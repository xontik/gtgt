<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { isOnline } from './lib/network';
import { queuedMutations } from './lib/offlineQueue';
import { errorMessage, errorVisible } from './lib/globalError';

const route = useRoute();
const pendingCount = computed(() => queuedMutations.value.length);
</script>

<template>
  <v-app>
    <v-app-bar>
      <v-app-bar-title>
        <router-link to="/" class="text-decoration-none text-high-emphasis">GtG Tracker</router-link>
      </v-app-bar-title>
      <v-chip v-if="!isOnline" size="small" variant="tonal" color="warning" class="mr-2">
        <v-icon start size="14">mdi-wifi-off</v-icon>
        Offline
      </v-chip>
      <v-badge v-if="pendingCount > 0" :content="pendingCount" color="warning" offset-x="8" offset-y="8">
        <v-btn icon="mdi-server-outline" aria-label="System" to="/system" />
      </v-badge>
      <v-btn v-else icon="mdi-server-outline" aria-label="System" to="/system" />
    </v-app-bar>
    <v-main>
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>
    <v-bottom-navigation :model-value="route.path" grow>
      <v-btn value="/" to="/">
        <v-icon>mdi-home</v-icon>
        Home
      </v-btn>
      <v-btn value="/stats" to="/stats">
        <v-icon>mdi-chart-bar</v-icon>
        Stats
      </v-btn>
      <v-btn value="/log" to="/log">
        <v-icon>mdi-format-list-bulleted</v-icon>
        Log
      </v-btn>
      <v-btn value="/exercises" to="/exercises">
        <v-icon>mdi-cog-outline</v-icon>
        Manage
      </v-btn>
    </v-bottom-navigation>
    <v-snackbar v-model="errorVisible" timeout="5000" color="error">{{ errorMessage }}</v-snackbar>
  </v-app>
</template>
