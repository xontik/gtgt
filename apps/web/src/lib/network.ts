import { ref } from 'vue';

// Single reactive source of truth for connectivity, driven by the
// browser's online/offline events (not polled) - api/client.ts and the
// offline queue both read this instead of checking navigator.onLine
// directly, so tests/SSR-less environments only need to stub one ref.
export const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline.value = true;
  });
  window.addEventListener('offline', () => {
    isOnline.value = false;
  });
}
