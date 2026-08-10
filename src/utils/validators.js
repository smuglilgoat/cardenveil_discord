/**
 * Parse a date string into a Unix timestamp (seconds since epoch).
 * Supports various formats including French dates and ISO format.
 * Returns null if the date is invalid or "à définir".
 */
function parseDateToTimestamp(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const lower = dateStr.toLowerCase().trim();
  
  // Check for "à définir" or similar
  if (lower.includes('définir') || lower.includes('definir') || lower === 'à définir' || lower === 'a definir') {
    return null;
  }
  
  // Try various parsing methods
  let date = null;
  
  // Try ISO format first: 2024-06-13 14:00 or 2024-06-13T14:00:00
  date = tryParseISO(dateStr);
  
  // Try French format: Samedi 13 Juin 2024 14:00
  if (!date) {
    date = tryParseFrench(dateStr);
  }
  
  // Try European format: 13/06/2024 14:00
  if (!date) {
    date = tryParseEuropean(dateStr);
  }
  
  // Try US format: 06/13/2024 14:00
  if (!date) {
    date = tryParseUS(dateStr);
  }
  
  if (!date || isNaN(date.getTime())) {
    return null;
  }
  
  // Convert to Unix timestamp (seconds)
  return Math.floor(date.getTime() / 1000);
}

function tryParseISO(dateStr) {
  // Match: 2024-06-13 14:00 or 2024-06-13T14:00:00
  const isoRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/;
  const match = dateStr.match(isoRegex);
  
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second || 0)
    );
  }
  
  return null;
}

function tryParseFrench(dateStr) {
  // Match: Samedi 13 Juin 2024 14:00 or 13 Juin 2024 14:00
  const months = {
    'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
    'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
    'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
  };
  
  const frenchRegex = /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s*(\d{4})?\s*(\d{1,2}):(\d{2})?/i;
  const match = dateStr.match(frenchRegex);
  
  if (match) {
    const [, day, monthName, year, hour, minute] = match;
    const month = months[monthName.toLowerCase()];
    const fullYear = year ? parseInt(year) : new Date().getFullYear();
    
    return new Date(
      fullYear,
      month,
      parseInt(day),
      parseInt(hour || 0),
      parseInt(minute || 0)
    );
  }
  
  return null;
}

function tryParseEuropean(dateStr) {
  // Match: 13/06/2024 14:00 or 13-06-2024 14:00
  const euroRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(\d{1,2}):(\d{2})?/;
  const match = dateStr.match(euroRegex);
  
  if (match) {
    const [, day, month, year, hour, minute] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour || 0),
      parseInt(minute || 0)
    );
  }
  
  return null;
}

function tryParseUS(dateStr) {
  // Match: 06/13/2024 14:00 (month first)
  const usRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(\d{1,2}):(\d{2})?/;
  const match = dateStr.match(usRegex);
  
  if (match) {
    const [, month, day, year, hour, minute] = match;
    // Only use this if month <= 12 and day > 12 (to distinguish from European)
    if (parseInt(month) <= 12 && parseInt(day) > 12) {
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour || 0),
        parseInt(minute || 0)
      );
    }
  }
  
  return null;
}

/**
 * Check if a Unix timestamp represents a valid future date.
 */
function isValidFutureTimestamp(timestamp) {
  if (!timestamp) return false;
  const now = Math.floor(Date.now() / 1000);
  return timestamp > now;
}

/**
 * Convert Unix timestamp to Discord timestamp format.
 * @param {number} timestamp - Unix timestamp in seconds
 * @param {string} style - Discord timestamp style (t, T, d, D, f, F, R)
 * @returns {string} Discord timestamp string
 */
function formatDiscordTimestamp(timestamp, style = 'f') {
  if (!timestamp) return 'À définir';
  return `<t:${timestamp}:${style}>`;
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
  parseDateToTimestamp,
  isValidFutureTimestamp,
  formatDiscordTimestamp,
  parseMaxPlayers,
  parseTags,
  extractUserId,
  normalizeStatus,
};
