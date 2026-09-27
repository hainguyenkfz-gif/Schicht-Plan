import { iso, addDays, weekday } from './dates.js';

export const STATES = [
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hessen' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thüringen' },
];

export const stateName = (code) => (STATES.find((s) => s.code === code) || {}).name || code;

// Ostersonntag nach der Gaußschen Osterformel (gregorianisch)
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(y, month, day);
}

// Buß- und Bettag: Mittwoch vor dem 23. November
export function bussUndBettag(y) {
  const n22 = iso(y, 11, 22);
  return addDays(n22, -((weekday(n22) - 2 + 7) % 7));
}

// Gesetzliche Feiertage eines Bundeslandes.
// partial: true = gilt nur in einem Teil des Landes.
export function publicHolidays(year, st) {
  const E = easter(year);
  const list = [];
  const add = (date, name, states, note) => {
    if (states && !states.includes(st)) return;
    list.push(note ? { date, name, note, partial: true } : { date, name });
  };

  add(iso(year, 1, 1), 'Neujahr');
  add(iso(year, 1, 6), 'Heilige Drei Könige', ['BW', 'BY', 'ST']);
  if (year >= 2019) add(iso(year, 3, 8), 'Internationaler Frauentag', year >= 2023 ? ['BE', 'MV'] : ['BE']);
  add(addDays(E, -2), 'Karfreitag');
  add(E, 'Ostersonntag', ['BB']);
  add(addDays(E, 1), 'Ostermontag');
  add(iso(year, 5, 1), 'Tag der Arbeit');
  if (year === 2020 || year === 2025) add(iso(year, 5, 8), 'Tag der Befreiung', ['BE']);
  add(addDays(E, 39), 'Christi Himmelfahrt');
  add(addDays(E, 49), 'Pfingstsonntag', ['BB']);
  add(addDays(E, 50), 'Pfingstmontag');
  add(addDays(E, 60), 'Fronleichnam', ['BW', 'BY', 'HE', 'NW', 'RP', 'SL']);
  add(addDays(E, 60), 'Fronleichnam', ['SN', 'TH'], 'nur in einigen Gemeinden');
  add(iso(year, 8, 8), 'Augsburger Friedensfest', ['BY'], 'nur in Augsburg');
  add(iso(year, 8, 15), 'Mariä Himmelfahrt', ['SL']);
  add(iso(year, 8, 15), 'Mariä Himmelfahrt', ['BY'], 'nur in überwiegend katholischen Gemeinden');
  if (year >= 2019) add(iso(year, 9, 20), 'Weltkindertag', ['TH']);
  add(iso(year, 10, 3), 'Tag der Deutschen Einheit');
  add(iso(year, 10, 31), 'Reformationstag',
    year >= 2018 ? ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'] : ['BB', 'MV', 'SN', 'ST', 'TH']);
  add(iso(year, 11, 1), 'Allerheiligen', ['BW', 'BY', 'NW', 'RP', 'SL']);
  add(bussUndBettag(year), 'Buß- und Bettag', ['SN']);
  add(iso(year, 12, 25), '1. Weihnachtstag');
  add(iso(year, 12, 26), '2. Weihnachtstag');

  return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// ---------- Schulferien (werden online geladen und lokal gespeichert) ----------

const CACHE_DAYS = 30;

const SOURCES = [
  {
    url: (y, st) => `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-${st}` +
      `&languageIsoCode=DE&validFrom=${y}-01-01&validTo=${y}-12-31`,
    parse: (arr) => arr.map((h) => ({
      name: ((h.name || []).find((n) => n.language === 'DE') || (h.name || [])[0] || {}).text || 'Ferien',
      start: h.startDate,
      end: h.endDate,
    })),
  },
  {
    url: (y, st) => `https://ferien-api.de/api/v1/holidays/${st}/${y}`,
    parse: (arr) => arr.map((h) => ({
      name: String(h.name || 'Ferien').replace(/\b\p{L}/gu, (c) => c.toUpperCase()),
      start: String(h.start).slice(0, 10),
      end: String(h.end).slice(0, 10),
    })),
  },
];

export function normalizeFerien(items, year) {
  const seen = new Set();
  return items
    .filter((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.start) && /^\d{4}-\d{2}-\d{2}$/.test(h.end))
    .filter((h) => h.end >= `${year}-01-01` && h.start <= `${year}-12-31`)
    .filter((h) => {
      const k = `${h.start}|${h.end}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.start < b.start ? -1 : 1));
}

async function fetchJSON(url, fetchImpl) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: ctrl && ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Liefert { items, stale } – stale = true, wenn nur alte Daten aus dem Speicher da sind.
export async function loadSchoolHolidays(year, st, { fetchImpl = fetch, storage = null } = {}) {
  const key = `ferien:v1:${st}:${year}`;
  let cached = null;
  try { cached = storage && JSON.parse(storage.getItem(key)); } catch { cached = null; }
  if (cached && Date.now() - cached.ts < CACHE_DAYS * 864e5) return { items: cached.items, stale: false };

  for (const src of SOURCES) {
    try {
      const data = await fetchJSON(src.url(year, st), fetchImpl);
      if (!Array.isArray(data)) continue;
      const items = normalizeFerien(src.parse(data), year);
      if (!items.length) continue;
      try { storage && storage.setItem(key, JSON.stringify({ ts: Date.now(), items })); } catch { /* voll */ }
      return { items, stale: false };
    } catch { /* nächste Quelle versuchen */ }
  }
  if (cached) return { items: cached.items, stale: true };
  throw new Error('Ferien konnten nicht geladen werden');
}
