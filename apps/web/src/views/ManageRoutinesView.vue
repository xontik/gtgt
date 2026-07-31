<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoutinesStore } from '../stores/routines';
import { useExercisesStore } from '../stores/exercises';
import { notify } from '../lib/snackbarQueue';
import AddRoutineItemDialog from '../components/AddRoutineItemDialog.vue';
import EditRoutineItemDialog from '../components/EditRoutineItemDialog.vue';

const routinesStore = useRoutinesStore();
const exercisesStore = useExercisesStore();

onMounted(async () => {
  await Promise.all([routinesStore.fetchAll(), exercisesStore.fetchAll()]);
});

function exerciseNameFor(variationId: number) {
  const variation = exercisesStore.variations.find((v) => v.id === variationId);
  const exercise = variation && exercisesStore.exercises.find((e) => e.id === variation.exerciseId);
  return { exerciseName: exercise?.name ?? 'Unknown exercise', variationName: variation?.name ?? 'Unknown variation' };
}

const newRoutineName = ref('');
const addRoutineDialogOpen = ref(false);

async function addRoutine() {
  if (!newRoutineName.value.trim()) return;
  await routinesStore.addRoutine(newRoutineName.value.trim());
  newRoutineName.value = '';
  addRoutineDialogOpen.value = false;
}

const renamingRoutineId = ref<number>();
const renameValue = ref('');

function startRename(routineId: number, currentName: string) {
  renamingRoutineId.value = routineId;
  renameValue.value = currentName;
}

async function confirmRename() {
  if (!renamingRoutineId.value || !renameValue.value.trim()) return;
  await routinesStore.renameRoutine(renamingRoutineId.value, renameValue.value.trim());
  renamingRoutineId.value = undefined;
}

const confirmingDeleteRoutineId = ref<number>();

async function confirmDeleteRoutine() {
  if (!confirmingDeleteRoutineId.value) return;
  await routinesStore.removeRoutine(confirmingDeleteRoutineId.value);
  confirmingDeleteRoutineId.value = undefined;
}

async function removeItem(itemId: number) {
  const item = routinesStore.items.find((i) => i.id === itemId);
  if (!item) return;
  const { exerciseName } = exerciseNameFor(item.variationId);
  await routinesStore.removeItem(itemId);

  notify(`Removed ${exerciseName} from the routine`, {
    timeout: 4000,
    actionLabel: 'Undo',
    onAction: () => routinesStore.addItem(item.routineId, item.variationId, item.targetValue, item.setsCount),
  });
}

const addItemDialogOpen = ref(false);
const addItemRoutineId = ref<number>();

function openAddItem(routineId: number) {
  addItemRoutineId.value = routineId;
  addItemDialogOpen.value = true;
}

async function addItem(variationId: number, targetValue: number | null, setsCount: number) {
  if (!addItemRoutineId.value) return;
  await routinesStore.addItem(addItemRoutineId.value, variationId, targetValue, setsCount);
  addItemDialogOpen.value = false;
}

const editItemDialogOpen = ref(false);
const editingItemId = ref<number>();
const editingItem = computed(() => routinesStore.items.find((i) => i.id === editingItemId.value));

function openEditItem(itemId: number) {
  editingItemId.value = itemId;
  editItemDialogOpen.value = true;
}

async function saveItemTemplate(details: { targetValue: number | null; setsCount: number }) {
  if (!editingItemId.value) return;
  await routinesStore.updateItemTemplate(editingItemId.value, details);
  editItemDialogOpen.value = false;
}
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Manage routines</h1>
      <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addRoutineDialogOpen = true">
        New routine
      </v-btn>
    </div>

    <v-progress-linear v-if="routinesStore.loading" indeterminate class="mb-4" />

    <v-alert v-else-if="routinesStore.routines.length === 0" type="info" variant="tonal">
      No routines yet. A routine is an ordered set of exercises done together
      in one sitting (e.g. an ankle mobility warm-up), as opposed to working
      variations logged individually throughout the day.
    </v-alert>

    <v-expansion-panels v-else variant="accordion">
      <v-expansion-panel v-for="routine in routinesStore.routines" :key="routine.id">
        <v-expansion-panel-title>
          <span v-if="renamingRoutineId !== routine.id">{{ routine.name }}</span>
          <v-text-field
            v-else
            v-model="renameValue"
            density="compact"
            hide-details
            autofocus
            @click.stop
            @keyup.enter="confirmRename"
          />
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-list density="compact">
            <v-list-item
              v-for="(item, index) in routinesStore.itemsFor(routine.id)"
              :key="item.id"
              :title="exerciseNameFor(item.variationId).exerciseName"
              :subtitle="
                exerciseNameFor(item.variationId).variationName +
                ` · ${item.setsCount} set${item.setsCount === 1 ? '' : 's'}` +
                (item.targetValue ? ` × ${item.targetValue}` : '')
              "
            >
              <template #append>
                <v-btn
                  icon="mdi-arrow-up"
                  size="x-small"
                  variant="text"
                  :disabled="index === 0"
                  aria-label="Move up"
                  @click="routinesStore.moveItem(item.id, 'up')"
                />
                <v-btn
                  icon="mdi-arrow-down"
                  size="x-small"
                  variant="text"
                  :disabled="index === routinesStore.itemsFor(routine.id).length - 1"
                  aria-label="Move down"
                  @click="routinesStore.moveItem(item.id, 'down')"
                />
                <v-btn
                  icon="mdi-pencil"
                  size="x-small"
                  variant="text"
                  aria-label="Edit"
                  @click="openEditItem(item.id)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  size="x-small"
                  variant="text"
                  aria-label="Remove from routine"
                  @click="removeItem(item.id)"
                />
              </template>
            </v-list-item>
          </v-list>

          <div class="d-flex ga-2 mt-2">
            <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="openAddItem(routine.id)">
              Add exercise
            </v-btn>
            <v-spacer />
            <v-btn
              v-if="renamingRoutineId !== routine.id"
              size="small"
              variant="text"
              @click="startRename(routine.id, routine.name)"
            >
              Rename
            </v-btn>
            <v-btn v-else size="small" variant="text" color="primary" @click="confirmRename">Save</v-btn>
            <v-btn size="small" variant="text" color="error" @click="confirmingDeleteRoutineId = routine.id">
              Delete
            </v-btn>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-dialog v-model="addRoutineDialogOpen" max-width="400">
      <v-card>
        <v-card-title>New routine</v-card-title>
        <v-card-text>
          <v-text-field v-model="newRoutineName" label="Name" autofocus @keyup.enter="addRoutine" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addRoutineDialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!newRoutineName.trim()" @click="addRoutine">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="confirmingDeleteRoutineId !== undefined" max-width="360">
      <v-card>
        <v-card-title>Delete routine?</v-card-title>
        <v-card-text>This removes the routine and its exercise list. Log history is not affected.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmingDeleteRoutineId = undefined">Cancel</v-btn>
          <v-btn color="error" @click="confirmDeleteRoutine">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <AddRoutineItemDialog
      v-model="addItemDialogOpen"
      :exercises="exercisesStore.exercises"
      :variations="exercisesStore.variations"
      @select="addItem"
    />

    <EditRoutineItemDialog
      v-model="editItemDialogOpen"
      :item="editingItem"
      :exercise-name="editingItem ? exerciseNameFor(editingItem.variationId).exerciseName : ''"
      :variation-name="editingItem ? exerciseNameFor(editingItem.variationId).variationName : ''"
      @save="saveItemTemplate"
    />
  </v-container>
</template>
