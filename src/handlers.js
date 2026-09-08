import config from './config.js';
import * as db from './db.js';
import {
  getGuildRoles,
  postMessage,
  editMessage,
  sendDm,
  createScheduledEvent,
  deleteScheduledEvent,
} from './discord.js';
import { t } from './i18n.js';
import { buildSessionEmbed, buildCalendarEmbed, buildRegistrationButtons } from './embeds.js';
import {
  parseDateToTimestamp,
  parseMaxPlayers,
  normalizeStatus,
  isValidFutureTimestamp,
} from './validators.js';
import { scheduleReminders } from './reminders.js';

// ─── Interaction helpers ───────────────────────────────────────────

// Interaction types
const COMMAND = 2;
const BUTTON = 3;
const MODAL_SUBMIT = 5;

// Response types
const MESSAGE = 4;
const MODAL = 9;

const ephemeral = (data) => ({ type: MESSAGE, data: { flags: 64, ...data } });
const text = (content) => ephemeral({ content });

const subcommand = (interaction) => interaction.data.options?.[0]?.name;
const option = (interaction, name) =>
  interaction.data.options?.[0]?.options?.find(o => o.name === name)?.value;
const modalValue = (interaction, name) =>
  interaction.data.components?.flatMap(r => r.components)?.find(c => c.custom_id === name)?.value;

async function isMj(interaction) {
  const roles = await getGuildRoles(interaction.guild_id);
  const mj = roles.find(r => r.name === config.mjRoleName);
  return !!mj && interaction.member.roles.includes(mj.id);
}

async function refreshAnnouncement(session) {
  if (!session.announcement_message_id || !session.announcement_channel_id) return;
  try {
    await editMessage(session.announcement_channel_id, session.announcement_message_id, {
      embeds: [await buildSessionEmbed(session)],
      components: buildRegistrationButtons(session),
    });
  } catch (err) {
    console.error('Failed to update announcement:', err);
  }
}

// ─── Router ────────────────────────────────────────────────────────

export async function handleInteraction(interaction) {
  if (!interaction.guild_id) return text(t('guild_only'));

  if (interaction.type === COMMAND) {
    switch (interaction.data.name) {
      case 'session': return handleSessionCommand(interaction);
      case 'register': return handleRegisterCommand(interaction);
      case 'mj': return handleMjCommand(interaction);
    }
  }

  if (interaction.type === BUTTON) {
    const [action, sessionId] = interaction.data.custom_id.split(':');
    if (action === 'register') return handleRegisterButton(interaction, Number(sessionId));
    if (action === 'unregister') return handleUnregisterButton(interaction, Number(sessionId));
  }

  if (interaction.type === MODAL_SUBMIT) {
    if (interaction.data.custom_id === 'session_create_modal') return handleSessionCreateModal(interaction);
    if (interaction.data.custom_id.startsWith('session_edit_modal:')) return handleSessionEditModal(interaction);
  }

  return text(t('error_generic'));
}

// ─── /session ──────────────────────────────────────────────────────

async function handleSessionCommand(interaction) {
  switch (subcommand(interaction)) {
    case 'create': return handleSessionCreate(interaction);
    case 'edit': return handleSessionEdit(interaction);
    case 'list': return handleSessionList(interaction);
    case 'info': return handleSessionInfo(interaction);
    case 'status': return handleSessionStatus(interaction);
    case 'cancel': return handleSessionCancel(interaction);
    default: return text(t('error_generic'));
  }
}

async function handleSessionCreate(interaction) {
  if (!(await isMj(interaction))) return text(t('mj_only'));
  return {
    type: MODAL,
    data: {
      custom_id: 'session_create_modal',
      title: t('session_create_title'),
      // Discord modals are capped at 5 inputs — essentials only.
      // MJ is the invoker; description/comments etc. via /session edit.
      components: [
        row(textInput('system', t('field_system'), { placeholder: 'Cardenveil Layer 1' })),
        row(textInput('format', t('field_format'), { placeholder: 'One shot / Two shot / Mini shot' })),
        row(textInput('date', t('field_date'), { placeholder: '2026-06-13 14:00 ou Samedi 13 Juin 2026 14:00' })),
        row(textInput('max_players', t('field_max_players'), { placeholder: '3' })),
        row(textInput('game_type', t('field_game_type'), { style: 2, placeholder: 'Boss fight / Bac à sable / Exploration...' })),
      ],
    },
  };
}

async function handleSessionEdit(interaction) {
  if (!(await isMj(interaction))) return text(t('mj_only'));
  const session = await db.getSessionById(option(interaction, 'id'));
  if (!session) return text(t('session_not_found'));

  return {
    type: MODAL,
    data: {
      custom_id: `session_edit_modal:${session.id}`,
      title: `${t('session_edit_title')} #${session.id}`.slice(0, 45),
      components: [
        row(textInput('date', t('field_date'), { required: false, value: session.date_text || '', placeholder: 'Vide = à définir' })),
        row(textInput('max_players', t('field_max_players'), { value: String(session.max_players || ''), placeholder: '3' })),
        row(textInput('status', t('field_status'), { value: session.status || 'recrutement', placeholder: 'recrutement / en_preparation / pret / fini / cancelled' })),
        row(textInput('description', t('field_description'), { style: 2, required: false, value: session.description || '' })),
        row(textInput('comments', t('field_comments'), { style: 2, required: false, value: session.comments || '' })),
      ],
    },
  };
}

async function handleSessionList(interaction) {
  const sessions = await db.getUpcomingSessions();
  return { type: MESSAGE, data: { embeds: [await buildCalendarEmbed(sessions)] } };
}

async function handleSessionInfo(interaction) {
  const session = await db.getSessionById(option(interaction, 'id'));
  if (!session) return text(t('session_not_found'));
  return { type: MESSAGE, data: { embeds: [await buildSessionEmbed(session)] } };
}

async function handleSessionStatus(interaction) {
  if (!(await isMj(interaction))) return text(t('mj_only'));
  const session = await db.getSessionById(option(interaction, 'id'));
  if (!session) return text(t('session_not_found'));

  const newStatus = option(interaction, 'status');
  await db.updateSession(session.id, { status: newStatus });
  const updated = await db.getSessionById(session.id);

  if (newStatus === 'cancelled' || newStatus === 'fini') {
    await closeSessionSideEffects(interaction, updated);
  }

  await refreshAnnouncement(updated);
  return text(t('session_status_updated'));
}

async function handleSessionCancel(interaction) {
  if (!(await isMj(interaction))) return text(t('mj_only'));
  const session = await db.getSessionById(option(interaction, 'id'));
  if (!session) return text(t('session_not_found'));

  await db.updateSession(session.id, { status: 'cancelled' });
  const updated = await db.getSessionById(session.id);

  await closeSessionSideEffects(interaction, updated);
  await refreshAnnouncement(updated);
  return text(t('session_cancelled'));
}

// Delete Discord event + reminders when a session closes.
async function closeSessionSideEffects(interaction, session) {
  if (session.discord_event_id) {
    try {
      await deleteScheduledEvent(interaction.guild_id, session.discord_event_id);
    } catch (err) {
      console.error('Failed to delete Discord event:', err);
    }
  }
  await db.deleteRemindersForSession(session.id);
}

// ─── Session create modal ──────────────────────────────────────────

async function handleSessionCreateModal(interaction) {
  const maxPlayers = parseMaxPlayers(modalValue(interaction, 'max_players'));
  if (!maxPlayers) return text(t('error_invalid_players'));

  const dateInput = modalValue(interaction, 'date');
  const dateTimestamp = parseDateToTimestamp(dateInput);

  const session = await db.createSession({
    mj_id: interaction.member.user.id,
    system: modalValue(interaction, 'system'),
    format: modalValue(interaction, 'format'),
    date_timestamp: dateTimestamp,
    date_text: dateInput,
    game_type: modalValue(interaction, 'game_type'),
    max_players: maxPlayers,
    status: 'recrutement',
  });

  if (dateTimestamp) {
    try {
      const eventId = await createEventForSession(interaction.guild_id, session);
      if (eventId) await db.updateSession(session.id, { discord_event_id: eventId });
    } catch (err) {
      console.error('Failed to create Discord event:', err);
    }
  }

  if (config.announcementChannelId) {
    try {
      const message = await postMessage(config.announcementChannelId, {
        embeds: [await buildSessionEmbed(session)],
        components: buildRegistrationButtons(session),
      });
      await db.updateSession(session.id, {
        announcement_message_id: message.id,
        announcement_channel_id: message.channel_id,
      });
    } catch (err) {
      console.error('Failed to post announcement:', err);
    }
  }

  await scheduleReminders(session.id, dateTimestamp);

  const updated = await db.getSessionById(session.id);
  return ephemeral({ content: t('session_created'), embeds: [await buildSessionEmbed(updated)] });
}

async function createEventForSession(guildId, session) {
  if (!isValidFutureTimestamp(session.date_timestamp)) return null;
  const start = new Date(session.date_timestamp * 1000);
  const event = await createScheduledEvent(guildId, {
    name: `🎲 ${session.system || 'Cardenveil'} — ${session.format || 'Session'}`,
    description: buildEventDescription(session),
    scheduled_start_time: start.toISOString(),
    scheduled_end_time: new Date(start.getTime() + 4 * 3600 * 1000).toISOString(),
    privacy_level: 2,  // GUILD_ONLY
    entity_type: 3,    // EXTERNAL
    entity_metadata: { location: session.platform || 'En ligne' },
  });
  return event.id;
}

function buildEventDescription(session) {
  const lines = [];
  if (session.game_type) lines.push(`⚔️ ${session.game_type}`);
  if (session.level) lines.push(`⚔️ Niveau: ${session.level}`);
  if (session.warnings) lines.push(`⚠️ ${session.warnings}`);
  if (session.description) lines.push(`\n${session.description}`);
  return lines.join('\n') || 'Session Cardenveil';
}

// ─── Session edit modal ────────────────────────────────────────────

async function handleSessionEditModal(interaction) {
  const sessionId = Number(interaction.data.custom_id.split(':')[1]);
  const session = await db.getSessionById(sessionId);
  if (!session) return text(t('session_not_found'));

  const maxPlayers = parseMaxPlayers(modalValue(interaction, 'max_players'));
  if (!maxPlayers) return text(t('error_invalid_players'));

  const dateInput = modalValue(interaction, 'date');
  const newDateTimestamp = parseDateToTimestamp(dateInput);
  const newStatus = normalizeStatus(modalValue(interaction, 'status'));
  const dateChanged = newDateTimestamp !== session.date_timestamp;

  await db.updateSession(sessionId, {
    date_timestamp: newDateTimestamp,
    date_text: dateInput,
    max_players: maxPlayers,
    status: newStatus,
    description: modalValue(interaction, 'description'),
    comments: modalValue(interaction, 'comments'),
  });

  const updated = await db.getSessionById(sessionId);

  // Close-side effects if the session is now closed
  if (newStatus === 'cancelled' || newStatus === 'fini') {
    await closeSessionSideEffects(interaction, updated);
  } else if (dateChanged) {
    // Recreate the Discord event when the date changes
    if (session.discord_event_id) {
      try {
        await deleteScheduledEvent(interaction.guild_id, session.discord_event_id);
      } catch (err) {
        console.error('Failed to delete old Discord event:', err);
      }
      await db.updateSession(sessionId, { discord_event_id: null });
    }
    if (newDateTimestamp) {
      try {
        const eventId = await createEventForSession(interaction.guild_id, updated);
        if (eventId) await db.updateSession(sessionId, { discord_event_id: eventId });
      } catch (err) {
        console.error('Failed to create Discord event:', err);
      }
    }
    await scheduleReminders(sessionId, newDateTimestamp);
  }

  const finalSession = await db.getSessionById(sessionId);
  await refreshAnnouncement(finalSession);

  return ephemeral({
    content: t('session_edited', { id: sessionId }),
    embeds: [await buildSessionEmbed(finalSession)],
  });
}

// ─── /register ─────────────────────────────────────────────────────

async function handleRegisterCommand(interaction) {
  switch (subcommand(interaction)) {
    case 'join': return handleJoin(interaction);
    case 'leave': return handleLeave(interaction);
    case 'my-sessions': return handleMySessions(interaction);
    default: return text(t('error_generic'));
  }
}

async function handleJoin(interaction) {
  const sessionId = option(interaction, 'id');
  const session = await db.getSessionById(sessionId);
  if (!session) return text(t('session_not_found'));
  if (session.status === 'fini' || session.status === 'cancelled') return text(t('session_already_full'));

  const userId = interaction.member.user.id;
  if (await db.getRegistration(sessionId, userId)) return text(t('already_registered'));

  const confirmedCount = await db.getConfirmedCount(sessionId);
  if (session.max_players && confirmedCount >= session.max_players) {
    const waitlistCount = await db.getWaitlistCount(sessionId);
    await db.registerPlayer(sessionId, userId, 'waitlist');
    return text(t('waitlisted', { position: waitlistCount + 1 }));
  }

  await db.registerPlayer(sessionId, userId, 'confirmed');
  await refreshAnnouncement(await db.getSessionById(sessionId));
  return text(t('registered'));
}

async function handleLeave(interaction) {
  const sessionId = option(interaction, 'id');
  const userId = interaction.member.user.id;
  const existing = await db.getRegistration(sessionId, userId);
  if (!existing) return text(t('not_registered'));

  await db.unregisterPlayer(sessionId, userId);

  if (existing.status === 'confirmed') {
    await promoteNextFromWaitlist(sessionId);
    await refreshAnnouncement(await db.getSessionById(sessionId));
  }
  return text(t('unregistered'));
}

async function handleMySessions(interaction) {
  const userId = interaction.member.user.id;
  const registrations = await db.getRegistrationsForUser(userId);

  if (registrations.length === 0) {
    return text("Vous n'êtes inscrit à aucune session.");
  }

  const lines = registrations.map(reg => {
    const icon = reg.registration_status === 'confirmed' ? '✅' : '📋';
    const date = reg.date_timestamp
      ? `<t:${reg.date_timestamp}:f>`
      : (reg.date_text || 'À définir');
    const status = reg.registration_status === 'confirmed' ? 'Confirmé' : "Liste d'attente";
    return `${icon} **#${reg.session_id}** — ${reg.system || 'Cardenveil'} — ${date} (${status})`;
  });

  return ephemeral({
    embeds: [{ color: 0x5865f2, title: '📋 Vos inscriptions', description: lines.join('\n') }],
  });
}

// ─── /mj ───────────────────────────────────────────────────────────

async function handleMjCommand(interaction) {
  if (!(await isMj(interaction))) return text(t('mj_only'));

  switch (subcommand(interaction)) {
    case 'promote': return handlePromote(interaction);
    case 'kick': return handleKick(interaction);
    case 'remind': return handleMjRemind(interaction);
    default: return text(t('error_generic'));
  }
}

async function handlePromote(interaction) {
  const sessionId = option(interaction, 'session');
  const targetId = option(interaction, 'joueur');
  const session = await db.getSessionById(sessionId);
  if (!session) return text(t('session_not_found'));

  const registration = await db.getRegistration(sessionId, targetId);
  if (!registration) return text(t('not_registered'));
  if (registration.status === 'confirmed') return text(t('player_already_confirmed'));

  await db.updateRegistrationStatus(sessionId, targetId, 'confirmed');
  await notifyPromoted(targetId);
  await refreshAnnouncement(await db.getSessionById(sessionId));

  return text(t('mj_promoted', { user: `<@${targetId}>` }));
}

async function handleKick(interaction) {
  const sessionId = option(interaction, 'session');
  const targetId = option(interaction, 'joueur');
  const session = await db.getSessionById(sessionId);
  if (!session) return text(t('session_not_found'));

  const registration = await db.getRegistration(sessionId, targetId);
  if (!registration) return text(t('not_registered'));

  const wasConfirmed = registration.status === 'confirmed';
  await db.unregisterPlayer(sessionId, targetId);

  if (wasConfirmed) {
    await promoteNextFromWaitlist(sessionId);
    await refreshAnnouncement(await db.getSessionById(sessionId));
  }

  return text(t('mj_kicked', { user: `<@${targetId}>` }));
}

// Fixed: used to read session.date (nonexistent column); now uses date_timestamp
// and stores a real unix-seconds scheduled_at so the reminder actually fires.
async function handleMjRemind(interaction) {
  const sessionId = option(interaction, 'session');
  const hours = option(interaction, 'hours');
  const session = await db.getSessionById(sessionId);
  if (!session) return text(t('session_not_found'));
  if (!session.date_timestamp) return text(t('no_date'));

  const at = session.date_timestamp - hours * 3600;
  if (at <= Math.floor(Date.now() / 1000)) return text(t('reminder_past'));

  await db.createReminder(sessionId, `custom_${hours}h`, at);
  return text(t('mj_reminder_set', { hours }));
}

// ─── Registration buttons ──────────────────────────────────────────

async function handleRegisterButton(interaction, sessionId) {
  const session = await db.getSessionById(sessionId);
  if (!session) return text(t('session_not_found'));
  if (session.status === 'fini' || session.status === 'cancelled') return text(t('session_already_full'));

  const userId = interaction.member.user.id;
  if (await db.getRegistration(sessionId, userId)) return text(t('already_registered'));

  const confirmedCount = await db.getConfirmedCount(sessionId);
  let reply;
  if (session.max_players && confirmedCount >= session.max_players) {
    const waitlistCount = await db.getWaitlistCount(sessionId);
    await db.registerPlayer(sessionId, userId, 'waitlist');
    reply = t('waitlisted', { position: waitlistCount + 1 });
  } else {
    await db.registerPlayer(sessionId, userId, 'confirmed');
    reply = t('registered');
  }

  await refreshAnnouncement(await db.getSessionById(sessionId));
  return text(reply);
}

async function handleUnregisterButton(interaction, sessionId) {
  const userId = interaction.member.user.id;
  const existing = await db.getRegistration(sessionId, userId);
  if (!existing) return text(t('not_registered'));

  await db.unregisterPlayer(sessionId, userId);

  if (existing.status === 'confirmed') {
    await promoteNextFromWaitlist(sessionId);
    await refreshAnnouncement(await db.getSessionById(sessionId));
  }
  return text(t('unregistered'));
}

// ─── Shared helpers ────────────────────────────────────────────────

async function promoteNextFromWaitlist(sessionId) {
  const next = await db.promoteFromWaitlist(sessionId);
  if (!next) return;
  try {
    await sendDm(next.user_id, { content: t('promoted') });
  } catch {
    console.warn(`Could not notify promoted user ${next.user_id}`);
  }
}

// ─── Modal component builders ──────────────────────────────────────

function row(component) {
  return { type: 1, components: [component] };
}

function textInput(customId, label, { style = 1, placeholder, required = true, value } = {}) {
  return {
    type: 4, // TEXT_INPUT (1 = short, 2 = paragraph)
    custom_id: customId,
    label,
    style,
    required,
    ...(placeholder && { placeholder }),
    ...(value != null && value !== '' && { value }),
  };
}
