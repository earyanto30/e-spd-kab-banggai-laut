<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useTheme } from '../../composables/useTheme';

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
  <header class="h-16 bg-[#0F4C81] dark:bg-surface text-white dark:text-text-main border-b border-[#0d4373] dark:border-border px-6 flex items-center justify-between z-10 transition-colors shadow-sm">
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="w-9 h-9 rounded-lg flex items-center justify-center text-white dark:text-text-main bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 active:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 border border-white/20 dark:border-white/10"
        :title="sidebarCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'"
        @click="emit('toggleSidebar')"
      >
        <i :class="sidebarCollapsed ? 'pi pi-bars' : 'pi pi-arrow-left'" class="text-sm"></i>
      </button>
      <div>
        <h1 class="text-base font-semibold text-white dark:text-text-main tracking-tight">
          {{ (route.name as string) || 'SI-SPD Banggai Laut' }}
        </h1>
        <p class="text-xs text-white/80 dark:text-text-muted font-normal">
          Sistem Informasi Surat Perjalanan Dinas Sekda Kab. Banggai Laut
        </p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="w-9 h-9 rounded-lg flex items-center justify-center text-white dark:text-text-main bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 active:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 border border-white/20 dark:border-white/10"
        :title="isDark ? 'Mode Terang' : 'Mode Gelap'"
        @click="toggleTheme"
      >
        <i :class="isDark ? 'pi pi-sun text-accent' : 'pi pi-moon'" class="text-sm"></i>
      </button>
    </div>
  </header>
</template>
