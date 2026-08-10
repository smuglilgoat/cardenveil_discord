const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { t } = require('../../utils/i18n');

/**
 * Build the session edit modal with pre-filled current values.
 */
function buildSessionEditModal(session) {
  const modal = new ModalBuilder()
    .setCustomId(`session_edit_modal:${session.id}`)
    .setTitle(`✏️ ${t('session_edit_title')} #${session.id}`);

  // Field 1: Date
  const dateInput = new TextInputBuilder()
    .setCustomId('date')
    .setLabel(t('field_date'))
    .setPlaceholder('2024-06-13 14:00 ou Samedi 13 Juin 2024 14:00')
    .setStyle(TextInputStyle.Short)
    .setValue(session.date_text || '')
    .setRequired(false);

  // Field 2: Max Players
  const maxPlayersInput = new TextInputBuilder()
    .setCustomId('max_players')
    .setLabel(t('field_max_players'))
    .setPlaceholder('3')
    .setStyle(TextInputStyle.Short)
    .setValue(String(session.max_players || ''))
    .setRequired(true);

  // Field 3: Status
  const statusInput = new TextInputBuilder()
    .setCustomId('status')
    .setLabel(t('field_status'))
    .setPlaceholder('recrutement / en_preparation / pret / fini / cancelled')
    .setStyle(TextInputStyle.Short)
    .setValue(session.status || 'recrutement')
    .setRequired(true);

  // Field 4: Description
  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel(t('field_description'))
    .setPlaceholder('Description narrative...')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(session.description || '')
    .setRequired(false);

  // Field 5: Comments
  const commentsInput = new TextInputBuilder()
    .setCustomId('comments')
    .setLabel(t('field_comments'))
    .setPlaceholder('Notes additionnelles...')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(session.comments || '')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(maxPlayersInput),
    new ActionRowBuilder().addComponents(statusInput),
    new ActionRowBuilder().addComponents(descriptionInput),
    new ActionRowBuilder().addComponents(commentsInput),
  );

  return modal;
}

module.exports = { buildSessionEditModal };
