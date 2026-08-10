require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  announcementChannelId: process.env.ANNOUNCEMENT_CHANNEL_ID,
  mjRoleName: process.env.MJ_ROLE_NAME || 'MJ',
  language: process.env.LANGUAGE || 'fr',
  reminders: {
    reminder24h: process.env.REMINDER_24H !== 'false',
    reminder1h: process.env.REMINDER_1H !== 'false',
  },
};
