import type { Exercise, ExerciseVariation, LogEntry } from '@gtg/shared';
import { formatDuration } from './format';

export type InsightType = 'neglected' | 'plateau' | 'improving' | 'declining' | 'imbalance';

export interface Insight {
  id: string;
  type: InsightType;
  severity: 'info' | 'warning' | 'success';
  message: string;
  variation?: ExerciseVariation;
  exercise?: Exercise;
}

function formatValue(exercise: Exercise, value: number): string {
  return exercise.metricType === 'time' ? formatDuration(value) : `${Math.round(value)} reps`;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NEGLECTED_POSTPONE_DAYS = 7;
const TREND_RECENT_DAYS = 7;
const TREND_BASELINE_DAYS = 21;
const MIN_ENTRIES_PER_WINDOW = 2;
const PLATEAU_BAND = 0.05;
const IMPROVING_THRESHOLD = 0.15;
const DECLINING_THRESHOLD = 0.15;

/**
 * Pure, data-only "coach" detections derived entirely from what's already
 * logged - no new inputs, no server round-trip. Kept separate from
 * HomeView so the rules can be reasoned about (and eventually tested) in
 * isolation from rendering.
 */
export function computeInsights(
  exercises: Exercise[],
  favorites: { variation: ExerciseVariation; exercise: Exercise }[],
  entriesByVariation: Map<number, LogEntry[]>,
): Insight[] {
  const insights: Insight[] = [];
  const now = Date.now();

  for (const { variation, exercise } of favorites) {
    const entries = entriesByVariation.get(variation.id) ?? [];
    if (entries.length === 0) {
      continue;
    }

    const sorted = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const lastLogged = new Date(sorted[0].timestamp);
    const daysSinceLast = (now - lastLogged.getTime()) / DAY_MS;

    // Neglected: was actually being used (a real history, not one stray set)
    // before it went quiet - suggest parking it rather than letting it sit
    // as dead weight on Home forever.
    if (entries.length >= 3 && daysSinceLast >= NEGLECTED_POSTPONE_DAYS) {
      insights.push({
        id: `neglected-${variation.id}`,
        type: 'neglected',
        severity: 'warning',
        message: `${exercise.name} (${variation.name}) is a working variation but hasn't been logged in ${Math.floor(daysSinceLast)} days. Postpone it, or remove it for now?`,
        variation,
        exercise,
      });
      continue;
    }

    // Trend: compare the last week's average against the prior two weeks'
    // average to flag plateaus, gains, or dips - all from data already on
    // hand, no target/goal configuration required.
    const recentValues = sorted
      .filter((e) => now - new Date(e.timestamp).getTime() <= TREND_RECENT_DAYS * DAY_MS)
      .map((e) => e.value);
    const baselineValues = sorted
      .filter((e) => {
        const age = now - new Date(e.timestamp).getTime();
        return age > TREND_RECENT_DAYS * DAY_MS && age <= TREND_BASELINE_DAYS * DAY_MS;
      })
      .map((e) => e.value);

    if (recentValues.length < MIN_ENTRIES_PER_WINDOW || baselineValues.length < MIN_ENTRIES_PER_WINDOW) {
      continue;
    }

    const recentAvg = average(recentValues);
    const baselineAvg = average(baselineValues);
    const change = (recentAvg - baselineAvg) / baselineAvg;

    if (change >= IMPROVING_THRESHOLD) {
      insights.push({
        id: `improving-${variation.id}`,
        type: 'improving',
        severity: 'success',
        message: `${exercise.name} (${variation.name}) is trending up: averaging ${formatValue(exercise, recentAvg)} this week, up from ${formatValue(exercise, baselineAvg)} two weeks ago.`,
        variation,
        exercise,
      });
    } else if (change <= -DECLINING_THRESHOLD) {
      insights.push({
        id: `declining-${variation.id}`,
        type: 'declining',
        severity: 'warning',
        message: `${exercise.name} (${variation.name}) has dipped: averaging ${formatValue(exercise, recentAvg)} this week, down from ${formatValue(exercise, baselineAvg)}. Fatigue, an off week, or time to back off?`,
        variation,
        exercise,
      });
    } else if (Math.abs(change) <= PLATEAU_BAND) {
      insights.push({
        id: `plateau-${variation.id}`,
        type: 'plateau',
        severity: 'info',
        message: `You're stuck on ${exercise.name} (${variation.name}): averaging ${formatValue(exercise, recentAvg)} for weeks with no real change. Try a harder variation, add reps, or add rest.`,
        variation,
        exercise,
      });
    }
  }

  // Category imbalance: only looks at favorites (what's actually being
  // worked GtG-style), not the whole exercise library.
  const favoriteCategories = new Set(favorites.map((f) => f.exercise.category));
  if (favorites.length >= 2 && favoriteCategories.size === 1) {
    const [category] = favoriteCategories;
    const others = new Set(exercises.map((e) => e.category));
    others.delete(category!);
    if (others.size > 0) {
      insights.push({
        id: 'imbalance',
        type: 'imbalance',
        severity: 'info',
        message: `All ${favorites.length} of your working variations are ${category} exercises. Consider working in a ${[...others].join('/')} movement for balance.`,
      });
    }
  }

  return insights;
}
