const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { t } = require('../../utils/i18n');

/**
 * Build the session creation modal.
 */
function buildSessionCreateModal() {
  const modal = new ModalBuilder()
    .setCustomId('session_create_modal')
    .setTitle(t('session_create_title'));

  // Row 1: MJ + System
  const mjInput = new TextInputBuilder()
    .setCustomId('mj_id')
    .setLabel(t('field_mj'))
    .setPlaceholder('@Patrakolos')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const systemInput = new TextInputBuilder()
    .setCustomId('system')
    .setLabel(t('field_system'))
    .setPlaceholder('Cardenveil Layer 1')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(mjInput),
    new ActionRowBuilder().addComponents(systemInput),
  );

  // Row 2: Format + Date
  const formatInput = new TextInputBuilder()
    .setCustomId('format')
    .setLabel(t('field_format'))
    .setPlaceholder('One shot / Two shot / Mini shot')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const dateInput = new TextInputBuilder()
    .setCustomId('date')
    .setLabel(t('field_date'))
    .setPlaceholder('Samedi 13 Juin / À définir')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(formatInput),
    new ActionRowBuilder().addComponents(dateInput),
  );

  // Row 3: Duration + Type
  const durationInput = new TextInputBuilder()
    .setCustomId('duration')
    .setLabel(t('field_duration'))
    .setPlaceholder('4h / 2 sessions / 2x 3h30')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const typeInput = new TextInputBuilder()
    .setCustomId('type')
    .setLabel(t('field_type'))
    .setPlaceholder('En ligne / IRL / Mixte')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(durationInput),
    new ActionRowBuilder().addComponents(typeInput),
  );

  // Row 4: Level + Platform
  const levelInput = new TextInputBuilder()
    .setCustomId('level')
    .setLabel(t('field_level'))
    .setPlaceholder('Débutant / Intermédiaire / Avancé')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const platformInput = new TextInputBuilder()
    .setCustomId('platform')
    .setLabel(t('field_platform'))
    .setPlaceholder('Owlbear / Overlay Cardenveil')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(levelInput),
    new ActionRowBuilder().addComponents(platformInput),
  );

  // Row 5: Warnings (optional)
  const warningsInput = new TextInputBuilder()
    .setCustomId('warnings')
    .setLabel(t('field_warnings'))
    .setPlaceholder('Violence, Psychologique, Torture')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(warningsInput));

  // Row 6: Tags
  const tagsInput = new TextInputBuilder()
    .setCustomId('tags')
    .setLabel(t('field_tags'))
    .setPlaceholder('#Stratégique #Goofy #Epreuves')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(tagsInput));

  // Row 7: Game type
  const gameTypeInput = new TextInputBuilder()
    .setCustomId('game_type')
    .setLabel(t('field_game_type'))
    .setPlaceholder('Boss fight / Bac à sable / Exploration...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(gameTypeInput));

  // Row 8: Max players
  const maxPlayersInput = new TextInputBuilder()
    .setCustomId('max_players')
    .setLabel(t('field_max_players'))
    .setPlaceholder('3')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(maxPlayersInput));

  // Row 9: Description
  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel(t('field_description'))
    .setPlaceholder('Votre description narrative ici...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(descriptionInput));

  // Row 10: Comments (optional)
  const commentsInput = new TextInputBuilder()
    .setCustomId('comments')
    .setLabel(t('field_comments'))
    .setPlaceholder('Notes additionnelles...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(commentsInput));

  return modal;
}

module.exports = { buildSessionCreateModal };
