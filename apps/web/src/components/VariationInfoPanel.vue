<script setup lang="ts">
defineProps<{
  imageUrl?: string | null;
  notes?: string | null;
  videoUrl?: string | null;
}>();
</script>

<template>
  <div v-if="imageUrl || notes || videoUrl" class="mb-4">
    <v-img
      v-if="imageUrl"
      :src="imageUrl"
      max-height="240"
      class="mb-2 rounded bg-surface-variant"
      contain
    />
    <div v-if="notes" class="text-body-2 text-medium-emphasis mb-2">{{ notes }}</div>
    <v-btn
      v-if="videoUrl"
      :href="videoUrl"
      target="_blank"
      rel="noopener"
      variant="tonal"
      size="small"
      prepend-icon="mdi-youtube"
    >
      Watch video
    </v-btn>
  </div>
</template>
