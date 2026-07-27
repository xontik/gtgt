<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Exercise, ExerciseVariation, LogEntry } from '@gtg/shared';
import { useExercisesStore } from '../stores/exercises';
import { createLogEntry, listLogEntries } from '../api/logEntries';
import { formatDuration, formatRelativeTime } from '../lib/format';
import { dateKey } from '../lib/heatmap';
import { vibrateSuccess, vibrateMilestone } from '../lib/haptics';
import FavoriteVariationCard from '../components/FavoriteVariationCard.vue';
import RepStepperSheet from '../components/RepStepperSheet.vue';
import TimerSheet from '../components/TimerSheet.vue';
import AddFavoriteDialog from '../components/AddFavoriteDialog.vue';
import LogEntryList from '../components/LogEntryList.vue';

const store = useExercisesStore();
const entries = ref<LogEntry[]>([]);
const route = useRoute();
const router = useRouter();

onMounted(async () => {
  const [, fetchedEntries] = await Promise.all([store.fetchAll(), listLogEntries()]);
  entries.value = fetchedEntries;

  // Deep link from notifications: ?logVariation=<id> opens the quick-log
  // sheet immediately, no tap needed.
  const logVariationId = Number(route.query.logVariation);
  if (logVariationId) {
    const variation = store.variations.find((v) => v.id === logVariationId);
    const exercise = variation && store.exercises.find((e) => e.id === variation.exerciseId);
    if (variation && exercise) openSheet(exercise, variation);
    router.replace({ query: {} });
  }
});

const entriesByVariation = computed(() => {
  const map = new Map<number, LogEntry[]>();
  for (const entry of entries.value) {
    const list = map.get(entry.variationId);
    if (list) list.push(entry);
    else map.set(entry.variationId, [entry]);
  }
  return map;
});

const todayTotalsByVariation = computed(() => {
  const map = new Map<number, { setCount: number; total: number }>();
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  for (const [variationId, list] of entriesByVariation.value) {
    const todays = list.filter((e) => isToday(new Date(e.timestamp)));
    map.set(variationId, {
      setCount: todays.length,
      total: todays.reduce((sum, e) => sum + e.value, 0),
    });
  }
  return map;
});

const lastLoggedByVariation = computed(() => {
  const map = new Map<number, Date>();
  for (const [variationId, list] of entriesByVariation.value) {
    const latest = list.reduce<Date | undefined>((acc, e) => {
      const t = new Date(e.timestamp);
      return !acc || t > acc ? t : acc;
    }, undefined);
    if (latest) map.set(variationId, latest);
  }
  return map;
});

// The value of the most recently logged entry for a variation, so the
// quick-log sheet can default to "same as last time" instead of always
// resetting to 5 reps / 0:00 - most sets are the same as the previous one.
const lastValueByVariation = computed(() => {
  const map = new Map<number, number>();
  for (const [variationId, list] of entriesByVariation.value) {
    const latest = list.reduce<{ t: Date; value: number } | undefined>((acc, e) => {
      const t = new Date(e.timestamp);
      return !acc || t > acc.t ? { t, value: e.value } : acc;
    }, undefined);
    if (latest) map.set(variationId, latest.value);
  }
  return map;
});

const favoritesWithExercise = computed(() =>
  store.favoriteVariations
    .map((variation) => ({
      variation,
      exercise: store.exercises.find((e) => e.id === variation.exerciseId),
    }))
    .filter((f): f is { variation: ExerciseVariation; exercise: Exercise } => f.exercise !== undefined),
);

const sortedFavorites = computed(() =>
  [...favoritesWithExercise.value].sort((a, b) => {
    const aTime = lastLoggedByVariation.value.get(a.variation.id)?.getTime() ?? -Infinity;
    const bTime = lastLoggedByVariation.value.get(b.variation.id)?.getTime() ?? -Infinity;
    return bTime - aTime;
  }),
);

const todaySetCount = computed(
  () => entries.value.filter((e) => new Date(e.timestamp).toDateString() === new Date().toDateString()).length,
);

// Rolling 7-day windows (not calendar weeks) so the comparison is always
// "this week so far" vs "the 7 days before that" - a quick sense of
// momentum without needing to dig into Stats.
const weeklyRecap = computed(() => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const thisWeekStart = now - 7 * DAY_MS;
  const lastWeekStart = now - 14 * DAY_MS;

  let thisWeek = 0;
  let lastWeek = 0;
  for (const entry of entries.value) {
    const t = new Date(entry.timestamp).getTime();
    if (t >= thisWeekStart) thisWeek += 1;
    else if (t >= lastWeekStart) lastWeek += 1;
  }
  return { thisWeek, lastWeek };
});

const loggedDayKeys = computed(() => new Set(entries.value.map((e) => dateKey(new Date(e.timestamp)))));

const currentStreak = computed(() => {
  let streak = 0;
  const cursor = new Date();
  // Today doesn't have to be logged yet for the streak to still count "so far".
  if (!loggedDayKeys.value.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (loggedDayKeys.value.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
});

const NEGLECTED_DAYS = 3;

const neglectedFavorites = computed(() =>
  sortedFavorites.value.filter((f) => {
    const last = lastLoggedByVariation.value.get(f.variation.id);
    if (!last) return true;
    const diffDays = (Date.now() - last.getTime()) / 86_400_000;
    return diffDays >= NEGLECTED_DAYS;
  }),
);

const RECENT_ENTRIES_LIMIT = 6;

const recentEntries = computed(() =>
  [...entries.value]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, RECENT_ENTRIES_LIMIT),
);

function onRecentUpdate(updated: LogEntry) {
  const index = entries.value.findIndex((e) => e.id === updated.id);
  if (index !== -1) entries.value[index] = updated;
}

function onRecentRemove(id: number) {
  entries.value = entries.value.filter((e) => e.id !== id);
}

function onRecentRestore(entry: LogEntry) {
  entries.value = [...entries.value, entry];
}

function todayLabelFor(exercise: Exercise, variation: ExerciseVariation) {
  const stats = todayTotalsByVariation.value.get(variation.id);
  if (!stats || stats.setCount === 0) return 'No sets today';
  const amount = exercise.metricType === 'time' ? formatDuration(stats.total) : `${stats.total} reps`;
  return `${stats.setCount} set${stats.setCount === 1 ? '' : 's'} · ${amount}`;
}

function lastLoggedLabelFor(variation: ExerciseVariation) {
  const last = lastLoggedByVariation.value.get(variation.id);
  return last ? formatRelativeTime(last) : 'Not logged yet';
}

function goalLabelFor(variation: ExerciseVariation) {
  if (!variation.targetSetsPerDay) return undefined;
  const setCount = todayTotalsByVariation.value.get(variation.id)?.setCount ?? 0;
  return `${setCount}/${variation.targetSetsPerDay} sets today`;
}

function goalMetFor(variation: ExerciseVariation) {
  if (!variation.targetSetsPerDay) return false;
  const setCount = todayTotalsByVariation.value.get(variation.id)?.setCount ?? 0;
  return setCount >= variation.targetSetsPerDay;
}

const sheetOpen = ref(false);
const selectedExercise = ref<Exercise>();
const selectedVariation = ref<ExerciseVariation>();
const snackbar = ref(false);
const snackbarText = ref('');

function openSheet(exercise: Exercise, variation: ExerciseVariation) {
  selectedExercise.value = exercise;
  selectedVariation.value = variation;
  sheetOpen.value = true;
}

async function logSet(value: number, forYesterday = false) {
  const exercise = selectedExercise.value;
  const variation = selectedVariation.value;
  if (!exercise || !variation) return;

  const priorBest = Math.max(
    0,
    ...(entriesByVariation.value.get(variation.id) ?? []).map((e) => e.value),
  );
  const wasGoalMet = goalMetFor(variation);

  const timestamp = forYesterday ? new Date(Date.now() - 24 * 60 * 60 * 1000) : undefined;
  const created = await createLogEntry({ variationId: variation.id, value, timestamp });
  entries.value.push(created);
  sheetOpen.value = false;
  const unit = exercise.metricType === 'time' ? 's' : 'reps';
  const when = forYesterday ? ' (yesterday)' : '';
  const isPersonalBest = priorBest > 0 && value > priorBest;
  const justHitGoal = !wasGoalMet && goalMetFor(variation);

  if (isPersonalBest || justHitGoal) {
    vibrateMilestone();
  } else {
    vibrateSuccess();
  }

  let note = '';
  if (isPersonalBest) note = ' — new best!';
  else if (justHitGoal) note = ' — goal hit!';
  snackbarText.value = `Logged ${value}${unit === 's' ? 's' : ' reps'} for ${exercise.name}${when}${note}`;
  snackbar.value = true;
}

async function unfavorite(variationId: number) {
  await store.setFavorite(variationId, false);
}

const addDialogOpen = ref(false);

async function addFavorite(variationId: number) {
  await store.setFavorite(variationId, true);
  addDialogOpen.value = false;
}
</script>

<template>
  <v-container>
    <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />

    <v-alert v-if="!store.loading && sortedFavorites.length === 0" type="info" variant="tonal" class="mb-4">
      No favorites yet. Use "Add working variation" below to pick what you want to quick-log here.
    </v-alert>

    <v-row>
      <v-col v-for="favorite in sortedFavorites" :key="favorite.variation.id" cols="12" sm="6" md="4">
        <FavoriteVariationCard
          :exercise="favorite.exercise"
          :variation="favorite.variation"
          :today-label="todayLabelFor(favorite.exercise, favorite.variation)"
          :last-logged-label="lastLoggedLabelFor(favorite.variation)"
          :goal-label="goalLabelFor(favorite.variation)"
          :goal-met="goalMetFor(favorite.variation)"
          @log="openSheet(favorite.exercise, favorite.variation)"
          @unfavorite="unfavorite(favorite.variation.id)"
        />
      </v-col>
    </v-row>

    <v-btn block variant="tonal" prepend-icon="mdi-plus" class="mt-2" @click="addDialogOpen = true">
      Add working variation
    </v-btn>

    <v-row class="mt-2 mb-2" dense>
      <v-col cols="6">
        <v-card variant="tonal" class="pa-3 text-center">
          <div class="text-h5">{{ todaySetCount }}</div>
          <div class="text-caption text-medium-emphasis">set{{ todaySetCount === 1 ? '' : 's' }} today</div>
        </v-card>
      </v-col>
      <v-col cols="6">
        <v-card variant="tonal" class="pa-3 text-center">
          <div class="text-h5">{{ currentStreak }}</div>
          <div class="text-caption text-medium-emphasis">day streak</div>
        </v-card>
      </v-col>
    </v-row>

    <v-alert
      v-if="weeklyRecap.lastWeek > 0 || weeklyRecap.thisWeek > 0"
      :type="weeklyRecap.thisWeek >= weeklyRecap.lastWeek ? 'success' : 'info'"
      variant="tonal"
      density="compact"
      class="mb-2"
    >
      {{ weeklyRecap.thisWeek }} set{{ weeklyRecap.thisWeek === 1 ? '' : 's' }} in the last 7 days
      <template v-if="weeklyRecap.lastWeek > 0">
        ({{ weeklyRecap.thisWeek >= weeklyRecap.lastWeek ? 'up' : 'down' }} from {{ weeklyRecap.lastWeek }} the
        7 days before)
      </template>
    </v-alert>

    <template v-if="neglectedFavorites.length > 0">
      <div class="text-subtitle-2 text-medium-emphasis mt-4 mb-1">Hasn't been hit in a while</div>
      <v-list density="compact" class="mb-2">
        <v-list-item
          v-for="favorite in neglectedFavorites"
          :key="favorite.variation.id"
          :title="favorite.exercise.name"
          :subtitle="`${favorite.variation.name} · ${lastLoggedLabelFor(favorite.variation)}`"
          @click="openSheet(favorite.exercise, favorite.variation)"
        >
          <template #append>
            <v-btn icon="mdi-plus" size="small" variant="text" @click.stop="openSheet(favorite.exercise, favorite.variation)" />
          </template>
        </v-list-item>
      </v-list>
    </template>

    <template v-if="recentEntries.length > 0">
      <div class="text-subtitle-2 text-medium-emphasis mt-4 mb-1">Recent activity</div>
      <LogEntryList
        :entries="recentEntries"
        @update="onRecentUpdate"
        @remove="onRecentRemove"
        @restore="onRecentRestore"
      />
      <v-btn block variant="text" class="mt-1" to="/log">See full log</v-btn>
    </template>

    <template v-if="selectedExercise && selectedVariation">
      <RepStepperSheet
        v-if="selectedExercise.metricType === 'reps'"
        v-model="sheetOpen"
        :exercise-name="selectedExercise.name"
        :variation-name="selectedVariation.name"
        :image-url="selectedVariation.imageUrl"
        :notes="selectedVariation.notes"
        :video-url="selectedVariation.videoUrl"
        :initial-value="lastValueByVariation.get(selectedVariation.id)"
        @confirm="logSet"
      />
      <TimerSheet
        v-else
        v-model="sheetOpen"
        :exercise-name="selectedExercise.name"
        :variation-name="selectedVariation.name"
        :image-url="selectedVariation.imageUrl"
        :notes="selectedVariation.notes"
        :video-url="selectedVariation.videoUrl"
        :initial-value="lastValueByVariation.get(selectedVariation.id)"
        @confirm="logSet"
      />
    </template>

    <v-snackbar v-model="snackbar" timeout="2500">{{ snackbarText }}</v-snackbar>

    <AddFavoriteDialog
      v-model="addDialogOpen"
      :exercises="store.exercises"
      :variations="store.variations"
      @select="addFavorite"
    />
  </v-container>
</template>
