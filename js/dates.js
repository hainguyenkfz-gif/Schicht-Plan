// Datums-Hilfsfunktionen. Alle Daten sind Strings im Format "YYYY-MM-DD".
// Gerechnet wird über UTC-Tagesnummern, damit Sommer-/Winterzeit keine Rolle spielt.

export const pad = (n) => String(n).padStart(2, '0');

export const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export function dayNum(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 864e5;
}

export function fromDayNum(n) {
  const dt = new Date(n * 864e5);
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export const addDays = (s, k) => fromDayNum(dayNum(s) + k);

// 0 = Montag … 6 = Sonntag
export const weekday = (s) => (new Date(dayNum(s) * 864e5).getUTCDay() + 6) % 7;

export const mondayOf = (s) => addDays(s, -weekday(s));

export const daysBetween = (a, b) => dayNum(b) - dayNum(a);

// ISO-Kalenderwoche (KW)
export function isoWeek(s) {
  const thu = addDays(s, 3 - weekday(s));
  const y = Number(thu.slice(0, 4));
  return { week: Math.floor((dayNum(thu) - dayNum(`${y}-01-01`)) / 7) + 1, year: y };
}

export function todayISO() {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
  'August', 'September', 'Oktober', 'November', 'Dezember'];
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export function fmtShort(s) {
  const [, m, d] = s.split('-');
  return `${d}.${m}.`;
}

export function fmtDate(s) {
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}

export function fmtLong(s) {
  const [y, m, d] = s.split('-').map(Number);
  return `${WEEKDAYS_LONG[weekday(s)]}, ${d}. ${MONTHS[m - 1]} ${y}`;
}
