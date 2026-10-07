<script setup lang="ts" generic="T = any, V = any">
import Select from 'primevue/select';

const model = defineModel<V>();

withDefaults(
  defineProps<{
    options: T[];
    optionLabel?: string;
    optionValue?: string;
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
    fluid?: boolean;
  }>(),
  {
    fluid: true,
  }
);
</script>

<template>
  <Select
    v-model="model"
    :options="options"
    :option-label="optionLabel"
    :option-value="optionValue"
    :placeholder="placeholder"
    :invalid="invalid"
    :disabled="disabled"
    :fluid="fluid"
    v-bind="$attrs"
  >
    <template v-if="$slots.option" #option="slotProps">
      <slot name="option" v-bind="slotProps" />
    </template>
    <template v-if="$slots.value" #value="slotProps">
      <slot name="value" v-bind="slotProps" />
    </template>
  </Select>
</template>
