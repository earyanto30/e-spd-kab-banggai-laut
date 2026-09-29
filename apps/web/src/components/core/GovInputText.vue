<script setup lang="ts">
import InputText from 'primevue/inputtext';

const model = defineModel<string>();

defineProps<{
  id?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autocomplete?: string;
  disabled?: boolean;
  block?: boolean;
}>();
</script>

<template>
  <InputText
    :id="id"
    v-model="model"
    :type="type || 'text'"
    :placeholder="placeholder"
    :required="required"
    :autocomplete="autocomplete"
    :disabled="disabled"
    :class="{ 'w-full': block }"
  />
</template>
