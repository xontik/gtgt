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
  progression.
- **Manage exercises** — a plain list of every exercise (name, category,
  metric type) for basic CRUD: add a new exercise, rename/change one, or
  delete it entirely. Tap a row to jump to its detail page for variations.

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
