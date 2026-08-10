/**
 * Parse a date string into a Discord timestamp or ISO string.
 * Supports French date formats and "à définir" / "a definir" as null.
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const lower = dateStr.toLowerCase().trim();
  if (lower.includes('définir') || lower.includes('definir') || lower === 'à définir' || lower === 'a definir') {
    return null;
  }
  return dateStr.trim();
}

/**
 * Check if a date string is a valid future date (for Discord event creation).
 */
function isValidFutureDate(dateStr) {
  if (!dateStr) return false;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return false;
  return parsed > new Date();
}

/**
 * Parse a max players string into an integer.
 */
function parseMaxPlayers(value) {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1 || num > 20) return null;
  return num;
}

/**
 * Parse tags string into an array.
 */
function parseTags(tagsStr) {
  if (!tagsStr || tagsStr.trim() === '') return [];
  return tagsStr
    .split(/\s+/)
    .filter(Boolean)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
}

/**
 * Extract Discord user ID from a mention string.
 * Handles <@123456789>, <@!123456789>, or raw ID.
 */
function extractUserId(mention) {
  if (!mention) return null;
  const match = mention.match(/<@!?(\d+)>/) || mention.match(/^(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Status mapping for internal use.
 */
const STATUS_MAP = {
  recrutement: 'recrutement',
  'en préparation': 'en_preparation',
  'en_preparation': 'en_preparation',
  prêt: 'pret',
  pret: 'pret',
  fini: 'fini',
  cancelled: 'cancelled',
  annulé: 'cancelled',
  annule: 'cancelled',
};

function normalizeStatus(status) {
  if (!status) return 'recrutement';
  const key = status.toLowerCase().trim();
  return STATUS_MAP[key] || 'recrutement';
}

module.exports = {
  parseDate,
  isValidFutureDate,
  parseMaxPlayers,
  parseTags,
  extractUserId,
  normalizeStatus,
};
