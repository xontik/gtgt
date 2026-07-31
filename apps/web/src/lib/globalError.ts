import { ref } from 'vue';
import { ApiError } from '../api/client';

// Most store actions/views don't try/catch their API calls - some views
// (System page) show their own error snackbar, most don't, so a failure
// silently vanished into the console with no user-visible feedback. Rather
// than retrofit every call site individually (and inevitably miss some),
// this is a single net: anything that ends up as an unhandled rejection
// (see main.ts) surfaces here instead of nowhere.
export const errorMessage = ref('');
export const errorVisible = ref(false);

export function showError(message: string) {
  errorMessage.value = message;
  errorVisible.value = true;
}

export function friendlyMessage(reason: unknown): string {
  if (reason instanceof ApiError) return reason.message || 'Something went wrong talking to the server.';
  if (reason instanceof Error) return reason.message || 'Something went wrong.';
  return 'Something went wrong.';
}
