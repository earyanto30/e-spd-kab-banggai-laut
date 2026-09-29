<script setup lang="ts">
import Checkbox from 'primevue/checkbox';

const model = defineModel<boolean | any[]>();

defineProps<{
  inputId?: string;
  binary?: boolean;
  disabled?: boolean;
}>();
</script>

<template>
  <Checkbox
    :input-id="inputId"
    v-model="model"
    :binary="binary ?? true"
    :disabled="disabled"
  />
</template>
