import test from 'node:test';
import assert from 'node:assert/strict';
import { isoWeek, mondayOf, weekday, addDays } from '../js/dates.js';
import { easter, bussUndBettag, publicHolidays, loadSchoolHolidays, STATES } from '../js/holidays.js';
import { planShift, shiftOn, addPlan, buildOrder } from '../js/shifts.js';

test('Ostersonntag', () => {
  assert.equal(easter(2024), '2024-03-31');
  assert.equal(easter(2025), '2025-04-20');
  assert.equal(easter(2026), '2026-04-05');
  assert.equal(easter(2027), '2027-03-28');
});

test('Buß- und Bettag', () => {
  assert.equal(bussUndBettag(2025), '2025-11-19');
  assert.equal(bussUndBettag(2026), '2026-11-18');
  assert.equal(bussUndBettag(2028), '2028-11-22');
});

test('Feiertage Hessen 2026', () => {
  const names = publicHolidays(2026, 'HE').map((h) => `${h.date} ${h.name}`);
  assert.deepEqual(names, [
    '2026-01-01 Neujahr', '2026-04-03 Karfreitag', '2026-04-06 Ostermontag', '2026-05-01 Tag der Arbeit',
    '2026-05-14 Christi Himmelfahrt', '2026-05-25 Pfingstmontag', '2026-06-04 Fronleichnam',
    '2026-10-03 Tag der Deutschen Einheit', '2026-12-25 1. Weihnachtstag', '2026-12-26 2. Weihnachtstag',
  ]);
});

test('Landesspezifische Feiertage', () => {
  const has = (st, name) => publicHolidays(2026, st).some((h) => h.name === name && !h.partial);
  assert.ok(has('BY', 'Heilige Drei Könige'));
  assert.ok(has('BE', 'Internationaler Frauentag'));
  assert.ok(has('MV', 'Internationaler Frauentag'));
  assert.ok(has('TH', 'Weltkindertag'));
  assert.ok(has('SN', 'Buß- und Bettag'));
  assert.ok(has('NI', 'Reformationstag'));
  assert.ok(has('NW', 'Allerheiligen'));
  assert.ok(has('SL', 'Mariä Himmelfahrt'));
  assert.ok(has('BB', 'Ostersonntag'));
  assert.ok(!has('HE', 'Reformationstag'));
  assert.ok(!has('NI', 'Fronleichnam'));
  assert.equal(STATES.length, 16);
  for (const s of STATES) assert.ok(publicHolidays(2026, s.code).length >= 9, s.code);
});

test('Kalenderwoche', () => {
  assert.equal(isoWeek('2026-09-28').week, 40);
  assert.equal(isoWeek('2026-12-31').week, 53);
  assert.equal(isoWeek('2027-01-04').week, 1);
  assert.equal(mondayOf('2026-10-04'), '2026-09-28');
  assert.equal(weekday('2026-09-28'), 0);
});

test('2 Schichten wöchentlich bis Jahresende', () => {
  const plan = { order: ['F', 'S'], start: '2026-09-28', startIndex: 0, weeksPer: 1, workdays: [0, 1, 2, 3, 4], end: '2026-12-31' };
  assert.equal(planShift(plan, '2026-09-28'), 'F');
  assert.equal(planShift(plan, '2026-10-02'), 'F');
  assert.equal(planShift(plan, '2026-10-03'), null); // Samstag
  assert.equal(planShift(plan, '2026-10-05'), 'S');
  assert.equal(planShift(plan, '2026-10-12'), 'F');
  assert.equal(planShift(plan, '2026-12-31'), 'S'); // KW 53
  assert.equal(planShift(plan, '2027-01-04'), null);
  assert.equal(planShift(plan, '2026-09-25'), null);
});

test('3 Schichten, alle 2 Wochen, über Zeitumstellung', () => {
  const plan = { order: buildOrder(3), start: '2026-10-19', startIndex: 1, weeksPer: 2, workdays: [0, 1, 2, 3, 4, 5, 6], end: '2027-12-31' };
  const at = (w) => planShift(plan, addDays('2026-10-19', w * 7));
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(at), ['S', 'S', 'N', 'N', 'F', 'F', 'S']);
  assert.equal(planShift(plan, '2026-10-25'), 'S'); // Sonntag der Zeitumstellung
});

test('Neuer Abschnitt ersetzt ab Startwoche, manuelle Einträge haben Vorrang', () => {
  const a = { order: ['F', 'S'], start: '2026-01-05', startIndex: 0, weeksPer: 1, workdays: [0, 1, 2, 3, 4], end: '2026-12-31' };
  const b = { ...a, start: '2026-06-01', startIndex: 1 };
  const data = { plans: addPlan([a], b), overrides: { '2026-06-02': 'U' } };
  assert.equal(shiftOn(data, '2026-01-05'), 'F');
  assert.equal(shiftOn(data, '2026-06-01'), 'S');
  assert.equal(shiftOn(data, '2026-06-02'), 'U');
  assert.equal(addPlan(data.plans, { ...a, start: '2026-03-02' }).length, 2);
});

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
}

test('Ferien laden: OpenHolidays, Ausweichquelle und Cache', async () => {
  const oh = [{ startDate: '2026-03-30', endDate: '2026-04-10', name: [{ language: 'DE', text: 'Osterferien' }] },
    { startDate: '2026-12-21', endDate: '2027-01-09', name: [{ language: 'DE', text: 'Weihnachtsferien' }] }];
  const storage = memStorage();
  const ok = async () => ({ ok: true, json: async () => oh });
  const r = await loadSchoolHolidays(2026, 'HE', { fetchImpl: ok, storage });
  assert.deepEqual(r.items.map((h) => h.name), ['Osterferien', 'Weihnachtsferien']);

  const fail = async () => { throw new Error('offline'); };
  const cached = await loadSchoolHolidays(2026, 'HE', { fetchImpl: fail, storage });
  assert.equal(cached.items.length, 2);

  let calls = 0;
  const fallback = async (url) => {
    calls++;
    if (url.includes('openholidays')) return { ok: false, status: 500 };
    return { ok: true, json: async () => [{ start: '2026-07-06T00:00Z', end: '2026-08-14T00:00Z', name: 'sommerferien' }] };
  };
  const f = await loadSchoolHolidays(2026, 'BY', { fetchImpl: fallback, storage: memStorage() });
  assert.equal(calls, 2);
  assert.deepEqual(f.items, [{ name: 'Sommerferien', start: '2026-07-06', end: '2026-08-14' }]);

  await assert.rejects(loadSchoolHolidays(2026, 'NI', { fetchImpl: fail, storage: memStorage() }));
});

test('Urlaub: nur Arbeitstage ohne Feiertage, manueller Eintrag hat Vorrang', async () => {
  const { isWorkday } = await import('../js/shifts.js');
  const plan = { order: ['F', 'S'], start: '2026-09-28', startIndex: 0, weeksPer: 1, workdays: [0, 1, 2, 3, 4], end: '2026-12-31' };
  const data = { plans: [plan], overrides: { '2026-10-07': 'K' }, vacations: [{ id: 'a', start: '2026-10-01', end: '2026-10-09' }], setup: { workdays: [0, 1, 2, 3, 4] } };
  const hol = (s) => s === '2026-10-03';
  const codes = [];
  for (let d = '2026-10-01'; d <= '2026-10-09'; d = addDays(d, 1)) codes.push(shiftOn(data, d, hol));
  // Do Fr Sa So Mo Di Mi(Krank) Do Fr
  assert.deepEqual(codes, ['U', 'U', null, null, 'U', 'U', 'K', 'U', 'U']);
  assert.equal(shiftOn(data, '2026-10-12', hol), 'F');
  assert.equal(isWorkday(data, '2026-10-03', hol), false);
  // Ohne Plan zählen die gewählten Wochentage
  assert.equal(isWorkday({ plans: [], setup: { workdays: [0, 1, 2, 3, 4, 5] } }, '2026-10-10'), true);
});
