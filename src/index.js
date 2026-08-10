const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// ─── Create Client ─────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// ─── Load Commands ─────────────────────────────────────────────────

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`[Commands] Loaded: ${command.data.name}`);
  } else {
    console.warn(`[Commands] Skipped ${file}: missing data or execute`);
  }
}

// ─── Load Events ───────────────────────────────────────────────────

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`[Events] Loaded: ${event.name}`);
}

// ─── Error Handling ────────────────────────────────────────────────

process.on('unhandledRejection', error => {
  console.error('[Error] Unhandled rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('[Error] Uncaught exception:', error);
});

// ─── Start Bot ─────────────────────────────────────────────────────

if (!config.token) {
  console.error('[Config] DISCORD_TOKEN is missing in .env');
  process.exit(1);
}

client.login(config.token);
