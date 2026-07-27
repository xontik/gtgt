import { desc, isNull, and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { exercises, exerciseVariations, logEntries } from '../db/schema.js';
import { isDiscordConfigured, sendDiscordMessage } from '../lib/discord.js';

const IDLE_HOURS = Number(process.env.NOTIFY_IDLE_HOURS ?? 1);
const SUGGESTION_COUNT = 3;

export type CheckIdleResult = {
  notified: boolean;
  reason: string;
};

// In-memory: fine for this single-process app, and intentionally resets on
// restart (a fresh idle window is a reasonable "clean slate" after a
// redeploy). Prevents a frequent cron (e.g. every 5 minutes) from re-sending
// the same reminder repeatedly once the idle threshold has been crossed.
let lastNotifiedAt: Date | null = null;

export async function checkIdleAndNotify(options: { force?: boolean } = {}): Promise<CheckIdleResult> {
  if (!isDiscordConfigured()) {
    return { notified: false, reason: 'Discord webhook not configured' };
  }

  const [lastActivity] = await db
    .select({ timestamp: logEntries.timestamp })
    .from(logEntries)
    .orderBy(desc(logEntries.timestamp))
    .limit(1);

  const idleSince = lastActivity?.timestamp ?? null;
  const idleMs = idleSince ? Date.now() - idleSince.getTime() : Infinity;

  if (!options.force && idleMs < IDLE_HOURS * 60 * 60 * 1000) {
    return { notified: false, reason: 'A set was already logged recently' };
  }

  if (!options.force && lastNotifiedAt && idleSince && lastNotifiedAt >= idleSince) {
    return { notified: false, reason: 'Already sent a reminder since the last logged set' };
  }

  const favorites = await db
    .select({ variation: exerciseVariations, exercise: exercises })
    .from(exerciseVariations)
    .innerJoin(exercises, eq(exerciseVariations.exerciseId, exercises.id))
    .where(and(eq(exerciseVariations.isFavorite, true), isNull(exerciseVariations.deletedAt)));

  if (favorites.length === 0) {
    return { notified: false, reason: 'No favorite variations to suggest' };
  }

  const lastLoggedByVariation = new Map<number, Date>();
  for (const { variation } of favorites) {
    const [lastEntry] = await db
      .select({ timestamp: logEntries.timestamp })
      .from(logEntries)
      .where(eq(logEntries.variationId, variation.id))
      .orderBy(desc(logEntries.timestamp))
      .limit(1);
    if (lastEntry) lastLoggedByVariation.set(variation.id, lastEntry.timestamp);
  }

  // Most-overdue first; never-logged favorites count as maximally overdue.
  const suggestions = [...favorites]
    .sort((a, b) => {
      const aTime = lastLoggedByVariation.get(a.variation.id)?.getTime() ?? 0;
      const bTime = lastLoggedByVariation.get(b.variation.id)?.getTime() ?? 0;
      return aTime - bTime;
    })
    .slice(0, SUGGESTION_COUNT);

  const appUrl = (process.env.PUBLIC_APP_URL ?? 'http://localhost:8080').replace(/\/$/, '');

  const lines = suggestions.map(({ variation, exercise }) => {
    const link = `${appUrl}/?logVariation=${variation.id}`;
    const last = lastLoggedByVariation.get(variation.id);
    const lastLabel = last ? `last done ${formatRelative(last)}` : 'never logged';
    return `• **${exercise.name}** — ${variation.name} (${lastLabel}) — <${link}>`;
  });

  const message = [
    `⏰ Nothing logged in the last ${IDLE_HOURS} hour${IDLE_HOURS === 1 ? '' : 's'}. Quick set?`,
    ...lines,
  ].join('\n');

  await sendDiscordMessage(message);
  lastNotifiedAt = new Date();

  return { notified: true, reason: `Suggested ${suggestions.length} variation(s)` };
}

function formatRelative(date: Date): string {
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
