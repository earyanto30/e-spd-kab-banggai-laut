<script setup lang="ts">
import Textarea from 'primevue/textarea';

const model = defineModel<string>();

withDefaults(
  defineProps<{
    rows?: number | string;
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
    autoResize?: boolean;
    fluid?: boolean;
    maxlength?: number | string;
  }>(),
  {
    rows: 3,
    fluid: true,
  }
);
</script>

<template>
  <Textarea
    v-model="model"
    :rows="rows"
    :placeholder="placeholder"
    :invalid="invalid"
    :disabled="disabled"
    :auto-resize="autoResize"
    :fluid="fluid"
    :maxlength="maxlength"
    v-bind="$attrs"
  />
</template>
