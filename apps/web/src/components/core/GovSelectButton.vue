<script setup lang="ts" generic="T = any">
import SelectButton from 'primevue/selectbutton';

const model = defineModel<T>();

defineProps<{
  options: T[];
  optionLabel?: string;
  optionValue?: string;
  invalid?: boolean;
  disabled?: boolean;
}>();
</script>

<template>
  <SelectButton
    v-model="model"
    :options="options"
    :option-label="optionLabel"
    :option-value="optionValue"
    :invalid="invalid"
    :disabled="disabled"
    v-bind="$attrs"
  />
</template>
