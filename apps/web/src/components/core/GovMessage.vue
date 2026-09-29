<script setup lang="ts">
import Message from 'primevue/message';

defineProps<{
  severity?: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';
  closable?: boolean;
}>();
</script>

<template>
  <Message :severity="severity || 'info'" :closable="closable ?? false">
    <slot />
  </Message>
</template>
