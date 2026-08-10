const { Events } = require('discord.js');
const { t } = require('../utils/i18n');
const { handleRegisterButton, handleUnregisterButton } = require('../components/buttons/registration');
const db = require('../database');
const { extractUserId, parseMaxPlayers } = require('../utils/validators');
const { createDiscordEvent } = require('../services/discordEvent');
const { postAnnouncement } = require('../services/announcement');
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

  const sessionData = {
    mj_id: mjId,
    system: interaction.fields.getTextInputValue('system'),
    format: interaction.fields.getTextInputValue('format'),
    date: interaction.fields.getTextInputValue('date'),
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
  try {
    eventId = await createDiscordEvent(interaction.guild, session);
    if (eventId) {
      db.updateSession(session.id, { discord_event_id: eventId });
    }
  } catch (err) {
    console.error('Failed to create Discord event:', err);
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

  // Schedule reminders
  if (session.date) {
    scheduleReminders(session.id, session.date);
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
