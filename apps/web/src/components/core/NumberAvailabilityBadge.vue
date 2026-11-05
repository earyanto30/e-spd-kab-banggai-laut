<script setup lang="ts">
import { computed } from 'vue';

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'duplicate' | 'auto';

const props = withDefaults(
  defineProps<{
    status: AvailabilityStatus;
    message?: string;
    availableText?: string;
    duplicateText?: string;
    checkingText?: string;
    autoText?: string;
  }>(),
  {
    status: 'idle',
    message: '',
    availableText: 'Tersedia',
    duplicateText: 'Sudah Digunakan',
    checkingText: 'Memeriksa...',
    autoText: 'Otomatis Sistem (Tersedia)',
  }
);

const badgeClass = computed(() => {
  switch (props.status) {
    case 'available':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    case 'duplicate':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-700';
    case 'checking':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    case 'auto':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    default:
      return '';
  }
});

const iconClass = computed(() => {
  switch (props.status) {
    case 'available':
      return 'pi pi-check text-xs font-bold text-emerald-700 dark:text-emerald-300';
    case 'duplicate':
      return 'pi pi-times text-xs font-bold text-rose-700 dark:text-rose-300';
    case 'checking':
      return 'pi pi-spin pi-spinner text-xs text-slate-600 dark:text-slate-400';
    case 'auto':
      return 'pi pi-check-circle text-xs font-bold text-blue-600 dark:text-blue-400';
    default:
      return '';
  }
});

const displayLabel = computed(() => {
  switch (props.status) {
    case 'available':
      return props.availableText;
    case 'duplicate':
      return props.duplicateText;
    case 'checking':
      return props.checkingText;
    case 'auto':
      return props.autoText;
    default:
      return '';
  }
});
</script>

<template>
  <span
    v-if="status !== 'idle'"
    :class="[
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs transition-all duration-200 select-none',
      badgeClass
    ]"
    :title="message || displayLabel"
  >
    <i :class="iconClass"></i>
    <span>{{ displayLabel }}</span>
  </span>
</template>
