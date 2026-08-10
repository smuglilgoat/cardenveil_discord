const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
};

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command) {
    commands.push(command.data.toJSON());
    console.log(`[Deploy] Loaded: ${command.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`[Deploy] Refreshing ${commands.length} application command(s)...`);

    // Guild commands (instant, for testing)
    if (config.guildId) {
      const data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands },
      );
      console.log(`[Deploy] ✅ Successfully registered ${data.length} guild command(s)`);
    } else {
      // Global commands (takes ~1 hour to propagate)
      const data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
      );
      console.log(`[Deploy] ✅ Successfully registered ${data.length} global command(s)`);
    }
  } catch (error) {
    console.error('[Deploy] ❌ Error:', error);
  }
})();
