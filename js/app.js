import {
  iso, addDays, weekday, mondayOf, isoWeek, todayISO, daysInMonth, daysBetween,
  MONTHS, WEEKDAYS, fmtShort, fmtDate, fmtLong,
} from './dates.js';
import { SHIFT_TYPES, buildOrder, addPlan, shiftOn, isWorkday } from './shifts.js';
import { STATES, stateName, publicHolidays, loadSchoolHolidays } from './holidays.js';
import { round2, parseHours, fmtHours, fmtHM, vorholBalance } from './vorhol.js';

// ---------------------------------------------------------------- Daten

const KEY = 'schichtplan:v1';

const DEFAULT_COLORS = {
  F: '#FFB300', S: '#1E88E5', N: '#5E35B1', X: '#B0BEC5', U: '#00ACC1', K: '#EC407A',
  holiday: '#E53935', ferien: '#43A047',
};

function defaults() {
  const t = todayISO();
  return {
    plans: [],
    overrides: {},
    vacations: [],
    vacationDays: 30,
    vorhol: { start: 0, startDate: '', entries: {} },
    bl: 'HE',
    colors: { ...DEFAULT_COLORS },
    times: { F: ['06:00', '14:00'], S: ['14:00', '22:00'], N: ['22:00', '06:00'] },
    setup: {
      count: 2, direction: 'fwd', weeksPer: 1, workdays: [0, 1, 2, 3, 4],
      startShift: 'F', start: addDays(mondayOf(t), 7), until: 'year',
    },
  };
}

function load() {
  const base = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') {
      return {
        ...base, ...saved,
        colors: { ...base.colors, ...saved.colors },
        times: { ...base.times, ...saved.times },
        setup: { ...base.setup, ...saved.setup },
        vorhol: { ...base.vorhol, ...saved.vorhol },
      };
    }
  } catch { /* leer oder gesperrt */ }
  return base;
}

let data = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignorieren */ } };

const ui = {
  tab: 'month',
  cursor: { y: +todayISO().slice(0, 4), m: +todayISO().slice(5, 7) },
  year: +todayISO().slice(0, 4),
  sheetDate: null,
  sheetMode: null,
  vhSign: 1,
  sheetSel: null,
};

// ---------------------------------------------------------------- Hilfen

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#1c1c1e' : '#ffffff';
}

const colorOf = (code) => data.colors[code] || '#999';
const shiftStyle = (code) => `--c:${colorOf(code)};--t:${textOn(colorOf(code))}`;

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 2600);
}

function inDays(s) {
  const d = daysBetween(todayISO(), s);
  if (d === 0) return 'heute';
  if (d === 1) return 'morgen';
  if (d > 0) return `in ${d} Tagen`;
  return null;
}

// ---------------------------------------------------------------- Feiertage & Ferien

const holMemo = new Map();
function holidayMap(y) {
  const k = `${data.bl}:${y}`;
  if (!holMemo.has(k)) {
    const m = new Map();
    for (const h of publicHolidays(y, data.bl)) if (!m.has(h.date) || m.get(h.date).partial) m.set(h.date, h);
    holMemo.set(k, m);
  }
  return holMemo.get(k);
}
const holidayOn = (s) => holidayMap(+s.slice(0, 4)).get(s) || null;
const isFullHoliday = (s) => { const h = holidayOn(s); return !!h && !h.partial; };
const dayCode = (s) => shiftOn(data, s, isFullHoliday);

const ferienState = {};
function ferien(y) {
  const k = `${data.bl}:${y}`;
  if (!ferienState[k]) {
    ferienState[k] = { status: 'loading', items: [] };
    loadSchoolHolidays(y, data.bl, { storage: localStorage })
      .then((r) => { ferienState[k] = { status: 'ok', items: r.items, stale: r.stale }; })
      .catch(() => { ferienState[k] = { status: 'error', items: [] }; })
      .finally(() => render());
  }
  return ferienState[k];
}

function ferienOn(s) {
  const y = +s.slice(0, 4);
  for (const yy of [y, y - 1]) {
    const f = ferienState[`${data.bl}:${yy}`];
    if (!f) continue;
    const hit = f.items.find((h) => h.start <= s && s <= h.end);
    if (hit) return hit;
  }
  return null;
}

// ---------------------------------------------------------------- Ansicht: Monat

function dayCell(s, month) {
  const code = dayCode(s);
  const hol = holidayOn(s);
  const fer = ferienOn(s);
  const cls = ['day'];
  if (+s.slice(5, 7) !== month) cls.push('other');
  if (s === todayISO()) cls.push('today');
  if (code) cls.push('has-shift');
  if (hol) cls.push(hol.partial ? 'hol partial' : 'hol');
  if (weekday(s) >= 5) cls.push('weekend');
  return `<button type="button" class="${cls.join(' ')}" data-date="${s}" ${code ? `style="${shiftStyle(code)}"` : ''}
      aria-label="${fmtLong(s)}${code ? ', ' + SHIFT_TYPES[code].name : ''}${hol ? ', ' + esc(hol.name) : ''}${fer ? ', ' + esc(fer.name) : ''}">
    <span class="num">${+s.slice(8)}</span>
    ${code ? `<span class="tag">${SHIFT_TYPES[code].short}</span>` : '<span class="tag"></span>'}
    ${hol ? '<span class="hol-dot"></span>' : ''}
    ${fer ? '<span class="fer-bar"></span>' : ''}
    ${data.vorhol.entries[s] ? `<span class="vh-mark ${data.vorhol.entries[s] > 0 ? 'plus' : 'minus'}"></span>` : ''}
  </button>`;
}

function renderMonth() {
  const { y, m } = ui.cursor;
  ferien(y); ferien(y - 1);
  const first = iso(y, m, 1);
  const last = iso(y, m, daysInMonth(y, m));
  let rows = '';
  for (let wk = mondayOf(first); wk <= last; wk = addDays(wk, 7)) {
    const kw = isoWeek(wk).week;
    rows += `<div class="kw">${kw}</div>`;
    for (let i = 0; i < 7; i++) rows += dayCell(addDays(wk, i), m);
  }

  const counts = {};
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const c = dayCode(iso(y, m, d));
    if (c) counts[c] = (counts[c] || 0) + 1;
  }
  const stats = Object.keys(SHIFT_TYPES).filter((c) => counts[c])
    .map((c) => `<span class="stat" style="${shiftStyle(c)}">${SHIFT_TYPES[c].name} <b>${counts[c]}</b></span>`).join('');

  const events = [];
  for (const h of holidayMap(y).values()) if (h.date.slice(5, 7) === first.slice(5, 7)) events.push({ s: h.date, html: `<span class="ev-dot" style="background:${colorOf('holiday')}"></span><span><b>${fmtShort(h.date)}</b> ${esc(h.name)}${h.partial ? ` <small>(${esc(h.note)})</small>` : ''}</span>` });
  const fSeen = new Set();
  for (const yy of [y - 1, y]) {
    for (const f of (ferienState[`${data.bl}:${yy}`] || { items: [] }).items) {
      if (f.end < first || f.start > last || fSeen.has(f.start + f.end)) continue;
      fSeen.add(f.start + f.end);
      events.push({ s: f.start, html: `<span class="ev-dot" style="background:${colorOf('ferien')}"></span><span><b>${esc(f.name)}</b> ${fmtDate(f.start)} – ${fmtDate(f.end)}</span>` });
    }
  }
  events.sort((a, b) => (a.s < b.s ? -1 : 1));

  const t = todayISO();
  const todayCode = dayCode(t);
  const tomorrowCode = dayCode(addDays(t, 1));
  const hasPlan = data.plans.length || data.vacations.length || Object.keys(data.overrides).length;

  return `
    ${hasPlan ? `
    <div class="today-card">
      <div><small>Heute</small><div class="big">${todayCode ? `<span class="chip" style="${shiftStyle(todayCode)}">${SHIFT_TYPES[todayCode].name}</span>` : 'Frei'}</div></div>
      <div><small>Morgen</small><div class="big">${tomorrowCode ? `<span class="chip" style="${shiftStyle(tomorrowCode)}">${SHIFT_TYPES[tomorrowCode].name}</span>` : 'Frei'}</div></div>
    </div>` : `
    <div class="card welcome">
      <h2>Willkommen! 👋</h2>
      <p>Tippe auf einen Tag in der Woche, in der du z.&nbsp;B. <b>Frühschicht</b> hast, und wähle
      <b>„Ab dieser Woche automatisch“</b>. Die App trägt dann alle Wochen bis Jahresende ein.</p>
      <button type="button" class="btn primary" data-goto="settings">Schichtplan einrichten</button>
    </div>`}

    <div class="month-nav">
      <button type="button" class="icon-btn" data-nav="-1" aria-label="Vorheriger Monat">‹</button>
      <h2>${MONTHS[m - 1]} ${y}</h2>
      <button type="button" class="icon-btn" data-nav="1" aria-label="Nächster Monat">›</button>
    </div>
    <div class="cal" id="cal">
      <div class="kw head">KW</div>
      ${WEEKDAYS.map((w, i) => `<div class="wd ${i >= 5 ? 'weekend' : ''}">${w}</div>`).join('')}
      ${rows}
    </div>
    ${legend()}
    <div class="stats">${stats}${vorholTile()}</div>
    ${events.length ? `<div class="card"><h3>Feiertage &amp; Ferien · ${esc(stateName(data.bl))}</h3><ul class="events">${events.map((e) => `<li>${e.html}</li>`).join('')}</ul></div>` : ''}
  `;
}

function legend() {
  const used = data.plans.length ? [...new Set(data.plans.flatMap((p) => p.order))] : ['F', 'S'];
  return `<div class="legend">
    ${used.map((c) => `<span><i style="background:${colorOf(c)}"></i>${SHIFT_TYPES[c].name}</span>`).join('')}
    <span><i class="ring" style="border-color:${colorOf('holiday')}"></i>Feiertag</span>
    <span><i class="bar" style="background:${colorOf('ferien')}"></i>Ferien</span>
  </div>`;
}

// ---------------------------------------------------------------- Ansicht: Jahr

function renderYear() {
  const y = ui.year;
  ferien(y); ferien(y - 1);
  let months = '';
  for (let m = 1; m <= 12; m++) {
    const first = iso(y, m, 1);
    let cells = WEEKDAYS.map((w) => `<i class="h">${w[0]}</i>`).join('');
    for (let i = 0; i < weekday(first); i++) cells += '<i></i>';
    for (let d = 1; d <= daysInMonth(y, m); d++) {
      const s = iso(y, m, d);
      const code = dayCode(s);
      const hol = holidayOn(s);
      const fer = ferienOn(s);
      const cls = [hol && !hol.partial ? 'hol' : '', fer ? 'fer' : '', s === todayISO() ? 'today' : ''].join(' ');
      cells += `<i class="${cls}" ${code ? `style="${shiftStyle(code)}"` : ''}>${d}</i>`;
    }
    months += `<button type="button" class="mini" data-month="${m}"><h4>${MONTHS[m - 1]}</h4><div class="mini-grid">${cells}</div></button>`;
  }
  return `
    <div class="month-nav">
      <button type="button" class="icon-btn" data-ynav="-1" aria-label="Vorheriges Jahr">‹</button>
      <h2>${y}</h2>
      <button type="button" class="icon-btn" data-ynav="1" aria-label="Nächstes Jahr">›</button>
    </div>
    ${legend()}
    <div class="year-grid">${months}</div>`;
}

// ---------------------------------------------------------------- Ansicht: Feiertage & Ferien

function renderHolidays() {
  const y = ui.year;
  const t = todayISO();
  const f = ferien(y);
  const hols = publicHolidays(y, data.bl);

  const nextHol = [...publicHolidays(+t.slice(0, 4), data.bl), ...publicHolidays(+t.slice(0, 4) + 1, data.bl)]
    .find((h) => h.date >= t && !h.partial);

  const holList = hols.map((h) => {
    const past = h.date < t;
    const rel = inDays(h.date);
    const wd = WEEKDAYS[weekday(h.date)];
    return `<li class="${past ? 'past' : ''}">
      <span class="date-badge" style="--c:${colorOf('holiday')}"><b>${+h.date.slice(8)}</b><small>${MONTHS[+h.date.slice(5, 7) - 1].slice(0, 3)}</small></span>
      <span class="grow"><b>${esc(h.name)}</b><small>${wd}, ${fmtDate(h.date)}${h.partial ? ` · ${esc(h.note)}` : ''}</small></span>
      ${rel ? `<span class="rel">${rel}</span>` : ''}
    </li>`;
  }).join('');

  let ferList;
  if (f.status === 'loading') ferList = '<p class="muted">Ferien werden geladen …</p>';
  else if (f.status === 'error') ferList = `<p class="muted">Die Ferien konnten nicht geladen werden. Bitte Internet prüfen.</p><button type="button" class="btn" data-retry>Erneut versuchen</button>`;
  else if (!f.items.length) ferList = '<p class="muted">Für dieses Jahr sind noch keine Ferien veröffentlicht.</p>';
  else {
    ferList = `<ul class="list">${f.items.map((h) => {
      const days = daysBetween(h.start, h.end) + 1;
      const now = h.start <= t && t <= h.end;
      const past = h.end < t;
      const rel = now ? 'läuft gerade' : inDays(h.start);
      return `<li class="${past ? 'past' : ''}">
        <span class="date-badge" style="--c:${colorOf('ferien')}"><b>${+h.start.slice(8)}</b><small>${MONTHS[+h.start.slice(5, 7) - 1].slice(0, 3)}</small></span>
        <span class="grow"><b>${esc(h.name)}</b><small>${WEEKDAYS[weekday(h.start)]}, ${fmtDate(h.start)} – ${WEEKDAYS[weekday(h.end)]}, ${fmtDate(h.end)} · ${days} ${days === 1 ? 'Tag' : 'Tage'}</small></span>
        ${rel ? `<span class="rel ${now ? 'now' : ''}">${rel}</span>` : ''}
      </li>`;
    }).join('')}</ul>${f.stale ? '<p class="muted small">Offline – gespeicherte Daten.</p>' : ''}`;
  }

  return `
    <div class="card">
      <h3>Bundesland wählen</h3>
      <div class="states">
        ${STATES.map((s) => `<button type="button" data-bl="${s.code}" class="${s.code === data.bl ? 'active' : ''}" title="${s.name}"><b>${s.code}</b><small>${s.name}</small></button>`).join('')}
      </div>
    </div>
    ${nextHol ? `<div class="next-card" style="--c:${colorOf('holiday')}">Nächster Feiertag in ${esc(stateName(data.bl))}:<br><b>${esc(nextHol.name)}</b> – ${WEEKDAYS[weekday(nextHol.date)]}, ${fmtDate(nextHol.date)} (${inDays(nextHol.date)})</div>` : ''}
    <div class="month-nav">
      <button type="button" class="icon-btn" data-ynav="-1" aria-label="Vorheriges Jahr">‹</button>
      <h2>${y}</h2>
      <button type="button" class="icon-btn" data-ynav="1" aria-label="Nächstes Jahr">›</button>
    </div>
    <div class="card"><h3>🎉 Feiertage ${y} · ${esc(stateName(data.bl))}</h3><ul class="list">${holList}</ul></div>
    <div class="card"><h3>🏖️ Schulferien ${y} · ${esc(stateName(data.bl))}</h3>${ferList}</div>
    <p class="muted small center">Feiertage werden berechnet. Schulferien: openholidaysapi.org / ferien-api.de – ohne Gewähr.</p>
  `;
}

// ---------------------------------------------------------------- Ansicht: Plan / Einstellungen

const WORKDAY_PRESETS = { 'Mo–Fr': [0, 1, 2, 3, 4], 'Mo–Sa': [0, 1, 2, 3, 4, 5], 'Mo–So': [0, 1, 2, 3, 4, 5, 6] };

function draftPlan(setup = data.setup) {
  const order = buildOrder(setup.count, setup.direction);
  const start = mondayOf(setup.start);
  const endYear = +start.slice(0, 4) + (setup.until === 'next' ? 1 : 0);
  return {
    order, start, weeksPer: setup.weeksPer, workdays: [...setup.workdays],
    startIndex: Math.max(0, order.indexOf(setup.startShift)),
    end: `${endYear}-12-31`,
  };
}

function seg(name, options, current) {
  return `<div class="seg" data-seg="${name}">${options.map(([v, label]) =>
    `<button type="button" data-v="${v}" class="${String(v) === String(current) ? 'active' : ''}">${label}</button>`).join('')}</div>`;
}

function renderSettings() {
  const s = data.setup;
  const draft = draftPlan();
  const startY = +draft.start.slice(0, 4);
  const wdKey = Object.keys(WORKDAY_PRESETS).find((k) => WORKDAY_PRESETS[k].join() === s.workdays.join()) || 'Mo–Fr';

  let preview = '';
  for (let i = 0; i < 8; i++) {
    const wk = addDays(draft.start, i * 7);
    if (wk > draft.end) break;
    const code = draft.order[(draft.startIndex + Math.floor(i / draft.weeksPer)) % draft.order.length];
    const kw = isoWeek(wk).week;
    preview += `<li><span>KW ${kw} <small>(${kw % 2 === 0 ? 'gerade' : 'ungerade'})</small></span>
      <small>${fmtShort(wk)} – ${fmtShort(addDays(wk, 6))}</small>
      <span class="chip" style="${shiftStyle(code)}">${SHIFT_TYPES[code].name}</span></li>`;
  }

  const shifts = buildOrder(s.count, s.direction);
  const colorRow = (k, label) => `<label class="color-row"><span>${label}</span><input type="color" data-color="${k}" value="${colorOf(k)}"></label>`;
  const timeRow = (k) => `<div class="time-row"><span class="chip" style="${shiftStyle(k)}">${SHIFT_TYPES[k].name}</span>
    <input type="time" data-time="${k}:0" value="${data.times[k][0]}"> – <input type="time" data-time="${k}:1" value="${data.times[k][1]}"></div>`;

  return `
    <div class="card">
      <h3>1. Wie viele Schichten arbeitest du?</h3>
      ${seg('count', [[2, 'Früh + Spät'], [3, 'Früh + Spät + Nacht']], s.count)}
      ${s.count === 3 ? `<h4>Reihenfolge</h4>${seg('direction', [['fwd', 'F → S → N'], ['back', 'F → N → S']], s.direction)}` : ''}
      <h4>Wechsel</h4>
      ${seg('weeksPer', [[1, 'jede Woche'], [2, 'alle 2 Wochen']], s.weeksPer)}
      <h4>Arbeitstage</h4>
      ${seg('workdays', Object.keys(WORKDAY_PRESETS).map((k) => [k, k]), wdKey)}
    </div>

    <div class="card">
      <h3>2. Womit beginnst du?</h3>
      <label class="field"><span>Startwoche</span><input type="date" id="startDate" value="${draft.start}"></label>
      <p class="muted small">KW ${isoWeek(draft.start).week} · ${fmtDate(draft.start)} – ${fmtDate(addDays(draft.start, 6))}</p>
      <h4>In dieser Woche habe ich</h4>
      ${seg('startShift', shifts.map((c) => [c, SHIFT_TYPES[c].name]), s.startShift)}
      <h4>Automatisch eintragen bis</h4>
      ${seg('until', [['year', `Ende ${startY}`], ['next', `Ende ${startY + 1}`]], s.until)}
    </div>

    <div class="card">
      <h3>Vorschau</h3>
      <ul class="preview">${preview}</ul>
      <button type="button" class="btn primary big" data-apply>✓ Automatisch bis ${fmtDate(draft.end)} eintragen</button>
      <p class="muted small">Urlaub, Krank und Frei, die du selbst eingetragen hast, bleiben erhalten.</p>
    </div>

    <div class="card">
      <h3>Bundesland</h3>
      <select id="blSelect">${STATES.map((st) => `<option value="${st.code}" ${st.code === data.bl ? 'selected' : ''}>${st.name}</option>`).join('')}</select>
    </div>

    <div class="card">
      <h3>Farben</h3>
      ${Object.keys(SHIFT_TYPES).map((k) => colorRow(k, SHIFT_TYPES[k].name)).join('')}
      ${colorRow('holiday', 'Feiertag')}
      ${colorRow('ferien', 'Schulferien')}
      <button type="button" class="btn" data-reset-colors>Standardfarben</button>
    </div>

    <div class="card">
      <h3>Schichtzeiten</h3>
      ${['F', 'S', 'N'].map(timeRow).join('')}
    </div>

    <div class="card">
      <h3>Daten</h3>
      <button type="button" class="btn" data-ics>📲 In iPhone-Kalender exportieren (.ics)</button>
      <button type="button" class="btn" data-backup>💾 Sicherung speichern</button>
      <label class="btn file">📂 Sicherung laden<input type="file" accept="application/json,.json" id="restore" hidden></label>
      <button type="button" class="btn danger" data-clear>🗑️ Alle Schichten löschen</button>
    </div>
    <div class="card">
      <h3>Mit Kollegen teilen</h3>
      <p class="muted small">Jeder bekommt seinen eigenen, leeren Schichtplan. Deine Einträge bleiben bei dir.</p>
      <button type="button" class="btn primary" data-shareapp>📤 App-Link teilen</button>
    </div>
    <p class="muted small center">Alle Daten bleiben nur auf deinem iPhone gespeichert.</p>
    <p class="credit"><span class="hai">HAI</span> Schichtplan · © ${new Date().getFullYear()} Hai</p>
  `;
}

// ---------------------------------------------------------------- Ansicht: Urlaub

// Zählt die Urlaubstage (nur Arbeitstage, ohne Feiertage) in einem Zeitraum.
function countVacation(start, end) {
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWorkday(data, d, isFullHoliday)) n++;
  return n;
}

function vacInfoText(from, to) {
  if (!from || !to) return 'Bitte Anfang und Ende wählen.';
  if (to < from) return '⚠️ Das Ende liegt vor dem Anfang.';
  const n = countVacation(from, to);
  const all = daysBetween(from, to) + 1;
  return `= ${n} Urlaubstag${n === 1 ? '' : 'e'} (${all} Kalendertag${all === 1 ? '' : 'e'}, freie Tage und Feiertage zählen nicht)`;
}

function renderVacation() {
  const y = ui.year;
  const t = todayISO();
  let used = 0;
  let planned = 0;
  const singles = [];
  for (let d = `${y}-01-01`; d <= `${y}-12-31`; d = addDays(d, 1)) {
    if (dayCode(d) !== 'U') continue;
    if (d <= t) used++; else planned++;
    if (data.overrides[d] === 'U' && !data.vacations.some((v) => v.start <= d && d <= v.end)) singles.push(d);
  }
  const total = Math.max(0, +data.vacationDays || 0);
  const rest = total - used - planned;
  const pct = (n) => (total ? Math.min(100, (n / total) * 100) : 0);

  const list = data.vacations
    .filter((v) => v.end >= `${y}-01-01` && v.start <= `${y}-12-31`)
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .map((v) => {
      const n = countVacation(v.start, v.end);
      const now = v.start <= t && t <= v.end;
      const rel = now ? 'läuft gerade' : inDays(v.start);
      return `<li class="${v.end < t ? 'past' : ''}">
        <span class="date-badge" style="--c:${colorOf('U')}"><b>${+v.start.slice(8)}</b><small>${MONTHS[+v.start.slice(5, 7) - 1].slice(0, 3)}</small></span>
        <span class="grow"><b>${n} Urlaubstag${n === 1 ? '' : 'e'}</b>
          <small>${WEEKDAYS[weekday(v.start)]}, ${fmtDate(v.start)} – ${WEEKDAYS[weekday(v.end)]}, ${fmtDate(v.end)}</small>
          ${rel ? `<small class="rel ${now ? 'now' : ''}">${rel}</small>` : ''}</span>
        <button type="button" class="del-btn" data-delvac="${v.id}" aria-label="Urlaub löschen">🗑️</button>
      </li>`;
    }).join('');

  const from = ui.vacFrom || '';
  const to = ui.vacTo || '';

  return `
    <div class="month-nav">
      <button type="button" class="icon-btn" data-ynav="-1" aria-label="Vorheriges Jahr">‹</button>
      <h2>Urlaub ${y}</h2>
      <button type="button" class="icon-btn" data-ynav="1" aria-label="Nächstes Jahr">›</button>
    </div>

    <div class="card">
      <div class="vac-summary">
        <div><b>${used}</b><small>genommen</small></div>
        <div><b>${planned}</b><small>geplant</small></div>
        <div class="rest"><b style="color:${rest < 0 ? 'var(--danger)' : colorOf('U')}">${rest}</b><small>Rest</small></div>
      </div>
      <div class="progress" aria-hidden="true">
        <i style="width:${pct(used)}%;background:${colorOf('U')}"></i>
        <i style="width:${pct(planned)}%;background:${colorOf('U')};opacity:.45"></i>
      </div>
      <div class="row-between" style="margin-top:14px">
        <span>Urlaubsanspruch ${y}</span>
        <span><input type="number" inputmode="numeric" min="0" max="366" class="inline-num" id="vacTotal" value="${total}"> Tage</span>
      </div>
    </div>

    <div class="card">
      <h3>🏖️ Urlaub eintragen</h3>
      <div class="vac-form">
        <label>Von<input type="date" id="vacFrom" value="${from}"></label>
        <label>Bis<input type="date" id="vacTo" value="${to}"></label>
      </div>
      <p class="vac-info" id="vacInfo">${vacInfoText(from, to)}</p>
      <button type="button" class="btn primary big" data-addvac>✓ Urlaub eintragen</button>
    </div>

    <div class="card">
      <h3>Mein Urlaub ${y}</h3>
      ${list ? `<ul class="list">${list}</ul>` : '<p class="muted">Noch kein Urlaub eingetragen.</p>'}
      ${singles.length ? `<p class="muted small">Einzelne Urlaubstage aus dem Kalender: ${singles.map(fmtShort).join(', ')}</p>` : ''}
      <button type="button" class="btn" data-vacics>📲 Urlaub in iPhone-Kalender exportieren</button>
    </div>
    <p class="muted small center">Als Urlaubstag zählen nur Tage, an denen du laut Plan arbeiten würdest – ohne Feiertage.</p>
  `;
}

// ---------------------------------------------------------------- Vorholzeit

const vhClass = (x) => (round2(x) > 0 ? 'plus' : round2(x) < 0 ? 'minus' : 'zero');

// Digitalanzeige im 7-Segment-Stil (mit schwachen „88.88“-Segmenten dahinter)
function lcd(x, size = '') {
  const v = round2(x);
  const num = Math.abs(v).toFixed(2);
  return `<span class="lcd ${vhClass(v)} ${size}"><span class="lcd-sign">${v > 0 ? '+' : v < 0 ? '−' : ''}</span><span class="lcd-num"><span class="ghost" aria-hidden="true">${num.replace(/\d/g, '8')}</span><span>${num}</span></span></span>`;
}

const vorholSetUp = () => !!(data.vorhol.startDate || Object.keys(data.vorhol.entries).length);

function vorholTile() {
  if (!vorholSetUp()) return '<button type="button" class="vh-tile setup" data-vorhol>⏱️ Vorholzeit einrichten</button>';
  const b = vorholBalance(data.vorhol, todayISO());
  return `<button type="button" class="vh-tile ${vhClass(b.available)}" data-vorhol aria-label="Vorholzeit ${fmtHours(b.available)} Stunden">
    <small>⏱️ Vorholzeit</small>${lcd(b.available)}<small>Std</small></button>`;
}

function vorholDayBox(s) {
  const h = data.vorhol.entries[s] || 0;
  return `<div class="vh-day">
    <h4>⏱️ Vorholzeit an diesem Tag</h4>
    <div class="vh-stepper">
      <button type="button" class="step minus" data-vhstep="-0.25" aria-label="15 Minuten weniger">−</button>
      <div class="vh-val">${lcd(h, 'mid')}<small>${h ? fmtHM(h) : 'keine'}</small></div>
      <button type="button" class="step plus" data-vhstep="0.25" aria-label="15 Minuten mehr">+</button>
    </div>
    <div class="vh-quick">
      ${[-8, -1, -0.5, 0.5, 1, 2].map((q) => `<button type="button" data-vhstep="${q}" class="${q > 0 ? 'plus' : 'minus'}">${q > 0 ? '+' : '−'}${Math.abs(q).toFixed(2)}</button>`).join('')}
    </div>
    ${h ? '<button type="button" class="btn ghost small-btn" data-vhclear>Eintrag löschen</button>' : ''}
  </div>`;
}

function renderVorholSheet() {
  const v = data.vorhol;
  const t = todayISO();
  const b = vorholBalance(v, t);
  const entries = Object.entries(v.entries).sort((a, c) => (a[0] < c[0] ? 1 : -1));
  const list = entries.map(([d, h]) => {
    const old = v.startDate && d <= v.startDate;
    return `<li class="${old ? 'past' : ''}">
      <button type="button" class="grow link" data-date="${d}"><b>${WEEKDAYS[weekday(d)]}, ${fmtDate(d)}</b>
        <small>${fmtHM(h)}${old ? ' · im Startwert enthalten' : d > t ? ' · geplant' : ''}</small></button>
      <span class="vh-amount ${vhClass(h)}">${fmtHours(h)}</span>
      <button type="button" class="del-btn" data-vhdel="${d}" aria-label="Eintrag löschen">🗑️</button>
    </li>`;
  }).join('');
  const row = (label, val, date = '') => `<div class="vh-row"><span>${label}${date ? ` <small>${date}</small>` : ''}</span><b class="${vhClass(val)}">${fmtHours(val)} Std</b></div>`;

  $('#sheetBody').innerHTML = `
    <h2 id="sheetTitle">⏱️ Vorholzeit</h2>
    <div class="vh-display ${vhClass(b.available)}">
      <small>Verfügbar</small>
      ${lcd(b.available, 'big')}
      <small>Std · ${fmtHM(b.available)}</small>
    </div>
    <div class="vh-table">
      ${row('Stand Firma', b.start, v.startDate ? `vom ${fmtDate(v.startDate)}` : '')}
      ${row('Seitdem eingetragen', b.done)}
      ${row('Aktuell', b.current, `(${fmtShort(t)})`)}
      ${row('Geplant', b.planned)}
      ${row('Verfügbar', b.available)}
    </div>

    <h3>Stunden eintragen</h3>
    <div class="vh-form">
      <label>Datum<input type="date" id="vhDate" value="${ui.vhDate || t}"></label>
      <div class="seg vh-sign">
        <button type="button" data-vhsign="1" class="${ui.vhSign > 0 ? 'active plus' : ''}">＋ Plus</button>
        <button type="button" data-vhsign="-1" class="${ui.vhSign < 0 ? 'active minus' : ''}">− Minus</button>
      </div>
      <label>Stunden<input type="text" inputmode="decimal" id="vhHours" placeholder="z. B. 0.25 oder 1:30" value="${ui.vhHours || ''}"></label>
      <div class="vh-quick">${[0.25, 0.5, 0.75, 1, 2, 8].map((q) => `<button type="button" data-vhq="${q}">${q.toFixed(2)}</button>`).join('')}</div>
      <p class="muted small" id="vhHint">${vhHint()}</p>
      <button type="button" class="btn primary big" data-vhadd>✓ Eintragen</button>
    </div>

    <details class="vh-start" ${v.startDate ? '' : 'open'}>
      <summary>Stand aus der Firma übernehmen</summary>
      <p class="muted small">Trage den Wert „Aktuell“ aus dem Firmen-System ein, z. B. 11.65 Std vom 27.09.2026.
        Einträge bis zu diesem Datum sind darin schon enthalten.</p>
      <div class="vac-form">
        <label>Stunden<input type="text" inputmode="decimal" id="vhStart" value="${v.startDate ? v.start : ''}" placeholder="z. B. 11.65 oder -3.5"></label>
        <label>Stand vom<input type="date" id="vhStartDate" value="${v.startDate || t}"></label>
      </div>
      <button type="button" class="btn" data-vhsavestart>Stand speichern</button>
    </details>

    <h3>Einträge</h3>
    ${list ? `<ul class="list">${list}</ul>` : '<p class="muted">Noch keine Einträge.</p>'}
    <p class="muted small">0.25 Std = 15 Min · 0.50 Std = 30 Min · 0.75 Std = 45 Min</p>
    <button type="button" class="btn ghost" data-close>Schließen</button>`;
}

function vhHint() {
  const h = parseHours(ui.vhHours);
  if (ui.vhHours && h === null) return '⚠️ Bitte eine Zahl eingeben, z. B. 0.25, 1,5 oder 1:30';
  if (!h) return 'Plus = Überstunden, Minus = früher gegangen / Freischicht';
  const v = ui.vhSign * Math.abs(h);
  return `= ${fmtHours(v)} Std (${v < 0 ? 'minus ' : 'plus '}${fmtHM(v)})`;
}

function addVorhol(date, hours) {
  const e = data.vorhol.entries;
  const v = round2((e[date] || 0) + hours);
  if (v) e[date] = v; else delete e[date];
  save();
}

// ---------------------------------------------------------------- Tages-Blatt

function showSheet(mode) {
  ui.sheetMode = mode;
  renderSheet();
  const el = $('#sheet');
  el.hidden = false;
  el.querySelector('.sheet').scrollTop = 0;
  requestAnimationFrame(() => el.classList.add('open'));
}

function openSheet(s) {
  ui.sheetDate = s;
  ui.sheetSel = dayCode(s) || data.setup.startShift || 'F';
  showSheet('day');
}

function closeSheet() {
  const el = $('#sheet');
  el.classList.remove('open');
  setTimeout(() => { if (!ui.sheetMode) el.hidden = true; }, 200);
  ui.sheetDate = null;
  ui.sheetMode = null;
}

function renderSheet() {
  if (ui.sheetMode === 'vorhol') return renderVorholSheet();
  const s = ui.sheetDate;
  const sel = ui.sheetSel;
  const kw = isoWeek(s).week;
  const hol = holidayOn(s);
  const fer = ferienOn(s);
  const current = dayCode(s);
  const isOverride = Object.prototype.hasOwnProperty.call(data.overrides, s);
  const opts = [...buildOrder(data.setup.count, data.setup.direction), 'X', 'U', 'K'];
  if (current === 'N' && !opts.includes('N')) opts.splice(2, 0, 'N');
  const y = +mondayOf(s).slice(0, 4);
  const endY = y + (data.setup.until === 'next' ? 1 : 0);

  $('#sheetBody').innerHTML = `
    <h2 id="sheetTitle">${fmtLong(s)}</h2>
    <p class="muted">KW ${kw} (${kw % 2 === 0 ? 'gerade' : 'ungerade'} Woche)
      · Jetzt: <b>${current ? SHIFT_TYPES[current].name : 'frei'}</b>${isOverride ? ' (manuell)' : ''}</p>
    ${hol ? `<p class="badge" style="--c:${colorOf('holiday')}">🎉 ${esc(hol.name)}${hol.partial ? ` – ${esc(hol.note)}` : ''}</p>` : ''}
    ${fer ? `<p class="badge" style="--c:${colorOf('ferien')}">🏖️ ${esc(fer.name)} (${fmtShort(fer.start)} – ${fmtShort(fer.end)})</p>` : ''}
    <div class="choices">
      ${opts.map((c) => `<button type="button" data-pick="${c}" class="choice ${c === sel ? 'active' : ''}" style="${shiftStyle(c)}">
        <b>${SHIFT_TYPES[c].short}</b><span>${SHIFT_TYPES[c].name}</span></button>`).join('')}
    </div>
    <div class="actions">
      ${SHIFT_TYPES[sel].work ? `<button type="button" class="btn primary big" data-act="auto">
        ⚡ Ab dieser Woche „${SHIFT_TYPES[sel].name}“ – automatisch bis Ende ${endY}</button>` : ''}
      ${sel === 'U' ? `<button type="button" class="btn primary big" data-act="vacrange">🏖️ Urlaub ab hier – Zeitraum eintragen</button>` : ''}
      <button type="button" class="btn" data-act="day">Nur diesen Tag: ${SHIFT_TYPES[sel].name}</button>
      <button type="button" class="btn" data-act="week">Ganze Woche (KW ${kw}): ${SHIFT_TYPES[sel].name}</button>
      ${isOverride ? '<button type="button" class="btn" data-act="reset">↺ Zurück zum automatischen Plan</button>' : ''}
    </div>
    ${vorholDayBox(s)}
    <button type="button" class="btn ghost" data-close>Schließen</button>`;
}

function applyAuto(s, code) {
  const setup = { ...data.setup, start: mondayOf(s), startShift: code };
  if (code === 'N' && setup.count === 2) setup.count = 3;
  data.setup = setup;
  const plan = draftPlan(setup);
  data.plans = addPlan(data.plans, plan);
  for (const k of Object.keys(data.overrides)) {
    if (k >= plan.start && SHIFT_TYPES[data.overrides[k]].work) delete data.overrides[k];
  }
  save();
  toast(`✓ Eingetragen bis ${fmtDate(plan.end)}`);
}

function sheetAction(act) {
  const s = ui.sheetDate;
  const sel = ui.sheetSel;
  if (act === 'vacrange') {
    ui.vacFrom = s;
    ui.vacTo = s;
    ui.year = +s.slice(0, 4);
    closeSheet();
    return setTab('vacation');
  }
  if (act === 'auto') applyAuto(s, sel);
  else if (act === 'day') data.overrides[s] = sel;
  else if (act === 'week') {
    const mon = mondayOf(s);
    const days = SHIFT_TYPES[sel].work ? data.setup.workdays : [0, 1, 2, 3, 4, 5, 6];
    for (const d of days) data.overrides[addDays(mon, d)] = sel;
  } else if (act === 'reset') delete data.overrides[s];
  save();
  closeSheet();
  render();
}

// ---------------------------------------------------------------- Export / Sicherung

function downloadFile(name, text, type) {
  const blob = new Blob([text], { type });
  // Als Home-Bildschirm-App gehen Downloads auf dem iPhone nicht zuverlässig – dort das Teilen-Menü nutzen.
  if (navigator.standalone && typeof File !== 'undefined') {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(() => {});
      return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

const icsStamp = () => new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
const icsHead = (name) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HAI Schichtplan//DE', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${name}`];

// Ein Termin pro zusammenhängendem Urlaub (auch einzelne Urlaubstage aus dem Kalender).
function buildVacationICS() {
  const days = new Set();
  for (const v of data.vacations) for (let d = v.start; d <= v.end; d = addDays(d, 1)) days.add(d);
  for (const [d, c] of Object.entries(data.overrides)) if (c === 'U') days.add(d); else days.delete(d);
  const sorted = [...days].sort();
  const ranges = [];
  for (const d of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && addDays(last.end, 1) === d) last.end = d; else ranges.push({ start: d, end: d });
  }
  const stamp = icsStamp();
  const compact = (x) => x.replace(/-/g, '');
  const lines = icsHead('Urlaub');
  for (const r of ranges) {
    const n = countVacation(r.start, r.end);
    lines.push('BEGIN:VEVENT', `UID:urlaub-${r.start}-${r.end}@hai-schichtplan`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(r.start)}`, `DTEND;VALUE=DATE:${compact(addDays(r.end, 1))}`,
      `SUMMARY:🏖️ Urlaub (${n} ${n === 1 ? 'Tag' : 'Tage'})`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n'), n: ranges.length };
}

function buildICS() {
  const dates = new Set(Object.keys(data.overrides));
  for (const p of data.plans) for (let d = p.start; d <= p.end; d = addDays(d, 1)) dates.add(d);
  for (const v of data.vacations) for (let d = v.start; d <= v.end; d = addDays(d, 1)) dates.add(d);
  const stamp = icsStamp();
  const compact = (s) => s.replace(/-/g, '');
  const lines = icsHead('HAI Schichtplan');
  let n = 0;
  for (const s of [...dates].sort()) {
    const code = dayCode(s);
    if (!code || code === 'X') continue;
    const t = SHIFT_TYPES[code];
    lines.push('BEGIN:VEVENT', `UID:${s}-${code}@hai-schichtplan`, `DTSTAMP:${stamp}`);
    if (t.work) {
      const [from, to] = data.times[code];
      const endDay = to <= from ? addDays(s, 1) : s;
      lines.push(`DTSTART:${compact(s)}T${from.replace(':', '')}00`, `DTEND:${compact(endDay)}T${to.replace(':', '')}00`,
        `SUMMARY:${t.name}schicht`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(s)}`, `DTEND;VALUE=DATE:${compact(addDays(s, 1))}`, `SUMMARY:${t.name}`);
    }
    lines.push('END:VEVENT');
    n++;
  }
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n'), n };
}

// ---------------------------------------------------------------- Rendern & Ereignisse

const TITLES = { month: '', year: 'Jahresübersicht', vacation: 'Mein Urlaub', holidays: 'Feiertage & Ferien', settings: 'Mein Plan' };

function render() {
  const view = $('#view');
  const html = ui.tab === 'month' ? renderMonth()
    : ui.tab === 'year' ? renderYear()
      : ui.tab === 'vacation' ? renderVacation()
        : ui.tab === 'holidays' ? renderHolidays() : renderSettings();
  view.innerHTML = html;
  document.documentElement.style.setProperty('--hol', colorOf('holiday'));
  document.documentElement.style.setProperty('--fer', colorOf('ferien'));
  $('#title').textContent = TITLES[ui.tab];
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
  if (ui.sheetMode) renderSheet();
}

function setTab(tab) {
  ui.tab = tab;
  render();
  window.scrollTo(0, 0);
}

function moveMonth(delta) {
  let { y, m } = ui.cursor;
  m += delta;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  ui.cursor = { y, m };
  render();
}

function changeState(code) {
  data.bl = code;
  save();
  render();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-close], label.btn');
  if (!t) return;
  const d = t.dataset;

  if (d.home !== undefined) return goToday('month');
  if (d.vorhol !== undefined) return showSheet('vorhol');
  if (d.vhstep) { addVorhol(ui.sheetDate, +d.vhstep); return render(); }
  if (d.vhclear !== undefined) { delete data.vorhol.entries[ui.sheetDate]; save(); return render(); }
  if (d.vhsign) { ui.vhSign = +d.vhsign; return renderSheet(); }
  if (d.vhq) { ui.vhHours = d.vhq; return renderSheet(); }
  if (d.vhdel) { delete data.vorhol.entries[d.vhdel]; save(); return render(); }
  if (d.vhadd !== undefined) {
    const h = parseHours(ui.vhHours);
    if (!h) return toast('Bitte Stunden eingeben, z. B. 0.25');
    const date = ui.vhDate || todayISO();
    const v = ui.vhSign * Math.abs(h);
    addVorhol(date, v);
    ui.vhHours = '';
    toast(`✓ ${fmtHours(v)} Std am ${fmtShort(date)} eingetragen`);
    return render();
  }
  if (d.vhsavestart !== undefined) {
    const h = parseHours($('#vhStart').value);
    const date = $('#vhStartDate').value;
    if (h === null || !date) return toast('Bitte Stunden und Datum eingeben');
    data.vorhol.start = h;
    data.vorhol.startDate = date;
    save();
    toast('✓ Stand gespeichert');
    return render();
  }
  if (d.tab) return setTab(d.tab);
  if (d.goto) return setTab(d.goto);
  if (d.close !== undefined) return closeSheet();
  if (d.date) return openSheet(d.date);
  if (d.nav) return moveMonth(+d.nav);
  if (d.ynav) { ui.year += +d.ynav; return render(); }
  if (d.month) { ui.cursor = { y: ui.year, m: +d.month }; return setTab('month'); }
  if (d.bl) return changeState(d.bl);
  if (d.pick) { ui.sheetSel = d.pick; return renderSheet(); }
  if (d.act) return sheetAction(d.act);
  if (d.delvac) {
    if (!confirm('Diesen Urlaub löschen?')) return;
    data.vacations = data.vacations.filter((v) => v.id !== d.delvac);
    save();
    toast('Urlaub gelöscht');
    return render();
  }
  if (d.addvac !== undefined) {
    const from = ui.vacFrom;
    const to = ui.vacTo;
    if (!from || !to) return toast('Bitte Anfang und Ende wählen');
    if (to < from) return toast('Das Ende liegt vor dem Anfang');
    data.vacations.push({ id: Date.now().toString(36), start: from, end: to });
    save();
    ui.vacFrom = '';
    ui.vacTo = '';
    toast(`✓ ${countVacation(from, to)} Urlaubstage eingetragen`);
    return render();
  }
  if (d.vacics !== undefined) {
    const { text, n } = buildVacationICS();
    if (!n) return toast('Noch kein Urlaub eingetragen');
    downloadFile('urlaub.ics', text, 'text/calendar');
    return toast(`${n} Urlaub-Termin${n === 1 ? '' : 'e'} – Datei öffnen und „Alle hinzufügen“ tippen`);
  }
  if (d.shareapp !== undefined) {
    const url = location.href.split('#')[0];
    if (navigator.share) {
      navigator.share({ title: 'HAI Schichtplan', text: 'Mein Schichtplan mit Feiertagen & Ferien – kostenlos:', url }).catch(() => {});
    } else {
      navigator.clipboard && navigator.clipboard.writeText(url);
      toast('Link kopiert');
    }
    return;
  }
  if (d.retry !== undefined) { delete ferienState[`${data.bl}:${ui.year}`]; return render(); }

  const segEl = t.closest('[data-seg]');
  if (segEl && d.v !== undefined) {
    const name = segEl.dataset.seg;
    const s = data.setup;
    if (name === 'count') { s.count = +d.v; if (!buildOrder(s.count).includes(s.startShift)) s.startShift = 'F'; }
    else if (name === 'weeksPer') s.weeksPer = +d.v;
    else if (name === 'workdays') s.workdays = WORKDAY_PRESETS[d.v];
    else s[name] = d.v;
    save();
    return render();
  }

  if (d.apply !== undefined) {
    const plan = draftPlan();
    applyAuto(plan.start, data.setup.startShift);
    ui.cursor = { y: +plan.start.slice(0, 4), m: +plan.start.slice(5, 7) };
    return setTab('month');
  }
  if (d.resetColors !== undefined) { data.colors = { ...DEFAULT_COLORS }; save(); return render(); }
  if (d.ics !== undefined) {
    const { text, n } = buildICS();
    if (!n) return toast('Noch keine Schichten eingetragen');
    downloadFile('schichtplan.ics', text, 'text/calendar');
    return toast(`${n} Termine exportiert – Datei öffnen und „Alle hinzufügen“ tippen`);
  }
  if (d.backup !== undefined) {
    downloadFile(`schichtplan-sicherung-${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json');
    return toast('Sicherung gespeichert');
  }
  if (d.clear !== undefined) {
    if (!confirm('Wirklich alle Schichten und manuellen Einträge löschen?')) return;
    data.plans = [];
    data.overrides = {};
    save();
    toast('Alle Schichten gelöscht');
    return render();
  }
});

function onVacInput(el) {
  if (el.id === 'vacFrom') {
    ui.vacFrom = el.value;
    const toEl = $('#vacTo');
    if (el.value && (!ui.vacTo || ui.vacTo < el.value)) { ui.vacTo = el.value; if (toEl) toEl.value = el.value; }
  } else ui.vacTo = el.value;
  const info = $('#vacInfo');
  if (info) info.textContent = vacInfoText(ui.vacFrom, ui.vacTo);
}

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'vacFrom' || el.id === 'vacTo') onVacInput(el);
  else if (el.id === 'vhHours') { ui.vhHours = el.value; const hint = $('#vhHint'); if (hint) hint.textContent = vhHint(); }
  else if (el.id === 'vhDate') ui.vhDate = el.value;
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'vacFrom' || el.id === 'vacTo') return onVacInput(el);
  if (el.id === 'vhDate') { ui.vhDate = el.value; return; }
  if (el.id === 'startDate' && el.value) { data.setup.start = mondayOf(el.value); save(); render(); }
  else if (el.id === 'blSelect') changeState(el.value);
  else if (el.id === 'vacTotal') { data.vacationDays = Math.max(0, parseInt(el.value, 10) || 0); save(); render(); }
  else if (el.dataset.color) { data.colors[el.dataset.color] = el.value; save(); render(); }
  else if (el.dataset.time) {
    const [k, i] = el.dataset.time.split(':');
    data.times[k][+i] = el.value;
    save();
  } else if (el.id === 'restore' && el.files[0]) {
    el.files[0].text().then((txt) => {
      const obj = JSON.parse(txt);
      if (!obj || !Array.isArray(obj.plans) || typeof obj.overrides !== 'object') throw new Error('Format');
      localStorage.setItem(KEY, JSON.stringify(obj));
      data = load();
      holMemo.clear();
      toast('Sicherung geladen ✓');
      render();
    }).catch(() => toast('Diese Datei ist keine gültige Sicherung'));
  }
});

function goToday(tab) {
  const t = todayISO();
  ui.cursor = { y: +t.slice(0, 4), m: +t.slice(5, 7) };
  ui.year = +t.slice(0, 4);
  if (tab) return setTab(tab);
  render();
}

$('#todayBtn').addEventListener('click', () => goToday(ui.tab === 'settings' ? 'month' : null));

// Wischen im Monatskalender
let touchX = null;
document.addEventListener('touchstart', (e) => {
  touchX = e.target.closest('#cal') ? e.touches[0].clientX : null;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 60) moveMonth(dx < 0 ? 1 : -1);
}, { passive: true });

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.sheetMode) closeSheet(); });

// Nach Mitternacht oder beim Zurückkehren „Heute“ aktualisieren
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
