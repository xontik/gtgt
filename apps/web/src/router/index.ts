import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import StatsView from '../views/StatsView.vue';
import LogView from '../views/LogView.vue';
import ExerciseDetailView from '../views/ExerciseDetailView.vue';
import ManageExercisesView from '../views/ManageExercisesView.vue';
import BackupView from '../views/BackupView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/stats', name: 'stats', component: StatsView },
    { path: '/log', name: 'log', component: LogView },
    { path: '/exercises', name: 'manage-exercises', component: ManageExercisesView },
    { path: '/exercises/:id', name: 'exercise-detail', component: ExerciseDetailView },
    { path: '/backup', name: 'backup', component: BackupView },
  ],
});
