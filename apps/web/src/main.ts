import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { vuetify } from './plugins/vuetify';
import { router } from './router';
import './global.css';

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability is a nice-to-have, not critical - ignore failures
      // (e.g. running over plain http on a LAN IP during dev).
    });
  });
}
