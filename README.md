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

- **Home / quick log** — every exercise shown as a card with its current
  active variation. Tap a card to log a set: a rep stepper (+/-) or a
  start/stop timer, depending on the exercise's metric type. Add new
  exercises from the button below the list.
- **Stats** — per-exercise totals (set count + reps or time), browsable by
  Day / Week / Month / Year with prev/next navigation. Pick exactly which
  data to include from a variation tree checklist: checking an exercise
  selects all its variations, or check individual variations to narrow
  the stats down to just those (e.g. only the currently active one).
- **Log** — every log entry, newest first. Tap one to edit its value or
  delete it.
- **Exercise detail** — tap the chevron on a Home card to open an exercise's
  page: a visual progression ladder of its variations, pick which one is
  currently active, reorder variations with the up/down arrows, rename or
  delete a variation, add a new one, and see/edit recent entries for that
  exercise. The pencil icon next to the exercise name lets you rename it,
  change its category/metric type, or delete it entirely. Deleting a
  variation is a soft delete — it disappears from the progression ladder but
  its past log entries are kept for stats/history. Variations can branch:
  use the branch icon on any variation to add a new variation forking from
  it (e.g. push-up splitting into a decline/archer route and a
  handstand-push-up route), rather than a single straight-line progression.

## How to use it

1. On **Home**, tap an exercise card whenever you do a set — log the reps (or
   start/stop the timer for time-based exercises) and confirm.
2. Check **Stats** to see today's (or this week's/month's/year's) totals per
   exercise.
3. Use **Log** if you need to fix a mis-logged set or delete one.
4. Open an exercise's detail page (chevron on its Home card) to progress to a
   harder variation, tweak the progression ladder, or manage the exercise
   itself.

## Non-goals (for now)

- No auth / multi-user support — this is a single-user app.
- No offline-first / sync layer.
- No workout planning, templates, or scheduling.
