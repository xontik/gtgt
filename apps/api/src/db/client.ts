import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema.js';

const dbUrl = process.env.DATABASE_URL ?? 'file:./data/gtg.sqlite';
const filePath = dbUrl.replace(/^file:/, '');
mkdirSync(dirname(filePath), { recursive: true });

const client = createClient({ url: dbUrl });

export const db = drizzle(client, { schema });
