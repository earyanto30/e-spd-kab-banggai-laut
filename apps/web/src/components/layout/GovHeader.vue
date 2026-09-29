<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useTheme } from '../../composables/useTheme';
import { GovButton } from '../core';

defineProps<{
  sidebarCollapsed: boolean;
  userName?: string | null;
}>();

const emit = defineEmits<{
  (e: 'toggleSidebar'): void;
}>();

const route = useRoute();
const { isDark, toggleTheme } = useTheme();
</script>

<template>
  <header class="h-16 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-6 flex items-center justify-between z-10 transition-colors">
    <div class="flex items-center gap-4">
      <GovButton
        :icon="sidebarCollapsed ? 'pi pi-bars' : 'pi pi-arrow-left'"
        severity="secondary"
        @click="emit('toggleSidebar')"
      />
      <div>
        <h1 class="text-base font-semibold text-slate-800 dark:text-zinc-100">
          {{ (route.name as string) || 'SI-SETDA' }}
        </h1>
        <p class="text-xs text-slate-400 dark:text-zinc-400">
          Portal Pelayanan & Tata Kelola Administrasi
        </p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <GovButton
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        severity="secondary"
        @click="toggleTheme"
      />
    </div>
  </header>
</template>
