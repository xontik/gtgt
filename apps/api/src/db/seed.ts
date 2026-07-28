import { inArray } from 'drizzle-orm';
import { db } from './client.js';
import { exercises, exerciseVariations, logEntries } from './schema.js';

function daysAgo(days: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function seed() {
  const [pushUp] = await db
    .insert(exercises)
    .values({ name: 'Push-up', category: 'push', metricType: 'reps' })
    .returning();
  const [pistolSquat] = await db
    .insert(exercises)
    .values({ name: 'Pistol squat', category: 'squat', metricType: 'reps' })
    .returning();
  const [plank] = await db
    .insert(exercises)
    .values({ name: 'Plank', category: 'core', metricType: 'time' })
    .returning();

  if (!pushUp || !pistolSquat || !plank) {
    throw new Error('Failed to seed exercises.');
  }

  const pushUpVariations = await db
    .insert(exerciseVariations)
    .values([
      { exerciseId: pushUp.id, name: 'Knee push-up', difficultyRank: 1 },
      { exerciseId: pushUp.id, name: 'Push-up', difficultyRank: 2 },
      { exerciseId: pushUp.id, name: 'Decline push-up', difficultyRank: 3 },
      { exerciseId: pushUp.id, name: 'Archer push-up', difficultyRank: 4 },
      { exerciseId: pushUp.id, name: 'One-arm assisted push-up', difficultyRank: 5 },
    ])
    .returning();

  const kneePushUp = pushUpVariations.find((v) => v.difficultyRank === 1);
  const standardPushUp = pushUpVariations.find((v) => v.difficultyRank === 2);
  const declinePushUp = pushUpVariations.find((v) => v.difficultyRank === 3);
  const archerPushUp = pushUpVariations.find((v) => v.difficultyRank === 4);
  if (!kneePushUp || !standardPushUp || !declinePushUp || !archerPushUp) {
    throw new Error('Failed to seed push-up variations.');
  }

  const pistolSquatVariations = await db
    .insert(exerciseVariations)
    .values([
      { exerciseId: pistolSquat.id, name: 'Assisted pistol squat', difficultyRank: 1 },
      { exerciseId: pistolSquat.id, name: 'Box pistol squat', difficultyRank: 2 },
      { exerciseId: pistolSquat.id, name: 'Pistol squat', difficultyRank: 3 },
      { exerciseId: pistolSquat.id, name: 'Weighted pistol squat', difficultyRank: 4 },
    ])
    .returning();

  const [plankHold] = await db
    .insert(exerciseVariations)
    .values({ exerciseId: plank.id, name: 'Plank', difficultyRank: 1 })
    .returning();
  if (!plankHold) throw new Error('Failed to seed plank.');

  const pistolSquatStart = pistolSquatVariations.find((v) => v.difficultyRank === 1);

  // Favorite a couple of push-up variations at once, to show working
  // multiple points on the same ladder simultaneously.
  const favoriteIds = [declinePushUp.id, archerPushUp.id, plankHold.id, pistolSquatStart?.id].filter(
    (id): id is number => id !== undefined,
  );
  await db.update(exerciseVariations).set({ isFavorite: true }).where(inArray(exerciseVariations.id, favoriteIds));

  await db.insert(logEntries).values([
    // History on now-superseded variations, to exercise stats across the whole progression.
    { variationId: kneePushUp.id, timestamp: daysAgo(20, 8), value: 12 },
    { variationId: kneePushUp.id, timestamp: daysAgo(19, 13), value: 14 },
    { variationId: standardPushUp.id, timestamp: daysAgo(14, 9), value: 10 },
    { variationId: standardPushUp.id, timestamp: daysAgo(13, 17), value: 12 },
    // Recent sets on the active variation (decline push-up), spread through today.
    { variationId: declinePushUp.id, timestamp: daysAgo(2, 8), value: 8 },
    { variationId: declinePushUp.id, timestamp: daysAgo(1, 12), value: 9 },
    { variationId: declinePushUp.id, timestamp: daysAgo(0, 8), value: 8 },
    { variationId: declinePushUp.id, timestamp: daysAgo(0, 12), value: 9 },
    { variationId: declinePushUp.id, timestamp: daysAgo(0, 17), value: 7 },
    // A few sets tried on the harder variation, to show it's not one-at-a-time.
    { variationId: archerPushUp.id, timestamp: daysAgo(3, 18), value: 3 },
    ...(pistolSquatStart
      ? [
          { variationId: pistolSquatStart.id, timestamp: daysAgo(1, 7), value: 5 },
          { variationId: pistolSquatStart.id, timestamp: daysAgo(0, 7), value: 6 },
        ]
      : []),
    { variationId: plankHold.id, timestamp: daysAgo(0, 8), value: 45 },
    { variationId: plankHold.id, timestamp: daysAgo(0, 14), value: 60 },
  ]);

  console.log('Seed complete.');
}

seed();
