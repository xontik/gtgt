<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { vibrateSuccess } from '../lib/haptics';

// A plain chronometer, independent of logging a set - for timing a rest
// period, a hold, anything that doesn't need to end up in the log. Same
// Date.now()-delta interval pattern as TimerSheet.vue (avoids setInterval
// drift), just not tied to any exercise/variation.
const minutes = ref(0);
const seconds = ref(0);
const running = ref(false);
let startedAtMs = 0;
let baseMs = 0;
let intervalId: ReturnType<typeof setInterval> | undefined;

function setFromMs(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  minutes.value = Math.floor(totalSeconds / 60);
  seconds.value = totalSeconds % 60;
}

function start() {
  running.value = true;
  vibrateSuccess();
  baseMs = (minutes.value * 60 + seconds.value) * 1000;
  startedAtMs = Date.now();
  intervalId = setInterval(() => {
    setFromMs(Date.now() - startedAtMs + baseMs);
  }, 200);
}

function stop() {
  running.value = false;
  vibrateSuccess();
  if (intervalId) clearInterval(intervalId);
  intervalId = undefined;
}

function reset() {
  stop();
  minutes.value = 0;
  seconds.value = 0;
}

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <v-container class="d-flex flex-column align-center justify-center" style="min-height: 70vh">
    <div class="text-h1 font-weight-bold mb-8" style="font-variant-numeric: tabular-nums">
      {{ minutes }}:{{ seconds.toString().padStart(2, '0') }}
    </div>

    <div class="d-flex ga-3">
      <v-btn
        v-if="!running"
        color="primary"
        size="x-large"
        variant="tonal"
        prepend-icon="mdi-play"
        @click="start"
      >
        Start
      </v-btn>
      <v-btn v-else color="error" size="x-large" variant="tonal" prepend-icon="mdi-stop" @click="stop">
        Stop
      </v-btn>
      <v-btn
        size="x-large"
        variant="text"
        prepend-icon="mdi-restart"
        :disabled="running || (minutes === 0 && seconds === 0)"
        @click="reset"
      >
        Reset
      </v-btn>
    </div>
  </v-container>
</template>
