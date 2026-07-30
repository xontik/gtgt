import { ref } from 'vue';
import { isOnline } from './network';
import { apiFetch, ApiError } from '../api/client';

export interface QueuedMutation {
  id: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: string;
  label: string;
  createdAt: number;
  failed?: boolean;
}

const DB_NAME = 'gtg-offline-queue';
const STORE_NAME = 'mutations';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = fn(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadAll(): Promise<QueuedMutation[]> {
  if (typeof indexedDB === 'undefined') return [];
  const items = await withStore<QueuedMutation[]>('readonly', (store) => store.getAll());
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

// Reactive mirror of what's in IndexedDB, so App.vue's pending-sync badge
// and the System page's queue list update live without re-opening the DB
// on every render.
export const queuedMutations = ref<QueuedMutation[]>([]);
export const syncing = ref(false);

let loaded = false;
async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  queuedMutations.value = await loadAll();
}
void ensureLoaded();

export async function enqueueMutation(
  input: Omit<QueuedMutation, 'id' | 'createdAt' | 'failed'>,
): Promise<QueuedMutation> {
  await ensureLoaded();
  const mutation: QueuedMutation = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await withStore('readwrite', (store) => store.put(mutation));
  queuedMutations.value = [...queuedMutations.value, mutation];
  return mutation;
}

async function removeMutation(id: string) {
  await withStore('readwrite', (store) => store.delete(id));
  queuedMutations.value = queuedMutations.value.filter((m) => m.id !== id);
}

async function markFailed(id: string) {
  const mutation = queuedMutations.value.find((m) => m.id === id);
  if (!mutation) return;
  const updated = { ...mutation, failed: true };
  await withStore('readwrite', (store) => store.put(updated));
  queuedMutations.value = queuedMutations.value.map((m) => (m.id === id ? updated : m));
}

export async function discardMutation(id: string) {
  await removeMutation(id);
}

// Replays queued mutations in the order they were made. Stops at the
// first genuine connectivity failure (rest stay queued for next time);
// a mutation the server actively rejects (validation, 404 because the
// underlying row is gone, etc.) is marked failed and skipped rather than
// blocking everything behind it - see CLAUDE.md "Offline support" for why
// that's an acceptable simplification here (log entries can't conflict
// thanks to soft delete, and other queued edits are last-write-wins).
export async function syncQueue(): Promise<void> {
  await ensureLoaded();
  if (syncing.value || !isOnline.value) return;
  syncing.value = true;
  try {
    for (const mutation of [...queuedMutations.value].sort((a, b) => a.createdAt - b.createdAt)) {
      if (!isOnline.value) break;
      try {
        await apiFetch(mutation.path, { method: mutation.method, body: mutation.body });
        await removeMutation(mutation.id);
      } catch (err) {
        if (err instanceof ApiError) {
          await markFailed(mutation.id);
          continue;
        }
        // Network error mid-sync - connectivity dropped again, stop and
        // wait for the next 'online' event.
        break;
      }
    }
  } finally {
    syncing.value = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void syncQueue();
  });
}

// Used by api/*.ts for mutating calls (POST/PATCH/DELETE): tries the real
// request, and only falls back to queuing on a genuine connectivity
// failure (fetch itself throwing, or isOnline already false) - a real
// server-side rejection (validation, 404, etc.) still throws normally so
// it isn't silently swallowed into the queue.
export async function mutateFetch<T>(
  path: string,
  init: { method: 'POST' | 'PATCH' | 'DELETE'; body?: string },
  optimisticResult: T,
  label: string,
): Promise<T> {
  if (!isOnline.value) {
    await enqueueMutation({ method: init.method, path, body: init.body, label });
    return optimisticResult;
  }
  try {
    return await apiFetch<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    await enqueueMutation({ method: init.method, path, body: init.body, label });
    return optimisticResult;
  }
}
