<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { GovButton } from '../core';
import { Role, RoleType } from '@si-setda/shared-types';

const props = defineProps<{
  collapsed: boolean;
  userRole?: RoleType | string;
  userName?: string | null;
  username?: string | null;
}>();

const emit = defineEmits<{
  (e: 'toggle'): void;
  (e: 'logout'): void;
}>();

const router = useRouter();

const menuItems = computed(() => [
  {
    label: 'Beranda',
    icon: 'pi pi-home',
    to: '/',
    roles: [Role.USER, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    label: 'Persuratan & Disposisi',
    icon: 'pi pi-envelope',
    to: '/surat',
    roles: [Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    label: 'Agenda & Dokumen',
    icon: 'pi pi-calendar',
    to: '/agenda',
    roles: [Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    label: 'Kepegawaian',
    icon: 'pi pi-users',
    to: '/kepegawaian',
    roles: [Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    label: 'Pengaturan Sistem',
    icon: 'pi pi-cog',
    to: '/pengaturan',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  },
]);

const userInitial = computed(() => {
  if (props.userName) return props.userName.charAt(0).toUpperCase();
  if (props.username) return props.username.charAt(0).toUpperCase();
  return 'U';
});

const isItemActive = (path: string) => {
  return router.currentRoute.value.path === path;
};
</script>

<template>
  <aside
    class="flex flex-col bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 transition-all duration-200 z-20 select-none"
    :class="collapsed ? 'w-20' : 'w-64'"
  >
    <!-- Brand / Header Section -->
    <div class="h-16 flex items-center px-4 border-b border-slate-200 dark:border-zinc-800 justify-between">
      <router-link to="/" class="flex items-center gap-3 overflow-hidden">
        <div class="w-10 h-10 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
          <i class="pi pi-building text-lg"></i>
        </div>
        <div v-if="!collapsed" class="flex flex-col min-w-0 transition-opacity duration-200">
          <span class="font-bold text-base text-slate-800 dark:text-zinc-100 tracking-tight truncate">
            SI-SETDA
          </span>
          <span class="text-xs text-slate-400 dark:text-zinc-400 truncate">
            Sekretariat Daerah
          </span>
        </div>
      </router-link>

      <div v-if="!collapsed">
        <GovButton
          icon="pi pi-chevron-left"
          severity="secondary"
          @click="emit('toggle')"
        />
      </div>
    </div>

    <!-- Toggle button when collapsed -->
    <div v-if="collapsed" class="p-2 flex justify-center border-b border-slate-100 dark:border-zinc-800">
      <GovButton
        icon="pi pi-chevron-right"
        severity="secondary"
        @click="emit('toggle')"
      />
    </div>

    <!-- Navigation Menu Items -->
    <nav class="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
      <template v-for="item in menuItems" :key="item.label">
        <router-link
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="[
            isItemActive(item.to)
              ? 'bg-blue-900 text-white shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
              : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/80',
            collapsed ? 'justify-center' : ''
          ]"
          :title="collapsed ? item.label : undefined"
        >
          <i :class="[item.icon, 'text-lg flex-shrink-0', isItemActive(item.to) ? 'text-amber-300' : 'text-slate-400 dark:text-zinc-400']"></i>
          <span v-if="!collapsed" class="truncate">
            {{ item.label }}
          </span>
        </router-link>
      </template>
    </nav>

    <!-- User Profile & Footer Section -->
    <div class="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
      <div v-if="!collapsed" class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-full bg-blue-900 text-amber-300 font-bold text-sm flex items-center justify-center flex-shrink-0">
            {{ userInitial }}
          </div>
          <div class="min-w-0 flex flex-col">
            <span class="text-xs font-semibold text-slate-800 dark:text-zinc-100 truncate">
              {{ userName || 'Tamu' }}
            </span>
            <span class="text-xs text-slate-400 dark:text-zinc-400 truncate">
              {{ userRole || 'USER' }}
            </span>
          </div>
        </div>

        <GovButton
          icon="pi pi-sign-out"
          severity="secondary"
          @click="emit('logout')"
        />
      </div>

      <div v-else class="flex flex-col items-center gap-2">
        <div
          class="w-9 h-9 rounded-full bg-blue-900 text-amber-300 font-bold text-sm flex items-center justify-center"
          :title="userName || 'Tamu'"
        >
          {{ userInitial }}
        </div>
        <GovButton
          icon="pi pi-sign-out"
          severity="secondary"
          @click="emit('logout')"
        />
      </div>
    </div>
  </aside>
</template>
