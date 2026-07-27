# Need to do

- [x] add home link on the title of the app
- [x] let log arbitrary time for exercices with time, do not use timer
- [x] graphic visualisation per periode, per exercices
- [x] avoid loosing logged entries when deleting variation, use soft delete and keep a link to the variation that was deleted, maybe a "deleted" state for variations.
- [x] how to handle variations ? (branching progression via parentVariationId)
- [x] on the stats view let me select variation under an exercices to just see the log from this variation, in a tree like checkbox structure, selecting an exercices select all variation or deselect all variation, i think vuetify have a component for that.
- [x] remove current variation of exercices, because i can work on mulitple at the same time, but add a list of current variations, like favorites, and it's theses one that i can quick log from home screen. Add a button to look for anyvariation any exercices to quick log the "non favorites" ones. (per-variation isFavorite, Home shows a favorites grid + "Add working variation" search picker, heart toggle in exercise detail, remove-with-confirm on Home, new "Manage exercises" page for exercise CRUD, Stats preselects favorites)

# Nice to have

- [x] a better home view, but keep quick logging easy (today's total + last-logged per card, sorted by recency)
- [x] Direct delete button in a log entry row (no confirmation modal, just a snackbar undo).
- [x] edit or delete a set from the stats view (directly or by linking to log page)
- [x] pump up home page below favorites: today's-sets/streak stats, "hasn't been hit in a while" list, recent activity feed
- [ ] reorder variation with drag and drop
- [x] variation of the same exercices but that are not "more difficult" just another branch. maybe some ancestor link ?
- [ ] simple deployement on home server docker compose
- [ ] home page "progression nudge" (suggest moving up the ladder) once there's a good signal for it
