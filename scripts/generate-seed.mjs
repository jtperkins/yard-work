#!/usr/bin/env node
// Generates scripts/seed-dev.sql — realistic local sample data for the whole catalog.
//
//   node scripts/generate-seed.mjs        (then: pnpm db:seed:local)
//
// Output is deterministic (fixed PRNG seed) and every date is written relative to "today in Costa Rica"
// as SQL expressions, so the same file stays fresh whenever it is loaded. Yard-worker jobs land on the
// yard day (data/house.json → yardDay) of past weeks. Never put semicolons inside generated strings:
// the test harness splits the file on ';' at line ends.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tasks = JSON.parse(readFileSync(join(root, 'data/tasks.json'), 'utf8'));
const house = JSON.parse(readFileSync(join(root, 'data/house.json'), 'utf8'));
const taskById = new Map(tasks.map((t) => [t.id, t]));

// ---- deterministic randomness -------------------------------------------------------------
let state = 0x5eed2026;
function rand() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const chance = (p) => rand() < p;
function uuid() {
  const hex = Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16));
  hex[12] = '4';
  hex[16] = '89ab'[Math.floor(rand() * 4)];
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

// ---- people (the same strings the sign-off sheet suggests) --------------------------------
const [ME, NEIGHBOR, YARD] = house.people;
/** Days (ago) when the neighbour covered the house. */
const neighborCovering = (daysAgo) => daysAgo >= 18 && daysAgo <= 24;

// ---- SQL date expressions -----------------------------------------------------------------
const TODAY = `date('now', '-6 hours')`;
const MONDAY = `date('now', '-6 hours', 'weekday 0', '-6 days')`;
/** A date N days before today (CR). */
const daysAgo = (n) => ({ sql: `date(${TODAY}, '-${n} days')`, approx: n });
/** Weekday `dow` (1 = Mon … 7 = Sun) of the week `k` weeks before this one. k = 0 only for Monday. */
function weekDay(k, dow) {
  if (k === 0 && dow !== 1)
    throw new Error('only Monday of the current week is safely in the past');
  return { sql: `date(${MONDAY}, '-${7 * k - (dow - 1)} days')`, approx: 7 * k - (dow - 1) + 3 };
}
const stamp = (date, extra = []) =>
  `strftime('%Y-%m-%dT%H:%M:%fZ', ${[date.sql, ...extra.map((e) => `'${e}'`)].join(', ')})`;
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`);

// ---- completions -----------------------------------------------------------------------------
const completions = [];
function addCompletion({
  taskId = null,
  title = null,
  date,
  doneBy,
  loggedBy,
  note = null,
  minutes = 0,
}) {
  const c = {
    id: uuid(),
    taskId,
    title,
    date,
    doneBy,
    loggedBy: loggedBy ?? (doneBy === NEIGHBOR ? NEIGHBOR : ME),
    note,
    planItemId: null,
    minutes,
    deleted: false,
  };
  completions.push(c);
  return c;
}

const notesFor = {
  'mow-lawn': ['Front and back lawn', 'Grass very wet, did the back only after lunch'],
  'clear-drains': ['Ditch by the road was full of leaves'],
  'zompopas-check': ['New trail near the mango tree, baited it'],
  'mold-check': ['Wiped the closet in the guest room with vinegar'],
  'cat-brush-tick-check': ['One tick on the orange cat, removed'],
  'rust-inspection': ['Spot-treated the front gate hinges'],
  'fruit-tree-care': ['Picked a bag of limes'],
};
const maybeNote = (taskId) =>
  notesFor[taskId] && chance(0.25)
    ? notesFor[taskId][between(0, notesFor[taskId].length - 1)]
    : null;

// Yard-worker jobs: done on the yard day, every `every` weeks, last done `last` weeks ago.
const yardSchedule = {
  'mow-lawn': { every: 1, last: 1 },
  'trim-edges': { every: 1, last: 1, miss: [2, 9] },
  'rake-debris': { every: 1, last: 1, miss: [5] },
  'weed-beds': { every: 2, last: 1 },
  'trim-hedges': { every: 4, last: 2 },
  'clear-drains': { every: 2, last: 2 },
  'zompopas-check': { every: 2, last: 3 },
  'prune-trees': { every: 13, last: 5 },
  fertilize: { every: 13, last: 11 },
  'mulch-beds': { every: 26, last: 20 },
  'scrub-walkways': { every: 9, last: 10 },
};
const YARD_WEEKS = 26;
for (const [taskId, { every, last, miss = [] }] of Object.entries(yardSchedule)) {
  for (let k = last; k <= YARD_WEEKS; k += every) {
    if (miss.includes(k)) continue;
    addCompletion({
      taskId,
      date: weekDay(k, house.yardDay),
      doneBy: YARD,
      note: maybeNote(taskId),
      minutes: between(0, 50),
    });
  }
}

// Everything else: last done `last` days ago, earlier ones at jittered intervals back to `history` days.
const daySchedule = {
  'rust-inspection': { last: 40 },
  'repaint-metal': { last: 190, history: 200 },
  'treat-exterior-wood': { last: 200, history: 210 },
  'fruit-tree-care': { last: 9 },
  'water-garden': { last: 162, history: 230, every: 3 },
  'water-sheltered-pots': { last: 2, history: 60 },
  'check-irrigation': { last: 170, history: 240, every: 30 },
  'clean-gutters': { last: 52 },
  'gutters-deep-clean': { last: 185, history: 190 },
  'check-water-system': { last: 88 },
  // 'septic-check' and 'emergency-kit-check' are deliberately never done.
  'scorpion-termite-inspection': { last: 12 },
  'standing-water-check': { last: 5 },
  'mold-check': { last: 16 },
  'clean-screens': { last: 30 },
  'roof-inspection': { last: 180, history: 190 },
  'trash-out': { last: 4 },
  'test-detectors': { last: 120 },
  'check-gas-cylinder': { last: 27 },
  'litter-full-change': { last: 6 },
  'cat-brush-tick-check': { last: 8 },
  'flea-tick-treatment': { last: 25 },
  deworming: { last: 60 },
  'vet-checkup': { last: 210, history: 220 },
};
function doerFor(task, ago) {
  if (task.who === 'sitter') return neighborCovering(ago) ? NEIGHBOR : ME;
  if (task.who === 'yard') return YARD;
  return chance(0.3) ? YARD : ME;
}
for (const [taskId, { last, history = 200, every }] of Object.entries(daySchedule)) {
  const task = taskById.get(taskId);
  if (!task) throw new Error(`unknown task ${taskId}`);
  const base = every ?? task.frequencyDaysBySeason?.rainy ?? task.frequencyDays;
  for (
    let ago = last;
    ago <= history;
    ago += Math.max(1, Math.round(base * (0.9 + rand() * 0.35)))
  ) {
    addCompletion({
      taskId,
      date: daysAgo(ago),
      doneBy: doerFor(task, ago),
      note: maybeNote(taskId),
      minutes: between(0, 50),
    });
  }
}

// Daily cat care: every day for ~7 months except a few misses. Today is left for the user to sign off.
for (let ago = 1; ago <= 210; ago++) {
  if ([33, 71, 72, 140].includes(ago)) continue;
  addCompletion({
    taskId: 'daily-cat-care',
    date: daysAgo(ago),
    doneBy: neighborCovering(ago) ? NEIGHBOR : ME,
    minutes: between(0, 30),
  });
}

// Ad-hoc jobs.
const adHoc = [
  ['Cleared fallen branch after storm', 5, YARD, 'Big guanacaste limb across the driveway'],
  ['Fixed sticky front gate latch', 13, ME, 'WD-40 and tightened the bolt'],
  ['Unclogged kitchen sink', 24, NEIGHBOR, null],
  ['Swept leaves off the roof terrace', 33, YARD, null],
  ['Bought cat litter and food', 44, ME, null],
  ['Replaced porch light bulb', 49, ME, null],
  ['Removed wasp nest under the eave', 55, YARD, 'Done at dusk, no stings'],
  ['Patched the hole in the chicken-wire fence', 96, YARD, null],
];
for (const [title, ago, doneBy, note] of adHoc)
  addCompletion({ title, date: daysAgo(ago), doneBy, note, minutes: 30 });

// One soft-deleted mistake, to show the audit trail.
const oops = addCompletion({
  taskId: 'trash-out',
  date: daysAgo(2),
  doneBy: ME,
  note: 'Logged by mistake (wrong day)',
});
oops.deleted = true;

// ---- weekly plans (this week + the two before) --------------------------------------------
const planItems = [];
function addPlan({
  k,
  taskId = null,
  title = null,
  assignee,
  note = null,
  status = 'planned',
  doneDate,
}) {
  const item = { id: uuid(), k, taskId, title, assignee, note, status };
  planItems.push(item);
  if (status === 'done') {
    let c = completions.find(
      (x) => !x.deleted && x.taskId === taskId && taskId !== null && x.date.sql === doneDate.sql,
    );
    if (!c) c = addCompletion({ taskId, title, date: doneDate, doneBy: assignee, minutes: 40 });
    c.planItemId = item.id;
  }
  return item;
}
const yardDayOf = (k) => weekDay(k, house.yardDay);
// This week: Monday chores already done, the yard day still ahead.
addPlan({ k: 0, taskId: 'mow-lawn', assignee: YARD, note: 'Front and back lawn' });
addPlan({ k: 0, taskId: 'trim-edges', assignee: YARD });
addPlan({
  k: 0,
  taskId: 'clear-drains',
  assignee: YARD,
  note: 'Heavy rain forecast, check the culvert first',
});
addPlan({ k: 0, taskId: 'rust-inspection', assignee: ME });
addPlan({
  k: 0,
  taskId: 'zompopas-check',
  assignee: YARD,
  note: 'Too rainy, bait washes away',
  status: 'skipped',
});
addPlan({
  k: 0,
  taskId: 'humidity-absorbers',
  assignee: ME,
  status: 'done',
  doneDate: weekDay(0, 1),
});
addPlan({
  k: 0,
  title: 'Buy trimmer line',
  assignee: ME,
  note: 'Ferretería in San Ramón',
  status: 'done',
  doneDate: weekDay(0, 1),
});
// Last week.
addPlan({ k: 1, taskId: 'mow-lawn', assignee: YARD, status: 'done', doneDate: yardDayOf(1) });
addPlan({ k: 1, taskId: 'trim-edges', assignee: YARD, status: 'done', doneDate: yardDayOf(1) });
addPlan({ k: 1, taskId: 'weed-beds', assignee: YARD, status: 'done', doneDate: yardDayOf(1) });
addPlan({
  k: 1,
  title: 'Clear drainage ditch by the road',
  assignee: YARD,
  status: 'done',
  doneDate: yardDayOf(1),
});
addPlan({
  k: 1,
  taskId: 'rust-inspection',
  assignee: ME,
  note: 'Out of primer',
  status: 'skipped',
});
// Two weeks ago.
addPlan({ k: 2, taskId: 'mow-lawn', assignee: YARD, status: 'done', doneDate: yardDayOf(2) });
addPlan({ k: 2, taskId: 'clear-drains', assignee: YARD, status: 'done', doneDate: yardDayOf(2) });
addPlan({ k: 2, taskId: 'trim-hedges', assignee: YARD, status: 'done', doneDate: yardDayOf(2) });
addPlan({
  k: 2,
  title: 'Clean carport gutters',
  assignee: YARD,
  note: 'Moved to next month',
  status: 'skipped',
});

// Humidity absorbers are weekly: the Monday plan item above is the latest, add earlier Mondays.
for (let k = 1; k <= 20; k++)
  addCompletion({
    taskId: 'humidity-absorbers',
    date: weekDay(k, 1),
    doneBy: neighborCovering(7 * k) ? NEIGHBOR : ME,
  });

// ---- notes -----------------------------------------------------------------------------------
const notes = [
  {
    author: ME,
    pinned: 1,
    ago: 60,
    minute: 7,
    body: `🐈 CATS (template — replace the brackets)
Names: [cat 1], [cat 2], [cat 3]
Food & amounts: [brand] — [amount] in the morning, [amount] in the evening
Meds: [which cat, what, when]
Quirks: [hiding spots, who must stay inside, who bolts for the door]
Vet: [clinic name], [phone], [address / hours]`,
  },
  {
    author: ME,
    pinned: 1,
    ago: 60,
    minute: 6,
    body: `🚨 EMERGENCY CONTACTS (template)
Owner: [name] — WhatsApp [+506 ...]
Neighbor: [name] — [phone], [which house]
Emergencies: 911
After-hours vet: [clinic] — [phone]
Nearest clinic / hospital: [name, how to get there]`,
  },
  {
    author: ME,
    pinned: 1,
    ago: 60,
    minute: 5,
    body: `🔧 UTILITIES (template)
Water shutoff: [where the main valve is]
Water tank / pump: [location, how to reset]
Breaker panel: [location, which breaker is what]
Wi-Fi: [network name] / password: [password]
Gas: [tank location, supplier phone]
Power or water outage line: [phone]`,
  },
  {
    author: ME,
    pinned: 1,
    ago: 60,
    minute: 4,
    body: `🌿 YARD WORKER (template)
Name: [name]
Day: [usually Thursday], [hours]
Pay: [amount, cash or SINPE, when]
WhatsApp: [+506 ...]
Brings: [own trimmer?] — we provide: [gas, line, bags]`,
  },
  {
    author: ME,
    pinned: 1,
    ago: 60,
    minute: 3,
    body: `🏠 HOUSE QUIRKS (template)
Front gate: [how to lock it, sticks when wet?]
Trash days: [days, where the bins go]
Leaks / damp spots: [where to watch in heavy rain]
Keys: [where spares are]
Anything else: [...]`,
  },
  {
    author: NEIGHBOR,
    pinned: 0,
    ago: 20,
    minute: 5,
    body: 'Covering cats this week. Mía hides under the guest bed when it storms — she comes out for dinner.',
  },
  {
    author: ME,
    pinned: 0,
    ago: 3,
    minute: 6,
    body: 'Front gate sticks after heavy rain: lift it slightly while closing. Bought a new can of anticorrosive primer, it is in the bodega.',
  },
];

// ---- write SQL -------------------------------------------------------------------------------
const lines = [
  '-- Yard Work dev seed. Local only: pnpm db:migrate:local && pnpm db:seed:local',
  '-- GENERATED by scripts/generate-seed.mjs — edit the generator, not this file.',
  '-- WARNING: clears completions, plan_items and notes in the LOCAL database first.',
  '-- Dates are relative to today in Costa Rica (UTC-6, no DST), so the seed stays fresh whenever it is loaded.',
  '',
  'DELETE FROM completions;',
  'DELETE FROM plan_items;',
  'DELETE FROM notes;',
  '',
  '-- Weekly plan (this week + two previous weeks)',
];
for (const p of planItems) {
  const week = { sql: `date(${MONDAY}, '-${7 * p.k} days')` };
  const created = stamp(week, ['+14 hours']);
  const updated = p.status === 'planned' ? created : stamp(week, ['+14 hours', '+30 minutes']);
  lines.push(
    `INSERT INTO plan_items (id, week_start, task_id, title, assignee, note, status, created_by, created_at, updated_at) VALUES (${[
      q(p.id),
      week.sql,
      q(p.taskId),
      q(p.title),
      q(p.assignee),
      q(p.note),
      q(p.status),
      q(ME),
      created,
      updated,
    ].join(', ')});`,
  );
}
lines.push('', '-- Sign-offs');
completions.sort((a, b) => a.date.approx - b.date.approx);
for (const c of completions) {
  const created = stamp(c.date, ['+14 hours', `+${c.minutes} minutes`]);
  const deleted = c.deleted ? stamp(c.date, ['+14 hours', `+${c.minutes + 15} minutes`]) : 'NULL';
  lines.push(
    `INSERT INTO completions (id, task_id, title, done_on, done_by, logged_by, note, plan_item_id, created_at, deleted_at, deleted_by) VALUES (${[
      q(c.id),
      q(c.taskId),
      q(c.title),
      c.date.sql,
      q(c.doneBy),
      q(c.loggedBy),
      q(c.note),
      q(c.planItemId),
      created,
      deleted,
      c.deleted ? q(c.loggedBy) : 'NULL',
    ].join(', ')});`,
  );
}
lines.push(
  '',
  '-- Handoff notes: the pinned template by section (fill in on the live site, never in the repo) + recent notes',
);
for (const n of notes) {
  if (n.body.includes(';')) throw new Error('no semicolons in seed strings');
  lines.push(
    `INSERT INTO notes (id, author, body, pinned, created_at) VALUES (${[
      q(uuid()),
      q(n.author),
      q(n.body),
      n.pinned,
      stamp(daysAgo(n.ago), ['+15 hours', `+${n.minute} minutes`]),
    ].join(', ')});`,
  );
}
lines.push('');
writeFileSync(join(root, 'scripts/seed-dev.sql'), lines.join('\n'));
console.log(
  `seed-dev.sql: ${planItems.length} plan items, ${completions.length} sign-offs, ${notes.length} notes`,
);
