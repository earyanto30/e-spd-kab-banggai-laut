<script setup lang="ts">
import Button from 'primevue/button';

defineProps<{
  label?: string;
  icon?: string;
  iconPos?: 'left' | 'right' | 'top' | 'bottom';
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast';
  variant?: 'outlined' | 'text' | 'link';
  size?: 'small' | 'large';
  outlined?: boolean;
  text?: boolean;
  rounded?: boolean;
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
    :icon-pos="iconPos"
    :severity="severity"
    :variant="variant"
    :size="size"
    :outlined="outlined"
    :text="text"
    :rounded="rounded"
    :loading="loading"
    :disabled="disabled"
    :type="type || 'button'"
    :class="{ 'w-full': block }"
    v-bind="$attrs"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope ?? {}" />
    </template>
  </Button>
</template>
