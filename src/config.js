import 'dotenv/config';

export default {
  token: process.env.DISCORD_TOKEN,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  applicationId: process.env.DISCORD_APPLICATION_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  announcementChannelId: process.env.ANNOUNCEMENT_CHANNEL_ID,
  databaseUrl: process.env.DATABASE_URL,
  mjRoleName: process.env.MJ_ROLE_NAME || 'MJ',
  language: process.env.LANGUAGE || 'fr',
  timezone: process.env.TIMEZONE || 'Europe/Paris',
  reminders: {
    reminder24h: process.env.REMINDER_24H !== 'false',
    reminder1h: process.env.REMINDER_1H !== 'false',
  },
};
