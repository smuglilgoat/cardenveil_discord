const { EmbedBuilder } = require('discord.js');
const { t } = require('./i18n');
const { formatDiscordTimestamp } = require('./validators');
const db = require('../database');

/**
 * Build the announcement embed for a session.
 */
function buildSessionEmbed(session) {
  const confirmedCount = db.getConfirmedCount(session.id);
  const waitlistCount = db.getWaitlistCount(session.id);
  const confirmedPlayers = db.getConfirmedPlayers(session.id);
  const waitlistPlayers = db.getWaitlistPlayers(session.id);

  const statusLabel = getStatusLabel(session.status);
  const playerList = confirmedPlayers.map(p => `<@${p.user_id}>`).join(' ') || '—';
  const waitlistList = waitlistPlayers.map(p => `<@${p.user_id}>`).join(' ') || '';

  // Format date using Discord timestamps
  const dateDisplay = session.date_timestamp 
    ? `${formatDiscordTimestamp(session.date_timestamp, 'F')} (${formatDiscordTimestamp(session.date_timestamp, 'R')})`
    : (session.date_text || 'À définir');

  const embed = new EmbedBuilder()
    .setColor(getStatusColor(session.status))
    .setDescription(session.description || '—')
    .addFields(
      { name: t('embed_mj'), value: `<@${session.mj_id}>`, inline: true },
      { name: t('embed_system'), value: session.system || '—', inline: true },
      { name: t('embed_format'), value: session.format || '—', inline: true },
      { name: t('embed_date'), value: dateDisplay, inline: true },
      { name: t('embed_duration'), value: session.duration || '—', inline: true },
      { name: t('embed_type'), value: session.type || '—', inline: true },
      { name: t('embed_level'), value: session.level || '—', inline: true },
      { name: t('embed_platform'), value: session.platform || '—', inline: true },
    );

  if (session.warnings) {
    embed.addFields({ name: t('embed_warnings'), value: session.warnings, inline: false });
  }

  if (session.tags) {
    const tags = typeof session.tags === 'string' ? session.tags : JSON.parse(session.tags || '[]');
    if (Array.isArray(tags) && tags.length > 0) {
      embed.addFields({ name: t('embed_tags'), value: tags.join(' '), inline: false });
    }
  }

  embed.addFields(
    { name: t('embed_game_type'), value: session.game_type || '—', inline: false },
    {
      name: t('embed_players'),
      value: `${playerList} ${waitlistCount > 0 ? `\n${t('embed_waitlist')}: ${waitlistList}` : ''}\n**${confirmedCount}/${session.max_players || '?'}** ${session.max_players ? '(max)' : ''}`,
      inline: false,
    },
    { name: t('embed_status'), value: statusLabel, inline: true },
  );

  if (session.comments) {
    embed.addFields({ name: t('embed_comments'), value: session.comments, inline: false });
  }

  return embed;
}

/**
 * Build a compact calendar embed for listing sessions.
 */
function buildCalendarEmbed(sessions) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(t('calendar_title'));

  if (sessions.length === 0) {
    embed.setDescription(t('calendar_empty'));
    return embed;
  }

  for (const session of sessions) {
    const confirmedCount = db.getConfirmedCount(session.id);
    const statusLabel = getStatusLabel(session.status);
    const tags = typeof session.tags === 'string' ? session.tags : JSON.parse(session.tags || '[]');
    const tagsStr = Array.isArray(tags) ? tags.join(' ') : '';

    // Format date using Discord timestamps
    const dateDisplay = session.date_timestamp 
      ? formatDiscordTimestamp(session.date_timestamp, 'f')
      : (session.date_text || 'À définir');

    const value = [
      `${t('embed_format')}: ${session.format || '—'}`,
      `${t('embed_date')}: ${dateDisplay}`,
      `${t('embed_duration')}: ${session.duration || '—'}`,
      `${t('embed_level')}: ${session.level || '—'}`,
      `${t('embed_platform')}: ${session.platform || '—'}`,
      `${t('embed_players')}: ${confirmedCount}/${session.max_players || '?'} ${statusLabel}`,
      tagsStr ? `${t('embed_tags')}: ${tagsStr}` : null,
    ].filter(Boolean).join('\n');

    embed.addFields({
      name: `**#${session.id}** — ${session.system || 'Cardenveil'} — MJ: <@${session.mj_id}>`,
      value: value || '—',
      inline: false,
    });
  }

  return embed;
}

function getStatusColor(status) {
  switch (status) {
    case 'recrutement': return 0x57f287; // green
    case 'en_preparation': return 0xfee75c; // yellow
    case 'pret': return 0x5865f2; // blurple
    case 'fini': return 0x99aab5; // grey
    case 'cancelled': return 0xed4245; // red
    default: return 0x5865f2;
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'recrutement': return t('status_recruitment');
    case 'en_preparation': return t('status_preparation');
    case 'pret': return t('status_ready');
    case 'fini': return t('status_done');
    case 'cancelled': return t('status_cancelled');
    default: return status;
  }
}

module.exports = {
  buildSessionEmbed,
  buildCalendarEmbed,
  getStatusColor,
  getStatusLabel,
};
