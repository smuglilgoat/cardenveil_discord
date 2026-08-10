const { Events } = require('discord.js');
const { t } = require('../utils/i18n');
const { handleRegisterButton, handleUnregisterButton } = require('../components/buttons/registration');
const db = require('../database');
const { extractUserId, parseMaxPlayers, parseDateToTimestamp, normalizeStatus } = require('../utils/validators');
const { createDiscordEvent, updateDiscordEvent, deleteDiscordEvent } = require('../services/discordEvent');
const { postAnnouncement, editAnnouncement } = require('../services/announcement');
const { scheduleReminders } = require('../services/reminder');
const config = require('../config');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // ─── Slash Commands ──────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`[Commands] No handler for: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[Commands] Error executing ${interaction.commandName}:`, error);
        const reply = { content: t('error_generic'), ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
      return;
    }

    // ─── Button Interactions ─────────────────────────────────────
    if (interaction.isButton()) {
      const [action, sessionId] = interaction.customId.split(':');

      try {
        if (action === 'register') {
          await handleRegisterButton(interaction);
        } else if (action === 'unregister') {
          await handleUnregisterButton(interaction);
        }
      } catch (error) {
        console.error('[Buttons] Error:', error);
        const reply = { content: t('error_generic'), ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
      return;
    }

    // ─── Modal Submissions ───────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'session_create_modal') {
        await handleSessionCreateModal(interaction);
      } else if (interaction.customId.startsWith('session_edit_modal:')) {
        await handleSessionEditModal(interaction);
      }
      return;
    }
  },
};

// ─── Session Create Modal Handler ──────────────────────────────────

async function handleSessionCreateModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // Extract all fields from the modal
  const mjMention = interaction.fields.getTextInputValue('mj_id');
  const mjId = extractUserId(mjMention) || interaction.user.id;
  const dateInput = interaction.fields.getTextInputValue('date');

  // Parse date into Unix timestamp
  const dateTimestamp = parseDateToTimestamp(dateInput);

  const sessionData = {
    mj_id: mjId,
    system: interaction.fields.getTextInputValue('system'),
    format: interaction.fields.getTextInputValue('format'),
    date_timestamp: dateTimestamp,
    date_text: dateInput,
    duration: interaction.fields.getTextInputValue('duration'),
    type: interaction.fields.getTextInputValue('type'),
    level: interaction.fields.getTextInputValue('level'),
    platform: interaction.fields.getTextInputValue('platform'),
    warnings: interaction.fields.getTextInputValue('warnings') || null,
    tags: interaction.fields.getTextInputValue('tags') || null,
    game_type: interaction.fields.getTextInputValue('game_type'),
    max_players: parseMaxPlayers(interaction.fields.getTextInputValue('max_players')),
    description: interaction.fields.getTextInputValue('description') || null,
    comments: interaction.fields.getTextInputValue('comments') || null,
    status: 'recrutement',
  };

  if (!sessionData.max_players) {
    return interaction.editReply({ content: t('error_invalid_players') });
  }

  // Create session in database
  const session = db.createSession(sessionData);

  // Create Discord event if date is valid
  let eventId = null;
  if (dateTimestamp) {
    try {
      eventId = await createDiscordEvent(interaction.guild, session);
      if (eventId) {
        db.updateSession(session.id, { discord_event_id: eventId });
      }
    } catch (err) {
      console.error('Failed to create Discord event:', err);
    }
  }

  // Post announcement in the configured channel
  let messageId = null;
  let channelId = null;

  if (config.announcementChannelId) {
    try {
      const channel = await interaction.client.channels.fetch(config.announcementChannelId);
      if (channel) {
        const message = await postAnnouncement(channel, session);
        if (message) {
          messageId = message.id;
          channelId = message.channelId;
          db.updateSession(session.id, {
            announcement_message_id: messageId,
            announcement_channel_id: channelId,
          });
        }
      }
    } catch (err) {
      console.error('Failed to post announcement:', err);
    }
  }

  // Schedule reminders if date is valid
  if (dateTimestamp) {
    scheduleReminders(session.id, dateTimestamp);
  }

  // Reply with success
  const updatedSession = db.getSessionById(session.id);
  const { buildSessionEmbed } = require('../utils/embeds');
  const embed = buildSessionEmbed(updatedSession);

  await interaction.editReply({
    content: t('session_created'),
    embeds: [embed],
    ephemeral: true,
  });
}

// ─── Session Edit Modal Handler ────────────────────────────────────

async function handleSessionEditModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // Extract session ID from customId
  const sessionId = parseInt(interaction.customId.split(':')[1], 10);
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.editReply({ content: t('session_not_found') });
  }

  // Extract new values
  const dateInput = interaction.fields.getTextInputValue('date');
  const newDateTimestamp = parseDateToTimestamp(dateInput);
  const newMaxPlayers = parseMaxPlayers(interaction.fields.getTextInputValue('max_players'));
  const newStatus = normalizeStatus(interaction.fields.getTextInputValue('status'));
  const newDescription = interaction.fields.getTextInputValue('description') || null;
  const newComments = interaction.fields.getTextInputValue('comments') || null;

  if (!newMaxPlayers) {
    return interaction.editReply({ content: t('error_invalid_players') });
  }

  // Check if date changed
  const dateChanged = newDateTimestamp !== session.date_timestamp;

  // Update database
  const updates = {
    date_timestamp: newDateTimestamp,
    date_text: dateInput,
    max_players: newMaxPlayers,
    status: newStatus,
    description: newDescription,
    comments: newComments,
  };

  db.updateSession(sessionId, updates);

  // Handle Discord Event based on date changes
  const updated = db.getSessionById(sessionId);

  if (dateChanged) {
    if (session.discord_event_id) {
      // Date changed - delete old event and create new one if valid
      await deleteDiscordEvent(interaction.guild, session.discord_event_id);
      db.updateSession(sessionId, { discord_event_id: null });

      if (newDateTimestamp) {
        // Create new event with new date
        try {
          const newEventId = await createDiscordEvent(interaction.guild, updated);
          if (newEventId) {
            db.updateSession(sessionId, { discord_event_id: newEventId });
          }
        } catch (err) {
          console.error('Failed to create new Discord event:', err);
        }
      }
    } else if (newDateTimestamp) {
      // No previous event but now has valid date - create event
      try {
        const newEventId = await createDiscordEvent(interaction.guild, updated);
        if (newEventId) {
          db.updateSession(sessionId, { discord_event_id: newEventId });
        }
      } catch (err) {
        console.error('Failed to create Discord event:', err);
      }
    }
  }

  // Reschedule reminders if date changed
  if (dateChanged) {
    if (newDateTimestamp) {
      scheduleReminders(sessionId, newDateTimestamp);
    } else {
      // Date changed to "à définir" - delete reminders
      db.deleteRemindersForSession(sessionId);
    }
  }

  // Update announcement message
  if (updated.announcement_message_id && updated.announcement_channel_id) {
    try {
      const channel = await interaction.client.channels.fetch(updated.announcement_channel_id);
      const message = await channel.messages.fetch(updated.announcement_message_id);
      await editAnnouncement(message, updated);
    } catch (err) {
      console.error('Failed to update announcement:', err);
    }
  }

  // Reply with success
  const { buildSessionEmbed } = require('../utils/embeds');
  const embed = buildSessionEmbed(updated);

  await interaction.editReply({
    content: t('session_edited', { id: sessionId }),
    embeds: [embed],
    ephemeral: true,
  });
}
