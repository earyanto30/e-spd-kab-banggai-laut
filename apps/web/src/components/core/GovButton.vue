<script setup lang="ts">
import Button from 'primevue/button';

defineProps<{
  label?: string;
  icon?: string;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast';
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  block?: boolean;
}>();
</script>

<template>
  <Button
    :label="label"
    :icon="icon"
    :severity="severity"
    :loading="loading"
    :disabled="disabled"
    :type="type || 'button'"
    :class="{ 'w-full': block }"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope ?? {}" />
    </template>
  </Button>
</template>
