<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { GovButton } from '../core';
import { Role, RoleType } from '@si-setda/shared-types';
import logoUrl from '../../assets/logo.png';

interface SubMenuItem {
  label: string;
  icon?: string;
  to: string;
  roles?: RoleType[];
}

interface MenuItem {
  label: string;
  icon: string;
  to?: string;
  roles: RoleType[];
  children?: SubMenuItem[];
}

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

const openSubmenus = ref<Record<string, boolean>>({});

const menuItems = computed<MenuItem[]>(() => [
  {
    label: 'Beranda',
    icon: 'pi pi-home',
    to: '/',
    roles: [Role.USER, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    label: 'Surat Perjalanan Dinas',
    icon: 'pi pi-briefcase',
    roles: [Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN],
    children: [
      {
        label: 'Pengaturan Kop Surat',
        icon: 'pi pi-file-edit',
        to: '/spd/kop-surat',
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
      },
    ],
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
    roles: [Role.ADMIN, Role.SUPER_ADMIN],
    children: [
      {
        label: 'Data ASN',
        icon: 'pi pi-id-card',
        to: '/kepegawaian/asn',
        roles: [Role.ADMIN, Role.SUPER_ADMIN],
      },
    ],
  },
  {
    label: 'Pengaturan Sistem',
    icon: 'pi pi-cog',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    children: [
      {
        label: 'Pengguna Sistem',
        icon: 'pi pi-user-edit',
        to: '/pengaturan/pengguna',
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
      },
    ],
  },
]);

const userInitial = computed(() => {
  if (props.userName) return props.userName.charAt(0).toUpperCase();
  if (props.username) return props.username.charAt(0).toUpperCase();
  return 'U';
});

const isItemActive = (path?: string) => {
  if (!path) return false;
  return router.currentRoute.value.path === path;
};

const isParentActive = (children?: SubMenuItem[]) => {
  if (!children) return false;
  return children.some((sub) => router.currentRoute.value.path.startsWith(sub.to));
};

const toggleSubmenu = (label: string) => {
  if (props.collapsed) {
    emit('toggle');
    openSubmenus.value[label] = true;
  } else {
    openSubmenus.value[label] = !openSubmenus.value[label];
  }
};
</script>

<template>
  <aside
    class="flex flex-col bg-surface border-r border-border transition-all duration-200 z-20 select-none shadow-sm"
    :class="collapsed ? 'w-20' : 'w-64'"
  >
    <!-- Brand / Header Section -->
    <div class="h-16 flex items-center px-4 bg-[#0F4C81] dark:bg-surface border-b border-[#0d4373] dark:border-border justify-between text-white dark:text-text-main">
      <router-link to="/" class="flex items-center gap-3 overflow-hidden">
        <div class="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/20 dark:border-slate-700">
          <img :src="logoUrl" alt="Logo Kab. Banggai Laut" class="w-full h-full object-contain" />
        </div>
        <div v-if="!collapsed" class="flex flex-col min-w-0 transition-opacity duration-200">
          <span class="font-bold text-base text-white dark:text-text-main tracking-tight truncate">
            SI-SPD
          </span>
          <span class="text-xs text-white/80 dark:text-text-muted truncate">
            Sekda Kab. Banggai Laut
          </span>
        </div>
      </router-link>

      <div v-if="!collapsed">
        <button
          type="button"
          class="w-7 h-7 rounded-lg flex items-center justify-center text-white dark:text-text-main bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 active:bg-white/30 transition-colors border border-white/10 dark:border-white/5"
          title="Tutup Sidebar"
          @click="emit('toggle')"
        >
          <i class="pi pi-chevron-left text-xs"></i>
        </button>
      </div>
    </div>

    <!-- Toggle button when collapsed -->
    <div v-if="collapsed" class="p-2 flex justify-center bg-[#0F4C81] dark:bg-surface border-b border-[#0d4373] dark:border-border">
      <button
        type="button"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-white dark:text-text-main bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 active:bg-white/30 transition-colors border border-white/10 dark:border-white/5"
        title="Buka Sidebar"
        @click="emit('toggle')"
      >
        <i class="pi pi-chevron-right text-xs"></i>
      </button>
    </div>

    <!-- Navigation Menu Items -->
    <nav class="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
      <template v-for="item in menuItems" :key="item.label">
        <!-- Item without sub-menu -->
        <router-link
          v-if="!item.children"
          :to="item.to!"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="[
            isItemActive(item.to)
              ? 'bg-primary text-white dark:text-[#0F172A] shadow-sm font-semibold'
              : 'text-text-main hover:bg-canvas hover:text-primary dark:hover:text-primary',
            collapsed ? 'justify-center' : ''
          ]"
          :title="collapsed ? item.label : undefined"
        >
          <i :class="[item.icon, 'text-lg flex-shrink-0', isItemActive(item.to) ? 'text-accent dark:text-[#0F172A]' : 'text-text-muted']"></i>
          <span v-if="!collapsed" class="truncate font-medium">
            {{ item.label }}
          </span>
        </router-link>

        <!-- Item with sub-menu -->
        <div v-else class="space-y-1">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left"
            :class="[
              isParentActive(item.children)
                ? 'text-primary font-semibold bg-primary/5 dark:bg-primary/10 border-l-2 border-primary'
                : 'text-text-main hover:bg-canvas hover:text-primary dark:hover:text-primary',
              collapsed ? 'justify-center' : 'justify-between'
            ]"
            :title="collapsed ? item.label : undefined"
            @click="toggleSubmenu(item.label)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <i :class="[item.icon, 'text-lg flex-shrink-0', isParentActive(item.children) ? 'text-primary' : 'text-text-muted']"></i>
              <span v-if="!collapsed" class="truncate">
                {{ item.label }}
              </span>
            </div>
            <i
              v-if="!collapsed"
              class="pi text-xs text-text-muted"
              :class="openSubmenus[item.label] ? 'pi-chevron-down' : 'pi-chevron-right'"
            ></i>
          </button>

          <!-- Submenu items -->
          <div
            v-if="!collapsed && openSubmenus[item.label]"
            class="pl-7 pr-1 space-y-1 pt-0.5"
          >
            <router-link
              v-for="sub in item.children"
              :key="sub.to"
              :to="sub.to"
              class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              :class="[
                isItemActive(sub.to)
                  ? 'bg-primary text-white dark:text-[#0F172A] shadow-sm font-semibold'
                  : 'text-text-muted hover:bg-canvas hover:text-text-main'
              ]"
            >
              <i :class="[sub.icon || 'pi pi-circle', 'text-xs flex-shrink-0', isItemActive(sub.to) ? 'text-accent dark:text-[#0F172A]' : 'text-text-muted']"></i>
              <span class="truncate">{{ sub.label }}</span>
            </router-link>
          </div>
        </div>
      </template>
    </nav>

    <!-- User Profile & Footer Section -->
    <div class="p-3 border-t border-border bg-canvas">
      <div v-if="!collapsed" class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-full bg-primary text-accent dark:text-[#0F172A] font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm border border-primary/20">
            {{ userInitial }}
          </div>
          <div class="min-w-0 flex flex-col">
            <span class="text-xs font-semibold text-text-main truncate">
              {{ userName || 'Tamu' }}
            </span>
            <span class="text-xs text-text-muted truncate">
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
          class="w-9 h-9 rounded-full bg-primary text-accent dark:text-[#0F172A] font-bold text-sm flex items-center justify-center shadow-sm"
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
