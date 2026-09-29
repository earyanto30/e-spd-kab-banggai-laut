<script setup lang="ts">
import DataTable from 'primevue/datatable';

defineProps<{
  value?: any[];
  stripedRows?: boolean;
  paginator?: boolean;
  rows?: number;
}>();
</script>

<template>
  <DataTable
    :value="value"
    :striped-rows="stripedRows ?? true"
    :paginator="paginator"
    :rows="rows || 10"
    v-bind="$attrs"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope ?? {}" />
    </template>
  </DataTable>
</template>
