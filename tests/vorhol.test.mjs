import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHours, fmtHours, fmtHM, vorholBalance } from '../js/vorhol.js';

test('Stunden-Eingabe', () => {
  assert.equal(parseHours('0.25'), 0.25);
  assert.equal(parseHours('1,5'), 1.5);
  assert.equal(parseHours('-0,75'), -0.75);
  assert.equal(parseHours('1:30'), 1.5);
  assert.equal(parseHours('0:15'), 0.25);
  assert.equal(parseHours('.5'), 0.5);
  assert.equal(parseHours(''), null);
  assert.equal(parseHours('abc'), null);
  assert.equal(parseHours('1:75'), null);
});

test('Anzeige in Industriestunden und Minuten', () => {
  assert.equal(fmtHours(11.65), '+11.65');
  assert.equal(fmtHours(-3.5), '−3.50');
  assert.equal(fmtHours(0), '0.00');
  assert.equal(fmtHM(0.25), '15 Min');
  assert.equal(fmtHM(0.5), '30 Min');
  assert.equal(fmtHM(11.65), '11 Std 39 Min');
  assert.equal(fmtHM(-8), '8 Std');
});

test('Saldo wie im Firmen-System: Stand + Einträge danach, Geplant separat', () => {
  const v = {
    start: 11.65,
    startDate: '2026-09-27',
    entries: { '2026-09-26': 2, '2026-09-28': 0.25, '2026-09-29': 0.5, '2026-10-09': -8 },
  };
  assert.deepEqual(vorholBalance(v, '2026-09-29'), { start: 11.65, done: 0.75, current: 12.4, planned: -8, available: 4.4 });
  assert.equal(vorholBalance({ start: 0, startDate: '', entries: { '2026-01-02': -1.25 } }, '2026-09-29').available, -1.25);
});
