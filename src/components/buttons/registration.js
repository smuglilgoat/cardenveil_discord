const db = require('../../database');
const { t } = require('../../utils/i18n');
const { editAnnouncement } = require('../../services/announcement');

/**
 * Handle registration button clicks.
 */
async function handleRegisterButton(interaction) {
  const sessionId = parseInt(interaction.customId.split(':')[1], 10);
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
    // Add to waitlist
    const waitlistCount = db.getWaitlistCount(sessionId);
    db.registerPlayer(sessionId, userId, 'waitlist');
    await editAnnouncementMessage(interaction, session);
    return interaction.reply({
      content: t('waitlisted', { position: waitlistCount + 1 }),
      ephemeral: true,
    });
  }

  // Confirm registration
  db.registerPlayer(sessionId, userId, 'confirmed');
  await editAnnouncementMessage(interaction, session);
  return interaction.reply({ content: t('registered'), ephemeral: true });
}

/**
 * Handle unregistration button clicks.
 */
async function handleUnregisterButton(interaction) {
  const sessionId = parseInt(interaction.customId.split(':')[1], 10);
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

  // If a confirmed player leaves, promote from waitlist
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

  await editAnnouncementMessage(interaction, session);
  return interaction.reply({ content: t('unregistered'), ephemeral: true });
}

/**
 * Refresh the announcement message embed after a registration change.
 */
async function editAnnouncementMessage(interaction, session) {
  if (!session.announcement_message_id || !session.announcement_channel_id) return;

  try {
    const channel = await interaction.client.channels.fetch(session.announcement_channel_id);
    const message = await channel.messages.fetch(session.announcement_message_id);
    await editAnnouncement(message, session);
  } catch (err) {
    console.error('Failed to update announcement message:', err);
  }
}

module.exports = {
  handleRegisterButton,
  handleUnregisterButton,
};
