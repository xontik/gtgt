<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { login } from '../api/auth';
import { ApiError } from '../api/client';

const router = useRouter();
const route = useRoute();
const passcode = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await login(passcode.value);
    const redirect = (route.query.redirect as string) || '/';
    await router.replace(redirect);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) error.value = 'Wrong passcode.';
    else if (err instanceof ApiError && err.status === 429) error.value = 'Too many attempts. Try again later.';
    else error.value = 'Login failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-container class="fill-height" style="max-width: 420px">
    <v-form class="w-100" @submit.prevent="submit">
      <div class="text-h5 mb-4 text-center">GtG Tracker</div>
      <v-text-field
        v-model="passcode"
        type="password"
        label="Passcode"
        autofocus
        :error-messages="error ? [error] : []"
        @keydown.enter.prevent="submit"
      />
      <v-btn block color="primary" size="large" :loading="loading" @click="submit">Log in</v-btn>
    </v-form>
  </v-container>
</template>
