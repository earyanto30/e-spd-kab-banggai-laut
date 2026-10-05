<script setup lang="ts">
import InputNumber from 'primevue/inputnumber';

const model = defineModel<number | null>();

withDefaults(
  defineProps<{
    min?: number;
    max?: number;
    step?: number;
    showButtons?: boolean;
    buttonLayout?: 'stacked' | 'horizontal' | 'vertical';
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
    fluid?: boolean;
  }>(),
  {
    showButtons: true,
    buttonLayout: 'horizontal',
    step: 1,
    fluid: true,
  }
);
</script>

<template>
  <InputNumber
    v-model="model"
    :min="min"
    :max="max"
    :step="step"
    :show-buttons="showButtons"
    :button-layout="buttonLayout"
    :placeholder="placeholder"
    :invalid="invalid"
    :disabled="disabled"
    :fluid="fluid"
    v-bind="$attrs"
  />
</template>
