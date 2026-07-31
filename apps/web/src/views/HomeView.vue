<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Exercise, ExerciseVariation, LogEntry } from '@gtg/shared';
import { useExercisesStore } from '../stores/exercises';
import { useRoutinesStore } from '../stores/routines';
import { createLogEntry, listLogEntries } from '../api/logEntries';
import { formatDuration, formatRelativeTime } from '../lib/format';
import { dateKey } from '../lib/heatmap';
import { vibrateSuccess, vibrateMilestone } from '../lib/haptics';
import { isOnline } from '../lib/network';
import { queuedMutations, syncing, dataVersion } from '../lib/offlineQueue';
import { recentHistorySince } from '../lib/dateRange';
import FavoriteVariationCard from '../components/FavoriteVariationCard.vue';
import RepStepperSheet from '../components/RepStepperSheet.vue';
import TimerSheet from '../components/TimerSheet.vue';
import AddFavoriteDialog from '../components/AddFavoriteDialog.vue';
import QuickLogPickerDialog from '../components/QuickLogPickerDialog.vue';
import LogEntryList from '../components/LogEntryList.vue';
import { curveStyle } from '../lib/curveVariant';
import { computeInsights, type Insight } from '../lib/insights';
import RoutineRunnerSheet, {
  type RoutineStep,
  type RoutineStepResult,
} from '../components/RoutineRunnerSheet.vue';

const store = useExercisesStore();
const routinesStore = useRoutinesStore();
const entries = ref<LogEntry[]>([]);
const route = useRoute();
const router = useRouter();

// A minimal cold-start cache: if the app is opened with no connectivity at
// all (not just "went offline mid-session", where Pinia's in-memory state
// already covers it), there's otherwise nothing to show or log against.
// Snapshotted after every successful load, read back only when the real
// fetch fails while offline.
const OFFLINE_CACHE_KEY = 'gtg-offline-cache-v1';

function saveOfflineCache() {
  try {
    localStorage.setItem(
      OFFLINE_CACHE_KEY,
      JSON.stringify({ exercises: store.exercises, variations: store.variations, entries: entries.value }),
    );
  } catch {
    // best-effort - a full/unavailable localStorage shouldn't break the happy path
  }
}

function loadOfflineCache(): { exercises: Exercise[]; variations: ExerciseVariation[]; entries: LogEntry[] } | null {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function load() {
  try {
    const [, fetchedEntries] = await Promise.all([
      store.fetchAll(),
      listLogEntries({ since: recentHistorySince() }),
      routinesStore.fetchAll(),
    ]);
    entries.value = fetchedEntries;
    saveOfflineCache();
  } catch (err) {
    if (isOnline.value) throw err;
    const cached = loadOfflineCache();
    if (cached) {
      store.exercises = cached.exercises;
      store.variations = cached.variations;
      entries.value = cached.entries;
    }
  }
}

onMounted(async () => {
  await load();

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

// A discarded offline mutation (see System page) leaves the store stale
// until the next real fetch - full reload rather than trying to reverse
// just that one edit, same reasoning as offlineQueue.ts's dataVersion doc.
watch(dataVersion, load);

// Once the offline queue fully drains, refetch so client-generated temp
// ids (negative, see api/logEntries.ts) get replaced by the real synced
// entries instead of showing "Syncing" forever.
watch(
  () => queuedMutations.value.length,
  async (count, prevCount) => {
    if (prevCount > 0 && count === 0 && !syncing.value) {
      entries.value = await listLogEntries({ since: recentHistorySince() }).catch(() => entries.value);
      saveOfflineCache();
    }
  },
);

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

function streakFromDayKeys(dayKeys: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  // Today doesn't have to be logged yet for the streak to still count "so far".
  if (!dayKeys.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dayKeys.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const currentStreak = computed(() => streakFromDayKeys(loggedDayKeys.value));

// Streak per exercise (not per variation) - logging any variation on the
// ladder keeps it going, so moving up or down doesn't reset it.
const streakByExercise = computed(() => {
  const dayKeysByExercise = new Map<number, Set<string>>();
  for (const entry of entries.value) {
    const variation = store.variations.find((v) => v.id === entry.variationId);
    if (!variation) continue;
    const set = dayKeysByExercise.get(variation.exerciseId) ?? new Set<string>();
    set.add(dateKey(new Date(entry.timestamp)));
    dayKeysByExercise.set(variation.exerciseId, set);
  }
  const map = new Map<number, number>();
  for (const [exerciseId, dayKeys] of dayKeysByExercise) {
    map.set(exerciseId, streakFromDayKeys(dayKeys));
  }
  return map;
});

function exerciseStreakFor(exercise: Exercise) {
  return streakByExercise.value.get(exercise.id) ?? 0;
}

const NEGLECTED_DAYS = 3;

const neglectedFavorites = computed(() =>
  sortedFavorites.value.filter((f) => {
    const last = lastLoggedByVariation.value.get(f.variation.id);
    if (!last) return true;
    const diffDays = (Date.now() - last.getTime()) / 86_400_000;
    return diffDays >= NEGLECTED_DAYS;
  }),
);

// Progression nudge: if the last few sets on a favorited variation all met
// or beat its target, and there's a harder variation next on that
// exercise's ladder, suggest moving up instead of staying put forever.
const NUDGE_STREAK = 5;
const NUDGE_DISMISS_KEY = 'gtg-dismissed-nudges';
const NUDGE_DISMISS_DAYS = 7;

function loadDismissedNudgeIds(): Set<number> {
  try {
    const raw = localStorage.getItem(NUDGE_DISMISS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { variationId: number; until: number }[];
    const now = Date.now();
    return new Set(parsed.filter((d) => d.until > now).map((d) => d.variationId));
  } catch {
    return new Set();
  }
}

const dismissedNudgeIds = ref<Set<number>>(loadDismissedNudgeIds());

function dismissNudge(variationId: number) {
  dismissedNudgeIds.value = new Set([...dismissedNudgeIds.value, variationId]);
  let list: { variationId: number; until: number }[] = [];
  try {
    list = JSON.parse(localStorage.getItem(NUDGE_DISMISS_KEY) ?? '[]');
  } catch {
    list = [];
  }
  list = list.filter((d) => d.variationId !== variationId);
  list.push({ variationId, until: Date.now() + NUDGE_DISMISS_DAYS * 24 * 60 * 60 * 1000 });
  localStorage.setItem(NUDGE_DISMISS_KEY, JSON.stringify(list));
}

interface ProgressionNudge {
  variation: ExerciseVariation;
  exercise: Exercise;
  nextVariation: ExerciseVariation;
}

const progressionNudges = computed<ProgressionNudge[]>(() => {
  const nudges: ProgressionNudge[] = [];
  for (const { variation, exercise } of favoritesWithExercise.value) {
    if (dismissedNudgeIds.value.has(variation.id)) continue;
    if (!variation.targetValue) continue;

    const recent = (entriesByVariation.value.get(variation.id) ?? [])
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, NUDGE_STREAK);
    if (recent.length < NUDGE_STREAK) continue;
    if (!recent.every((e) => e.value >= variation.targetValue!)) continue;

    const ladder = store.activeVariationsFor(exercise.id);
    const index = ladder.findIndex((v) => v.id === variation.id);
    const next = ladder[index + 1];
    if (!next) continue;

    nudges.push({ variation, exercise, nextVariation: next });
  }
  return nudges;
});

// Insights: data-only "coach" detections (neglected favorites, plateaus,
// trending up/down, category imbalance) computed purely from what's
// already logged - see lib/insights.ts for the rules.
const INSIGHT_DISMISS_KEY = 'gtg-dismissed-insights';
const INSIGHT_DISMISS_DAYS = 3;

function loadDismissedInsightIds(): Set<string> {
  try {
    const raw = localStorage.getItem(INSIGHT_DISMISS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { id: string; until: number }[];
    const now = Date.now();
    return new Set(parsed.filter((d) => d.until > now).map((d) => d.id));
  } catch {
    return new Set();
  }
}

const dismissedInsightIds = ref<Set<string>>(loadDismissedInsightIds());

function dismissInsight(id: string) {
  dismissedInsightIds.value = new Set([...dismissedInsightIds.value, id]);
  let list: { id: string; until: number }[] = [];
  try {
    list = JSON.parse(localStorage.getItem(INSIGHT_DISMISS_KEY) ?? '[]');
  } catch {
    list = [];
  }
  list = list.filter((d) => d.id !== id);
  list.push({ id, until: Date.now() + INSIGHT_DISMISS_DAYS * 24 * 60 * 60 * 1000 });
  localStorage.setItem(INSIGHT_DISMISS_KEY, JSON.stringify(list));
}

const insights = computed<Insight[]>(() =>
  computeInsights(store.exercises, favoritesWithExercise.value, entriesByVariation.value).filter(
    (insight) => !dismissedInsightIds.value.has(insight.id),
  ),
);

const insightIcons: Record<Insight['type'], string> = {
  neglected: 'mdi-clock-alert-outline',
  plateau: 'mdi-chart-line-variant',
  improving: 'mdi-trending-up',
  declining: 'mdi-trending-down',
  imbalance: 'mdi-scale-balance',
};

const insightColors: Record<Insight['severity'], string> = {
  info: 'info',
  warning: 'warning',
  success: 'success',
};

async function postponeInsightFavorite(insight: Insight) {
  if (insight.variation) await store.setFavorite(insight.variation.id, false);
  dismissInsight(insight.id);
}

// Nudges + insights used to render as one always-open v-alert each, which
// piled into a wall of banners above the favorites grid on a day with
// several findings. Collapsed into one summary panel (closed by default,
// like the other Home accordions) so the common case - nothing/one finding
// - stays compact, and a bad day is one tap away instead of a scroll past.
interface CoachItem {
  id: string;
  icon: string;
  color: string;
  message: string;
  showProgressionLink?: { exerciseId: number };
  showUnfavorite?: Insight;
  onDismiss: () => void;
}

const coachItems = computed<CoachItem[]>(() => [
  ...progressionNudges.value.map(
    (nudge): CoachItem => ({
      id: `nudge-${nudge.variation.id}`,
      icon: 'mdi-arrow-up-bold-circle-outline',
      color: 'success',
      message: `${nudge.exercise.name}: you've hit target on ${nudge.variation.name} ${NUDGE_STREAK} sets in a row. Ready for ${nudge.nextVariation.name}?`,
      showProgressionLink: { exerciseId: nudge.exercise.id },
      onDismiss: () => dismissNudge(nudge.variation.id),
    }),
  ),
  ...insights.value.map(
    (insight): CoachItem => ({
      id: insight.id,
      icon: insightIcons[insight.type],
      color: insightColors[insight.severity],
      message: insight.message,
      showUnfavorite: insight.type === 'neglected' ? insight : undefined,
      onDismiss: () => dismissInsight(insight.id),
    }),
  ),
]);

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

function quickAddLabelFor(variation: ExerciseVariation) {
  const last = lastValueByVariation.value.get(variation.id);
  return last ? `+${last}` : undefined;
}

async function quickAdd(exercise: Exercise, variation: ExerciseVariation) {
  const last = lastValueByVariation.value.get(variation.id);
  if (!last) {
    openSheet(exercise, variation);
    return;
  }

  const priorBest = Math.max(
    0,
    ...(entriesByVariation.value.get(variation.id) ?? []).map((e) => e.value),
  );
  const wasGoalMet = goalMetFor(variation);

  const created = await createLogEntry({ variationId: variation.id, value: last });
  entries.value.push(created);

  const isPersonalBest = priorBest > 0 && last > priorBest;
  const justHitGoal = !wasGoalMet && goalMetFor(variation);
  if (isPersonalBest || justHitGoal) vibrateMilestone();
  else vibrateSuccess();

  const unit = exercise.metricType === 'time' ? 's' : ' reps';
  let note = '';
  if (isPersonalBest) note = ' — new best!';
  else if (justHitGoal) note = ' — goal hit!';
  snackbarText.value = `Logged ${last}${unit} for ${exercise.name}${note}`;
  snackbar.value = true;
}

const addDialogOpen = ref(false);

async function addFavorite(variationId: number) {
  await store.setFavorite(variationId, true);
  addDialogOpen.value = false;
}

const quickLogPickerOpen = ref(false);

function quickLogPicked(variationId: number) {
  quickLogPickerOpen.value = false;
  const variation = store.variations.find((v) => v.id === variationId);
  const exercise = variation && store.exercises.find((e) => e.id === variation.exerciseId);
  if (variation && exercise) openSheet(exercise, variation);
}

// A routine's "last done" is approximated as the most recent log entry
// across any of its items - not a strict "all items logged together" check,
// but close enough to tell you roughly when you last worked through it.
function routineLastDoneLabel(routineId: number) {
  const items = routinesStore.itemsFor(routineId);
  let latest: Date | undefined;
  for (const item of items) {
    const last = lastLoggedByVariation.value.get(item.variationId);
    if (last && (!latest || last > latest)) latest = last;
  }
  return latest ? formatRelativeTime(latest) : 'Not done yet';
}

const runnerOpen = ref(false);
const runnerRoutineId = ref<number>();
const runnerRoutineName = ref('');
const runnerSteps = ref<RoutineStep[]>([]);

function startRoutine(routineId: number) {
  const routine = routinesStore.routines.find((r) => r.id === routineId);
  if (!routine) return;

  const steps: RoutineStep[] = [];
  for (const item of routinesStore.itemsFor(routineId)) {
    const variation = store.variations.find((v) => v.id === item.variationId);
    const exercise = variation && store.exercises.find((e) => e.id === variation.exerciseId);
    if (!variation || !exercise) continue;
    const initialValue = item.targetValue ?? lastValueByVariation.value.get(variation.id) ?? (exercise.metricType === 'time' ? 30 : 5);
    steps.push({
      routineItemId: item.id,
      variationId: variation.id,
      exerciseName: exercise.name,
      variationName: variation.name,
      metricType: exercise.metricType,
      initialValue,
      plannedSets: item.setsCount,
      plannedValue: item.targetValue,
    });
  }
  if (steps.length === 0) return;

  runnerRoutineId.value = routineId;
  runnerRoutineName.value = routine.name;
  runnerSteps.value = steps;
  runnerOpen.value = true;
}

async function logRoutineStep(variationId: number, value: number) {
  const created = await createLogEntry({ variationId, value });
  entries.value.push(created);
}

interface RoutineDiffItem {
  routineItemId: number;
  variationId: number;
  exerciseName: string;
  variationName: string;
  actualSets: number;
  actualValue: number | null;
  plannedSets: number;
  plannedValue: number | null;
}

const routineDiffDialogOpen = ref(false);
const routineDiffItems = ref<RoutineDiffItem[]>([]);
const routineDiffAllResults = ref<RoutineStepResult[]>([]);
const savingNewRoutineName = ref(false);
const newRoutineNameInput = ref('');

function finishRoutine(results: RoutineStepResult[]) {
  vibrateSuccess();
  snackbarText.value = `Finished ${runnerRoutineName.value}`;
  snackbar.value = true;

  const diffs: RoutineDiffItem[] = [];
  for (const result of results) {
    const setsDiffer = result.performedSets !== result.plannedSets;
    const valueDiffers = result.plannedValue !== null && result.lastValue !== result.plannedValue;
    if (!setsDiffer && !valueDiffers) continue;

    const variation = store.variations.find((v) => v.id === result.variationId);
    const exercise = variation && store.exercises.find((e) => e.id === variation.exerciseId);
    diffs.push({
      routineItemId: result.routineItemId,
      variationId: result.variationId,
      exerciseName: exercise?.name ?? 'Unknown exercise',
      variationName: variation?.name ?? 'Unknown variation',
      actualSets: result.performedSets,
      actualValue: result.lastValue,
      plannedSets: result.plannedSets,
      plannedValue: result.plannedValue,
    });
  }

  if (diffs.length > 0) {
    routineDiffItems.value = diffs;
    routineDiffAllResults.value = results;
    savingNewRoutineName.value = false;
    newRoutineNameInput.value = runnerRoutineName.value ? `${runnerRoutineName.value} (updated)` : '';
    routineDiffDialogOpen.value = true;
  }
}

async function updateRoutineFromRun() {
  for (const diff of routineDiffItems.value) {
    await routinesStore.updateItemTemplate(diff.routineItemId, {
      targetValue: diff.actualValue ?? diff.plannedValue,
      setsCount: diff.actualSets,
    });
  }
  routineDiffDialogOpen.value = false;
}

async function saveRunAsNewRoutine() {
  if (!newRoutineNameInput.value.trim()) return;
  const created = await routinesStore.addRoutine(newRoutineNameInput.value.trim());
  for (const result of routineDiffAllResults.value) {
    await routinesStore.addItem(created.id, result.variationId, result.lastValue, result.performedSets);
  }
  routineDiffDialogOpen.value = false;
}
</script>

<template>
  <v-container>
    <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />

    <v-alert v-if="!store.loading && sortedFavorites.length === 0" type="info" variant="tonal" class="mb-4">
      No favorites yet. Use "Add working variation" below to pick what you want to quick-log here.
    </v-alert>

    <v-row align="stretch">
      <v-col
        v-for="(favorite, index) in sortedFavorites"
        :key="favorite.variation.id"
        cols="12"
        sm="6"
        md="4"
        class="d-flex"
        style="min-width: 0"
      >
        <FavoriteVariationCard
          :style="curveStyle(index)"
          :exercise="favorite.exercise"
          :variation="favorite.variation"
          :today-label="todayLabelFor(favorite.exercise, favorite.variation)"
          :last-logged-label="lastLoggedLabelFor(favorite.variation)"
          :goal-label="goalLabelFor(favorite.variation)"
          :goal-met="goalMetFor(favorite.variation)"
          :quick-add-label="quickAddLabelFor(favorite.variation)"
          :exercise-streak="exerciseStreakFor(favorite.exercise)"
          @log="openSheet(favorite.exercise, favorite.variation)"
          @quick-add="quickAdd(favorite.exercise, favorite.variation)"
        />
      </v-col>
    </v-row>

    <v-btn block variant="tonal" prepend-icon="mdi-plus" class="mt-2" @click="addDialogOpen = true">
      Add working variation
    </v-btn>

    <template v-if="routinesStore.routines.length > 0">
      <div class="text-subtitle-2 text-medium-emphasis mt-4 mb-1">Routines</div>
      <v-list density="compact" class="mb-2">
        <v-list-item
          v-for="routine in routinesStore.routines"
          :key="routine.id"
          :title="routine.name"
          :subtitle="`${routinesStore.itemsFor(routine.id).length} exercise${routinesStore.itemsFor(routine.id).length === 1 ? '' : 's'} · ${routineLastDoneLabel(routine.id)}`"
          @click="startRoutine(routine.id)"
        >
          <template #append>
            <v-btn
              icon="mdi-play"
              size="small"
              variant="tonal"
              :aria-label="`Start ${routine.name}`"
              @click.stop="startRoutine(routine.id)"
            />
          </template>
        </v-list-item>
      </v-list>
    </template>

    <v-expansion-panels v-if="coachItems.length > 0" class="mt-4" variant="accordion">
      <v-expansion-panel>
        <v-expansion-panel-title>
          Coach
          <v-chip size="small" class="ml-2" :color="coachItems.some((i) => i.color === 'warning') ? 'warning' : 'primary'">
            {{ coachItems.length }}
          </v-chip>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-list density="compact">
            <v-list-item v-for="item in coachItems" :key="item.id" :prepend-icon="item.icon" :base-color="item.color">
              <v-list-item-title class="text-wrap text-body-2">{{ item.message }}</v-list-item-title>
              <div class="mt-1">
                <v-btn
                  v-if="item.showProgressionLink"
                  size="small"
                  variant="text"
                  class="px-0"
                  :to="`/exercises/${item.showProgressionLink.exerciseId}`"
                >
                  View progression
                </v-btn>
                <v-btn
                  v-if="item.showUnfavorite"
                  size="small"
                  variant="text"
                  class="px-0"
                  @click="postponeInsightFavorite(item.showUnfavorite)"
                >
                  Unfavorite
                </v-btn>
                <v-btn size="small" variant="text" class="px-0" @click="item.onDismiss">Dismiss</v-btn>
              </div>
            </v-list-item>
          </v-list>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-card variant="tonal" class="mt-4 pa-3">
      <div class="d-flex ga-4">
        <div class="text-center flex-1-1">
          <div class="text-h5">{{ todaySetCount }}</div>
          <div class="text-caption text-medium-emphasis">set{{ todaySetCount === 1 ? '' : 's' }} today</div>
        </div>
        <div class="text-center flex-1-1">
          <div class="text-h5">{{ currentStreak }}</div>
          <div class="text-caption text-medium-emphasis">day streak</div>
        </div>
      </div>
      <div
        v-if="weeklyRecap.lastWeek > 0 || weeklyRecap.thisWeek > 0"
        class="text-caption text-medium-emphasis text-center mt-2"
      >
        {{ weeklyRecap.thisWeek }} set{{ weeklyRecap.thisWeek === 1 ? '' : 's' }} in the last 7 days
        <template v-if="weeklyRecap.lastWeek > 0">
          ({{ weeklyRecap.thisWeek >= weeklyRecap.lastWeek ? 'up' : 'down' }} from {{ weeklyRecap.lastWeek }} the
          7 days before)
        </template>
      </div>
    </v-card>

    <v-expansion-panels v-if="neglectedFavorites.length > 0 || recentEntries.length > 0" class="mt-4" variant="accordion">
      <v-expansion-panel v-if="neglectedFavorites.length > 0">
        <v-expansion-panel-title>Hasn't been hit in a while ({{ neglectedFavorites.length }})</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-list density="compact">
            <v-list-item
              v-for="favorite in neglectedFavorites"
              :key="favorite.variation.id"
              :title="favorite.exercise.name"
              :subtitle="`${favorite.variation.name} · ${lastLoggedLabelFor(favorite.variation)}`"
              @click="openSheet(favorite.exercise, favorite.variation)"
            >
              <template #append>
                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="text"
                  :aria-label="`Log ${favorite.exercise.name}`"
                  @click.stop="openSheet(favorite.exercise, favorite.variation)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel v-if="recentEntries.length > 0">
        <v-expansion-panel-title>Recent activity</v-expansion-panel-title>
        <v-expansion-panel-text>
          <LogEntryList
            :entries="recentEntries"
            @update="onRecentUpdate"
            @remove="onRecentRemove"
            @restore="onRecentRestore"
          />
          <v-btn block variant="text" class="mt-1" to="/log">See full log</v-btn>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

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

    <QuickLogPickerDialog
      v-model="quickLogPickerOpen"
      :exercises="store.exercises"
      :variations="store.variations"
      @select="quickLogPicked"
    />

    <v-btn
      icon="mdi-plus"
      color="primary"
      size="large"
      rounded="circle"
      class="quick-log-fab"
      aria-label="Quick log any exercise"
      @click="quickLogPickerOpen = true"
    />

    <RoutineRunnerSheet
      v-model="runnerOpen"
      :routine-name="runnerRoutineName"
      :steps="runnerSteps"
      @log-step="logRoutineStep"
      @finished="finishRoutine"
    />

    <v-dialog v-model="routineDiffDialogOpen" max-width="480">
      <v-card>
        <v-card-title>Routine differed from the plan</v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item
              v-for="diff in routineDiffItems"
              :key="diff.routineItemId"
              :title="diff.exerciseName"
              :subtitle="`${diff.variationName} · ${diff.plannedSets}×${diff.plannedValue ?? '?'} planned → ${diff.actualSets}×${diff.actualValue ?? '?'} done`"
            />
          </v-list>

          <v-text-field
            v-if="savingNewRoutineName"
            v-model="newRoutineNameInput"
            label="New routine name"
            class="mt-2"
            autofocus
          />
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="routineDiffDialogOpen = false">Keep as one-off</v-btn>
          <v-spacer />
          <template v-if="!savingNewRoutineName">
            <v-btn variant="tonal" @click="savingNewRoutineName = true">Save as new</v-btn>
            <v-btn color="primary" @click="updateRoutineFromRun">Update routine</v-btn>
          </template>
          <v-btn v-else color="primary" :disabled="!newRoutineNameInput.trim()" @click="saveRunAsNewRoutine">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.quick-log-fab {
  position: fixed;
  right: 16px;
  /* Above the bottom nav (56px) + its safe-area padding, plus a gap. */
  bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px);
  z-index: 5;
}
</style>
