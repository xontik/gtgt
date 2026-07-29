# Need to do

- [x] add home link on the title of the app
- [x] let log arbitrary time for exercices with time, do not use timer
- [x] graphic visualisation per periode, per exercices
- [x] avoid loosing logged entries when deleting variation, use soft delete and keep a link to the variation that was deleted, maybe a "deleted" state for variations.
- [x] how to handle variations ? (originally: branching progression via parentVariationId; later reversed — see below, one flat ladder per exercise instead)
- [x] on the stats view let me select variation under an exercices to just see the log from this variation, in a tree like checkbox structure, selecting an exercices select all variation or deselect all variation, i think vuetify have a component for that.
- [x] remove current variation of exercices, because i can work on mulitple at the same time, but add a list of current variations, like favorites, and it's theses one that i can quick log from home screen. Add a button to look for anyvariation any exercices to quick log the "non favorites" ones. (per-variation isFavorite, Home shows a favorites grid + "Add working variation" search picker, heart toggle in exercise detail, remove-with-confirm on Home, new "Manage exercises" page for exercise CRUD, Stats preselects favorites)

# Nice to have

- [x] a better home view, but keep quick logging easy (today's total + last-logged per card, sorted by recency)
- [x] Direct delete button in a log entry row (no confirmation modal, just a snackbar undo).
- [x] edit or delete a set from the stats view (directly or by linking to log page)
- [x] pump up home page below favorites: today's-sets/streak stats, "hasn't been hit in a while" list, recent activity feed
- [ ] reorder variation with drag and drop
- [x] variation of the same exercices but that are not "more difficult" just another branch. maybe some ancestor link ? (reversed later — branching turned out unused and made reordering harder; removed in favor of one flat ladder per exercise, forks now modeled as a second exercise)
- [x] simple deployement on home server docker compose
- [ ] home page "progression nudge" (suggest moving up the ladder) once there's a good signal for it
- [x] backup/restore data from the UI, plus import-just-exercises-and-variations for trying out configs
- [x] image, notes, and video URL per variation, shown in quick-log/edit bottom sheets, carried through backup/import
- [x] Discord webhook reminder when nothing's been logged in N hours, suggesting top 3 overdue favorites with a no-click deep link into the quick-log sheet
- [x] publish as a public Docker image (GHCR + GitHub Actions) so others can self-host; collapsed api+web into a single container (Fastify serves the built SPA directly, no nginx)
- [x] edit a set's timestamp, not just its value (date+time field on the log entry edit sheet)
- [x] quick "log for yesterday" toggle on the quick-log sheets, backdates the entry by 24h
- [x] undo for variation delete (restore endpoint + snackbar, matching the log-entry pattern)
- [x] rolling stats periods (last 7 days, last 30 days) alongside calendar-aligned day/week/month/year
- [x] search/filter on the Log view (the "Add working variation" picker already had it via autocomplete)
- [x] CSV export of log entries alongside the existing JSON backup
- [x] optional per-variation daily-set target, with "3/5 sets today" progress on the Home favorite card
- [x] shared-secret passcode gate (`APP_PASSCODE`), still single-user — no-op if unset so existing deploys keep working
- [x] installable as a PWA (manifest + service worker + iOS meta tags + real 192/512/maskable PNG icons via an idempotent `pnpm --filter @gtg/web generate-icons` script)
- [x] quick-log sheets default to the last logged value ("same as last time") instead of always resetting
- [x] haptic feedback on logging a set (longer pattern for a personal best or hitting a daily target)
- [x] favorite card switches to a success state with a checkmark once its daily target is met
- [x] personal-best and goal-hit callouts in the log confirmation snackbar
- [x] rolling weekly recap banner on Home (this week's sets vs the prior week)
- [x] removed variation parenting/branching entirely — one flat, reorderable ladder per exercise; a genuine fork is now a second exercise instead
- [x] per-exercise streak (any variation on the ladder counts, kept across moving up/down) shown on the Home favorite card
- [x] "+&lt;last value&gt;" quick-log button on the Home card, logs immediately with no sheet
- [x] removed the unfavorite button from Home cards (unused in practice; unfavoriting still works from exercise detail)
- [x] brute-force lockout on the passcode login (5 attempts / 15 min, then a 15-min lockout, per IP)
- [x] fixed uneven Home card heights when only some favorites have a daily-set target
- [x] Routines — new Routine/RoutineItem entities for exercises done together in one sitting (mobility/warm-ups) instead of spread through the day GtG-style; Manage routines page, Home "Routines" section with a guided step-through logging sheet, included in backup/restore
- [x] number of sets per routine item, with per-exercise set counting in the guided runner (log/advance, bonus "log & stay" set, skip) and a post-run prompt to update the routine template or save as a new routine when what you actually did differs from the plan
- [x] moved the Stats exercise picker into a slide-out filter drawer instead of an always-visible sidebar, which squeezed charts unreadably narrow on mobile
- [x] bottom safe-area padding (viewport-fit=cover + env(safe-area-inset-bottom)) so the bottom nav and bottom sheets aren't covered by rounded corners/home indicator on notched phones
- [x] edit button on each Manage Routines exercise row to update its target reps/seconds and sets without removing/re-adding it
- [x] theme pass: self-hosted Inter, custom purple accent theme, flat/bordered surfaces instead of Material shadows, larger corner radii (Vuetify defaults + global.css, no component rewrites)
