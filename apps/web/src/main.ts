import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { vuetify } from './plugins/vuetify';
import { router } from './router';
import { showError, friendlyMessage } from './lib/globalError';
import './global.css';

const app = createApp(App);

// Most views/store actions don't catch their own API errors - this is the
// single net that turns "silently failed, check the console" into a
// visible snackbar (see lib/globalError.ts). Covers both async failures
// (the vast majority - unhandled promise rejections from API calls) and
// synchronous errors during render/setup.
window.addEventListener('unhandledrejection', (event) => {
  showError(friendlyMessage(event.reason));
});
app.config.errorHandler = (err) => {
  showError(friendlyMessage(err));
  console.error(err);
};

app.use(createPinia()).use(router).use(vuetify).mount('#app');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability is a nice-to-have, not critical - ignore failures
      // (e.g. running over plain http on a LAN IP during dev).
    });
  });
}
