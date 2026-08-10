const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../utils/i18n');
const { buildSessionEmbed } = require('../utils/embeds');

/**
 * Post the announcement message with registration buttons in the configured channel.
 * Returns { message } or null on failure.
 */
async function postAnnouncement(channel, session) {
  const embed = buildSessionEmbed(session);
  const components = buildRegistrationButtons(session);

  try {
    const message = await channel.send({ embeds: [embed], components });
    return message;
  } catch (err) {
    console.error('Failed to post announcement:', err);
    return null;
  }
}

/**
 * Edit an existing announcement message.
 */
async function editAnnouncement(message, session) {
  const embed = buildSessionEmbed(session);
  const components = buildRegistrationButtons(session);

  try {
    await message.edit({ embeds: [embed], components });
    return true;
  } catch (err) {
    console.error('Failed to edit announcement:', err);
    return false;
  }
}

/**
 * Build the registration action row.
 */
function buildRegistrationButtons(session) {
  const isClosed = session.status === 'fini' || session.status === 'cancelled';

  const registerBtn = new ButtonBuilder()
    .setCustomId(`register:${session.id}`)
    .setLabel(t('register_button'))
    .setStyle(ButtonStyle.Success)
    .setDisabled(isClosed);

  const unregisterBtn = new ButtonBuilder()
    .setCustomId(`unregister:${session.id}`)
    .setLabel(t('unregister_button'))
    .setStyle(ButtonStyle.Danger)
    .setDisabled(isClosed);

  return [new ActionRowBuilder().addComponents(registerBtn, unregisterBtn)];
}

module.exports = {
  postAnnouncement,
  editAnnouncement,
  buildRegistrationButtons,
};
