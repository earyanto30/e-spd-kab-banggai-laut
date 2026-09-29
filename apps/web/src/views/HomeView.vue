<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SelectButton from 'primevue/selectbutton';
import { GovButton, GovCard } from '../components/core';
import { Role, RoleType } from '@si-setda/shared-types';

const roles: RoleType[] = [Role.USER, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN];
const selectedRole = ref<RoleType>((localStorage.getItem('user_role') as RoleType) || Role.USER);
const authToken = ref<string | null>(null);
const userName = ref<string | null>(null);
const currentUsername = ref<string | null>(null);

const checkAuth = () => {
  authToken.value = localStorage.getItem('auth_token');
  userName.value = localStorage.getItem('user_name');
  currentUsername.value = localStorage.getItem('username');
  selectedRole.value = (localStorage.getItem('user_role') as RoleType) || Role.USER;
};

onMounted(() => {
  checkAuth();
});

const setRole = (role: RoleType) => {
  selectedRole.value = role;
  localStorage.setItem('user_role', role);
};

const handleLogout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_name');
  localStorage.removeItem('username');
  localStorage.setItem('user_role', Role.USER);
  checkAuth();
};
</script>

<template>
  <div class="max-w-3xl mx-auto p-6 space-y-6">
    <GovCard>
      <template #title>
        <div class="text-2xl font-bold text-slate-800 dark:text-zinc-100">
          SI-SPD Sekda Kab. Banggai Laut
        </div>
      </template>
      <template #subtitle>
        <span class="text-slate-500 dark:text-zinc-400">Sistem Informasi Surat Perjalanan Dinas Sekretariat Daerah Kabupaten Banggai Laut</span>
      </template>
      <template #content>
        <p class="text-slate-600 dark:text-zinc-300 mb-6">
          Sistem Pengelolaan dan Administrasi Surat Perjalanan Dinas (SPD) di lingkungan Sekretariat Daerah Kabupaten Banggai Laut, Sulawesi Tengah.
        </p>

        <!-- Logged In Status Banner -->
        <div v-if="authToken" class="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Sesi Terautentikasi: {{ userName }} (@{{ currentUsername }})
              </div>
              <div class="text-xs text-emerald-600 dark:text-emerald-400">
                Tingkat Otorisasi: <span class="font-mono font-bold">{{ selectedRole }}</span>
              </div>
            </div>
            <GovButton
              label="Keluar (Logout)"
              icon="pi pi-sign-out"
              severity="danger"
              @click="handleLogout"
            />
          </div>
        </div>

        <div class="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg space-y-3 mb-6">
          <div class="text-sm font-semibold text-slate-700 dark:text-zinc-200">Simulasi Role (RBAC):</div>
          <SelectButton
            v-model="selectedRole"
            :options="roles"
            @update:model-value="(val) => val && setRole(val)"
          />
          <div class="text-xs text-slate-500 dark:text-zinc-400">
            Role saat ini: <span class="font-mono font-bold text-gov-primary dark:text-amber-400">{{ selectedRole }}</span>
          </div>
        </div>

        <div v-if="!authToken" class="flex gap-3">
          <router-link to="/login">
            <GovButton label="Ke Halaman Login" icon="pi pi-sign-in" severity="primary" />
          </router-link>
        </div>
      </template>
    </GovCard>
  </div>
</template>
