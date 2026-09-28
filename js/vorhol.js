// Vorholzeit (Zeitkonto) in Industriestunden: 0.25 Std = 15 Min, 0.50 Std = 30 Min.
// Stand = Startwert aus dem Firmensystem ("Stand vom" Datum) + alle Einträge danach.

export const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

// "1,5" / "1.5" / "-0,25" / "1:30" (Std:Min) → Stunden als Zahl, sonst null
export function parseHours(text) {
  const t = String(text ?? '').trim().replace(/\s/g, '').replace('−', '-');
  if (!t) return null;
  const hm = t.match(/^([+-]?)(\d+):([0-5]\d)$/);
  if (hm) return round2((hm[1] === '-' ? -1 : 1) * (Number(hm[2]) + Number(hm[3]) / 60));
  if (!/^[+-]?\d*[.,]?\d+$/.test(t)) return null;
  return round2(Number(t.replace(',', '.')));
}

export function fmtHours(x, { sign = true } = {}) {
  const v = round2(x);
  const s = v > 0 && sign ? '+' : v < 0 ? '−' : '';
  return `${s}${Math.abs(v).toFixed(2)}`;
}

// 11.65 → "11 Std 39 Min"
export function fmtHM(x) {
  const min = Math.round(Math.abs(round2(x)) * 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} Min`;
  return m ? `${h} Std ${m} Min` : `${h} Std`;
}

// { start, startDate, entries: { 'YYYY-MM-DD': Stunden } }
export function vorholBalance(v, today) {
  let done = 0;
  let planned = 0;
  for (const [d, h] of Object.entries((v && v.entries) || {})) {
    if (v.startDate && d <= v.startDate) continue; // schon im Startwert enthalten
    if (d <= today) done += h; else planned += h;
  }
  const start = round2(v && v.start);
  return {
    start,
    done: round2(done),
    current: round2(start + done),
    planned: round2(planned),
    available: round2(start + done + planned),
  };
}
