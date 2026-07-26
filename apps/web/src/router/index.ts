import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import DailySummaryView from '../views/DailySummaryView.vue';
import LogView from '../views/LogView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/summary', name: 'summary', component: DailySummaryView },
    { path: '/log', name: 'log', component: LogView },
  ],
});
