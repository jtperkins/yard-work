-- Iteration 2: tasks move into the database, partial sign-offs, incident reports.
-- Additive only, because the old code is still live while CI applies this file.
-- Keep semicolons, double hyphens and apostrophes out of comments and string values.
-- Multi-line steps are joined with char(10), one single-quoted literal per step.

-- Tasks are created and edited in the app. kind is once or recurring.
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,                -- kebab slug made from the title, never changes
  title TEXT NOT NULL,
  title_es TEXT,
  steps TEXT NOT NULL DEFAULT '',     -- one step per line
  steps_es TEXT,
  safety TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('once', 'recurring')),
  interval_count INTEGER,
  interval_unit TEXT CHECK (interval_unit IN ('day', 'week', 'month')),
  due_on TEXT,                        -- one-off tasks only, YYYY-MM-DD
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  archived_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((kind = 'recurring') = (interval_count IS NOT NULL AND interval_unit IS NOT NULL))
);

-- A partial sign-off means work started but not finished. It never resets the schedule.
ALTER TABLE completions ADD COLUMN partial INTEGER NOT NULL DEFAULT 0 CHECK (partial IN (0, 1));

-- Incident reports (sightings, people poking around, trespassing). Sign-in only.
CREATE TABLE incidents (
  id TEXT PRIMARY KEY,                -- client-generated UUID (idempotent POST)
  occurred_at TEXT NOT NULL,          -- ISO-8601 UTC
  type TEXT NOT NULL CHECK (type IN ('sighting', 'poking-around', 'trespassing', 'other')),
  location TEXT,
  description TEXT NOT NULL,
  people TEXT,                        -- free text names
  reported_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  deleted_by TEXT
);
CREATE INDEX idx_incidents_occurred ON incidents(occurred_at);

-- Attachments live in the private R2 bucket, this table is the index.
CREATE TABLE incident_files (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,            -- sanitized
  content_type TEXT NOT NULL,         -- normalized media type
  size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_incident_files_incident ON incident_files(incident_id);

INSERT INTO tasks
  (id, title, title_es, steps, steps_es, safety, kind, interval_count, interval_unit, due_on, priority, created_by, created_at, updated_at)
VALUES (
  'rust-inspection',
  'Spot-treat rust on the black painted metal',
  'Retocar el óxido del metal pintado de negro',
  'Walk the black painted gates, railings and window grilles and look for rust spots or bubbling paint.'
    || char(10) || 'Wire-brush each rust spot down to bright metal.'
    || char(10) || 'Wipe off the dust, then degrease with a rag and thinner.'
    || char(10) || 'Dab on anticorrosive primer, covering a little past the bare patch, and let it dry.'
    || char(10) || 'Touch up with black enamel to match.'
    || char(10) || 'Note any large or spreading rust in the log so a full repaint can be planned.',
  NULL,
  'Gloves and a dust mask. Work in the morning, before the afternoon rain.',
  'recurring', 6, 'month', NULL, 'normal',
  'system', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'
);

INSERT INTO tasks
  (id, title, title_es, steps, steps_es, safety, kind, interval_count, interval_unit, due_on, priority, created_by, created_at, updated_at)
VALUES (
  'chapia',
  'Chapia (mow and weed-eat)',
  'Chapia (cortar el zacate y orillar)',
  'Clear sticks, stones and fallen fruit from the lawn.'
    || char(10) || 'Check the fuel mix and the trimmer line before starting.'
    || char(10) || 'Mow the lawn to about 5 cm.'
    || char(10) || 'Weed-eat the edges, fence lines, paths and around posts and trees.'
    || char(10) || 'Rake up and bag the cuttings.',
  NULL,
  'Closed shoes, eye protection and ear protection. Keep people and pets away while cutting.',
  'recurring', 14, 'day', NULL, 'high',
  'system', '2026-10-17T12:00:00Z', '2026-10-17T12:00:00Z'
);

-- Chapia was half done on 2026-10-17 and will be finished next week.
INSERT INTO completions
  (id, task_id, title, done_on, done_by, logged_by, note, plan_item_id, partial, created_at)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'chapia', NULL, '2026-10-17', 'Dario', 'JT',
  'Partial - returning next week to finish',
  NULL, 1, '2026-10-17T12:00:00Z'
);
