import config from './config.js';
import * as db from './db.js';
import {
  getGuildRoles,
  postMessage,
  editMessage,
  editOriginal,
  sendDm,
  createScheduledEvent,
  deleteScheduledEvent,
  createForumThread,
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
const MESSAGE = 4;   // immediate reply
const MODAL = 9;     // open a form

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

/**
 * Deferred response pattern: ACK instantly (Discord's 3s limit only applies
 * to the initial response), run the work via context.waitUntil, then PATCH
 * the "thinking" message into the final result via the webhook endpoint.
 * workFn returns a message payload { content?, embeds?, components? }.
 */
function deferred(context, interaction, workFn, { ephemeralAck = true } = {}) {
  const token = interaction.token;
  context.waitUntil((async () => {
    try {
      const payload = await workFn();
      await editOriginal(token, payload);
    } catch (err) {
      console.error('[Interaction] background work failed:', err);
      try { await editOriginal(token, { content: t('error_generic') }); } catch { /* token expired */ }
    }
  })());
  return ephemeralAck ? { type: 5, data: { flags: 64 } } : { type: 5 };
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

export async function handleInteraction(interaction, context) {
  if (!interaction.guild_id) return text(t('guild_only'));
  context = context ?? { waitUntil: () => {} };

  if (interaction.type === COMMAND) {
    switch (interaction.data.name) {
      case 'session': return handleSessionCommand(interaction, context);
      case 'register': return handleRegisterCommand(interaction, context);
      case 'mj': return handleMjCommand(interaction, context);
      case 'ping': return text('🏓 Pong ! Le bot est en ligne.');
    }
  }

  if (interaction.type === BUTTON) {
    const [action, sessionId] = interaction.data.custom_id.split(':');
    switch (action) {
      case 'register': return deferred(context, interaction, () => doRegister(interaction, Number(sessionId)));
      case 'unregister': return deferred(context, interaction, () => doUnregister(interaction, Number(sessionId)));
      // Setup panel: dropdowns setformat/settype/setlevel + buttons
      case 'setformat':
      case 'settype':
      case 'setlevel':
        return deferred(context, interaction, () =>
          doSetupSelect(interaction, Number(sessionId), action.slice(3), interaction.data.values?.[0]));
      case 'edit': return handleSetupEditButton(interaction, Number(sessionId));
      case 'details': return handleSetupDetailsButton(interaction, Number(sessionId));
      case 'publish': return deferred(context, interaction, () => doSetupPublish(interaction, Number(sessionId)));
      case 'finish': return deferred(context, interaction, () => ({
        content: t('setup_done'),
        embeds: [],
        components: [],
      }));
    }
  }

  if (interaction.type === MODAL_SUBMIT) {
    if (interaction.data.custom_id === 'session_create_modal') {
      return deferred(context, interaction, () => doSessionCreateModal(interaction));
    }
    if (interaction.data.custom_id.startsWith('session_edit_modal:')) {
      return deferred(context, interaction, () => doSessionEditModal(interaction));
    }
    if (interaction.data.custom_id.startsWith('session_details_modal:')) {
      return deferred(context, interaction, () => doSessionDetailsModal(interaction));
    }
  }

  return text(t('error_generic'));
}

// ─── /session ──────────────────────────────────────────────────────

function handleSessionCommand(interaction, context) {
  switch (subcommand(interaction)) {
    case 'create': return handleSessionCreate(interaction);
    case 'edit': return handleSessionEdit(interaction);
    case 'list': return deferred(context, interaction, async () => ({
      embeds: [await buildCalendarEmbed(await db.getUpcomingSessions())],
    }), { ephemeralAck: false });
    case 'info': return deferred(context, interaction, async () => {
      const session = await db.getSessionById(option(interaction, 'id'));
      if (!session) return { content: t('session_not_found') };
      return { embeds: [await buildSessionEmbed(session)] };
    }, { ephemeralAck: false });
    case 'status': return deferred(context, interaction, () => doSessionStatus(interaction));
    case 'cancel': return deferred(context, interaction, () => doSessionCancel(interaction));
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
      // Remaining fields come from the setup panel (dropdowns + details modal).
      components: [
        row(textInput('system', t('field_system'), { placeholder: 'Cardenveil Layer 1' })),
        row(textInput('date', t('field_date'), { placeholder: '2026-06-13 14:00 ou Samedi 13 Juin 2026 14:00' })),
        row(textInput('max_players', t('field_max_players'), { placeholder: '3' })),
        row(textInput('game_type', t('field_game_type'), { style: 2, placeholder: 'Boss fight / Bac à sable / Exploration...' })),
        row(textInput('description', t('field_description'), { style: 2, required: false })),
      ],
    },
  };
}

// /session edit opens the same interactive panel as create (dropdowns +
// buttons); the 5-field modal stays reachable via the ⚙️ Modifier button.
async function handleSessionEdit(interaction) {
  if (!(await isMj(interaction))) return text(t('mj_only'));
  const session = await db.getSessionById(option(interaction, 'id'));
  if (!session) return text(t('session_not_found'));

  return {
    type: MESSAGE,
    data: {
      flags: 64,
      content: t('session_setup'),
      embeds: [await buildSessionEmbed(session)],
      components: buildSetupComponents(session, { withEditButton: true }),
    },
  };
}

// ─── Session modals (background work) ──────────────────────────────

async function doSessionCreateModal(interaction) {
  const maxPlayers = parseMaxPlayers(modalValue(interaction, 'max_players'));
  if (!maxPlayers) return { content: t('error_invalid_players') };

  const dateInput = modalValue(interaction, 'date');
  const dateTimestamp = parseDateToTimestamp(dateInput);

  const session = await db.createSession({
    mj_id: interaction.member.user.id,
    system: modalValue(interaction, 'system'),
    date_timestamp: dateTimestamp,
    date_text: dateInput,
    game_type: modalValue(interaction, 'game_type'),
    description: modalValue(interaction, 'description'),
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

  // One thread per session in the orga forum = the organization discussion space.
  // The public announcement is NOT posted yet — the MJ publishes it via the
  // "Publier l'annonce" button once the discussion is done.
  if (config.forumChannelId) {
    try {
      const thread = await createForumThread(config.forumChannelId, {
        name: `🎲 #${session.id} — ${session.system || 'Cardenveil'}`,
        type: 11, // PUBLIC_THREAD
        auto_archive_duration: 10080, // 7 days of inactivity
        message: { embeds: [await buildSessionEmbed(session)] },
      });
      await db.updateSession(session.id, { forum_thread_id: thread.id });
    } catch (err) {
      console.error('Failed to create forum thread:', err);
    }
  }

  await scheduleReminders(session.id, dateTimestamp);

  const updated = await db.getSessionById(session.id);
  return {
    content: `${t('session_created')} ${t('session_setup')}`,
    embeds: [await buildSessionEmbed(updated)],
    components: buildSetupComponents(updated),
  };
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

// ─── Setup panel (post-creation wizard) ────────────────────────────
// Modals are capped at 5 inputs, so remaining fields are collected via
// dropdowns on the panel + a second "details" modal. The session row in
// the DB is the wizard state — no draft storage needed.

function selectMenu(customId, placeholder, options) {
  return {
    type: 3, // STRING_SELECT
    custom_id: customId,
    placeholder,
    min_values: 1,
    max_values: 1,
    options: options.map(o => ({ label: o, value: o })),
  };
}

function button(customId, label, style, disabled = false) {
  return { type: 2, custom_id: customId, label, style, disabled };
}

function buildSetupComponents(session, { withEditButton = false } = {}) {
  const published = !!session.announcement_message_id;
  const buttons = [];
  if (withEditButton) {
    buttons.push(button(`edit:${session.id}`, t('setup_edit_btn'), 2)); // Primary
  }
  buttons.push(
    button(`publish:${session.id}`, t('setup_publish_btn'), 3, published), // Success, disabled once published
    button(`details:${session.id}`, t('setup_details_btn'), 2),            // Primary
    button(`finish:${session.id}`, t('setup_finish_btn'), 4),              // Neutral
  );
  return [
    row(selectMenu(`setformat:${session.id}`, t('select_format'), ['One shot', 'Two shot', 'Mini shot'])),
    row(selectMenu(`settype:${session.id}`, t('select_type'), ['En ligne', 'IRL', 'Mixte'])),
    row(selectMenu(`setlevel:${session.id}`, t('select_level'), ['Débutant', 'Intermédiaire', 'Avancé'])),
    { type: 1, components: buttons },
  ];
}

async function doSetupSelect(interaction, sessionId, field, value) {
  const session = await db.getSessionById(sessionId);
  if (!session) return { content: t('session_not_found') };

  await db.updateSession(sessionId, { [field]: value || null });
  const updated = await db.getSessionById(sessionId);
  await refreshAnnouncement(updated);

  // Re-render the panel in place so the embed reflects the new value.
  return {
    content: t('session_setup'),
    embeds: [await buildSessionEmbed(updated)],
    components: buildSetupComponents(updated),
  };
}

async function handleSetupEditButton(interaction, sessionId) {
  const session = await db.getSessionById(sessionId);
  if (!session) return text(t('session_not_found'));
  return { type: MODAL, data: sessionEditModalData(session) };
}

async function handleSetupDetailsButton(interaction, sessionId) {
  const session = await db.getSessionById(sessionId);
  if (!session) return text(t('session_not_found'));

  return {
    type: MODAL,
    data: {
      custom_id: `session_details_modal:${session.id}`,
      title: `${t('session_details_title')} #${session.id}`.slice(0, 45),
      components: [
        row(textInput('duration', t('field_duration'), { required: false, value: session.duration || '', placeholder: '4h / 2 sessions / 2x 3h30' })),
        row(textInput('platform', t('field_platform'), { required: false, value: session.platform || '', placeholder: 'Owlbear / Overlay Cardenveil' })),
        row(textInput('warnings', t('field_warnings'), { required: false, value: session.warnings || '', placeholder: 'Violence, Psychologique, Torture' })),
        row(textInput('tags', t('field_tags'), { required: false, value: session.tags || '', placeholder: 'Séparés par des espaces — #Stratégique #Goofy #Epreuves' })),
        row(textInput('comments', t('field_comments'), { style: 2, required: false, value: session.comments || '' })),
      ],
    },
  };
}

async function doSetupPublish(interaction, sessionId) {
  const session = await db.getSessionById(sessionId);
  if (!session) return { content: t('session_not_found') };

  if (!session.announcement_message_id) {
    if (!config.announcementChannelId) return { content: t('error_generic') };
    try {
      const threadLink = session.forum_thread_id
        ? `https://discord.com/channels/${interaction.guild_id}/${session.forum_thread_id}`
        : null;
      const message = await postMessage(config.announcementChannelId, {
        ...(threadLink && { content: `🧵 Discussion d'organisation : ${threadLink}` }),
        embeds: [await buildSessionEmbed(session)],
        components: buildRegistrationButtons(session),
      });
      await db.updateSession(session.id, {
        announcement_message_id: message.id,
        announcement_channel_id: message.channel_id,
      });
    } catch (err) {
      console.error('Failed to publish announcement:', err);
      return { content: t('error_generic') };
    }
  }

  const updated = await db.getSessionById(sessionId);
  await refreshAnnouncement(updated);

  return {
    content: `${t('session_setup')} ${t('setup_published')}`,
    embeds: [await buildSessionEmbed(updated)],
    components: buildSetupComponents(updated),
  };
}

async function doSessionDetailsModal(interaction) {
  const sessionId = Number(interaction.data.custom_id.split(':')[1]);
  const session = await db.getSessionById(sessionId);
  if (!session) return { content: t('session_not_found') };

  await db.updateSession(sessionId, {
    duration: modalValue(interaction, 'duration'),
    platform: modalValue(interaction, 'platform'),
    warnings: modalValue(interaction, 'warnings'),
    tags: modalValue(interaction, 'tags'),
    comments: modalValue(interaction, 'comments'),
  });

  const updated = await db.getSessionById(sessionId);
  await refreshAnnouncement(updated);

  return {
    content: t('setup_updated'),
    embeds: [await buildSessionEmbed(updated)],
  };
}

// ─── Session edit modal (date/max/status/description/comments) ─────

function sessionEditModalData(session) {
  return {
    custom_id: `session_edit_modal:${session.id}`,
    title: `${t('session_edit_title')} #${session.id}`.slice(0, 45),
    components: [
      row(textInput('date', t('field_date'), { required: false, value: session.date_text || '', placeholder: 'Vide = à définir' })),
      row(textInput('max_players', t('field_max_players'), { value: String(session.max_players || ''), placeholder: '3' })),
      row(textInput('status', t('field_status'), { value: session.status || 'recrutement', placeholder: 'recrutement / en_preparation / pret / fini / cancelled' })),
      row(textInput('description', t('field_description'), { style: 2, required: false, value: session.description || '' })),
      row(textInput('comments', t('field_comments'), { style: 2, required: false, value: session.comments || '' })),
    ],
  };
}

async function doSessionEditModal(interaction) {
  const sessionId = Number(interaction.data.custom_id.split(':')[1]);
  const session = await db.getSessionById(sessionId);
  if (!session) return { content: t('session_not_found') };

  const maxPlayers = parseMaxPlayers(modalValue(interaction, 'max_players'));
  if (!maxPlayers) return { content: t('error_invalid_players') };

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

  return {
    content: t('session_edited', { id: sessionId }),
    embeds: [await buildSessionEmbed(finalSession)],
  };
}

async function doSessionStatus(interaction) {
  if (!(await isMj(interaction))) return { content: t('mj_only') };
  const session = await db.getSessionById(option(interaction, 'id'));
  if (!session) return { content: t('session_not_found') };

  const newStatus = option(interaction, 'status');
  await db.updateSession(session.id, { status: newStatus });
  const updated = await db.getSessionById(session.id);

  if (newStatus === 'cancelled' || newStatus === 'fini') {
    await closeSessionSideEffects(interaction, updated);
  }

  await refreshAnnouncement(updated);
  return { content: t('session_status_updated') };
}

async function doSessionCancel(interaction) {
  if (!(await isMj(interaction))) return { content: t('mj_only') };
  const session = await db.getSessionById(option(interaction, 'id'));
  if (!session) return { content: t('session_not_found') };

  await db.updateSession(session.id, { status: 'cancelled' });
  const updated = await db.getSessionById(session.id);

  await closeSessionSideEffects(interaction, updated);
  await refreshAnnouncement(updated);
  return { content: t('session_cancelled') };
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

// ─── /register ─────────────────────────────────────────────────────

function handleRegisterCommand(interaction, context) {
  switch (subcommand(interaction)) {
    case 'join': return deferred(context, interaction, () => doJoin(interaction));
    case 'leave': return deferred(context, interaction, () => doLeave(interaction));
    case 'my-sessions': return deferred(context, interaction, () => doMySessions(interaction));
    default: return text(t('error_generic'));
  }
}

async function doJoin(interaction) {
  const sessionId = option(interaction, 'id');
  const session = await db.getSessionById(sessionId);
  if (!session) return { content: t('session_not_found') };
  if (session.status === 'fini' || session.status === 'cancelled') return { content: t('session_already_full') };

  const userId = interaction.member.user.id;
  if (await db.getRegistration(sessionId, userId)) return { content: t('already_registered') };

  const confirmedCount = await db.getConfirmedCount(sessionId);
  if (session.max_players && confirmedCount >= session.max_players) {
    const waitlistCount = await db.getWaitlistCount(sessionId);
    await db.registerPlayer(sessionId, userId, 'waitlist');
    return { content: t('waitlisted', { position: waitlistCount + 1 }) };
  }

  await db.registerPlayer(sessionId, userId, 'confirmed');
  await refreshAnnouncement(await db.getSessionById(sessionId));
  return { content: t('registered') };
}

async function doLeave(interaction) {
  const sessionId = option(interaction, 'id');
  const userId = interaction.member.user.id;
  const existing = await db.getRegistration(sessionId, userId);
  if (!existing) return { content: t('not_registered') };

  await db.unregisterPlayer(sessionId, userId);

  if (existing.status === 'confirmed') {
    await promoteNextFromWaitlist(sessionId);
    await refreshAnnouncement(await db.getSessionById(sessionId));
  }
  return { content: t('unregistered') };
}

async function doMySessions(interaction) {
  const userId = interaction.member.user.id;
  const registrations = await db.getRegistrationsForUser(userId);

  if (registrations.length === 0) {
    return { content: "Vous n'êtes inscrit à aucune session." };
  }

  const lines = registrations.map(reg => {
    const icon = reg.registration_status === 'confirmed' ? '✅' : '📋';
    const date = reg.date_timestamp
      ? `<t:${reg.date_timestamp}:f>`
      : (reg.date_text || 'À définir');
    const status = reg.registration_status === 'confirmed' ? 'Confirmé' : "Liste d'attente";
    return `${icon} **#${reg.session_id}** — ${reg.system || 'Cardenveil'} — ${date} (${status})`;
  });

  return { embeds: [{ color: 0x5865f2, title: '📋 Vos inscriptions', description: lines.join('\n') }] };
}

// ─── /mj ───────────────────────────────────────────────────────────

function handleMjCommand(interaction, context) {
  return deferred(context, interaction, async () => {
    if (!(await isMj(interaction))) return { content: t('mj_only') };

    switch (subcommand(interaction)) {
      case 'promote': return doPromote(interaction);
      case 'kick': return doKick(interaction);
      case 'remind': return doMjRemind(interaction);
      default: return { content: t('error_generic') };
    }
  });
}

async function doPromote(interaction) {
  const sessionId = option(interaction, 'session');
  const targetId = option(interaction, 'joueur');
  const session = await db.getSessionById(sessionId);
  if (!session) return { content: t('session_not_found') };

  const registration = await db.getRegistration(sessionId, targetId);
  if (!registration) return { content: t('not_registered') };
  if (registration.status === 'confirmed') return { content: t('player_already_confirmed') };

  await db.updateRegistrationStatus(sessionId, targetId, 'confirmed');
  await notifyPromoted(targetId);
  await refreshAnnouncement(await db.getSessionById(sessionId));

  return { content: t('mj_promoted', { user: `<@${targetId}>` }) };
}

async function doKick(interaction) {
  const sessionId = option(interaction, 'session');
  const targetId = option(interaction, 'joueur');
  const session = await db.getSessionById(sessionId);
  if (!session) return { content: t('session_not_found') };

  const registration = await db.getRegistration(sessionId, targetId);
  if (!registration) return { content: t('not_registered') };

  const wasConfirmed = registration.status === 'confirmed';
  await db.unregisterPlayer(sessionId, targetId);

  if (wasConfirmed) {
    await promoteNextFromWaitlist(sessionId);
    await refreshAnnouncement(await db.getSessionById(sessionId));
  }

  return { content: t('mj_kicked', { user: `<@${targetId}>` }) };
}

// Uses date_timestamp (the old session.date column never existed) and stores
// a real unix-seconds scheduled_at so the reminder actually fires.
async function doMjRemind(interaction) {
  const sessionId = option(interaction, 'session');
  const hours = option(interaction, 'hours');
  const session = await db.getSessionById(sessionId);
  if (!session) return { content: t('session_not_found') };
  if (!session.date_timestamp) return { content: t('no_date') };

  const at = session.date_timestamp - hours * 3600;
  if (at <= Math.floor(Date.now() / 1000)) return { content: t('reminder_past') };

  await db.createReminder(session.id, `custom_${hours}h`, at);
  return { content: t('mj_reminder_set', { hours }) };
}

// ─── Registration buttons ──────────────────────────────────────────

async function doRegister(interaction, sessionId) {
  const session = await db.getSessionById(sessionId);
  if (!session) return { content: t('session_not_found') };
  if (session.status === 'fini' || session.status === 'cancelled') return { content: t('session_already_full') };

  const userId = interaction.member.user.id;
  if (await db.getRegistration(sessionId, userId)) return { content: t('already_registered') };

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
  return { content: reply };
}

async function doUnregister(interaction, sessionId) {
  const userId = interaction.member.user.id;
  const existing = await db.getRegistration(sessionId, userId);
  if (!existing) return { content: t('not_registered') };

  await db.unregisterPlayer(sessionId, userId);

  if (existing.status === 'confirmed') {
    await promoteNextFromWaitlist(sessionId);
    await refreshAnnouncement(await db.getSessionById(sessionId));
  }
  return { content: t('unregistered') };
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

async function notifyPromoted(userId) {
  try {
    await sendDm(userId, { content: t('promoted') });
  } catch {
    console.warn(`Could not notify promoted user ${userId}`);
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
    // Discord rejects modals whose labels exceed 45 chars (50035)
    label: label.slice(0, 45),
    style,
    required,
    ...(placeholder && { placeholder }),
    ...(value != null && value !== '' && { value }),
  };
}
