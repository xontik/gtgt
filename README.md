# GtG Tracker

A personal web app to log "Grease the Groove" (GtG) style calisthenics training:
frequent, low-fatigue sets of an exercise spread across the day, logged fast
from a phone.

## Stack

- **Frontend**: Vite + Vue 3 + TypeScript + Vuetify 3 + Pinia (`apps/web`)
- **Backend**: Fastify + TypeScript REST API (`apps/api`)
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

To reset the local database, delete `apps/api/data/gtg.sqlite` and re-run
`pnpm db:migrate && pnpm db:seed` from `apps/api`.

## Deployment (Docker Compose on a VPS)

The repo ships a `docker-compose.yml` at the root with two services:

- **api** — builds `apps/api/Dockerfile`, runs the Fastify API with `tsx`
  (no separate compile step), applies Drizzle migrations on every start, and
  stores the SQLite file on a named volume (`api_data`) so data survives
  redeploys.
- **web** — builds `apps/web/Dockerfile` (a Vite production build served by
  nginx) and reverse-proxies `/api/*` to the `api` service. Exposed on host
  port `8080` by default (override with `WEB_PORT` env var).

On the VPS:

```bash
git clone <this repo> gtg-tracker && cd gtg-tracker
cp .env.example .env   # fill in DISCORD_WEBHOOK_URL / PUBLIC_APP_URL, see below
docker compose up -d --build
```

Then open `http://<vps-host>:8080`. To put it behind a domain with TLS, run
your own reverse proxy (Caddy, Traefik, nginx) in front of the `web`
service — this compose file doesn't manage certificates itself.

### Idle-training reminders (Discord)

The API runs an hourly cron job (configurable) that checks whether any set
has been logged recently; if not, it posts a reminder to a Discord webhook
suggesting your 3 most-overdue favorites, each with a link that opens
straight into that variation's quick-log sheet — no extra tap needed. Set
these in `.env` (see `.env.example`):

- `DISCORD_WEBHOOK_URL` — a Discord channel webhook URL. Leave unset to
  disable notifications entirely (the cron job still runs but no-ops).
- `PUBLIC_APP_URL` — the URL the app is actually reachable at, used to build
  the deep links in the reminder (defaults to `http://localhost:8080`, which
  is only right for local testing — set this for real deployments).
- `NOTIFY_CRON_SCHEDULE` — 5-field crontab syntax, default hourly 8am-10pm
  (`0 8-22 * * *`).
- `NOTIFY_IDLE_HOURS` — hours of no logged sets before a reminder fires
  (default `1`).

You can trigger a check manually (e.g. to test the webhook) with
`curl -X POST http://<host>:8080/api/notifications/check-idle`.

To update after pulling new commits:

```bash
docker compose up -d --build
```

The `api_data` volume is untouched by rebuilds; only `docker compose down -v`
or manually removing the volume deletes logged data.

## Features

- **Home / quick log** — a "Favorites" grid of working variations you're
  currently training. Any variation can be favorited (see Exercise detail
  below), including several on the same exercise at once, since you can work
  multiple progressions/branches simultaneously. Each card shows that
  variation's today's total (set count + reps or time) and how long ago it
  was last logged, sorted by recency (most recently logged first). Tap a
  card to log a set: a rep stepper (+/-) or a start/stop timer, depending on
  the exercise's metric type. The heart-off icon on a card removes it from
  favorites (with a confirmation dialog) without touching its log history.
  "Add working variation" opens a searchable picker over every exercise's
  variations to favorite one. Below the grid: a today's-sets / day-streak
  stat pair, a "Hasn't been hit in a while" list of favorited variations not
  logged in 3+ days (tap to quick-log), and a recent-activity feed of your
  last few log entries anywhere (tap-to-edit and quick-delete/undo just like
  the Log page), with a link to the full Log.
- **Stats** — per-exercise totals (set count + reps or time), browsable by
  Day / Week / Month / Year with prev/next navigation. Pick exactly which
  data to include from a variation tree checklist: checking an exercise
  selects all its variations, or check individual variations to narrow the
  stats down to just those. Favorited variations are preselected on load.
  Under each exercise, an expandable "Sets" panel lists the individual log
  entries for the current period, with the same tap-to-edit and
  quick-delete/undo behavior as the Log page.
- **Log** — every log entry, newest first. Tap one to edit its value or
  delete it (with confirmation). Or use the trash icon on a row to delete
  it immediately, no confirmation, safe to close the tab right after — a
  snackbar with an Undo button appears for a few seconds; Undo re-creates
  the entry (as a new log entry, since the original is already gone).
- **Exercise detail** — tap a favorite card's chevron, or a row on Manage
  exercises, to open an exercise's page: a visual progression ladder of its
  variations, reorder them with the up/down arrows, rename or delete a
  variation, add a new one, and see/edit recent entries for that exercise.
  Each variation row has a heart icon to favorite/unfavorite it as a working
  variation. Deleting a variation is a soft delete — it disappears from the
  progression ladder but its past log entries are kept for stats/history.
  Variations can branch: use the branch icon on any variation to add a new
  variation forking from it (e.g. push-up splitting into a decline/archer
  route and a handstand-push-up route), rather than a single straight-line
  progression. Editing a variation also lets you set an image URL, notes/tips,
  and a video URL (e.g. a YouTube link) — these show up in the quick-log
  bottom sheet on Home so you have form cues right when you're logging a set.
- **Manage exercises** — a plain list of every exercise (name, category,
  metric type) for basic CRUD: add a new exercise, rename/change one, or
  delete it entirely. Tap a row to jump to its detail page for variations.
- **Backup & restore** (database icon in the app bar) — download the entire
  database (exercises, variations, log entries) as one JSON file. Restore
  replaces everything in the app with the contents of a chosen backup file
  (destructive, confirmation required). "Import exercises & variations only"
  adds a backup file's exercises/variations without their log entries
  (favorite state does carry over) — handy for trying a different setup
  without losing history. Exercises/variations that already exist (same
  name, same exercise/parent) are skipped rather than duplicated, so re-importing the
  same or an overlapping file is safe.
- **Idle-training reminders** — a server-side cron job (see "Deployment"
  below) posts to a Discord webhook when nothing's been logged in a while,
  suggesting your 3 most-overdue favorites. Each suggestion links straight
  into that variation's quick-log sheet on Home — opening the link pops the
  sheet immediately, no extra tap.

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

## Non-goals (for now)

- No auth / multi-user support — this is a single-user app.
- No offline-first / sync layer.
- No workout planning, templates, or scheduling.
