<script setup lang="ts" generic="T = any">
import AutoComplete, { AutoCompleteCompleteEvent } from 'primevue/autocomplete';

const model = defineModel<T>();

withDefaults(
  defineProps<{
    suggestions: T[];
    loading?: boolean;
    optionLabel?: string;
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
    fluid?: boolean;
  }>(),
  {
    loading: false,
    fluid: true,
  }
);

const emit = defineEmits<{
  (e: 'complete', event: AutoCompleteCompleteEvent): void;
}>();
</script>

<template>
  <AutoComplete
    v-model="model"
    :suggestions="suggestions"
    :loading="loading"
    :option-label="optionLabel"
    :placeholder="placeholder"
    :invalid="invalid"
    :disabled="disabled"
    :fluid="fluid"
    v-bind="$attrs"
    @complete="emit('complete', $event)"
  >
    <template v-if="$slots.option" #option="slotProps">
      <slot name="option" v-bind="slotProps" />
    </template>
  </AutoComplete>
</template>
