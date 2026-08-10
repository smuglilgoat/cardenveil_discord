const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../utils/i18n');
const db = require('../database');
const config = require('../config');
const { scheduleReminders } = require('../services/reminder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mj')
    .setDescription('Outils MJ pour gérer les sessions')
    .addSubcommand(sub =>
      sub.setName('promote')
        .setDescription('Promouvoir un joueur de la liste d\'attente')
        .addIntegerOption(opt =>
          opt.setName('session')
            .setDescription('ID de la session')
            .setRequired(true)
        )
        .addUserOption(opt =>
          opt.setName('joueur')
            .setDescription('Joueur à promouvoir')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('Retirer un joueur d\'une session')
        .addIntegerOption(opt =>
          opt.setName('session')
            .setDescription('ID de la session')
            .setRequired(true)
        )
        .addUserOption(opt =>
          opt.setName('joueur')
            .setDescription('Joueur à retirer')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remind')
        .setDescription('Programmer un rappel personnalisé')
        .addIntegerOption(opt =>
          opt.setName('session')
            .setDescription('ID de la session')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('hours')
            .setDescription('Heures avant la session')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(168)
        )
    )
    .toJSON(),

  async execute(interaction) {
    // Check MJ role for all subcommands
    const mjRole = interaction.guild.roles.cache.find(r => r.name === config.mjRoleName);
    if (!mjRole || !interaction.member.roles.cache.has(mjRole.id)) {
      return interaction.reply({ content: t('mj_only'), ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'promote': return handlePromote(interaction);
      case 'kick': return handleKick(interaction);
      case 'remind': return handleRemind(interaction);
    }
  },
};

// ─── /mj promote ───────────────────────────────────────────────────

async function handlePromote(interaction) {
  const sessionId = interaction.options.getInteger('session');
  const targetUser = interaction.options.getUser('joueur');
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.reply({ content: t('session_not_found'), ephemeral: true });
  }

  const registration = db.getRegistration(sessionId, targetUser.id);
  if (!registration) {
    return interaction.reply({ content: t('not_registered'), ephemeral: true });
  }

  if (registration.status === 'confirmed') {
    return interaction.reply({ content: 'Ce joueur est déjà confirmé.', ephemeral: true });
  }

  // Promote from waitlist
  db.updateRegistrationStatus(sessionId, targetUser.id, 'confirmed');

  // Notify the player
  try {
    await targetUser.send(t('promoted'));
  } catch (err) {
    console.warn(`Could not notify promoted user ${targetUser.id}`);
  }

  return interaction.reply({
    content: t('mj_promoted', { user: `<@${targetUser.id}>` }),
    ephemeral: true,
  });
}

// ─── /mj kick ──────────────────────────────────────────────────────

async function handleKick(interaction) {
  const sessionId = interaction.options.getInteger('session');
  const targetUser = interaction.options.getUser('joueur');
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.reply({ content: t('session_not_found'), ephemeral: true });
  }

  const registration = db.getRegistration(sessionId, targetUser.id);
  if (!registration) {
    return interaction.reply({ content: t('not_registered'), ephemeral: true });
  }

  const wasConfirmed = registration.status === 'confirmed';
  db.unregisterPlayer(sessionId, targetUser.id);

  // If a confirmed player was kicked, promote from waitlist
  if (wasConfirmed) {
    const nextWaitlisted = db.promoteFromWaitlist(sessionId);
    if (nextWaitlisted) {
      try {
        const promotedUser = await interaction.client.users.fetch(nextWaitlisted.user_id);
        await promotedUser.send(t('promoted'));
      } catch (err) {
        console.warn(`Could not notify promoted user ${nextWaitlisted.user_id}`);
      }
    }
  }

  return interaction.reply({
    content: t('mj_kicked', { user: `<@${targetUser.id}>` }),
    ephemeral: true,
  });
}

// ─── /mj remind ────────────────────────────────────────────────────

async function handleRemind(interaction) {
  const sessionId = interaction.options.getInteger('session');
  const hours = interaction.options.getInteger('hours');
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.reply({ content: t('session_not_found'), ephemeral: true });
  }

  if (!session.date) {
    return interaction.reply({
      content: '❌ Cette session n\'a pas de date définie.',
      ephemeral: true,
    });
  }

  const sessionDate = new Date(session.date);
  if (isNaN(sessionDate.getTime())) {
    return interaction.reply({
      content: '❌ Format de date invalide.',
      ephemeral: true,
    });
  }

  const reminderTime = new Date(sessionDate.getTime() - hours * 60 * 60 * 1000);

  if (reminderTime <= new Date()) {
    return interaction.reply({
      content: '❌ Le rappel serait dans le passé.',
      ephemeral: true,
    });
  }

  // Create custom reminder
  db.createReminder(sessionId, `custom_${hours}h`, reminderTime.toISOString());

  return interaction.reply({
    content: t('mj_reminder_set', { hours }),
    ephemeral: true,
  });
}
