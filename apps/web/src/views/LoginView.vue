<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
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
import logoUrl from '../assets/logo.png';

const router = useRouter();
const route = useRoute();
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

    const redirectTarget = (route.query.redirect as string) || '/';
    router.push(redirectTarget);
  } catch (err: any) {
    isLoading.value = false;
    errorMessage.value = err.message || 'Gagal masuk ke sistem';
  }
};
</script>

<template>
  <div class="relative min-h-screen flex items-center justify-center px-4 py-12 bg-canvas transition-colors">
    <!-- Theme Switcher Top Right -->
    <div class="absolute top-4 right-4">
      <GovButton
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        severity="secondary"
        @click="toggleTheme"
      />
    </div>

    <div class="w-full max-w-md bg-surface border border-border rounded-2xl shadow-lg overflow-hidden">
      <!-- Portal Header with Maritime Navy #0F4C81 (Light) and Surface #162238 (Dark) -->
      <div class="bg-[#0F4C81] dark:bg-surface border-b border-[#0d4373] dark:border-border px-8 py-7 text-white dark:text-text-main text-center transition-colors">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-2 mb-3 shadow-md border border-white/20 dark:border-slate-700">
          <img :src="logoUrl" alt="Logo Kab. Banggai Laut" class="w-full h-full object-contain" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-white dark:text-text-main">SI-SPD</h1>
        <p class="text-xs font-semibold text-white/90 dark:text-accent uppercase tracking-widest mt-1">
          Surat Perjalanan Dinas Sekda Kab. Banggai Laut
        </p>
      </div>

      <!-- Form Container -->
      <div class="p-8 bg-surface">
        <div class="mb-6 text-center">
          <h2 class="text-lg font-bold text-text-main">Masuk ke Portal</h2>
          <p class="text-sm text-text-muted mt-1">Gunakan akun resmi pegawai untuk melanjutkan</p>
        </div>

        <GovMessage v-if="errorMessage" severity="error" class="mb-5">
          {{ errorMessage }}
        </GovMessage>

        <form novalidate @submit.prevent="handleLogin" class="space-y-5">
          <!-- Username / NIP Input -->
          <div class="space-y-2">
            <label for="username" class="block text-sm font-semibold text-text-main">
              Username atau NIP
            </label>
            <IconField class="w-full">
              <InputIcon class="pi pi-user text-text-muted" />
              <GovInputText
                id="username"
                v-model="username"
                placeholder="cth. admin"
                autocomplete="username"
                :required="true"
                :block="true"
              />
            </IconField>
          </div>

          <!-- Password Input -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="password" class="block text-sm font-semibold text-text-main">
                Kata Sandi
              </label>
              <a href="#" class="text-xs text-primary hover:text-accent font-medium transition-colors">
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
            <label for="remember" class="text-sm text-text-muted cursor-pointer select-none">
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

        <div class="mt-8 pt-6 border-t border-border text-center text-xs text-text-muted">
          Hak Cipta &copy; Pemerintah Kabupaten Banggai Laut &bull; Sekretariat Daerah
        </div>
      </div>
    </div>
  </div>
</template>
