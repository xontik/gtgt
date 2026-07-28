# Project brief: GtG Tracker

## What this is

A personal web app to log "Grease the Groove" (GtG) style calisthenics training: frequent, low-fatigue sets of an exercise spread across the day (not a single gym session). Primary use case is fast logging from a phone, many times a day.

See [README.md](README.md) for setup instructions, the current feature list, and how to use the app.

## Stack (already decided — do not suggest alternatives)

- **Frontend**: Vite + Vue 3 + TypeScript (Composition API, `<script setup>`). No Nuxt.
- **UI library**: Vuetify 3 — use its components exclusively, no custom-built UI primitives.
- **State**: Pinia.
- **Backend**: Fastify + TypeScript, plain REST API (no tRPC/GraphQL).
- **Validation**: Zod schemas, defined once and imported by both the Fastify route handlers and the Vue forms, so client and server share the same shape and never drift.
- **Database**: SQLite for local/dev, via `@libsql/client` (chosen over `better-sqlite3` to avoid local native-compilation issues). ORM: Drizzle.
- **Package manager**: pnpm.
- **Monorepo layout**: single repo, `apps/web` and `apps/api`, plus a `packages/shared` workspace for the Zod schemas and shared TS types.

## Data model

- **Exercise** — `id`, `name`, `category` (e.g. push / pull / squat / core / hold), `metricType`: `'reps' | 'time'`
- **ExerciseVariation** — `id`, `exerciseId`, `name` (e.g. "knee push up", "push up", "archer push up"), `difficultyRank` (integer, defines progression order low → high among all variations of the same exercise — one flat ladder per exercise, no branching), `isFavorite` (boolean — marks it a "working variation" quick-logged from Home; multiple variations, including several on the same exercise, can be favorited at once)
- **LogEntry** — `id`, `variationId`, `timestamp`, `value` (reps count or seconds), `notes?` (optional text)

Notes for the agent:
- Each exercise has exactly one linear progression ladder ordered by `difficultyRank` — there is no branching/forking between variations. If a progression genuinely needs to fork (e.g. two different routes from the same base movement), that's modeled as a second `Exercise`, not a branch within one.
- There is no single "active variation" per exercise anymore — favoriting is per-variation and many-to-many-ish (an exercise can have zero, one, or several favorited variations simultaneously, for working multiple points on the ladder at once). Home shows one card per favorited variation, not per exercise.
- `metricType` on Exercise determines whether the logging UI shows a rep counter/stepper or a timer/stopwatch for that exercise's variations.
- Deleting a variation is a soft delete (`deletedAt` timestamp set, row and its log entries kept). Soft-deleted variations stay out of the progression ladder and pickers but their history still counts toward stats.
- Creating/renaming/deleting an `Exercise` itself happens on the "Manage exercises" page (`/exercises`), not on Home or the exercise detail page. The exercise detail page (`/exercises/:id`) only handles that exercise's variations.

## Non-goals (do not build these unless asked)

- No auth/multi-user support — single user, no login flow needed yet.
- No offline-first/sync layer — this is a plain client-server app for now.
- No workout planning/templates/scheduling — that's the previous app's job, not this one.
- No charts/graphs — period totals (day/week/month/year) are in scope, but visualized as lists/numbers, not charts.

## Working conventions

- TypeScript strict mode everywhere, no `any` without a comment explaining why.
- ESLint + Prettier, standard Vue 3 + TS config.
- Keep components small; one Vuetify-based component per concern (e.g. `RepStepperSheet.vue`, `FavoriteVariationCard.vue`).
- Write the Zod schemas in `packages/shared` first, then build the API route, then the Vue form — in that order, so types flow from a single source.
- Update [README.md](README.md) (features list, usage, setup) whenever a feature is added or changed, so it never falls out of sync with the app's actual state.
