import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import StatsView from '../views/StatsView.vue';
import LogView from '../views/LogView.vue';
import ExerciseDetailView from '../views/ExerciseDetailView.vue';
import ManageExercisesView from '../views/ManageExercisesView.vue';
import ManageRoutinesView from '../views/ManageRoutinesView.vue';
import SystemView from '../views/SystemView.vue';
import LoginView from '../views/LoginView.vue';
import { authCheck } from '../api/auth';
import { ApiError } from '../api/client';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/stats', name: 'stats', component: StatsView },
    { path: '/log', name: 'log', component: LogView },
    { path: '/exercises', name: 'manage-exercises', component: ManageExercisesView },
    { path: '/routines', name: 'manage-routines', component: ManageRoutinesView },
    { path: '/exercises/:id', name: 'exercise-detail', component: ExerciseDetailView },
    { path: '/system', name: 'system', component: SystemView },
    { path: '/login', name: 'login', component: LoginView },
  ],
});

// Passcode gate: verify the session on every navigation other than to
// /login itself. When APP_PASSCODE isn't set server-side, /auth/check
// always succeeds (the API's auth hook is a no-op), so this is a no-op too.
router.beforeEach(async (to) => {
  if (to.name === 'login') return true;
  try {
    await authCheck();
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    return true;
  }
});
