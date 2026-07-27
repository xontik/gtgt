<script setup lang="ts">
import { ref } from 'vue';
import type { Backup } from '@gtg/shared';
import { backupSchema } from '@gtg/shared';
import { fetchBackup, restoreBackup, importStructure } from '../api/backup';
import { checkIdleNow } from '../api/notifications';
import { useExercisesStore } from '../stores/exercises';

const store = useExercisesStore();

const snackbar = ref(false);
const snackbarText = ref('');

function notify(text: string) {
  snackbarText.value = text;
  snackbar.value = true;
}

const checkingIdle = ref(false);

async function sendTestReminder() {
  checkingIdle.value = true;
  try {
    const result = await checkIdleNow();
    notify(result.notified ? `Reminder sent: ${result.reason}` : `Not sent: ${result.reason}`);
  } catch (err) {
    notify(err instanceof Error ? `Check failed: ${err.message}` : 'Check failed.');
  } finally {
    checkingIdle.value = false;
  }
}

const downloading = ref(false);

async function downloadBackup() {
  downloading.value = true;
  try {
    const backup = await fetchBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `gtg-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    downloading.value = false;
  }
}

async function readBackupFile(file: File): Promise<Backup> {
  const text = await file.text();
  return backupSchema.parse(JSON.parse(text));
}

// Vuetify's v-file-input model is a single File (or File[] with `multiple`);
// normalize since which one it is has varied across versions.
type FileInputModel = File | File[] | null;

function firstFile(value: FileInputModel): File | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

const restoreFile = ref<FileInputModel>(null);
const restoreConfirmOpen = ref(false);
const restoring = ref(false);

function onRestoreFileSelected() {
  if (firstFile(restoreFile.value)) restoreConfirmOpen.value = true;
}

async function confirmRestore() {
  const file = firstFile(restoreFile.value);
  restoreConfirmOpen.value = false;
  if (!file) return;
  restoring.value = true;
  try {
    const backup = await readBackupFile(file);
    await restoreBackup(backup);
    await store.fetchAll();
    notify('Backup restored.');
  } catch (err) {
    notify(err instanceof Error ? `Restore failed: ${err.message}` : 'Restore failed.');
  } finally {
    restoring.value = false;
    restoreFile.value = null;
  }
}

function cancelRestore() {
  restoreConfirmOpen.value = false;
  restoreFile.value = null;
}

const importFile = ref<FileInputModel>(null);
const importing = ref(false);

async function onImportFileSelected() {
  const file = firstFile(importFile.value);
  if (!file) return;
  importing.value = true;
  try {
    const backup = await readBackupFile(file);
    const result = await importStructure(backup);
    await store.fetchAll();
    const skippedNote =
      result.skippedExercises + result.skippedVariations > 0
        ? ` (skipped ${result.skippedExercises} exercises, ${result.skippedVariations} variations already present)`
        : '';
    notify(
      `Imported ${result.importedExercises} exercises, ${result.importedVariations} variations.${skippedNote}`,
    );
  } catch (err) {
    notify(err instanceof Error ? `Import failed: ${err.message}` : 'Import failed.');
  } finally {
    importing.value = false;
    importFile.value = null;
  }
}
</script>

<template>
  <v-container>
    <h1 class="text-h5 mb-4">System</h1>

    <v-card class="mb-4" variant="tonal">
      <v-card-title class="text-subtitle-1">Notifications</v-card-title>
      <v-card-text>
        Manually run the idle-training check: if nothing's been logged
        recently, it posts a Discord reminder with your most-overdue
        favorites (no-op if the Discord webhook isn't configured).
      </v-card-text>
      <v-card-actions>
        <v-btn prepend-icon="mdi-bell-ring-outline" :loading="checkingIdle" @click="sendTestReminder">
          Trigger reminder check
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card class="mb-4" variant="tonal">
      <v-card-title class="text-subtitle-1">Backup</v-card-title>
      <v-card-text>
        Download everything - exercises, variations, and log entries - as a
        single JSON file.
      </v-card-text>
      <v-card-actions>
        <v-btn prepend-icon="mdi-download" :loading="downloading" @click="downloadBackup">
          Download backup
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card class="mb-4" variant="tonal">
      <v-card-title class="text-subtitle-1">Restore</v-card-title>
      <v-card-text>
        Replace everything in this app with the contents of a backup file.
        This deletes all current exercises, variations, and log entries.
      </v-card-text>
      <v-card-text>
        <v-file-input
          v-model="restoreFile"
          label="Choose backup file"
          accept="application/json"
          density="compact"
          :loading="restoring"
          prepend-icon="mdi-file-upload-outline"
          @update:model-value="onRestoreFileSelected"
        />
      </v-card-text>
    </v-card>

    <v-card class="mb-4" variant="tonal">
      <v-card-title class="text-subtitle-1">Import exercises & variations only</v-card-title>
      <v-card-text>
        Add the exercises and variations from a backup file, without their
        log entries or favorites. Useful for trying out a different setup.
        Exercises and variations that already exist (same name, same
        exercise/parent) are skipped rather than duplicated.
      </v-card-text>
      <v-card-text>
        <v-file-input
          v-model="importFile"
          label="Choose backup file"
          accept="application/json"
          density="compact"
          :loading="importing"
          prepend-icon="mdi-file-upload-outline"
          @update:model-value="onImportFileSelected"
        />
      </v-card-text>
    </v-card>

    <v-dialog v-model="restoreConfirmOpen" max-width="420">
      <v-card>
        <v-card-title class="text-subtitle-1">Replace all data?</v-card-title>
        <v-card-text>
          This permanently deletes every exercise, variation, and log entry
          currently in the app and replaces them with the contents of the
          selected file. This can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelRestore">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmRestore">Replace everything</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" timeout="4000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>
