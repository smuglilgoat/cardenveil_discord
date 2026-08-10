const { GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } = require('discord.js');
const { isValidFutureDate } = require('../utils/validators');

/**
 * Create a Discord scheduled event for a session.
 * Returns the event ID or null if date is not valid.
 */
async function createDiscordEvent(guild, session) {
  if (!isValidFutureDate(session.date)) {
    return null;
  }

  const startDate = new Date(session.date);
  if (isNaN(startDate.getTime()) || startDate <= new Date()) {
    return null;
  }

  // Default duration: 4 hours
  const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

  try {
    const event = await guild.scheduledEvents.create({
      name: `🎲 ${session.system || 'Cardenveil'} — ${session.format || 'Session'}`,
      description: buildEventDescription(session),
      scheduledStartTime: startDate,
      scheduledEndTime: endDate,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.External,
      entityMetadata: {
        location: session.platform || 'En ligne',
      },
    });
    return event.id;
  } catch (err) {
    console.error('Failed to create Discord event:', err);
    return null;
  }
}

/**
 * Update an existing Discord event.
 */
async function updateDiscordEvent(guild, eventId, session) {
  try {
    const event = await guild.scheduledEvents.fetch(eventId);
    const updates = {
      name: `🎲 ${session.system || 'Cardenveil'} — ${session.format || 'Session'}`,
      description: buildEventDescription(session),
    };

    if (isValidFutureDate(session.date)) {
      updates.scheduledStartTime = new Date(session.date);
      updates.scheduledEndTime = new Date(new Date(session.date).getTime() + 4 * 60 * 60 * 1000);
    }

    if (session.platform) {
      updates.entityMetadata = { location: session.platform };
    }

    await event.edit(updates);
    return true;
  } catch (err) {
    console.error('Failed to update Discord event:', err);
    return false;
  }
}

/**
 * Delete a Discord event.
 */
async function deleteDiscordEvent(guild, eventId) {
  try {
    const event = await guild.scheduledEvents.fetch(eventId);
    await event.delete();
    return true;
  } catch (err) {
    console.error('Failed to delete Discord event:', err);
    return false;
  }
}

function buildEventDescription(session) {
  const lines = [];
  if (session.game_type) lines.push(`⚔️ ${session.game_type}`);
  if (session.level) lines.push(`⚔️ Niveau: ${session.level}`);
  if (session.warnings) lines.push(`⚠️ ${session.warnings}`);
  if (session.description) lines.push(`\n${session.description}`);
  return lines.join('\n') || 'Session Cardenveil';
}

module.exports = {
  createDiscordEvent,
  updateDiscordEvent,
  deleteDiscordEvent,
};
