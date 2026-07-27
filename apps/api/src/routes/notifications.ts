import type { FastifyInstance } from 'fastify';
import { checkIdleAndNotify } from '../notifications/checkIdle.js';

export async function notificationRoutes(app: FastifyInstance) {
  // Manual trigger, useful for testing the Discord webhook / deep links
  // without waiting for the cron schedule. ?force=true bypasses both the
  // idle-time gate and the "already notified" cooldown.
  app.post('/notifications/check-idle', async (req) => {
    const { force } = req.query as { force?: string };
    return checkIdleAndNotify({ force: force === 'true' });
  });
}
