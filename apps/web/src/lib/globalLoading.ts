import { computed, ref } from 'vue';

// Counts in-flight requests (see api/client.ts) so App.vue can show one
// top-of-page progress bar everywhere, instead of every view owning its
// own `loading` ref + <v-progress-linear> (previously inconsistent -
// some views had it, some didn't, and it only covered whichever fetch
// that view happened to wrap, e.g. exercise-detail rendered nothing at
// all until its data arrived). A per-view `loading` ref is still worth
// keeping where it gates other logic (e.g. Home's "no favorites yet"
// empty state) - this doesn't replace those, just the redundant bars.
const activeRequests = ref(0);

export const isLoading = computed(() => activeRequests.value > 0);

export function beginRequest() {
  activeRequests.value += 1;
}

export function endRequest() {
  activeRequests.value = Math.max(0, activeRequests.value - 1);
}
