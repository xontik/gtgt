<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { measureSafeAreaBottom } from './lib/safeArea';

const route = useRoute();

// Extra height for the bottom nav's safe-area padding, folded into the
// `height` prop so Vuetify's layout system reserves the right amount of
// space above it (see safeArea.ts for why plain CSS padding isn't enough).
const safeAreaBottom = ref(0);
onMounted(() => {
  safeAreaBottom.value = measureSafeAreaBottom();
});
</script>

<template>
  <v-app>
    <v-app-bar>
      <v-app-bar-title>
        <router-link to="/" class="text-decoration-none text-high-emphasis">GtG Tracker</router-link>
      </v-app-bar-title>
      <v-btn icon="mdi-server-outline" to="/system" />
    </v-app-bar>
    <v-main>
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>
    <v-bottom-navigation
      :model-value="route.path"
      grow
      :height="56 + safeAreaBottom"
      class="pb-safe-area"
    >
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
  </v-app>
</template>

<style scoped>
.pb-safe-area {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
