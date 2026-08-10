const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'cardenveil.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_event_id TEXT,
      announcement_message_id TEXT,
      announcement_channel_id TEXT,

      mj_id TEXT NOT NULL,
      system TEXT,
      format TEXT,
      date TEXT,
      duration TEXT,
      type TEXT,
      level TEXT,
      platform TEXT,
      warnings TEXT,
      tags TEXT,
      game_type TEXT,
      max_players INTEGER,
      status TEXT DEFAULT 'recrutement',
      description TEXT,
      comments TEXT,

      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'confirmed',
      registered_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      UNIQUE(session_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      reminder_type TEXT NOT NULL,
      scheduled_at DATETIME NOT NULL,
      sent_at DATETIME,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_registrations_session ON registrations(session_id);
    CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_at, sent_at);
  `);
}

// ─── Session Queries ───────────────────────────────────────────────

function createSession(data) {
  const stmt = getDb().prepare(`
    INSERT INTO sessions (
      mj_id, system, format, date, duration, type, level, platform,
      warnings, tags, game_type, max_players, status, description, comments
    ) VALUES (
      @mj_id, @system, @format, @date, @duration, @type, @level, @platform,
      @warnings, @tags, @game_type, @max_players, @status, @description, @comments
    )
  `);
  const result = stmt.run(data);
  return getSessionById(result.lastInsertRowid);
}

function getSessionById(id) {
  return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

function getSessionByEventId(eventId) {
  return getDb().prepare('SELECT * FROM sessions WHERE discord_event_id = ?').get(eventId);
}

function getSessionByMessageId(messageId) {
  return getDb().prepare('SELECT * FROM sessions WHERE announcement_message_id = ?').get(messageId);
}

function getUpcomingSessions() {
  return getDb().prepare(`
    SELECT * FROM sessions
    WHERE status NOT IN ('fini', 'cancelled')
    ORDER BY
      CASE WHEN date IS NULL OR date = '' OR date LIKE '%définir%' OR date LIKE '%définir%' THEN 1 ELSE 0 END,
      date ASC
  `).all();
}

function getSessionsForReminders() {
  return getDb().prepare(`
    SELECT * FROM sessions
    WHERE status NOT IN ('fini', 'cancelled')
    AND date IS NOT NULL AND date != '' AND date NOT LIKE '%définir%'
  `).all();
}

function updateSession(id, data) {
  const fields = [];
  const values = {};
  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = @${key}`);
    values[key] = value;
  }
  fields.push("updated_at = datetime('now')");
  values.id = id;

  getDb().prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = @id`).run(values);
  return getSessionById(id);
}

function deleteSession(id) {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

// ─── Registration Queries ──────────────────────────────────────────

function getConfirmedCount(sessionId) {
  return getDb().prepare(
    "SELECT COUNT(*) as count FROM registrations WHERE session_id = ? AND status = 'confirmed'"
  ).get(sessionId).count;
}

function getWaitlistCount(sessionId) {
  return getDb().prepare(
    "SELECT COUNT(*) as count FROM registrations WHERE session_id = ? AND status = 'waitlist'"
  ).get(sessionId).count;
}

function getRegistration(sessionId, userId) {
  return getDb().prepare(
    'SELECT * FROM registrations WHERE session_id = ? AND user_id = ?'
  ).get(sessionId, userId);
}

function getConfirmedPlayers(sessionId) {
  return getDb().prepare(
    "SELECT * FROM registrations WHERE session_id = ? AND status = 'confirmed' ORDER BY registered_at ASC"
  ).all(sessionId);
}

function getWaitlistPlayers(sessionId) {
  return getDb().prepare(
    "SELECT * FROM registrations WHERE session_id = ? AND status = 'waitlist' ORDER BY registered_at ASC"
  ).all(sessionId);
}

function getAllPlayers(sessionId) {
  return getDb().prepare(
    'SELECT * FROM registrations WHERE session_id = ? ORDER BY status ASC, registered_at ASC'
  ).all(sessionId);
}

function registerPlayer(sessionId, userId, status = 'confirmed') {
  getDb().prepare(
    'INSERT INTO registrations (session_id, user_id, status) VALUES (?, ?, ?)'
  ).run(sessionId, userId, status);
  return getRegistration(sessionId, userId);
}

function unregisterPlayer(sessionId, userId) {
  getDb().prepare(
    'DELETE FROM registrations WHERE session_id = ? AND user_id = ?'
  ).run(sessionId, userId);
}

function promoteFromWaitlist(sessionId) {
  const next = getDb().prepare(
    "SELECT * FROM registrations WHERE session_id = ? AND status = 'waitlist' ORDER BY registered_at ASC LIMIT 1"
  ).get(sessionId);

  if (next) {
    getDb().prepare(
      "UPDATE registrations SET status = 'confirmed' WHERE id = ?"
    ).run(next.id);
  }
  return next;
}

function updateRegistrationStatus(sessionId, userId, status) {
  getDb().prepare(
    'UPDATE registrations SET status = ? WHERE session_id = ? AND user_id = ?'
  ).run(status, sessionId, userId);
}

// ─── Reminder Queries ──────────────────────────────────────────────

function createReminder(sessionId, type, scheduledAt) {
  getDb().prepare(
    'INSERT INTO reminders (session_id, reminder_type, scheduled_at) VALUES (?, ?, ?)'
  ).run(sessionId, type, scheduledAt);
}

function getPendingReminders() {
  return getDb().prepare(`
    SELECT r.*, s.* FROM reminders r
    JOIN sessions s ON r.session_id = s.id
    WHERE r.sent_at IS NULL
    AND r.scheduled_at <= datetime('now')
  `).all();
}

function markReminderSent(id) {
  getDb().prepare(
    "UPDATE reminders SET sent_at = datetime('now') WHERE id = ?"
  ).run(id);
}

function deleteRemindersForSession(sessionId) {
  getDb().prepare('DELETE FROM reminders WHERE session_id = ?').run(sessionId);
}

module.exports = {
  getDb,
  // Sessions
  createSession,
  getSessionById,
  getSessionByEventId,
  getSessionByMessageId,
  getUpcomingSessions,
  getSessionsForReminders,
  updateSession,
  deleteSession,
  // Registrations
  getConfirmedCount,
  getWaitlistCount,
  getRegistration,
  getConfirmedPlayers,
  getWaitlistPlayers,
  getAllPlayers,
  registerPlayer,
  unregisterPlayer,
  promoteFromWaitlist,
  updateRegistrationStatus,
  // Reminders
  createReminder,
  getPendingReminders,
  markReminderSent,
  deleteRemindersForSession,
};
