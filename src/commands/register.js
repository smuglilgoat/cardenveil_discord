const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../utils/i18n');
const { buildSessionEmbed } = require('../utils/embeds');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Gérer vos inscriptions')
    .addSubcommand(sub =>
      sub.setName('join')
        .setDescription('S\'inscrire à une session')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('ID de la session')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('leave')
        .setDescription('Se désinscrire d\'une session')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('ID de la session')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('my-sessions')
        .setDescription('Lister vos inscriptions')
    )
    .toJSON(),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'join': return handleJoin(interaction);
      case 'leave': return handleLeave(interaction);
      case 'my-sessions': return handleMySessions(interaction);
    }
  },
};

// ─── /register join ────────────────────────────────────────────────

async function handleJoin(interaction) {
  const sessionId = interaction.options.getInteger('id');
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.reply({ content: t('session_not_found'), ephemeral: true });
  }

  if (session.status === 'fini' || session.status === 'cancelled') {
    return interaction.reply({ content: t('session_already_full'), ephemeral: true });
  }

  const userId = interaction.user.id;
  const existing = db.getRegistration(sessionId, userId);

  if (existing) {
    return interaction.reply({ content: t('already_registered'), ephemeral: true });
  }

  const confirmedCount = db.getConfirmedCount(sessionId);
  const maxPlayers = session.max_players;

  if (maxPlayers && confirmedCount >= maxPlayers) {
    const waitlistCount = db.getWaitlistCount(sessionId);
    db.registerPlayer(sessionId, userId, 'waitlist');
    return interaction.reply({
      content: t('waitlisted', { position: waitlistCount + 1 }),
      ephemeral: true,
    });
  }

  db.registerPlayer(sessionId, userId, 'confirmed');
  return interaction.reply({ content: t('registered'), ephemeral: true });
}

// ─── /register leave ───────────────────────────────────────────────

async function handleLeave(interaction) {
  const sessionId = interaction.options.getInteger('id');
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.reply({ content: t('session_not_found'), ephemeral: true });
  }

  const userId = interaction.user.id;
  const existing = db.getRegistration(sessionId, userId);

  if (!existing) {
    return interaction.reply({ content: t('not_registered'), ephemeral: true });
  }

  const wasConfirmed = existing.status === 'confirmed';
  db.unregisterPlayer(sessionId, userId);

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

  return interaction.reply({ content: t('unregistered'), ephemeral: true });
}

// ─── /register my-sessions ─────────────────────────────────────────

async function handleMySessions(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.user.id;
  const dbConn = db.getDb();

  const registrations = dbConn.prepare(`
    SELECT r.*, s.* FROM registrations r
    JOIN sessions s ON r.session_id = s.id
    WHERE r.user_id = ?
    ORDER BY s.date ASC
  `).all(userId);

  if (registrations.length === 0) {
    return interaction.editReply({ content: 'Vous n\'êtes inscrit à aucune session.', ephemeral: true });
  }

  const lines = registrations.map(reg => {
    const statusIcon = reg.status === 'confirmed' ? '✅' : '📋';
    return `${statusIcon} **#${reg.session_id}** — ${reg.system || 'Cardenveil'} — ${reg.date || 'À définir'} (${reg.status === 'confirmed' ? 'Confirmé' : 'Liste d\'attente'})`;
  });

  const embed = {
    color: 0x5865f2,
    title: '📋 Vos inscriptions',
    description: lines.join('\n'),
  };

  await interaction.editReply({ embeds: [embed], ephemeral: true });
}
