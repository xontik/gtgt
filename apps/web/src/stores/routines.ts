import { defineStore } from 'pinia';
import type { Routine, RoutineItem } from '@gtg/shared';
import {
  listRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  listRoutineItems,
  createRoutineItem,
  updateRoutineItem,
  deleteRoutineItem,
} from '../api/routines';

export const useRoutinesStore = defineStore('routines', {
  state: () => ({
    routines: [] as Routine[],
    items: [] as RoutineItem[],
    loading: false,
  }),
  getters: {
    itemsFor: (state) => (routineId: number) =>
      state.items.filter((i) => i.routineId === routineId).sort((a, b) => a.order - b.order),
  },
  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const [routines, items] = await Promise.all([listRoutines(), listRoutineItems()]);
        this.routines = routines;
        this.items = items;
      } finally {
        this.loading = false;
      }
    },

    async addRoutine(name: string) {
      const created = await createRoutine({ name });
      this.routines.push(created);
      return created;
    },

    async renameRoutine(routineId: number, name: string) {
      const updated = await updateRoutine(routineId, { name });
      const index = this.routines.findIndex((r) => r.id === routineId);
      if (index !== -1) this.routines[index] = updated;
    },

    async removeRoutine(routineId: number) {
      await deleteRoutine(routineId);
      this.routines = this.routines.filter((r) => r.id !== routineId);
      this.items = this.items.filter((i) => i.routineId !== routineId);
    },

    async addItem(
      routineId: number,
      variationId: number,
      targetValue: number | null = null,
      setsCount = 1,
    ) {
      const siblings = this.itemsFor(routineId);
      const order = (siblings.at(-1)?.order ?? 0) + 1;
      const created = await createRoutineItem({ routineId, variationId, order, targetValue, setsCount });
      this.items.push(created);
    },

    async updateItemTemplate(itemId: number, details: { targetValue: number | null; setsCount: number }) {
      const updated = await updateRoutineItem(itemId, details);
      const index = this.items.findIndex((i) => i.id === itemId);
      if (index !== -1) this.items[index] = updated;
    },

    async removeItem(itemId: number) {
      await deleteRoutineItem(itemId);
      this.items = this.items.filter((i) => i.id !== itemId);
    },

    async moveItem(itemId: number, direction: 'up' | 'down') {
      const item = this.items.find((i) => i.id === itemId);
      if (!item) return;

      const siblings = this.itemsFor(item.routineId);
      const index = siblings.findIndex((i) => i.id === itemId);
      const neighborIndex = direction === 'up' ? index - 1 : index + 1;
      const neighbor = siblings[neighborIndex];
      if (!neighbor) return;

      const [updatedItem, updatedNeighbor] = await Promise.all([
        updateRoutineItem(item.id, { order: neighbor.order }),
        updateRoutineItem(neighbor.id, { order: item.order }),
      ]);

      for (const updated of [updatedItem, updatedNeighbor]) {
        const i = this.items.findIndex((it) => it.id === updated.id);
        if (i !== -1) this.items[i] = updated;
      }
    },
  },
});
