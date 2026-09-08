import { t } from './i18n.js';
import { formatDiscordTimestamp } from './validators.js';
import * as db from './db.js';

/**
 * Build the announcement embed for a session (plain embed JSON).
 */
export async function buildSessionEmbed(session) {
  const [confirmedCount, waitlistCount, confirmedPlayers, waitlistPlayers] = await Promise.all([
    db.getConfirmedCount(session.id),
    db.getWaitlistCount(session.id),
    db.getConfirmedPlayers(session.id),
    db.getWaitlistPlayers(session.id),
  ]);

  const playerList = confirmedPlayers.map(p => `<@${p.user_id}>`).join(' ') || '—';
  const waitlistList = waitlistPlayers.map(p => `<@${p.user_id}>`).join(' ') || '';

  const dateDisplay = session.date_timestamp
    ? `${formatDiscordTimestamp(session.date_timestamp, 'F')} (${formatDiscordTimestamp(session.date_timestamp, 'R')})`
    : (session.date_text || 'À définir');

  const fields = [
    { name: t('embed_mj'), value: `<@${session.mj_id}>`, inline: true },
    { name: t('embed_system'), value: session.system || '—', inline: true },
    { name: t('embed_format'), value: session.format || '—', inline: true },
    { name: t('embed_date'), value: dateDisplay, inline: true },
    { name: t('embed_duration'), value: session.duration || '—', inline: true },
    { name: t('embed_type'), value: session.type || '—', inline: true },
    { name: t('embed_level'), value: session.level || '—', inline: true },
    { name: t('embed_platform'), value: session.platform || '—', inline: true },
    { name: t('embed_game_type'), value: session.game_type || '—', inline: false },
    {
      name: t('embed_players'),
      value: `${playerList}${waitlistCount > 0 ? `\n${t('embed_waitlist')}: ${waitlistList}` : ''}\n**${confirmedCount}/${session.max_players || '?'}** ${session.max_players ? '(max)' : ''}`,
      inline: false,
    },
    { name: t('embed_status'), value: getStatusLabel(session.status), inline: true },
  ];

  if (session.warnings) {
    fields.push({ name: t('embed_warnings'), value: session.warnings, inline: false });
  }
  if (session.tags) {
    fields.push({ name: t('embed_tags'), value: session.tags, inline: false });
  }
  if (session.description) {
    fields.push({ name: t('embed_description'), value: session.description, inline: false });
  }
  if (session.comments) {
    fields.push({ name: t('embed_comments'), value: session.comments, inline: false });
  }

  return { color: getStatusColor(session.status), fields };
}

/**
 * Build a compact calendar embed for listing sessions.
 */
export async function buildCalendarEmbed(sessions) {
  const embed = { color: 0x5865f2, title: t('calendar_title'), fields: [] };

  if (sessions.length === 0) {
    embed.description = t('calendar_empty');
    return embed;
  }

  for (const session of sessions) {
    const confirmedCount = await db.getConfirmedCount(session.id);
    const dateDisplay = session.date_timestamp
      ? formatDiscordTimestamp(session.date_timestamp, 'f')
      : (session.date_text || 'À définir');

    const value = [
      `${t('embed_format')}: ${session.format || '—'}`,
      `${t('embed_date')}: ${dateDisplay}`,
      `${t('embed_duration')}: ${session.duration || '—'}`,
      `${t('embed_level')}: ${session.level || '—'}`,
      `${t('embed_platform')}: ${session.platform || '—'}`,
      `${t('embed_players')}: ${confirmedCount}/${session.max_players || '?'} ${getStatusLabel(session.status)}`,
    ].join('\n');

    embed.fields.push({
      name: `**#${session.id}** — ${session.system || 'Cardenveil'} — MJ: <@${session.mj_id}>`,
      value: value || '—',
      inline: false,
    });
  }

  return embed;
}

/**
 * Registration buttons (plain component JSON).
 */
export function buildRegistrationButtons(session) {
  const isClosed = session.status === 'fini' || session.status === 'cancelled';
  return [
    {
      type: 1, // ACTION_ROW
      components: [
        { type: 2, style: 3, custom_id: `register:${session.id}`, label: t('register_button'), disabled: isClosed },
        { type: 2, style: 4, custom_id: `unregister:${session.id}`, label: t('unregister_button'), disabled: isClosed },
      ],
    },
  ];
}

function getStatusColor(status) {
  switch (status) {
    case 'recrutement': return 0x57f287;
    case 'en_preparation': return 0xfee75c;
    case 'pret': return 0x5865f2;
    case 'fini': return 0x99aab5;
    case 'cancelled': return 0xed4245;
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
