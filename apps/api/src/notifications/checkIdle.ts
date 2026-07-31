import { desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { logEntries } from '../db/schema.js';
import { isDiscordConfigured, sendDiscordMessage } from '../lib/discord.js';
import { getOverdueFavorites } from '../lib/overdueFavorites.js';

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

  const suggestions = await getOverdueFavorites(SUGGESTION_COUNT);

  if (suggestions.length === 0) {
    return { notified: false, reason: 'No favorite variations to suggest' };
  }

  const appUrl = (process.env.PUBLIC_APP_URL ?? 'http://localhost:8080').replace(/\/$/, '');

  const lines = suggestions.map(({ variationId, exerciseName, variationName, lastLoggedAt }) => {
    const link = `${appUrl}/?logVariation=${variationId}`;
    const lastLabel = lastLoggedAt ? `last done ${formatRelative(lastLoggedAt)}` : 'never logged';
    return `• **${exerciseName}** — ${variationName} (${lastLabel}) — <${link}>`;
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
