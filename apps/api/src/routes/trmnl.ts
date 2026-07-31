import type { FastifyInstance } from 'fastify';
import { getOverdueFavorites } from '../lib/overdueFavorites.js';

const SHOWN_COUNT = 4;

function formatValue(metricType: string, value: number): string {
  if (metricType !== 'time') return `${value} reps`;
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatRelative(date: Date): string {
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// A static (no client JS) page sized for the original TRMNL e-ink display
// (800x480, 1-bit black/white - TRMNL's server screenshots this URL on its
// own schedule, there's no browser on the device itself). Registered under
// /api (as /api/trmnl) purely so it's reachable through a reverse proxy
// that only forwards /api/* to this service - it's still deliberately
// public even there: index.ts's passcode-gate hook explicitly excludes
// /api/trmnl, since TRMNL's fetcher can't carry a session cookie.
export async function trmnlRoutes(app: FastifyInstance) {
  app.get('/trmnl', async (_req, reply) => {
    const overdue = await getOverdueFavorites(SHOWN_COUNT);

    const rows = overdue
      .map(({ exerciseName, variationName, metricType, lastLoggedAt, lastValue }) => {
        const lastLabel = lastLoggedAt ? `Last: ${formatRelative(lastLoggedAt)}` : 'Never logged';
        const nextLabel = lastValue !== null ? `Next: ${formatValue(metricType, lastValue)}` : '';
        return `
          <div class="row">
            <div class="name">${escapeHtml(exerciseName)}</div>
            <div class="variation">${escapeHtml(variationName)}</div>
            <div class="meta">${lastLabel}${nextLabel ? ` &middot; ${nextLabel}` : ''}</div>
          </div>`;
      })
      .join('\n');

    const body = overdue.length
      ? rows
      : '<div class="empty">No working variations set up yet.</div>';

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>GtG Tracker</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 800px;
    height: 480px;
    background: #fff;
    color: #000;
    font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  .page { width: 800px; height: 480px; padding: 32px; display: flex; flex-direction: column; }
  .header {
    font-size: 28px;
    font-weight: 700;
    border-bottom: 3px solid #000;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .rows { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: space-evenly; }
  .row { border-bottom: 1px solid #000; padding: 10px 0; }
  .row:last-child { border-bottom: none; }
  .name { font-size: 34px; font-weight: 700; line-height: 1.1; }
  .variation { font-size: 22px; margin-top: 2px; }
  .meta { font-size: 20px; margin-top: 4px; color: #333; }
  .empty { font-size: 28px; margin-top: 40px; }
</style>
</head>
<body>
  <div class="page">
    <div class="header">Next up on GtG</div>
    <div class="rows">
      ${body}
    </div>
  </div>
</body>
</html>`;

    reply.header('content-type', 'text/html; charset=utf-8');
    return html;
  });
}
