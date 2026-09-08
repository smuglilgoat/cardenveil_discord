import config from './config.js';

/**
 * Create a Date for wall-clock time in config.timezone.
 * Netlify runs UTC; MJs type Paris wall-clock times, so we apply the
 * timezone offset (including DST) before converting to a timestamp.
 */
function zonedDate(year, month, day, hour, minute) {
  const guess = Date.UTC(year, month, day, hour, minute, 0);
  const offsetMs = timezoneOffsetMs(config.timezone, new Date(guess));
  return new Date(guess - offsetMs);
}

function timezoneOffsetMs(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second,
  );
  return asUTC - date.getTime();
}

/**
 * Parse a date string into a Unix timestamp (seconds since epoch).
 * Supports ISO, French, European and US formats.
 * Returns null if the date is invalid or "à définir".
 */
export function parseDateToTimestamp(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;

  const lower = dateStr.toLowerCase().trim();
  if (lower.includes('définir') || lower.includes('definir')) return null;

  let date =
    tryParseISO(dateStr) ||
    tryParseFrench(dateStr) ||
    tryParseEuropean(dateStr) ||
    tryParseUS(dateStr);

  if (!date || isNaN(date.getTime())) return null;

  return Math.floor(date.getTime() / 1000);
}

function tryParseISO(dateStr) {
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, y, m, d, h, min, s] = match;
  return zonedDate(+y, +m - 1, +d, +h, +min, +s || 0);
}

function tryParseFrench(dateStr) {
  const match = dateStr.match(
    /(\d{1,2})\s+(\w+)\s*(\d{4})?\s*(\d{1,2})?:?(\d{2})?/i,
  );
  if (!match) return null;
  const [, day, monthName, year, hour, minute] = match;
  const month = FRENCH_MONTHS[stripAccents(monthName).toLowerCase()];
  if (month === undefined) return null;
  return zonedDate(
    year ? +year : new Date().getFullYear(),
    month,
    +day,
    +(hour || 0),
    +(minute || 0),
  );
}

function tryParseEuropean(dateStr) {
  const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(\d{1,2}):?(\d{2})?/);
  if (!match) return null;
  const [, d, m, y, h, min] = match;
  if (+m < 1 || +m > 12) return null;
  return zonedDate(+y, +m - 1, +d, +h || 0, +min || 0);
}

function tryParseUS(dateStr) {
  const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(\d{1,2}):?(\d{2})?/);
  if (!match) return null;
  const [, m, d, y, h, min] = match;
  // Only unambiguous US dates: month <= 12 and day > 12
  if (!(+m <= 12 && +d > 12)) return null;
  return zonedDate(+y, +m - 1, +d, +h || 0, +min || 0);
}

const FRENCH_MONTHS = {
  janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11,
};

function stripAccents(str) {
  return str.normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * Check if a Unix timestamp represents a valid future date.
 */
export function isValidFutureTimestamp(timestamp) {
  if (!timestamp) return false;
  return timestamp > Math.floor(Date.now() / 1000);
}

/**
 * Unix timestamp -> Discord timestamp markup.
 */
export function formatDiscordTimestamp(timestamp, style = 'f') {
  if (!timestamp) return 'À définir';
  return `<t:${timestamp}:${style}>`;
}

export function parseMaxPlayers(value) {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1 || num > 20) return null;
  return num;
}

export function extractUserId(mention) {
  if (!mention) return null;
  const match = mention.match(/<@!?(\d+)>/) || mention.match(/^(\d+)$/);
  return match ? match[1] : null;
}

const STATUS_MAP = {
  recrutement: 'recrutement',
  'en préparation': 'en_preparation',
  en_preparation: 'en_preparation',
  prêt: 'pret',
  pret: 'pret',
  fini: 'fini',
  cancelled: 'cancelled',
  annulé: 'cancelled',
  annule: 'cancelled',
};

export function normalizeStatus(status) {
  if (!status) return 'recrutement';
  return STATUS_MAP[status.toLowerCase().trim()] || 'recrutement';
}
