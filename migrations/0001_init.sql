-- Yard Work D1 schema (plan §3.3 + Revision 1 §14.3).
-- Keep semicolons out of comments: test helpers may split this file on semicolons.
-- Dates: done_on / week_start are CR-local calendar dates (YYYY-MM-DD).
-- Timestamps (*_at) are ISO-8601 UTC strings.

-- Sign-offs ("the clipboard"). Soft delete keeps the audit trail.
CREATE TABLE completions (
  id TEXT PRIMARY KEY,                -- client-generated UUID (idempotent POST)
  task_id TEXT,                       -- catalog task id, NULL for ad-hoc work
  title TEXT,                         -- ad-hoc title when task_id is NULL
  done_on TEXT NOT NULL,              -- YYYY-MM-DD (CR local), may be backdated, never future
  done_by TEXT NOT NULL,              -- who did the work (may be the yard worker)
  logged_by TEXT NOT NULL,            -- session name of whoever signed
  note TEXT,
  plan_item_id TEXT,                  -- single direction link: completion -> plan item
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  deleted_by TEXT,
  CHECK ((task_id IS NULL) <> (title IS NULL))
);
CREATE INDEX idx_completions_task ON completions(task_id, done_on);
CREATE INDEX idx_completions_done_on ON completions(done_on);
CREATE INDEX idx_completions_plan_item ON completions(plan_item_id);

-- Weekly plan. Status 'done' is set in the same batch that inserts the linked completion.
CREATE TABLE plan_items (
  id TEXT PRIMARY KEY,                -- client-generated UUID (idempotent POST)
  week_start TEXT NOT NULL,           -- Monday YYYY-MM-DD
  task_id TEXT,                       -- catalog task, or ...
  title TEXT,                         -- ... ad-hoc title (exactly one)
  assignee TEXT,                      -- free text, e.g. 'Yard worker'
  note TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'skipped')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((task_id IS NULL) <> (title IS NULL))
);
CREATE INDEX idx_plan_week ON plan_items(week_start);
-- A catalog task can be planned at most once per week (API maps the conflict to 409).
CREATE UNIQUE INDEX idx_plan_week_task ON plan_items(week_start, task_id) WHERE task_id IS NOT NULL;

-- Handoff notes (sign-in only, read and write). No edit: delete + repost.
CREATE TABLE notes (
  id TEXT PRIMARY KEY,                -- client-generated UUID (idempotent POST)
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  deleted_by TEXT
);
CREATE INDEX idx_notes_created ON notes(created_at);
