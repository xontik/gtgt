# GtG Tracker

A personal web app to log "Grease the Groove" (GtG) style calisthenics training:
frequent, low-fatigue sets of an exercise spread across the day, logged fast
from a phone. It's installable as a PWA (look for "Add to Home Screen" /
"Install app" in your browser) so it opens like a native app instead of a
browser tab.

## Stack

- **Frontend**: Vite + Vue 3 + TypeScript + Vuetify 3 + Pinia (`apps/web`)
- **Backend**: Fastify + TypeScript REST API (`apps/api`)
- **Offline queue**: no extra library — a small IndexedDB-backed queue plus
  a runtime-caching service worker (`apps/web/src/lib/offlineQueue.ts`,
  `apps/web/public/sw.js`)
- **Shared**: Zod schemas + types used by both apps (`packages/shared`)
- **Database**: SQLite (via `@libsql/client`), Drizzle ORM
- **Package manager**: pnpm workspaces

## Getting started

### Prerequisites

- Node 24 (see `.nvmrc` — run `nvm use` if you use nvm)
- pnpm (`corepack enable` will pick up the version pinned in `package.json`)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up the database

```bash
cd apps/api
pnpm db:migrate   # creates apps/api/data/gtg.sqlite and applies migrations
pnpm db:seed      # seeds starter exercises: push-up and pistol squat progressions
```

### 3. Run the dev servers

From the repo root, in two terminals:

```bash
pnpm dev:api   # Fastify API on http://localhost:3001
pnpm dev:web   # Vue app on http://localhost:5174 (Vite proxies /api to the API)
```

Open the web app URL Vite prints (default `http://localhost:5174`). The dev
server also prints a network URL so you can open it from your phone on the
same Wi-Fi.

### Other useful commands (run from repo root)

```bash
pnpm typecheck   # typecheck all packages
pnpm lint        # lint all packages
pnpm build       # build all packages
```

### Regenerating the PWA icons

`apps/web/public/icon-192.png`, `icon-512.png`, and `icon-maskable-512.png`
are generated from `apps/web/public/favicon.svg`. Re-run this whenever the
favicon changes — it's idempotent, always overwrites, never accumulates
files:

```bash
brew install librsvg imagemagick   # one-time, if you don't have them
pnpm --filter @gtg/web generate-icons
```

(needs `rsvg-convert` and `convert` on `PATH` — the script is
`apps/web/scripts/generate-icons.sh`, plain shell, no native Node module
build involved.)

To reset the local database, delete `apps/api/data/gtg.sqlite` and re-run
`pnpm db:migrate && pnpm db:seed` from `apps/api`.

If you had data from before variation branching was removed (migration
`0007`), `difficultyRank` may be off — it used to be scoped per
sibling-group under a `parentVariationId`, so unbranched variations can
collide on the same rank once flattened into one ladder. Run
`pnpm --filter @gtg/api db:backfill-difficulty-rank` once (from repo root,
or `pnpm db:backfill-difficulty-rank` from `apps/api`) to renumber each
exercise's variations sequentially in their current order. Safe to re-run;
it's a no-op once ranks are already sequential.

## Deployment (Docker Compose on a VPS)

A single `Dockerfile` at the root builds one image with one service
(`app`): the Fastify API serves both `/api/*` and the built Vue SPA
directly (no nginx, no second container, same-origin so no CORS needed). It
runs with `tsx` (no separate compile step), applies Drizzle migrations on
every start, and stores the SQLite file on a named volume (`api_data`) so
data survives redeploys. Exposed on host port `8080` by default (override
with `WEB_PORT` env var).

Every push to `main` and every `vX.Y.Z` tag builds and publishes a multi-arch
(`amd64`/`arm64`) image to GHCR via
[`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml):
`ghcr.io/xontik/gtgt`, tagged `latest`, `<version>`, `<major>.<minor>`, and
the commit SHA.

### Quick start: run the published image

No repo clone needed — grab just two files,
[`docker-compose.yml`](docker-compose.yml) and `.env.example` (rename to
`.env`, fill in), then:

```bash
docker compose up -d
```

Set `IMAGE_TAG` in `.env` to pin a specific version instead of `latest`
(e.g. `IMAGE_TAG=1.2.0`).

One-time setup after the first successful workflow run: GHCR packages are
created **private** by default regardless of the repo's visibility — go to
the package's page (github.com → your profile/org → Packages → `gtgt`) →
Package settings → change visibility to Public, so others can pull without
`docker login`.

### Building from source instead

Use [`docker-compose.dev.yml`](docker-compose.dev.yml) — for testing
Dockerfile/app changes before pushing, or if you'd rather not rely on the
published image:

```bash
git clone <this repo> gtg-tracker && cd gtg-tracker
cp .env.example .env   # fill in DISCORD_WEBHOOK_URL / PUBLIC_APP_URL, see below
docker compose -f docker-compose.dev.yml up -d --build
```

Then open `http://<vps-host>:8080`. To put it behind a domain with TLS, run
your own reverse proxy (Caddy, Traefik, nginx) in front of the `app`
service — this compose file doesn't manage certificates itself.

### Idle-training reminders (Discord)

The API runs a cron job (every 5 minutes, 8am-10pm by default) that checks
how long it's been since any set was logged; once that crosses
`NOTIFY_IDLE_HOURS`, it posts a reminder to a Discord webhook suggesting your
3 most-overdue favorites, each with a link that opens straight into that
variation's quick-log sheet — no extra tap needed. It only sends once per
idle stretch (tracked in memory, resets on restart) — the frequent cron just
controls how soon after crossing the threshold that happens, it doesn't
cause repeat notifications. Set these in `.env` (see `.env.example`):

- `DISCORD_WEBHOOK_URL` — a Discord channel webhook URL. Leave unset to
  disable notifications entirely (the cron job still runs but no-ops).
- `PUBLIC_APP_URL` — the URL the app is actually reachable at, used to build
  the deep links in the reminder (defaults to `http://localhost:8080`, which
  is only right for local testing — set this for real deployments).
- `NOTIFY_CRON_SCHEDULE` — 5-field crontab syntax, default every 5 minutes,
  8am-10pm (`*/5 8-22 * * *`).
- `NOTIFY_TIMEZONE` — IANA timezone name the schedule above is interpreted
  in (default `UTC`). Docker containers default to UTC regardless of the
  host's timezone, so set this (e.g. `Europe/Paris`) or "8am-10pm" won't
  land when you expect.
- `NOTIFY_IDLE_HOURS` — hours of no logged sets before a reminder fires
  (default `1`).

You can trigger a check manually — the System page has a button for this —
or via `curl -X POST http://<host>:8080/api/notifications/check-idle?force=true`.
`force=true` bypasses both the idle-time threshold and the once-per-idle-stretch
cooldown, so it always sends (useful for testing); without it, the endpoint
behaves exactly like the cron job.

### Automatic backups

The server takes its own backup on a schedule and writes it to disk next to
the sqlite file (same Docker volume, so it survives redeploys), independent
of the manual "Download backup" button on the System page. Retention: every
daily backup from the last 7 days, plus the oldest snapshot found in each
of the 3 months before that — everything else is deleted after each run.
Browse and download them from the System page's "Automatic backups" card.

- `BACKUP_CRON_SCHEDULE` — 5-field crontab syntax, default daily at 3am
  (`0 3 * * *`), interpreted in `NOTIFY_TIMEZONE` above.

### Passcode-gating the app (optional)

By default there's no login — fine for a home network. If the app is
reachable from the public internet, set `APP_PASSCODE` in `.env` to a
shared secret; the app then shows a login screen and gates every API route
behind an HTTP-only session cookie (30-day expiry, in-memory session store —
this is still single-user, just a lock on the door, not real multi-user
auth). Failed attempts are rate-limited per IP (5 tries per 15 minutes, then
a 15-minute lockout) to make the passcode harder to brute-force. Leave
`APP_PASSCODE` unset/empty and the app behaves exactly as before, no login
prompt at all.

To update: `docker compose pull && docker compose up -d` for the published
image, or `docker compose -f docker-compose.dev.yml up -d --build` after
pulling new commits if building from source. Either way, the `api_data`
volume is untouched by rebuilds/updates; only `docker compose down -v` or
manually removing the volume deletes logged data.

## Features

- **Home / quick log** — a "Favorites" grid of working variations you're
  currently training. Any variation can be favorited (see Exercise detail
  below), including several on the same exercise at once, e.g. to work two
  points on the same ladder simultaneously. Each card shows the exercise's
  streak (days in a row with a logged set on *any* of its variations - moving
  up or down the ladder doesn't reset it), that variation's today's total
  (set count + reps or time), and how long ago it was last logged, sorted by
  recency (most recently logged first). Tap a card to open the full quick-log
  sheet: a rep stepper (+/-) or a start/stop timer depending on the
  exercise's metric type, defaulting to whatever you logged last time (most
  sets repeat the same rep count/duration). A "+&lt;last value&gt;" button on
  the card itself skips the sheet entirely for that common case - one tap,
  logged. Either sheet also has a "Log for yesterday" toggle to backdate a
  forgotten set by 24h instead of logging it as today. Logging gives a short
  vibration where supported (a longer one for a personal best or hitting a
  daily target), and the confirmation snackbar calls out "new best!" / "goal
  hit!" when either happens. "Add working variation" opens a searchable
  picker over every exercise's variations to favorite one (unfavoriting
  happens from the exercise detail page, not from Home). If a variation has
  a daily-set target set (see Exercise detail below), its card shows
  progress like "3/5 sets today" and switches to a success-tinted state with
  a checkmark once the target's met. If the last 5 sets on a favorited
  variation all met its target and there's a harder variation next on that
  exercise's ladder, a "ready to progress?" prompt is queued. Below that, a
  collapsed **Coach** panel (closed by default, badge shows the count) holds
  all such findings computed purely from your existing log history - no
  extra config needed, and nothing takes up space until you open it:
  progression-ready nudges; a favorite untouched for 7+ days after a real
  logging history, with a one-tap postpone/unfavorite; a variation whose
  weekly average has barely moved over the last two weeks flagged as a
  plateau, or meaningfully higher/lower than two weeks ago flagged as
  trending up/down; and if every current favorite is the same exercise
  category (push/pull/squat/core/hold), a nudge to work in another one for
  balance. Dismissing an item silences it for 3 days (7 for progression
  nudges). Below that: a compact card with today's-sets / day-streak
  numbers and the rolling weekly recap ("32 sets in the last 7 days, up
  from 25"), then two collapsed panels — "Hasn't been hit in a while"
  (favorited variations not logged in 3+ days, tap to quick-log) and
  "Recent activity" (your last few log entries anywhere, tap-to-edit and
  quick-delete/undo just like the Log page, with a link to the full Log).
- **Stats** — two tabs. *Trends*: per-exercise totals (set count + reps or
  time), browsable by Day / Week / Month / Year (calendar-aligned, with
  prev/next navigation) or by rolling Last 7 days / Last 30 days (always
  ends today, no navigation). Pick exactly which data to include from a
  variation tree checklist in a filter drawer: checking an exercise selects
  all its variations, or check individual variations to narrow the stats
  down to just those. Favorited variations are preselected on load. Under
  each exercise, an expandable "Sets" panel lists the individual log
  entries for the current period, with the same tap-to-edit and
  quick-delete/undo behavior as the Log page. *Records*: all-time personal
  bests, independent of the Trends filter/period — grouped by exercise, one
  row per variation with a logged set, showing the best value and when it
  happened.
- **Log** — every log entry, newest first, with a search field to filter by
  exercise/variation name. Tap one to edit its value or timestamp (so you
  can backdate a forgotten entry), or delete it (with confirmation). Or use
  the trash icon on a row to delete it immediately, no confirmation, safe to
  close the tab right after — a snackbar with an Undo button appears for a
  few seconds; Undo re-creates the entry (as a new log entry, since the
  original is already gone).
- **Exercise detail** — tap a favorite card's chevron, or a row on Manage
  exercises, to open an exercise's page: a single ordered progression ladder
  of its variations, reorder them with the up/down arrows, rename or delete
  a variation, add a new one, and see/edit recent entries for that exercise.
  Each variation row has a heart icon to favorite/unfavorite it as a working
  variation - this is the only place to unfavorite (Home only lets you add).
  Deleting a variation is a soft delete — it disappears from the ladder but
  its past log entries are kept for stats/history; a snackbar with Undo
  appears right after, in case that was a mistake. There's no branching: each
  exercise has one straight-line ladder low-to-high difficulty. If a
  progression genuinely forks (e.g. push-up splitting into a decline/archer
  route and a handstand-push-up route), model that as a second exercise
  instead. Editing a variation also lets you set an image URL, notes/tips, a
  video URL (e.g. a YouTube link), and an optional daily-set target — these
  show up in the quick-log bottom sheet (image/notes/video) and on the Home
  favorite card (target progress) so you have form cues and goals right when
  you're logging a set.
- **Manage exercises** — a plain list of every exercise (name, category,
  metric type) for basic CRUD: add a new exercise, rename/change one, or
  delete it entirely. Adding one automatically creates a same-named
  variation too, so there's never an empty ladder with nothing to
  favorite/log yet - rename or replace that first variation like any other.
  Tap a row to jump to its detail page for variations. A
  "Manage routines" button at the top links to routine management.
- **Routines** — for exercises done together in one sitting (e.g. an ankle
  mobility warm-up) rather than spread throughout the day GtG-style. Manage
  routines from its own page (linked off Manage exercises): create a
  routine, add existing exercise variations to it in order with a number of
  sets and an optional target reps/seconds per set, reorder with up/down
  arrows, rename or delete. Routines needing multiple exercises are why this
  is a separate concept from favoriting — a variation can be in a routine,
  favorited, both, or neither. On Home, routines appear in their own section
  below the favorites grid, each showing how long ago it was last done. Tap
  one to open a guided step-through sheet showing "exercise N of M · set X
  of Y", prefilled with that item's target (or your last logged value):
  "Log set" advances through the planned sets for the current exercise and
  moves to the next one once they're done; "Log & do another set here" is
  always available (even past the planned count, or for a single-set item)
  for a bonus set without touching the routine; "Skip"/"Next exercise" moves
  on without logging. Each set logged is a normal LogEntry, so routine
  history shows up in Stats/CSV/backup exactly like anything else — no
  separate tracking system. If what you actually did differs from the
  routine's template (different set count or a different logged value than
  planned) once you finish, a dialog offers to update the routine to match,
  save the run as a brand new routine, or just keep it as a one-off.
- **System** (server icon in the app bar) — backup/restore and notifications:
  - *Notifications*: a "Trigger reminder check" button manually runs the same
    idle-training check the cron job runs (see "Idle-training reminders"
    below) — useful for testing the Discord webhook without waiting for the
    schedule. No-ops if the webhook isn't configured.
  - *Backup*: download everything (exercises, variations, log entries,
    routines) as one JSON file, or export just the log entries as a CSV
    (with resolved exercise/variation names) for spreadsheets or other tools.
  - *Automatic backups*: a list of the server's own nightly backups (see
    "Deployment" below), each downloadable — a safety net if you forget to
    click the manual button above.
  - *Restore*: replaces everything in the app with the contents of a chosen
    backup file (destructive, confirmation required).
  - *Import exercises & variations only*: adds a backup file's
    exercises/variations without their log entries (favorite state does
    carry over) — handy for trying a different setup without losing history.
    Exercises/variations that already exist (same name, same
    exercise/parent) are skipped rather than duplicated, so re-importing the
    same or an overlapping file is safe.
- **Idle-training reminders** — a server-side cron job (see "Deployment"
  below) posts to a Discord webhook when nothing's been logged in a while,
  suggesting your 3 most-overdue favorites. Each suggestion links straight
  into that variation's quick-log sheet on Home — opening the link pops the
  sheet immediately, no extra tap.
- **Optional passcode gate** — set `APP_PASSCODE` (see "Deployment" below) to
  put a login screen in front of the whole app if it's reachable from the
  public internet. Off by default.
- **Offline logging** — if the connection drops (or the phone opens the app
  with none at all, as long as it's loaded successfully at least once
  before), logging still works: sets you log offline show up immediately
  with a "Syncing" chip and queue in the background, and quick edits to an
  existing exercise/variation (rename, favorite, target, reorder) work the
  same way. The app bar's server icon shows a badge with how many changes
  are waiting, and turns into an "Offline" chip while disconnected. Syncing
  happens automatically the moment the connection comes back (or manually
  from the System page); a set that fails to sync for a real reason (not
  just "still offline") stays queued there for review instead of silently
  vanishing. Creating brand-new exercises/variations/routines and any
  routine edits still need a live connection.

## How to use it

1. On **Home**, tap a favorite card whenever you do a set — log the reps (or
   start/stop the timer for time-based exercises) and confirm. Use "Add
   working variation" to pick what shows up here.
2. Check **Stats** to see today's (or this week's/month's/year's) totals,
   defaulting to your favorited variations.
3. Use **Log** if you need to fix a mis-logged set or delete one.
4. Open an exercise's detail page to progress to a harder variation, tweak
   the progression ladder, or favorite/unfavorite specific variations.
5. Use **Manage exercises** to add a brand-new exercise or edit/delete an
   existing one.
6. For exercises done together as a session (mobility, warm-ups) rather than
   spread through the day, build a **Routine** (linked from Manage
   exercises) and run it from its Home section instead of favoriting each
   exercise individually.

## Non-goals (for now)

- No multi-user support — this is a single-user app. There's an optional
  shared-passcode gate (see "Deployment") but it's a lock on the door, not
  real per-user auth.
- No general offline-first / sync layer — offline support is scoped to
  logging sets and editing existing exercises/variations (see "Offline
  logging" above); creating new exercises/variations/routines and any
  routine edits still need a live connection.
- No workout planning, templates, or scheduling.
