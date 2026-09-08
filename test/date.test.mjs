import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.TIMEZONE = 'Europe/Paris';
const { parseDateToTimestamp } = await import('../src/validators.js');

test('ISO date is parsed in Europe/Paris (summer = UTC+2)', () => {
  // 2026-06-13 14:00 Paris = 12:00 UTC
  assert.equal(parseDateToTimestamp('2026-06-13 14:00'), Math.floor(Date.UTC(2026, 5, 13, 12, 0) / 1000));
});

test('ISO date is parsed in Europe/Paris (winter = UTC+1)', () => {
  // 2026-01-15 14:00 Paris = 13:00 UTC
  assert.equal(parseDateToTimestamp('2026-01-15 14:00'), Math.floor(Date.UTC(2026, 0, 15, 13, 0) / 1000));
});

test('French date with weekday, accented month, and optional year', () => {
  assert.equal(parseDateToTimestamp('Samedi 13 Juin 2026 14:00'), Math.floor(Date.UTC(2026, 5, 13, 12, 0) / 1000));
  assert.equal(parseDateToTimestamp('13 aout 2026 20:30'), Math.floor(Date.UTC(2026, 7, 13, 18, 30) / 1000));
});

test('European format dd/mm/yyyy', () => {
  assert.equal(parseDateToTimestamp('13/06/2026 14:00'), Math.floor(Date.UTC(2026, 5, 13, 12, 0) / 1000));
});

test('US format only when unambiguous (month <= 12, day > 12)', () => {
  // 06/20/2026 = June 20 (US parse wins because day > 12)
  assert.equal(parseDateToTimestamp('06/20/2026 14:00'), Math.floor(Date.UTC(2026, 5, 20, 12, 0) / 1000));
  // 13/06/2026 falls through to European parse
  assert.equal(parseDateToTimestamp('13/06/2026 14:00'), Math.floor(Date.UTC(2026, 5, 13, 12, 0) / 1000));
});

test('"à définir", empty and garbage return null', () => {
  assert.equal(parseDateToTimestamp('à définir'), null);
  assert.equal(parseDateToTimestamp('A DEFINIR'), null);
  assert.equal(parseDateToTimestamp(''), null);
  assert.equal(parseDateToTimestamp('pas une date'), null);
});
