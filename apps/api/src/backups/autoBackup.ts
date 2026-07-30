import { mkdir, readdir, readFile, writeFile, stat, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { buildBackupPayload } from '../lib/backupData.js';

// Same directory as the sqlite file (DATABASE_URL), so it lives on the same
// Docker volume and survives redeploys without extra configuration.
const dbUrl = process.env.DATABASE_URL ?? 'file:./data/gtg.sqlite';
const dbPath = dbUrl.replace(/^file:/, '');
const BACKUP_DIR = join(dirname(dbPath), 'backups');

const FILENAME_RE = /^auto-backup-(\d{4}-\d{2}-\d{2})\.json$/;

function todayDateStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function listBackupFiles(): Promise<{ filename: string; date: string }[]> {
  await mkdir(BACKUP_DIR, { recursive: true });
  const entries = await readdir(BACKUP_DIR);
  return entries
    .map((filename) => {
      const match = FILENAME_RE.exec(filename);
      return match ? { filename, date: match[1]! } : null;
    })
    .filter((v): v is { filename: string; date: string } => v !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Retention: every backup from the last 7 days, plus at most one per
// calendar month for the 3 months before that (the oldest snapshot found
// in each of those months - "the earliest we had that month" rather than
// picking an arbitrary day). Everything else gets deleted.
function selectFilesToKeep(files: { filename: string; date: string }[], now = new Date()): Set<string> {
  const keep = new Set<string>();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStamp = todayDateStamp(sevenDaysAgo);

  const monthlyCandidates = new Map<string, { filename: string; date: string }>();

  for (const file of files) {
    if (file.date >= sevenDaysAgoStamp) {
      keep.add(file.filename);
      continue;
    }
    const monthKey = file.date.slice(0, 7); // YYYY-MM
    const existing = monthlyCandidates.get(monthKey);
    // Files are sorted newest-first, so the last one we see for a month is
    // the oldest snapshot in it.
    if (!existing || file.date < existing.date) {
      monthlyCandidates.set(monthKey, file);
    }
  }

  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const cutoffMonth = threeMonthsAgo.toISOString().slice(0, 7);

  for (const [monthKey, file] of monthlyCandidates) {
    if (monthKey >= cutoffMonth) keep.add(file.filename);
  }

  return keep;
}

export async function runAutoBackup(): Promise<{ filename: string; deleted: number }> {
  await mkdir(BACKUP_DIR, { recursive: true });

  const payload = await buildBackupPayload();
  const filename = `auto-backup-${todayDateStamp()}.json`;
  await writeFile(join(BACKUP_DIR, filename), JSON.stringify(payload, null, 2), 'utf-8');

  const files = await listBackupFiles();
  const toKeep = selectFilesToKeep(files);
  const toDelete = files.filter((f) => !toKeep.has(f.filename));
  await Promise.all(toDelete.map((f) => unlink(join(BACKUP_DIR, f.filename))));

  return { filename, deleted: toDelete.length };
}

export async function listAutoBackups(): Promise<{ filename: string; date: string; sizeBytes: number }[]> {
  const files = await listBackupFiles();
  return Promise.all(
    files.map(async (f) => {
      const s = await stat(join(BACKUP_DIR, f.filename));
      return { filename: f.filename, date: f.date, sizeBytes: s.size };
    }),
  );
}

export async function readAutoBackup(filename: string): Promise<string | undefined> {
  // Only allow reading files matching our own naming pattern, from our own
  // directory - never trust the filename param as a path.
  if (!FILENAME_RE.test(filename)) return undefined;
  try {
    return await readFile(join(BACKUP_DIR, filename), 'utf-8');
  } catch {
    return undefined;
  }
}
