# Project brief: GtG Tracker

Paste this whole file as your first prompt to Claude Code (or another coding agent), ideally saved as `CLAUDE.md` / `AGENTS.md` in the repo root so it persists as context.

## What this is

A personal web app to log "Grease the Groove" (GtG) style calisthenics training: frequent, low-fatigue sets of an exercise spread across the day (not a single gym session). Primary use case is fast logging from a phone, many times a day.

## Stack (already decided — do not suggest alternatives)

- **Frontend**: Vite + Vue 3 + TypeScript (Composition API, `<script setup>`). No Nuxt.
- **UI library**: Vuetify 3 — use its components exclusively, no custom-built UI primitives.
- **State**: Pinia.
- **Backend**: Fastify + TypeScript, plain REST API (no tRPC/GraphQL).
- **Validation**: Zod schemas, defined once and imported by both the Fastify route handlers and the Vue forms, so client and server share the same shape and never drift.
- **Database**: SQLite for local/dev. ORM: Drizzle (preferred) — ask me to confirm before switching to Prisma if you think Prisma fits significantly better; don't switch silently.
- **Package manager**: pnpm.
- **Monorepo layout**: single repo, `apps/web` and `apps/api`, plus a `packages/shared` workspace for the Zod schemas and shared TS types.

## Data model

- **Exercise** — `id`, `name`, `category` (e.g. push / pull / squat / core / hold), `metricType`: `'reps' | 'time'`
- **ExerciseVariation** — `id`, `exerciseId`, `name` (e.g. "knee push up", "push up", "archer push up"), `difficultyRank` (integer, defines progression order low → high)
- **LogEntry** — `id`, `variationId`, `timestamp`, `value` (reps count or seconds), `notes?` (optional text)

Notes for the agent:
- The progression ladder (`difficultyRank`) is used to show "current working variation" per exercise and let the user move up/down.
- `metricType` on Exercise determines whether the logging UI shows a rep counter/stepper or a timer/stopwatch for that exercise's variations.
- Seed data should include at minimum: push-up progression (knee → push-up → decline → archer → one-arm assisted) and pistol squat progression (assisted → box pistol → pistol → weighted pistol) as sensible starter data — ask me before inventing exercise names I haven't mentioned if unsure.

## Core screens/features for MVP

1. **Home / quick log** — list of exercises (each showing its current working variation), one tap opens a bottom sheet to log a set: rep stepper (+/-) or a simple start/stop timer depending on `metricType`, then a confirm button that posts to the API and shows a snackbar confirmation.
2. **Exercise detail** — shows the progression ladder for that exercise, lets the user pick a different active variation, and shows today's + recent log entries for it.
3. **Daily summary** — today's total sets/reps or time per exercise, and a way to browse previous days.
4. **Manage exercises/variations** — basic CRUD screen, low priority polish, functional is enough.

## Non-goals for MVP (do not build these unless asked)

- No auth/multi-user support — single user, no login flow needed yet.
- No offline-first/sync layer — this is a plain client-server app for now.
- No workout planning/templates/scheduling — that's the previous app's job, not this one.
- No charts/analytics beyond simple daily totals.

## Working conventions

- TypeScript strict mode everywhere, no `any` without a comment explaining why.
- ESLint + Prettier, standard Vue 3 + TS config.
- Keep components small; one Vuetify-based component per concern (e.g. `RepStepperSheet.vue`, `ExerciseCard.vue`).
- Write the Zod schemas in `packages/shared` first, then build the API route, then the Vue form — in that order, so types flow from a single source.

## How to proceed

Work in phases and stop for review between each rather than building everything at once:
1. Scaffold the monorepo structure and tooling (no features yet).
2. Shared Zod schemas + Drizzle schema + migrations + seed script.
3. Fastify API: CRUD for exercises/variations, create + list for log entries.
4. Vue app: quick-log home screen wired to the real API.
5. Exercise detail + daily summary screens.

Ask clarifying questions before phase 1 if anything above is ambiguous, rather than guessing.
