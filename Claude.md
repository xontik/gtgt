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

- **Exercise** — `id`, `name`, `category` (e.g. push / pull / squat / core / hold), `metricType`: `'reps' | 'time'`, `activeVariationId` (nullable, the exercise's current working variation)
- **ExerciseVariation** — `id`, `exerciseId`, `name` (e.g. "knee push up", "push up", "archer push up"), `difficultyRank` (integer, defines progression order low → high)
- **LogEntry** — `id`, `variationId`, `timestamp`, `value` (reps count or seconds), `notes?` (optional text)

Notes for the agent:
- `Exercise.activeVariationId` is the explicit "current working variation" — set by the user on the exercise detail page, not derived from log history.
- `metricType` on Exercise determines whether the logging UI shows a rep counter/stepper or a timer/stopwatch for that exercise's variations.
- Deleting a variation is a soft delete (`deletedAt` timestamp set, row and its log entries kept); deleting a variation that was an exercise's active one sets `activeVariationId` back to null. Soft-deleted variations stay out of the progression ladder and pickers but their history still counts toward stats.

## Non-goals (do not build these unless asked)

- No auth/multi-user support — single user, no login flow needed yet.
- No offline-first/sync layer — this is a plain client-server app for now.
- No workout planning/templates/scheduling — that's the previous app's job, not this one.
- No charts/graphs — period totals (day/week/month/year) are in scope, but visualized as lists/numbers, not charts.

## Working conventions

- TypeScript strict mode everywhere, no `any` without a comment explaining why.
- ESLint + Prettier, standard Vue 3 + TS config.
- Keep components small; one Vuetify-based component per concern (e.g. `RepStepperSheet.vue`, `ExerciseCard.vue`).
- Write the Zod schemas in `packages/shared` first, then build the API route, then the Vue form — in that order, so types flow from a single source.
- Update [README.md](README.md) (features list, usage, setup) whenever a feature is added or changed, so it never falls out of sync with the app's actual state.
