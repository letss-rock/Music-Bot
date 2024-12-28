const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, AudioPlayerError, NoSubscriberBehavior } = require('@discordjs/voice');
const playdl = require('play-dl'); // For streaming audio from YouTube
const { token } = require('./config.json'); // Your bot token in a separate config.json

// Ensure ffmpeg-static is used
process.env.FFMPEG_PATH = require('ffmpeg-static');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = '!';
const audioPlayer = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play, // Play even if no one is listening
  },
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'play') {
    if (!args.length) return message.reply('Please provide a song name or URL!');
    const query = args.join(' ');
    const voiceChannel = message.member?.voice.channel;

    if (!voiceChannel) return message.reply('You need to be in a voice channel to play music!');

    try {
      // Search for the song on YouTube using the query
      const searchResults = await playdl.search(query, { limit: 1 });
      if (!searchResults.length) return message.reply('No results found for your query.');

      const song = searchResults[0];
      console.log(`Song found: ${song.title} | URL: ${song.url}`);

      const stream = await playdl.stream(song.url); // Get the stream of the song
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        metadata: {
          title: song.title,
        },
      });

      console.log(`Audio resource created for ${song.title}`);

      // Join the voice channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      // Subscribe to the audio player and play the resource
      connection.subscribe(audioPlayer);
      audioPlayer.play(resource);

      message.reply(`🎶 Now playing: **${song.title}**`);

      audioPlayer.on(AudioPlayerStatus.Playing, () => {
        console.log(`Started playing: ${song.title}`);
      });

      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        console.log('Audio player is idle.');
        connection.destroy(); // Leave the voice channel when finished
      });

      audioPlayer.on('error', (error) => {
        console.error('AudioPlayerError:', error.message);
      });

    } catch (error) {
      console.error('Error playing song:', error);
      message.reply('❌ Could not play the song. Please try again.');
    }
  }

  if (command === 'stop') {
    audioPlayer.stop();
    message.reply('🛑 Music stopped!');
  }

  if (command === 'skip') {
    audioPlayer.stop();
    message.reply('⏩ Skipped the current song!');
  }
});

// Debugging: log state changes for audio player
audioPlayer.on(AudioPlayerStatus.Playing, () => {
  console.log('Audio is playing!');
});

audioPlayer.on(AudioPlayerStatus.Idle, () => {
  console.log('Audio player is idle.');
});

client.login(token);


