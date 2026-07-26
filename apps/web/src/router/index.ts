import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import StatsView from '../views/StatsView.vue';
import LogView from '../views/LogView.vue';
import ExerciseDetailView from '../views/ExerciseDetailView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/stats', name: 'stats', component: StatsView },
    { path: '/log', name: 'log', component: LogView },
    { path: '/exercises/:id', name: 'exercise-detail', component: ExerciseDetailView },
  ],
});
