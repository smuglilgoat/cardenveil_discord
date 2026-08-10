const cron = require('node-cron');
const db = require('../database');
const { t } = require('../utils/i18n');
const config = require('../config');

let client;

/**
 * Initialize the reminder scheduler.
 */
function initReminders(discordClient) {
  client = discordClient;

  // Check every 5 minutes for pending reminders
  cron.schedule('*/5 * * * *', async () => {
    await processReminders();
  });

  console.log('[Reminders] Scheduler initialized (checking every 5 min)');
}

/**
 * Schedule reminders for a session based on its date.
 */
function scheduleReminders(sessionId, dateStr) {
  if (!dateStr) return;

  const sessionDate = new Date(dateStr);
  if (isNaN(sessionDate.getTime())) return;

  // Delete existing reminders for this session
  db.deleteRemindersForSession(sessionId);

  // 24h before
  if (config.reminders.reminder24h) {
    const reminder24h = new Date(sessionDate.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > new Date()) {
      db.createReminder(sessionId, '24h', reminder24h.toISOString());
    }
  }

  // 1h before
  if (config.reminders.reminder1h) {
    const reminder1h = new Date(sessionDate.getTime() - 60 * 60 * 1000);
    if (reminder1h > new Date()) {
      db.createReminder(sessionId, '1h', reminder1h.toISOString());
    }
  }
}

/**
 * Process all pending reminders.
 */
async function processReminders() {
  const pending = db.getPendingReminders();

  for (const reminder of pending) {
    try {
      await sendReminder(reminder);
      db.markReminderSent(reminder.id);
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err);
    }
  }
}

/**
 * Send a single reminder.
 */
async function sendReminder(reminder) {
  if (!client) return;

  const session = db.getSessionById(reminder.session_id);
  if (!session) return;

  const confirmedPlayers = db.getConfirmedPlayers(reminder.session_id);
  const title = `${session.system || 'Cardenveil'} — ${session.format || 'Session'}`;

  const dmKey = reminder.reminder_type === '24h' ? 'reminder_dm_24h' : 'reminder_dm_1h';
  const channelKey = reminder.reminder_type === '24h' ? 'reminder_24h' : 'reminder_1h';

  // DM each confirmed player
  for (const player of confirmedPlayers) {
    try {
      const user = await client.users.fetch(player.user_id);
      await user.send(t(dmKey, { title }));
    } catch (err) {
      // User might have DMs disabled, skip silently
      console.warn(`Could not DM user ${player.user_id} for reminder`);
    }
  }

  // Channel ping
  if (session.announcement_channel_id) {
    try {
      const channel = await client.channels.fetch(session.announcement_channel_id);
      const mentions = confirmedPlayers.map(p => `<@${p.user_id}>`).join(' ');
      await channel.send(
        `${t(channelKey)}\n${mentions}\n🎲 **${title}** — ${session.date || ''}`
      );
    } catch (err) {
      console.error('Failed to send channel reminder:', err);
    }
  }
}

module.exports = {
  initReminders,
  scheduleReminders,
  processReminders,
};
