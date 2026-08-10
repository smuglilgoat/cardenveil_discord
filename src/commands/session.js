const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { t } = require('../utils/i18n');
const { buildCalendarEmbed } = require('../utils/embeds');
const { buildSessionCreateModal } = require('../components/modals/sessionCreate');
const db = require('../database');
const { normalizeStatus } = require('../utils/validators');
const { editAnnouncement } = require('../services/announcement');
const { updateDiscordEvent, deleteDiscordEvent } = require('../services/discordEvent');
const { scheduleReminders } = require('../services/reminder');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Gérer les sessions Cardenveil')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Créer une nouvelle session')
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lister les sessions à venir')
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Afficher les détails d\'une session')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('ID de la session')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Changer le statut d\'une session (MJ uniquement)')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('ID de la session')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('status')
            .setDescription('Nouveau statut')
            .setRequired(true)
            .addChoices(
              { name: 'Recrutement', value: 'recrutement' },
              { name: 'En préparation', value: 'en_preparation' },
              { name: 'Prêt', value: 'pret' },
              { name: 'Fini', value: 'fini' },
              { name: 'Annulé', value: 'cancelled' },
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('cancel')
        .setDescription('Annuler une session (MJ uniquement)')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('ID de la session')
            .setRequired(true)
        )
    )
    .toJSON(),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'create': return handleCreate(interaction);
      case 'list': return handleList(interaction);
      case 'info': return handleInfo(interaction);
      case 'status': return handleStatus(interaction);
      case 'cancel': return handleCancel(interaction);
    }
  },
};

// ─── /session create ───────────────────────────────────────────────

async function handleCreate(interaction) {
  // Check MJ role
  const mjRole = interaction.guild.roles.cache.find(r => r.name === config.mjRoleName);
  if (!mjRole || !interaction.member.roles.cache.has(mjRole.id)) {
    return interaction.reply({ content: t('mj_only'), ephemeral: true });
  }

  const modal = buildSessionCreateModal();
  await interaction.showModal(modal);
}

// ─── /session list ─────────────────────────────────────────────────

async function handleList(interaction) {
  await interaction.deferReply();

  const sessions = db.getUpcomingSessions();
  const embed = buildCalendarEmbed(sessions);

  await interaction.editReply({ embeds: [embed] });
}

// ─── /session info ─────────────────────────────────────────────────

async function handleInfo(interaction) {
  const sessionId = interaction.options.getInteger('id');
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.reply({ content: t('session_not_found'), ephemeral: true });
  }

  const { buildSessionEmbed } = require('../utils/embeds');
  const embed = buildSessionEmbed(session);

  await interaction.reply({ embeds: [embed] });
}

// ─── /session status ───────────────────────────────────────────────

async function handleStatus(interaction) {
  // Check MJ role
  const mjRole = interaction.guild.roles.cache.find(r => r.name === config.mjRoleName);
  if (!mjRole || !interaction.member.roles.cache.has(mjRole.id)) {
    return interaction.reply({ content: t('mj_only'), ephemeral: true });
  }

  const sessionId = interaction.options.getInteger('id');
  const newStatus = interaction.options.getString('status');
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.reply({ content: t('session_not_found'), ephemeral: true });
  }

  db.updateSession(sessionId, { status: newStatus });
  const updated = db.getSessionById(sessionId);

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

  // Update Discord event
  if (updated.discord_event_id) {
    if (newStatus === 'cancelled') {
      await deleteDiscordEvent(interaction.guild, updated.discord_event_id);
    } else {
      await updateDiscordEvent(interaction.guild, updated.discord_event_id, updated);
    }
  }

  await interaction.reply({ content: t('session_status_updated'), ephemeral: true });
}

// ─── /session cancel ───────────────────────────────────────────────

async function handleCancel(interaction) {
  const mjRole = interaction.guild.roles.cache.find(r => r.name === config.mjRoleName);
  if (!mjRole || !interaction.member.roles.cache.has(mjRole.id)) {
    return interaction.reply({ content: t('mj_only'), ephemeral: true });
  }

  const sessionId = interaction.options.getInteger('id');
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.reply({ content: t('session_not_found'), ephemeral: true });
  }

  db.updateSession(sessionId, { status: 'cancelled' });
  const updated = db.getSessionById(sessionId);

  // Update announcement
  if (updated.announcement_message_id && updated.announcement_channel_id) {
    try {
      const channel = await interaction.client.channels.fetch(updated.announcement_channel_id);
      const message = await channel.messages.fetch(updated.announcement_message_id);
      await editAnnouncement(message, updated);
    } catch (err) {
      console.error('Failed to update announcement:', err);
    }
  }

  // Delete Discord event
  if (updated.discord_event_id) {
    await deleteDiscordEvent(interaction.guild, updated.discord_event_id);
  }

  await interaction.reply({ content: t('session_cancelled'), ephemeral: true });
}
