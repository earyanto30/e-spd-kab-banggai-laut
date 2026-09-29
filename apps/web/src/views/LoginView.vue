<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import {
  GovButton,
  GovInputText,
  GovPassword,
  GovCheckbox,
  GovMessage,
} from '../components/core';
import { useTheme } from '../composables/useTheme';
import { LoginRequestSchema } from '@si-setda/shared-types';
import { apiFetch } from '../utils/api';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();

const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  errorMessage.value = '';

  const validation = LoginRequestSchema.safeParse({
    username: username.value,
    password: password.value,
  });

  if (!validation.success) {
    errorMessage.value = validation.error.errors[0]?.message || 'Input tidak valid';
    return;
  }

  isLoading.value = true;
  try {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Gagal masuk ke sistem');
    }

    localStorage.setItem('auth_token', data.accessToken);
    localStorage.setItem('user_role', data.user.role);
    localStorage.setItem('user_name', data.user.name);
    localStorage.setItem('username', data.user.username);
    isLoading.value = false;
    router.push('/');
  } catch (err: any) {
    isLoading.value = false;
    errorMessage.value = err.message || 'Gagal masuk ke sistem';
  }
};
</script>

<template>
  <div class="relative min-h-screen flex items-center justify-center px-4 py-12 bg-slate-100 dark:bg-zinc-950 transition-colors">
    <!-- Theme Switcher Top Right -->
    <div class="absolute top-4 right-4">
      <GovButton
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        severity="secondary"
        @click="toggleTheme"
      />
    </div>

    <div class="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
      <!-- Portal Header -->
      <div class="bg-blue-900 px-8 py-7 text-white text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white bg-opacity-10 border border-white border-opacity-20 mb-3 shadow-inner">
          <i class="pi pi-building text-3xl text-amber-400"></i>
        </div>
        <h1 class="text-2xl font-bold tracking-tight">SI-SPD</h1>
        <p class="text-xs font-medium text-blue-200 uppercase tracking-widest mt-1">
          Surat Perjalanan Dinas Sekda Kab. Banggai Laut
        </p>
      </div>

      <!-- Form Container -->
      <div class="p-8">
        <div class="mb-6 text-center">
          <h2 class="text-lg font-semibold text-slate-800 dark:text-zinc-100">Masuk ke Portal</h2>
          <p class="text-sm text-slate-500 dark:text-zinc-400 mt-1">Gunakan akun resmi pegawai untuk melanjutkan</p>
        </div>

        <GovMessage v-if="errorMessage" severity="error" class="mb-5">
          {{ errorMessage }}
        </GovMessage>

        <form novalidate @submit.prevent="handleLogin" class="space-y-5">
          <!-- Username / NIP Input -->
          <div class="space-y-2">
            <label for="username" class="block text-sm font-medium text-slate-700 dark:text-zinc-200">
              NIP atau Username
            </label>
            <IconField class="w-full">
              <InputIcon class="pi pi-user text-slate-400 dark:text-zinc-400" />
              <GovInputText
                id="username"
                v-model="username"
                placeholder="cth. 198801152010011002"
                autocomplete="username"
                :required="true"
                :block="true"
              />
            </IconField>
          </div>

          <!-- Password Input -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="password" class="block text-sm font-medium text-slate-700 dark:text-zinc-200">
                Kata Sandi
              </label>
              <a href="#" class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium">
                Lupa sandi?
              </a>
            </div>
            <GovPassword
              id="password"
              v-model="password"
              :feedback="false"
              :toggle-mask="true"
              placeholder="Masukkan kata sandi"
              autocomplete="current-password"
              :required="true"
              :block="true"
            />
          </div>

          <!-- Remember Me -->
          <div class="flex items-center gap-2 pt-1">
            <GovCheckbox v-model="rememberMe" inputId="remember" />
            <label for="remember" class="text-sm text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
              Ingat saya di perangkat ini
            </label>
          </div>

          <!-- Submit Button -->
          <GovButton
            type="submit"
            label="Masuk ke Sistem"
            icon="pi pi-sign-in"
            :loading="isLoading"
            :block="true"
            severity="primary"
          />
        </form>

        <div class="mt-8 pt-6 border-t border-slate-100 dark:border-zinc-800 text-center text-xs text-slate-400 dark:text-zinc-500">
          Hak Cipta &copy; Pemerintah Kabupaten Banggai Laut &bull; Sekretariat Daerah
        </div>
      </div>
    </div>
  </div>
</template>
