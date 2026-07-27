# Need to do

- [x] add home link on the title of the app
- [x] let log arbitrary time for exercices with time, do not use timer
- [x] graphic visualisation per periode, per exercices
- [x] avoid loosing logged entries when deleting variation, use soft delete and keep a link to the variation that was deleted, maybe a "deleted" state for variations.
- [x] how to handle variations ? (branching progression via parentVariationId)
- [ ] on the stats view let me select variation under an exercices to just see the log from this variation, in a tree like checkbox structure, selecting an exercices select all variation or deselect all variation, i think vuetify have a component for that.

# Nice to have

- [ ] thing about a better home view, but keep quick logging easy
- [ ] Direct delete button in a log entry row (no confirmation modal, just a snackbar undo).
- [ ] edit or delete a set from the stats view (directly or by linking to log page)
- [ ] Modal to edit on desktop, bottom sheet on mobile
- [ ] reorder progression with drag and drop
- [x] variation of the same exercices but that are not "more difficult" just another branch. maybe some ancestor link ?
- [ ] simple deployement on home server docker compose
