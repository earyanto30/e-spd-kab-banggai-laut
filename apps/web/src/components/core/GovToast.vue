<script setup lang="ts">
import Toast from 'primevue/toast';

withDefaults(
  defineProps<{
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' | 'center';
    group?: string;
    autoZIndex?: boolean;
    baseZIndex?: number;
    breakpoints?: Record<string, any>;
  }>(),
  {
    position: 'top-right',
    autoZIndex: true,
    baseZIndex: 99999,
    breakpoints: () => ({
      '768px': { width: 'calc(100vw - 2rem)', right: '1rem', left: '1rem' },
      '480px': { width: 'calc(100vw - 1.5rem)', right: '0.75rem', left: '0.75rem' },
    }),
  }
);
</script>

<template>
  <Toast
    :position="position"
    :group="group"
    :auto-z-index="autoZIndex"
    :base-z-index="baseZIndex"
    :breakpoints="breakpoints"
    class="gov-toast-container"
  >
    <template #message="slotProps">
      <div class="flex items-start gap-3 w-full">
        <!-- Icon based on severity -->
        <span class="flex-shrink-0 mt-0.5 text-lg">
          <i v-if="slotProps.message.severity === 'success'" class="pi pi-check-circle text-emerald-500"></i>
          <i v-else-if="slotProps.message.severity === 'error'" class="pi pi-times-circle text-rose-500"></i>
          <i v-else-if="slotProps.message.severity === 'warn'" class="pi pi-exclamation-triangle text-amber-500"></i>
          <i v-else class="pi pi-info-circle text-blue-500"></i>
        </span>

        <!-- Message Body -->
        <div class="flex-1 min-w-0 pr-2">
          <div v-if="slotProps.message.summary" class="font-semibold text-sm text-text-main leading-tight mb-1">
            {{ slotProps.message.summary }}
          </div>
          <div class="text-xs text-text-muted leading-relaxed">
            {{ slotProps.message.detail }}
          </div>
        </div>
      </div>
    </template>
  </Toast>
</template>

<style scoped>
:deep(.p-toast-message) {
  backdrop-filter: blur(8px);
}
</style>
