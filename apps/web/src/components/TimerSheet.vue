<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import VariationInfoPanel from './VariationInfoPanel.vue';

const props = defineProps<{
  modelValue: boolean;
  exerciseName: string;
  variationName: string;
  imageUrl?: string | null;
  notes?: string | null;
  videoUrl?: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  confirm: [seconds: number, forYesterday: boolean];
}>();

const minutes = ref(0);
const seconds = ref(0);
const running = ref(false);
const forYesterday = ref(false);
let startedAtMs = 0;
let baseMs = 0;
let intervalId: ReturnType<typeof setInterval> | undefined;

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      stop();
      minutes.value = 0;
      seconds.value = 0;
      forYesterday.value = false;
    } else {
      stop();
    }
  },
);

function setFromMs(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  minutes.value = Math.floor(totalSeconds / 60);
  seconds.value = totalSeconds % 60;
}

function start() {
  running.value = true;
  baseMs = (minutes.value * 60 + seconds.value) * 1000;
  startedAtMs = Date.now();
  intervalId = setInterval(() => {
    setFromMs(Date.now() - startedAtMs + baseMs);
  }, 200);
}

function stop() {
  running.value = false;
  if (intervalId) clearInterval(intervalId);
  intervalId = undefined;
}

function confirm() {
  stop();
  const total = minutes.value * 60 + seconds.value;
  if (total <= 0) return;
  emit('confirm', total, forYesterday.value);
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

      <VariationInfoPanel :image-url="imageUrl" :notes="notes" :video-url="videoUrl" />

      <div v-if="running" class="text-h3 text-center my-6">
        {{ minutes }}:{{ seconds.toString().padStart(2, '0') }}
      </div>
      <div v-else class="d-flex align-center justify-center ga-2 my-4">
        <v-text-field v-model.number="minutes" type="number" label="Minutes" min="0" style="max-width: 120px" />
        <div class="text-h5">:</div>
        <v-text-field
          v-model.number="seconds"
          type="number"
          label="Seconds"
          min="0"
          max="59"
          style="max-width: 120px"
        />
      </div>

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

      <v-chip
        class="mt-3 mb-1"
        :color="forYesterday ? 'primary' : undefined"
        :variant="forYesterday ? 'flat' : 'tonal'"
        prepend-icon="mdi-clock-outline"
        @click="forYesterday = !forYesterday"
      >
        {{ forYesterday ? 'Logging for yesterday' : 'Log for yesterday' }}
      </v-chip>

      <v-btn
        class="mt-2"
        block
        color="primary"
        size="large"
        :disabled="minutes * 60 + seconds <= 0"
        @click="confirm"
      >
        Log {{ minutes }}:{{ seconds.toString().padStart(2, '0') }}
      </v-btn>
    </v-sheet>
  </v-bottom-sheet>
</template>
