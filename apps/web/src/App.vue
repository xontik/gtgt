<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { isOnline } from './lib/network';
import { queuedMutations } from './lib/offlineQueue';
import { isLoading } from './lib/globalLoading';
import { current, visible, onSnackbarClosed } from './lib/snackbarQueue';

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
      <!-- One shared indicator for every in-flight API call (see
           lib/globalLoading.ts + api/client.ts) instead of each view
           owning its own loading ref/bar - consistent everywhere, and
           covers views that previously showed nothing at all while their
           first fetch was still in flight. -->
      <v-progress-linear v-if="isLoading" indeterminate absolute location="bottom" color="primary" />
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
    <v-snackbar
      :model-value="visible"
      :timeout="current?.timeout ?? 3000"
      :color="current?.color"
      @update:model-value="(v) => !v && onSnackbarClosed()"
    >
      {{ current?.text }}
      <template v-if="current?.actionLabel" #actions>
        <v-btn color="white" variant="text" @click="current?.onAction?.(); onSnackbarClosed()">
          {{ current.actionLabel }}
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>
