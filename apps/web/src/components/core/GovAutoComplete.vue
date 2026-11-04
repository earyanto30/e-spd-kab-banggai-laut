<script setup lang="ts" generic="T = any">
import AutoComplete, { AutoCompleteCompleteEvent } from 'primevue/autocomplete';

const model = defineModel<T>();

withDefaults(
  defineProps<{
    suggestions: T[];
    loading?: boolean;
    optionLabel?: string | ((data: any) => string);
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
  (e: 'item-select', event: any): void;
  (e: 'clear'): void;
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
    @item-select="emit('item-select', $event)"
    @clear="emit('clear')"
  >
    <template v-for="(_, slotName) in $slots" :key="slotName" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps || {}" />
    </template>
  </AutoComplete>
</template>
