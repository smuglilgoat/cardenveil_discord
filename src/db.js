import postgres from 'postgres';
import config from './config.js';

let sql;

function getSql() {
  if (!sql) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is missing in environment');
    }
    // ponytail: max:1 + prepare:false — safe against Supabase transaction pooler (pgbouncer)
    sql = postgres(config.databaseUrl, { prepare: false, max: 1 });
  }
  return sql;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

const nullify = (data) =>
  Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? null]));

// ─── Session Queries ───────────────────────────────────────────────

export async function createSession(data) {
  // All 16 columns must exist and be non-undefined — callers may omit optional fields.
  const d = {
    mj_id: null,
    system: null,
    format: null,
    date_timestamp: null,
    date_text: null,
    duration: null,
    type: null,
    level: null,
    platform: null,
    warnings: null,
    tags: null,
    game_type: null,
    max_players: null,
    status: 'recrutement',
    description: null,
    comments: null,
    ...nullify(data),
  };
  const rows = await getSql()`
    insert into sessions (
      mj_id, system, format, date_timestamp, date_text, duration, type, level,
      platform, warnings, tags, game_type, max_players, status, description, comments
    ) values (
      ${d.mj_id}, ${d.system}, ${d.format}, ${d.date_timestamp}, ${d.date_text},
      ${d.duration}, ${d.type}, ${d.level}, ${d.platform}, ${d.warnings},
      ${d.tags}, ${d.game_type}, ${d.max_players}, ${d.status}, ${d.description}, ${d.comments}
    )
    returning *
  `;
  return rows[0];
}

export async function getSessionById(id) {
  const rows = await getSql()`select * from sessions where id = ${id}`;
  return rows[0] ?? null;
}

export async function getUpcomingSessions() {
  return getSql()`
    select * from sessions
    where status not in ('fini', 'cancelled')
    order by date_timestamp asc nulls last
  `;
}

export async function updateSession(id, data) {
  const updates = nullify(data);
  if (Object.keys(updates).length === 0) return getSessionById(id);
  updates.updated_at = new Date();
  // postgres.js object builder after 'set' → safe `col = $n` assignments
  const rows = await getSql()`
    update sessions set ${getSql()(updates)}
    where id = ${id}
    returning *
  `;
  return rows[0] ?? null;
}

export async function deleteSession(id) {
  await getSql()`delete from sessions where id = ${id}`;
}

// ─── Registration Queries ──────────────────────────────────────────

export async function getConfirmedCount(sessionId) {
  const rows = await getSql()`
    select count(*)::int as count from registrations
    where session_id = ${sessionId} and status = 'confirmed'
  `;
  return rows[0].count;
}

export async function getWaitlistCount(sessionId) {
  const rows = await getSql()`
    select count(*)::int as count from registrations
    where session_id = ${sessionId} and status = 'waitlist'
  `;
  return rows[0].count;
}

export async function getRegistration(sessionId, userId) {
  const rows = await getSql()`
    select * from registrations where session_id = ${sessionId} and user_id = ${userId}
  `;
  return rows[0] ?? null;
}

export async function getConfirmedPlayers(sessionId) {
  return getSql()`
    select * from registrations
    where session_id = ${sessionId} and status = 'confirmed'
    order by registered_at asc
  `;
}

export async function getWaitlistPlayers(sessionId) {
  return getSql()`
    select * from registrations
    where session_id = ${sessionId} and status = 'waitlist'
    order by registered_at asc
  `;
}

export async function getRegistrationsForUser(userId) {
  return getSql()`
    select r.status as registration_status, s.id as session_id, s.system, s.format,
           s.date_timestamp, s.date_text
    from registrations r
    join sessions s on s.id = r.session_id
    where r.user_id = ${userId}
    order by s.date_timestamp asc nulls last
  `;
}

export async function registerPlayer(sessionId, userId, status = 'confirmed') {
  await getSql()`
    insert into registrations (session_id, user_id, status)
    values (${sessionId}, ${userId}, ${status})
    on conflict (session_id, user_id) do nothing
  `;
  return getRegistration(sessionId, userId);
}

export async function unregisterPlayer(sessionId, userId) {
  await getSql()`
    delete from registrations where session_id = ${sessionId} and user_id = ${userId}
  `;
}

export async function promoteFromWaitlist(sessionId) {
  const rows = await getSql()`
    update registrations set status = 'confirmed'
    where id = (
      select id from registrations
      where session_id = ${sessionId} and status = 'waitlist'
      order by registered_at asc
      limit 1
      for update skip locked
    )
    returning *
  `;
  return rows[0] ?? null;
}

export async function updateRegistrationStatus(sessionId, userId, status) {
  await getSql()`
    update registrations set status = ${status}
    where session_id = ${sessionId} and user_id = ${userId}
  `;
}

// ─── Reminder Queries ──────────────────────────────────────────────

export async function createReminder(sessionId, type, scheduledAt) {
  await getSql()`
    insert into reminders (session_id, reminder_type, scheduled_at)
    values (${sessionId}, ${type}, ${scheduledAt})
  `;
}

export async function getPendingReminders() {
  // Explicit columns: select * would collide on id across the join.
  return getSql()`
    select r.id as reminder_id, r.session_id, r.reminder_type,
           s.system, s.format, s.announcement_channel_id
    from reminders r
    join sessions s on s.id = r.session_id
    where r.sent_at is null
      and r.scheduled_at <= ${nowSeconds()}
      and s.status not in ('fini', 'cancelled')
  `;
}

export async function markReminderSent(id) {
  await getSql()`update reminders set sent_at = ${nowSeconds()} where id = ${id}`;
}

export async function deleteRemindersForSession(sessionId) {
  await getSql()`delete from reminders where session_id = ${sessionId}`;
}
