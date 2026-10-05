<script setup lang="ts" generic="T = any">
import MultiSelect from 'primevue/multiselect';

const model = defineModel<T[]>();

withDefaults(
  defineProps<{
    options: T[];
    optionLabel?: string;
    optionValue?: string;
    placeholder?: string;
    display?: 'comma' | 'chip';
    invalid?: boolean;
    disabled?: boolean;
    fluid?: boolean;
  }>(),
  {
    display: 'chip',
    fluid: true,
  }
);
</script>

<template>
  <MultiSelect
    v-model="model"
    :options="options"
    :option-label="optionLabel"
    :option-value="optionValue"
    :placeholder="placeholder"
    :display="display"
    :invalid="invalid"
    :disabled="disabled"
    :fluid="fluid"
    v-bind="$attrs"
  >
    <template v-if="$slots.option" #option="slotProps">
      <slot name="option" v-bind="slotProps" />
    </template>
  </MultiSelect>
</template>
