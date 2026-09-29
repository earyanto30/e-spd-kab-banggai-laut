<script setup lang="ts">
import { GovButton, GovCard } from '../components/core';
</script>

<template>
  <div class="max-w-md mx-auto p-6 mt-12">
    <GovCard>
      <template #title>
        <div class="text-red-600 dark:text-red-400 flex items-center gap-2">
          <i class="pi pi-lock text-xl"></i>
          <span>Akses Ditolak</span>
        </div>
      </template>
      <template #content>
        <p class="text-slate-600 dark:text-zinc-300 mb-6">
          Anda tidak memiliki izin (role) yang sesuai untuk mengakses halaman ini.
        </p>
        <router-link to="/">
          <GovButton label="Kembali ke Beranda" icon="pi pi-arrow-left" severity="danger" />
        </router-link>
      </template>
    </GovCard>
  </div>
</template>
