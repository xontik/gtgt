<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <v-app>
    <v-app-bar title="GtG Tracker" />
    <v-main>
      <router-view />
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
    </v-bottom-navigation>
  </v-app>
</template>
