<script setup lang="ts">
import Password from 'primevue/password';

const model = defineModel<string>();

defineProps<{
  id?: string;
  placeholder?: string;
  feedback?: boolean;
  toggleMask?: boolean;
  required?: boolean;
  autocomplete?: string;
  disabled?: boolean;
  block?: boolean;
}>();
</script>

<template>
  <Password
    :id="id"
    v-model="model"
    :placeholder="placeholder"
    :feedback="feedback ?? false"
    :toggle-mask="toggleMask ?? true"
    :required="required"
    :autocomplete="autocomplete"
    :disabled="disabled"
    :class="{ 'w-full': block }"
    :input-class="block ? 'w-full' : undefined"
  />
</template>
