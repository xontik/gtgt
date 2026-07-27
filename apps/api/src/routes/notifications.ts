import type { FastifyInstance } from 'fastify';
import { checkIdleAndNotify } from '../notifications/checkIdle.js';

export async function notificationRoutes(app: FastifyInstance) {
  // Manual trigger, useful for testing the Discord webhook / deep links
  // without waiting for the cron schedule.
  app.post('/notifications/check-idle', async () => checkIdleAndNotify());
}
