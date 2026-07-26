import { db } from './client.js';
import { exercises, exerciseVariations } from './schema.js';

async function seed() {
  const [pushUp] = await db
    .insert(exercises)
    .values({ name: 'Push-up', category: 'push', metricType: 'reps' })
    .returning();
  const [pistolSquat] = await db
    .insert(exercises)
    .values({ name: 'Pistol squat', category: 'squat', metricType: 'reps' })
    .returning();

  if (!pushUp || !pistolSquat) {
    throw new Error('Failed to seed exercises.');
  }

  await db.insert(exerciseVariations).values([
    { exerciseId: pushUp.id, name: 'Knee push-up', difficultyRank: 1 },
    { exerciseId: pushUp.id, name: 'Push-up', difficultyRank: 2 },
    { exerciseId: pushUp.id, name: 'Decline push-up', difficultyRank: 3 },
    { exerciseId: pushUp.id, name: 'Archer push-up', difficultyRank: 4 },
    { exerciseId: pushUp.id, name: 'One-arm assisted push-up', difficultyRank: 5 },
  ]);

  await db.insert(exerciseVariations).values([
    { exerciseId: pistolSquat.id, name: 'Assisted pistol squat', difficultyRank: 1 },
    { exerciseId: pistolSquat.id, name: 'Box pistol squat', difficultyRank: 2 },
    { exerciseId: pistolSquat.id, name: 'Pistol squat', difficultyRank: 3 },
    { exerciseId: pistolSquat.id, name: 'Weighted pistol squat', difficultyRank: 4 },
  ]);

  console.log('Seed complete.');
}

seed();
