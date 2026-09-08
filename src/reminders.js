import config from './config.js';
import * as db from './db.js';
import { postMessage, sendDm } from './discord.js';
import { t } from './i18n.js';

/**
 * Schedule 24h/1h reminders for a session (replaces any existing ones).
 */
export async function scheduleReminders(sessionId, dateTimestamp) {
  if (!dateTimestamp) return;
  await db.deleteRemindersForSession(sessionId);

  const now = Math.floor(Date.now() / 1000);
  if (config.reminders.reminder24h) {
    const at = dateTimestamp - 24 * 3600;
    if (at > now) await db.createReminder(sessionId, '24h', at);
  }
  if (config.reminders.reminder1h) {
    const at = dateTimestamp - 3600;
    if (at > now) await db.createReminder(sessionId, '1h', at);
  }
}

/**
 * Send all due reminders. Called by the Netlify scheduled function every 5 min.
 */
export async function processReminders() {
  const pending = await db.getPendingReminders();
  for (const reminder of pending) {
    try {
      await sendReminder(reminder);
      await db.markReminderSent(reminder.reminder_id);
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.reminder_id}:`, err);
    }
  }
}

async function sendReminder(reminder) {
  const players = await db.getConfirmedPlayers(reminder.session_id);
  const title = `${reminder.system || 'Cardenveil'} — ${reminder.format || 'Session'}`;
  const is24h = reminder.reminder_type === '24h';
  const dmKey = is24h ? 'reminder_dm_24h' : 'reminder_dm_1h';
  const channelKey = is24h ? 'reminder_24h' : 'reminder_1h';

  for (const player of players) {
    try {
      await sendDm(player.user_id, { content: t(dmKey, { title }) });
    } catch {
      // User might have DMs disabled, skip silently
      console.warn(`Could not DM user ${player.user_id} for reminder`);
    }
  }

  if (reminder.announcement_channel_id) {
    try {
      const mentions = players.map(p => `<@${p.user_id}>`).join(' ');
      await postMessage(reminder.announcement_channel_id, {
        content: `${t(channelKey)}\n${mentions}\n🎲 **${title}**`,
      });
    } catch (err) {
      console.error('Failed to send channel reminder:', err);
    }
  }
}
