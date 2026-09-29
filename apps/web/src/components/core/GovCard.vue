<script setup lang="ts">
import Card from 'primevue/card';
</script>

<template>
  <Card v-bind="$attrs">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.subtitle" #subtitle>
      <slot name="subtitle" />
    </template>
    <template v-if="$slots.content" #content>
      <slot name="content" />
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Card>
</template>
