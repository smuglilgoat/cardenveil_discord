const { Events } = require('discord.js');
const { initReminders } = require('../services/reminder');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);

    // Initialize reminder scheduler
    initReminders(client);
  },
};
