<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { measureSafeAreaBottom } from './lib/safeArea';

const route = useRoute();

// Extra height for the bottom nav's safe-area padding, folded into both
// the `height` prop (Vuetify's layout system sizes v-main's padding from
// that prop, not the rendered box) and the inline padding-bottom below -
// both from this one reactive value, never a CSS env() living separately
// from a JS number.
//
// That mismatch is what caused the "buttons parallax as the browser chrome
// hides" glitch: outside of an installed PWA, iOS/Chrome's bottom toolbar
// occupies the safe-area strip while visible, so env(safe-area-inset-bottom)
// is 0 - then it jumps to the real inset the moment the toolbar
// auto-hides on scroll. A static JS measurement taken once at mount
// couldn't track that, so the CSS padding (which *did* track it live)
// and the nav's registered layout height drifted apart mid-scroll.
// Re-measuring on every viewport resize (which fires when the toolbar
// shows/hides) keeps both in lockstep instead.
const safeAreaBottom = ref(0);

function updateSafeArea() {
  safeAreaBottom.value = measureSafeAreaBottom();
}

onMounted(() => {
  updateSafeArea();
  window.visualViewport?.addEventListener('resize', updateSafeArea);
  window.addEventListener('resize', updateSafeArea);
});

onUnmounted(() => {
  window.visualViewport?.removeEventListener('resize', updateSafeArea);
  window.removeEventListener('resize', updateSafeArea);
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
      :style="{ paddingBottom: `${safeAreaBottom}px` }"
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
