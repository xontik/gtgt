import { ref } from 'vue';

export interface SnackbarMessage {
  id: number;
  text: string;
  color?: string;
  timeout: number;
  actionLabel?: string;
  onAction?: () => void;
}

// Home, LogEntryList (undo), System, and the global error handler each
// used to own a separate <v-snackbar>, so two firing close together (e.g.
// logging a set right as a background sync finishes) would just cut each
// other off - only the last v-model to flip true actually showed. One
// shared FIFO queue + a single <v-snackbar> in App.vue means every
// message gets its full timeout, one at a time, in the order they fired.
const queue: SnackbarMessage[] = [];
let nextId = 1;

export const current = ref<SnackbarMessage | null>(null);
export const visible = ref(false);

function showNext() {
  const next = queue.shift();
  if (!next) {
    current.value = null;
    visible.value = false;
    return;
  }
  current.value = next;
  visible.value = true;
}

export function notify(
  text: string,
  opts: { color?: string; timeout?: number; actionLabel?: string; onAction?: () => void } = {},
) {
  queue.push({
    id: nextId++,
    text,
    color: opts.color,
    timeout: opts.timeout ?? 3000,
    actionLabel: opts.actionLabel,
    onAction: opts.onAction,
  });
  if (!current.value) showNext();
}

// Bound to the <v-snackbar>'s v-model in App.vue - fires when a message's
// timeout elapses, it's dismissed early, or its action button is used.
// Closes first and waits a beat before showing the next one so Vuetify's
// own open/close transition actually plays instead of reusing the same
// visible=true state across two different messages in one tick.
export function onSnackbarClosed() {
  current.value = null;
  visible.value = false;
  setTimeout(showNext, 200);
}
