import { dayNum, weekday } from './dates.js';

// F/S/N sind Arbeitsschichten, X/U/K manuelle Markierungen.
export const SHIFT_TYPES = {
  F: { name: 'Früh', short: 'F', work: true },
  S: { name: 'Spät', short: 'S', work: true },
  N: { name: 'Nacht', short: 'N', work: true },
  X: { name: 'Frei', short: '–', work: false },
  U: { name: 'Urlaub', short: 'U', work: false },
  K: { name: 'Krank', short: 'K', work: false },
};

export function buildOrder(count, direction = 'fwd') {
  if (count === 2) return ['F', 'S'];
  return direction === 'back' ? ['F', 'N', 'S'] : ['F', 'S', 'N'];
}

// Ein Plan-Abschnitt: { order, start (Montag), startIndex, weeksPer, workdays: [0..6], end }
// Ab der Startwoche wechselt die Schicht alle `weeksPer` Wochen der Reihe nach.
export function planShift(plan, s) {
  if (!plan || s < plan.start || s > plan.end) return null;
  if (!plan.workdays.includes(weekday(s))) return null;
  const weeks = Math.floor((dayNum(s) - dayNum(plan.start)) / 7);
  const n = plan.order.length;
  const idx = (((plan.startIndex + Math.floor(weeks / plan.weeksPer)) % n) + n) % n;
  return plan.order[idx];
}

// Es gilt immer der zuletzt begonnene Abschnitt; ein neuer Abschnitt beendet den alten.
export function segmentFor(plans, s) {
  let found = null;
  for (const p of plans) if (p.start <= s && (!found || p.start > found.start)) found = p;
  return found;
}

// Neuen Abschnitt einfügen: alles ab seinem Start wird ersetzt, ältere Wochen bleiben.
export function addPlan(plans, plan) {
  return plans.filter((p) => p.start < plan.start).concat([plan])
    .sort((a, b) => (a.start < b.start ? -1 : 1));
}

// Arbeitstag = Tag mit geplanter Schicht (ohne Plan: gewählte Wochentage), kein Feiertag.
// Nur solche Tage zählen als Urlaubstag.
export function isWorkday(data, s, isHoliday = () => false) {
  if (isHoliday(s)) return false;
  const seg = segmentFor(data.plans, s);
  if (seg && s <= seg.end) return planShift(seg, s) !== null;
  return ((data.setup && data.setup.workdays) || [0, 1, 2, 3, 4]).includes(weekday(s));
}

export const inVacation = (vacations, s) => (vacations || []).some((v) => v.start <= s && s <= v.end);

// Vorrang: manueller Eintrag > Urlaubszeitraum (nur Arbeitstage) > automatischer Plan.
export function shiftOn(data, s, isHoliday = () => false) {
  if (Object.prototype.hasOwnProperty.call(data.overrides, s)) return data.overrides[s];
  if (inVacation(data.vacations, s) && isWorkday(data, s, isHoliday)) return 'U';
  return planShift(segmentFor(data.plans, s), s);
}
