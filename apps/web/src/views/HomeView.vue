<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { GovButton, GovCard } from '../components/core';
import logoUrl from '../assets/logo.png';

const router = useRouter();
const authToken = ref<string | null>(null);
const userName = ref<string | null>(null);
const currentUsername = ref<string | null>(null);
const userRole = ref<string>('USER');

const checkAuth = () => {
  authToken.value = localStorage.getItem('auth_token');
  userName.value = localStorage.getItem('user_name');
  currentUsername.value = localStorage.getItem('username');
  userRole.value = localStorage.getItem('user_role') || 'USER';
};

const handleLogout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_name');
  localStorage.removeItem('username');
  localStorage.removeItem('user_role');
  checkAuth();
  router.push('/login');
};

onMounted(() => {
  checkAuth();
});
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <GovCard>
      <template #title>
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-surface p-1 flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200">
            <img :src="logoUrl" alt="Logo Kab. Banggai Laut" class="w-full h-full object-contain" />
          </div>
          <div>
            <div class="text-2xl font-bold text-text-main tracking-tight">
              SI-SPD Sekda Kab. Banggai Laut
            </div>
          </div>
        </div>
      </template>
      <template #subtitle>
        <span class="text-text-muted text-sm">
          Sistem Informasi Surat Perjalanan Dinas Sekretariat Daerah Kabupaten Banggai Laut
        </span>
      </template>
      <template #content>
        <p class="text-text-main text-sm leading-relaxed mb-6">
          Selamat datang di Portal Sistem Informasi Surat Perjalanan Dinas (SI-SPD) Sekretariat Daerah Kabupaten Banggai Laut, Sulawesi Tengah.
        </p>

        <!-- Logged In Status Banner -->
        <div v-if="authToken" class="p-5 bg-surface border border-border rounded-xl space-y-4 mb-6 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-primary text-white dark:text-[#0F172A] font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                {{ userName ? userName.charAt(0).toUpperCase() : 'U' }}
              </div>
              <div>
                <div class="text-base font-bold text-text-main">
                  {{ userName }}
                </div>
                <div class="text-xs text-text-muted font-mono mt-0.5">
                  NIP / Akun: {{ currentUsername }} &bull; Otorisasi: <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-primary/15 text-primary border border-blue-200 dark:border-primary/30">{{ userRole }}</span>
                </div>
              </div>
            </div>

            <GovButton
              label="Keluar (Logout)"
              icon="pi pi-sign-out"
              severity="secondary"
              @click="handleLogout"
            />
          </div>

          <!-- Quick Navigation Actions -->
          <div class="pt-3 border-t border-border flex flex-wrap gap-2.5">
            <router-link to="/pengaturan/kop-surat">
              <GovButton
                label="Pengaturan Kop Surat"
                icon="pi pi-file-edit"
                severity="primary"
              />
            </router-link>
            <router-link to="/kepegawaian/asn">
              <GovButton
                label="Data Pegawai ASN"
                icon="pi pi-users"
                severity="secondary"
              />
            </router-link>
            <router-link to="/pengaturan/pengguna">
              <GovButton
                label="Pengguna Sistem"
                icon="pi pi-user-edit"
                severity="secondary"
              />
            </router-link>
          </div>
        </div>

        <!-- Not Logged In Prompt -->
        <div v-else class="p-6 bg-surface border border-border rounded-xl text-center space-y-4 shadow-sm">
          <div class="text-sm text-text-muted">
            Anda belum masuk ke sesi akun resmi. Silakan masuk menggunakan NIP atau Akun Pegawai.
          </div>
          <router-link to="/login">
            <GovButton
              label="Masuk ke Sistem"
              icon="pi pi-sign-in"
              severity="primary"
            />
          </router-link>
        </div>
      </template>
    </GovCard>
  </div>
</template>
