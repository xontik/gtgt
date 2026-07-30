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
- **Routine** — `id`, `name`. An ordered set of existing exercise variations done together in one sitting (e.g. an ankle mobility warm-up), as opposed to GtG-style favorites logged individually throughout the day.
- **RoutineItem** — `id`, `routineId`, `variationId`, `order` (integer, position within the routine), `targetValue?` (nullable — reps/seconds to prefill per set when running the routine), `setsCount` (number of sets to prompt for on that exercise, default 1)

Notes for the agent:
- Routines are a separate concern from favoriting/GtG: a variation can be in a routine, favorited, both, or neither. Running a routine through its guided sheet (Home) produces plain `LogEntry` rows per item, so Stats/CSV/backup pick routine sets up automatically without any special-casing.
- Each exercise has exactly one linear progression ladder ordered by `difficultyRank` — there is no branching/forking between variations. If a progression genuinely needs to fork (e.g. two different routes from the same base movement), that's modeled as a second `Exercise`, not a branch within one.
- There is no single "active variation" per exercise anymore — favoriting is per-variation and many-to-many-ish (an exercise can have zero, one, or several favorited variations simultaneously, for working multiple points on the ladder at once). Home shows one card per favorited variation, not per exercise.
- `metricType` on Exercise determines whether the logging UI shows a rep counter/stepper or a timer/stopwatch for that exercise's variations.
- Deleting a variation is a soft delete (`deletedAt` timestamp set, row and its log entries kept). Soft-deleted variations stay out of the progression ladder and pickers but their history still counts toward stats.
- Creating/renaming/deleting an `Exercise` itself happens on the "Manage exercises" page (`/exercises`), not on Home or the exercise detail page. The exercise detail page (`/exercises/:id`) only handles that exercise's variations.

## Offline support

Scoped deliberately narrow — this is not a general offline-first rewrite, just enough that a dropped connection mid-workout doesn't break logging:

- **Fully supported offline**: creating/editing/deleting `LogEntry` rows (the core GtG logging flow), and editing an existing `Exercise`/`ExerciseVariation` (rename, favorite toggle, target, difficulty rank). Mutating API calls go through `mutateFetch` (`apps/web/src/lib/offlineQueue.ts`): on a genuine connectivity failure (not a server-rejected request) the call is queued in IndexedDB and an optimistic result is returned immediately, so calling code (stores, views) doesn't need offline-specific branches — it just gets the object back like normal.
- **Not supported offline** (throws normally, same as before this existed): creating a brand-new `Exercise`/`ExerciseVariation`/`Routine`, deleting an `Exercise`, and all `Routine`/`RoutineItem` writes. These are rare mid-session actions; adding them would mean threading the same temp-id optimistic pattern through more entities for little practical benefit. Extend this list deliberately if a real need shows up, don't default to "just wire everything through the queue."
- **Conflict resolution is intentionally trivial**: log entries can't conflict because deleting a variation is a soft delete — the row (and the FK a queued entry points at) still exists even if it's off the active ladder. Every other queued mutation is last-write-wins: replaying a queued PATCH just overwrites whatever the field is now, no merge/diff logic. This only works because the offline-supported action set above is all "full-object edit" style; don't add a queued action that needs a real 3-way merge without revisiting this.
- **Sync** happens automatically on the browser's `online` event (`syncQueue()` in `offlineQueue.ts`), plus a manual "Sync now" button on `/system`. There is no push notification nudging you to reopen the app — just a persistent badge (app bar `/system` icon + an "Offline"/pending-count indicator) so it's visible whenever the app happens to be open, per explicit instruction not to build a proactive reminder for this.
- Client-generated temp ids for offline-created log entries are negative numbers (`id < 0`); real SQLite ids are always positive, so that's the whole "is this still pending sync" check — don't add a separate boolean flag for it.
- A minimal `localStorage` snapshot (`gtg-offline-cache-v1` in `HomeView.vue`) covers a cold app open with zero connectivity; it is not a general offline data cache for every view, just enough for Home to render and let you log.

## Non-goals (do not build these unless asked)

- No auth/multi-user support — single user, no login flow needed yet.
- No general offline-first/sync layer beyond the scoped logging support described above.
- No workout planning/templates/scheduling — that's the previous app's job, not this one.
- No charts/graphs — period totals (day/week/month/year) are in scope, but visualized as lists/numbers, not charts.

## Working conventions

- TypeScript strict mode everywhere, no `any` without a comment explaining why.
- ESLint + Prettier, standard Vue 3 + TS config.
- Keep components small; one Vuetify-based component per concern (e.g. `RepStepperSheet.vue`, `FavoriteVariationCard.vue`).
- Write the Zod schemas in `packages/shared` first, then build the API route, then the Vue form — in that order, so types flow from a single source.
- Update [README.md](README.md) (features list, usage, setup) whenever a feature is added or changed, so it never falls out of sync with the app's actual state.
