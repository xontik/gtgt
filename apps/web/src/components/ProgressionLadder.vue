<script setup lang="ts">
import { computed } from 'vue';
import type { ExerciseVariation } from '@gtg/shared';

interface TreeItem {
  id: number;
  title: string;
  variation: ExerciseVariation;
  isFirst: boolean;
  isLast: boolean;
  children?: TreeItem[];
}

const props = defineProps<{
  variations: ExerciseVariation[];
  activeVariationId: number | null;
}>();

const emit = defineEmits<{
  select: [variationId: number];
  reorder: [variationId: number, direction: 'up' | 'down'];
  edit: [variationId: number];
  branch: [parentVariationId: number];
}>();

const tree = computed<TreeItem[]>(() => {
  const byParent = new Map<number | null, ExerciseVariation[]>();
  for (const variation of props.variations) {
    const key = variation.parentVariationId;
    const siblings = byParent.get(key);
    if (siblings) siblings.push(variation);
    else byParent.set(key, [variation]);
  }
  for (const siblings of byParent.values()) siblings.sort((a, b) => a.difficultyRank - b.difficultyRank);

  function build(parentId: number | null): TreeItem[] {
    const siblings = byParent.get(parentId) ?? [];
    return siblings.map((variation, index) => ({
      id: variation.id,
      title: variation.name,
      variation,
      isFirst: index === 0,
      isLast: index === siblings.length - 1,
      children: build(variation.id),
    }));
  }

  return build(null);
});

function isActive(variation: ExerciseVariation) {
  return variation.id === props.activeVariationId;
}

function asTreeItem(item: unknown) {
  return item as TreeItem;
}
</script>

<template>
  <v-treeview :items="tree" item-value="id" open-all density="compact" slim>
    <template #title="{ item: rawItem }">
      <div
        v-for="item in [asTreeItem(rawItem)]"
        :key="item.id"
        class="d-flex align-center ga-1"
        style="cursor: pointer"
        @click="emit('select', item.variation.id)"
      >
        <v-avatar
          size="10"
          :color="isActive(item.variation) ? 'primary' : 'grey-lighten-1'"
          class="flex-shrink-0"
        />
        <div>
          <div :class="isActive(item.variation) ? 'font-weight-bold' : ''">{{ item.variation.name }}</div>
          <div v-if="isActive(item.variation)" class="text-caption text-primary">Active</div>
        </div>
      </div>
    </template>

    <template #append="{ item: rawItem }">
      <div v-for="item in [asTreeItem(rawItem)]" :key="item.id" class="d-flex align-center ga-1">
        <v-btn
          icon="mdi-arrow-up"
          size="x-small"
          variant="text"
          :disabled="item.isFirst"
          @click.stop="emit('reorder', item.variation.id, 'up')"
        />
        <v-btn
          icon="mdi-arrow-down"
          size="x-small"
          variant="text"
          :disabled="item.isLast"
          @click.stop="emit('reorder', item.variation.id, 'down')"
        />
        <v-btn
          icon="mdi-source-branch-plus"
          size="x-small"
          variant="text"
          title="Add branch from here"
          @click.stop="emit('branch', item.variation.id)"
        />
        <v-btn
          icon="mdi-pencil"
          size="x-small"
          variant="text"
          @click.stop="emit('edit', item.variation.id)"
        />
      </div>
    </template>
  </v-treeview>
</template>
