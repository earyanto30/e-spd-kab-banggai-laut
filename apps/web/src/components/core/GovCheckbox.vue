<script setup lang="ts">
import Checkbox from 'primevue/checkbox';

const model = defineModel<boolean | any[]>();

withDefaults(
  defineProps<{
    inputId?: string;
    binary?: boolean;
    disabled?: boolean;
    label?: string;
    description?: string;
  }>(),
  {
    binary: true,
  }
);
</script>

<template>
  <div v-if="label" class="flex items-start gap-2.5">
    <Checkbox
      :input-id="inputId"
      v-model="model"
      :binary="binary ?? true"
      :disabled="disabled"
      class="mt-0.5"
      v-bind="$attrs"
    />
    <label
      v-if="label"
      :for="inputId"
      class="text-xs text-text-main cursor-pointer select-none leading-relaxed"
    >
      <span class="font-medium">{{ label }}</span>
      <span v-if="description" class="block text-[11px] text-text-muted mt-0.5">
        {{ description }}
      </span>
    </label>
  </div>
  <Checkbox
    v-else
    :input-id="inputId"
    v-model="model"
    :binary="binary ?? true"
    :disabled="disabled"
    v-bind="$attrs"
  />
</template>
