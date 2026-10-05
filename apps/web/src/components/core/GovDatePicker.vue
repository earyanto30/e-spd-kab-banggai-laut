<script setup lang="ts">
import DatePicker from 'primevue/datepicker';

const model = defineModel<Date | Date[] | (Date | null)[] | null>();

withDefaults(
  defineProps<{
    dateFormat?: string;
    showIcon?: boolean;
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
    minDate?: Date;
    maxDate?: Date;
    fluid?: boolean;
  }>(),
  {
    dateFormat: 'dd/mm/yy',
    showIcon: true,
    fluid: true,
  }
);
</script>

<template>
  <DatePicker
    v-model="model"
    :date-format="dateFormat"
    :show-icon="showIcon"
    icon-display="input"
    :placeholder="placeholder"
    :invalid="invalid"
    :disabled="disabled"
    :min-date="minDate"
    :max-date="maxDate"
    :fluid="fluid"
    v-bind="$attrs"
  />
</template>
