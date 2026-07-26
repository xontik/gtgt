<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  exerciseName: string;
  variationName: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  confirm: [seconds: number];
}>();

const elapsedMs = ref(0);
const running = ref(false);
let startedAt = 0;
let intervalId: ReturnType<typeof setInterval> | undefined;

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset();
    else stop();
  },
);

function reset() {
  stop();
  elapsedMs.value = 0;
}

function start() {
  running.value = true;
  startedAt = Date.now() - elapsedMs.value;
  intervalId = setInterval(() => {
    elapsedMs.value = Date.now() - startedAt;
  }, 100);
}

function stop() {
  running.value = false;
  if (intervalId) clearInterval(intervalId);
  intervalId = undefined;
}

function confirm() {
  stop();
  emit('confirm', Math.round(elapsedMs.value / 1000));
}

function formatted() {
  const totalSeconds = Math.floor(elapsedMs.value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

onUnmounted(stop);
</script>

<template>
  <v-bottom-sheet
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <v-sheet class="pa-4" rounded="t-lg">
      <div class="text-h6">{{ exerciseName }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ variationName }}</div>

      <div class="text-h3 text-center my-6">{{ formatted() }}</div>

      <v-btn
        v-if="!running"
        block
        color="primary"
        size="large"
        variant="tonal"
        prepend-icon="mdi-play"
        @click="start"
      >
        Start
      </v-btn>
      <v-btn v-else block color="error" size="large" variant="tonal" prepend-icon="mdi-stop" @click="stop">
        Stop
      </v-btn>

      <v-btn
        class="mt-2"
        block
        color="primary"
        size="large"
        :disabled="elapsedMs <= 0"
        @click="confirm"
      >
        Log {{ formatted() }}
      </v-btn>
    </v-sheet>
  </v-bottom-sheet>
</template>
