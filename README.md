# Yard Work

House & grounds accountability app for a house-sit in Bajo La Paz (San Ramón, Alajuela, Costa Rica):
one-off and recurring tasks, job-site style sign-offs (including partial ones, "half done, finishing
next week"), handoff notes and a basic incident log, so anyone — owner, neighbour, future sitters, the
yard worker — can see what's due and hand off with zero tribal knowledge. English and Spanish.

- **Frontend:** Vite + React 19 + TypeScript (strict) + Tailwind CSS v4, react-router 7, TanStack Query.
- **Backend:** Cloudflare Pages Functions (`functions/`) + Cloudflare D1 (SQLite) for records
  (tasks, sign-offs, handoff notes, incidents) + a private Cloudflare R2 bucket for incident files.
- **Tasks:** stored in D1 and created, edited and archived in the app (no code change or deploy).
- **Auth:** name + shared house code → signed HttpOnly cookie (90 days). The board, tasks and log are
  readable without signing in; handoff notes and incidents need a session, and so does every write.
  This is a drive-by deterrent, not real security.

## Screens

| Route                                  | What                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `/` Board                              | Today's daily jobs, what needs attention (overdue first), stat tiles, sign-off          |
| `/tasks`, `/tasks/:id`                 | Task list (All, One-off, Recurring, Done, Archived) with search; a task's steps and log |
| `/tasks/new`, `/tasks/:id/edit` (auth) | Create and edit a task; archive or unarchive from its page                              |
| `/incidents` (signed in)               | Incident reports; `/incidents/new` to report one, `/incidents/:id` for the detail       |
| `/log`                                 | Every sign-off, filter by person / dates, soft-delete, CSV export                       |
| `/insights`                            | Activity heatmap, sign-offs per person per week                                         |
| `/handoff` (signed in)                 | State of the house, pinned essentials, notes between sitters, how-it-works              |
| `/login`                               | Name + house code                                                                       |

The old `/week` and `/calendar` URLs redirect to the Board.

## Repository layout

| Path                    | What                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `migrations/`           | D1 schema (`wrangler d1 migrations`)                                                                |
| `functions/`            | Pages Functions route handlers + middleware (`/api/*`)                                              |
| `server/lib/`           | Server helpers: session, http, repo, validation; `server/test/` D1-backed API tests                 |
| `src/shared/`           | Contracts shared by browser and server: API zod schemas, language helpers, CR-timezone date helpers |
| `src/domain/`           | Pure scheduling / stats logic                                                                       |
| `src/ui/`               | Design-system component library (dumb components, tokens only) — see `src/ui/README.md`             |
| `src/features/`         | Screens (compose `src/ui` only)                                                                     |
| `src/i18n/`             | EN/ES dictionaries per namespace, `useT`, `LanguageProvider`                                        |
| `src/api/`              | Typed fetch client + TanStack Query hooks                                                           |
| `src/app/`              | App shell, providers, router                                                                        |
| `src/styles/tokens.css` | Design tokens (light + dark) mapped into Tailwind                                                   |

## Local development

Requirements: Node 22+, pnpm (version pinned in `package.json` → `packageManager`; `corepack enable`).
No Cloudflare account is needed: wrangler runs D1 locally under `.wrangler/`.

```sh
pnpm install
cp .dev.vars.example .dev.vars        # set HOUSE_CODE (8+ chars) and SESSION_SECRET (any long string locally)
pnpm db:migrate:local                 # create the local D1 database
pnpm dev                              # http://localhost:5173 (Vite) → /api proxied to wrangler pages dev on :8788
```

Sign in at <http://localhost:5173/login> with any name and the `HOUSE_CODE` from your `.dev.vars`.

- **Starting data.** Migration `0002` seeds exactly two tasks (`rust-inspection`, every 6 months, and
  `chapia`, every 14 days) and one partial `chapia` sign-off, so a fresh local database matches
  production. There is no other sample data.
- **Reset the local database:** delete `.wrangler/state`, then run `pnpm db:migrate:local` again.
  This also resets the local R2 bucket that holds incident files.
- **Production-like run:** `pnpm build` then open <http://localhost:8788> (wrangler serves `dist/`
  and the functions together, exactly as Pages does).
- **Component kit:** the dev-only kitchen sink lives at <http://localhost:5173/ui>.
- Dark mode follows the operating system (`prefers-color-scheme`); there is no theme toggle.

| Script                                            | Does                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                                        | Vite dev server + `wrangler pages dev` (API + local D1)                  |
| `pnpm build` / `pnpm preview`                     | Production build to `dist/` / preview it                                 |
| `pnpm typecheck`                                  | `tsc -b` over app, server and tooling projects                           |
| `pnpm lint` / `pnpm format`                       | ESLint (incl. the no-raw-controls rule for screens) / Prettier           |
| `pnpm test` / `pnpm test:watch` / `pnpm coverage` | Vitest (projects: `unit`, `web` (jsdom), `server` (Node + Miniflare D1)) |
| `pnpm db:migrate:local`                           | Apply migrations to the local D1                                         |
| `pnpm check`                                      | typecheck + lint + test + build (what CI runs)                           |

Server tests start a fresh in-memory D1 per test file through wrangler's `getPlatformProxy()` and
apply the real migrations, so they need no setup.

## Managing tasks (in the app)

Tasks live in the D1 `tasks` table. Anyone signed in can add and edit them: **Tasks → New task**. Changes
show immediately, with no commit or deploy.

- A task is **one-off** (optionally with a due date) or **recurring** (every N days, weeks or months).
  Steps are one per line, with optional Spanish text (English is shown when it is left empty), safety
  notes and a priority.
- The id is a slug of the title (`Fix gate latch` → `fix-gate-latch`, then `-2`, `-3` on a clash) and never
  changes when the task is edited. `new` and `edit` are reserved, so a task titled "New" gets `new-task`.
- **Archive** a task from its page to retire it. It disappears from the Board and the default list, its
  old sign-offs keep their title in the Log and CSV export, and **Tasks → Archived → Unarchive** brings it
  back. Tasks are never deleted.
- **Partial sign-offs.** In the sign-off sheet choose "Partially done" and say what is left. The task shows
  "In progress", the schedule does not reset, and it counts as done only when someone signs it off fully.
  Only full sign-offs are counted on the Board and in Insights.

How due dates work: a recurring task's next due = last **full** sign-off + its interval (calendar months for
month intervals, clamped to month end). A task never signed off fully counts as due now. "Due soon" means
within 3 days (and never right after a sign-off). A one-off is done after one full sign-off; before that it is
"never done", or on time / due soon / overdue against its due date. "On track" = open tasks that are not
overdue.

## Handoff notes

`/handoff` is the only screen that needs sign-in to **read**, because notes hold private details.
Notes live only in D1 — **never put private information in the repo**.

After the first deploy, sign in on the live site and create these **pinned** notes (tick "Pin to
top"; the composer's "Start from the template" button fills in this outline). Notes can't be edited:
to change one, post the new version and delete the old one.

```text
🐈 CATS
Names: [cat 1], [cat 2], [cat 3]
Food & amounts: [brand] — [amount] in the morning, [amount] in the evening
Meds: [which cat, what, when]
Quirks: [hiding spots, who must stay inside, who bolts for the door]
Vet: [clinic name], [phone], [address / hours]

🚨 EMERGENCY CONTACTS
Owner: [name] — WhatsApp [+506 ...]
Neighbor: [name] — [phone], [which house]
Emergencies: 911
After-hours vet: [clinic] — [phone]
Nearest clinic / hospital: [name, how to get there]

🔧 UTILITIES
Water shutoff: [where the main valve is]
Water tank / pump: [location, how to reset]
Breaker panel: [location, which breaker is what]
Wi-Fi: [network name] / password: [password]
Gas: [tank location, supplier phone]

🌿 YARD WORKER
Name: [name]
Day: [usually Thursday], [hours]
Pay: [amount, cash or SINPE, when]
WhatsApp: [+506 ...]
Brings: [own trimmer?] — we provide: [gas, line, bags]

🏠 HOUSE QUIRKS
Front gate: [how to lock it, sticks when wet?]
Trash days: [days, where the bins go]
Leaks / damp spots: [where to watch in heavy rain]
Keys: [where spares are]
```

The page also builds a live "State of the house" summary (overdue, due in the next 7 days, sign-offs
from the last 14 days) from the schedule and the log.

## One-time Cloudflare setup

Needed once, by someone with the Cloudflare account. Until step 2 is done `wrangler.toml` carries a
placeholder database id and the CI deploy job fails fast with a clear message (the checks job still
runs and passes).

1. `pnpm dlx wrangler login`
2. `pnpm dlx wrangler d1 create yard-work` → paste the printed `database_id` into `wrangler.toml`
   and commit it (the id is not a secret).
3. `pnpm dlx wrangler pages project create yard-work --production-branch main`
4. Secrets (choose a house code of **at least 8 characters**; the session secret should be 32+ random bytes):
   ```sh
   pnpm dlx wrangler pages secret put HOUSE_CODE --project-name yard-work
   pnpm dlx wrangler pages secret put SESSION_SECRET --project-name yard-work
   # generate a secret: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
   If either secret is missing, sign-in returns an error instead of letting anyone in.
5. GitHub repository secrets for CI:
   - `CLOUDFLARE_API_TOKEN` — API token with **Account → Cloudflare Pages: Edit** and **Account → D1: Edit**
   - `CLOUDFLARE_ACCOUNT_ID` — shown in the Cloudflare dashboard sidebar
   ```sh
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set CLOUDFLARE_ACCOUNT_ID
   ```
6. Push `main`. CI runs the checks, applies D1 migrations remotely and deploys to
   `https://yard-work.pages.dev` (or the suffixed name Cloudflare assigns — `wrangler pages project list`).
7. Sign in on the live site and add the pinned handoff notes (above). Share the link and the house
   code with the people who need it.

## Incidents and R2

`/incidents` is a basic log of sightings, people poking around and trespassing. Each report has a time,
type, place, a description, names of people involved and attachments (photos, videos, PDFs). Everything,
including file downloads, needs a session.

Files live in a **private** R2 bucket bound as `INCIDENT_FILES` in `wrangler.toml`. One-time setup:

```sh
pnpm dlx wrangler r2 bucket create yard-work-incidents
pnpm dlx wrangler r2 bucket list      # confirm it is listed
```

Never enable a public `r2.dev` URL or a custom domain on the bucket: files are only served through
`/api/incidents/files/:id`, which checks the session and sends `nosniff`, a sandboxing CSP, `no-store`
and a safe `Content-Disposition`. If a deploy fails on the R2 binding, add the binding in the dashboard
(Pages → yard-work → Settings → Bindings) and re-run the job.

Limits: 10 files per report, images and PDFs up to 10 MB, videos up to 50 MB; JPEG, PNG, WebP, HEIC/HEIF,
MP4, MOV and PDF only. HEIC is stored as is and offered as a download because most browsers cannot show it.
Local `pnpm dev` and the server tests use an in-memory or local R2, so no Cloudflare account is needed.

## Deploy

Every push to `main` deploys via `.github/workflows/ci.yml`: the `check` job runs typecheck, lint,
test and build and uploads `dist/`; the `deploy` job runs
`wrangler d1 migrations apply yard-work --remote` and
`wrangler pages deploy dist --project-name=yard-work --branch=main` (`pages deploy` also compiles
`functions/`). Pull requests run the checks only. Deploys never overlap (concurrency group).

Schema changes: add a new numbered file to `migrations/` (never edit an applied one), run
`pnpm db:migrate:local`, and CI applies it remotely before deploying.

## Operations

- **Rotate the house code:** `pnpm dlx wrangler pages secret put HOUSE_CODE --project-name yard-work`
  (existing sessions stay signed in). Rotating `SESSION_SECRET` signs everyone out.
- **Back up the records:** `pnpm dlx wrangler d1 export yard-work --remote --output=yard-work-backup.sql`.
- **Audit trail:** deleting a sign-off, a note or an incident is a soft delete — the row keeps
  `deleted_at` / `deleted_by` in D1. Tasks are archived, never deleted.
- Sign-offs, notes and incidents carry client-generated ids, so a retried request on a flaky connection
  never creates duplicates.
