<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PanelMenu from 'primevue/panelmenu';
import { GovButton } from '../core';
import { Role, RoleType } from '@si-setda/shared-types';
import logoUrl from '../../assets/logo.png';

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

// ── Menu model ────────────────────────────────────────────────────────────────
// Labels follow UX best practices:
//   • Top-level: nouns (domain area), short, no verbs
//   • Sub-items: verb + noun only when the action is distinct (Buat SPD vs Daftar SPD)
//   • Avoid redundancy: don't repeat parent label in child
// ─────────────────────────────────────────────────────────────────────────────
const allMenuItems = [
  {
    key: 'beranda',
    label: 'Beranda',
    icon: 'pi pi-home',
    route: '/',
    roles: [Role.USER, Role.STAFF, Role.PENANDATANGAN, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    key: 'surat-tugas',
    label: 'Surat Tugas',
    icon: 'pi pi-file-edit',
    roles: [Role.USER, Role.STAFF, Role.PENANDATANGAN, Role.ADMIN, Role.SUPER_ADMIN],
    items: [
      {
        key: 'surat-tugas-daftar',
        label: 'Daftar Surat Tugas',
        icon: 'pi pi-list',
        route: '/surat-tugas',
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER],
      },
      {
        key: 'surat-tugas-buat',
        label: 'Buat Surat Tugas',
        icon: 'pi pi-plus-circle',
        route: '/surat-tugas/buat',
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    key: 'spd',
    label: 'Surat Perjalanan Dinas',
    icon: 'pi pi-briefcase',
    roles: [Role.USER, Role.STAFF, Role.PENANDATANGAN, Role.ADMIN, Role.SUPER_ADMIN],
    items: [
      {
        key: 'spd-daftar',
        label: 'Daftar SPD',
        icon: 'pi pi-list',
        route: '/spd',
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER],
      },
      {
        key: 'spd-buat',
        label: 'Buat SPD',
        icon: 'pi pi-plus-circle',
        route: '/spd/buat',
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF],
      },
    ],
  },
  {
    key: 'kepegawaian',
    label: 'Kepegawaian',
    icon: 'pi pi-users',
    roles: [Role.ADMIN, Role.SUPER_ADMIN, Role.PENANDATANGAN],
    items: [
      {
        key: 'kepegawaian-asn',
        label: 'Data ASN',
        icon: 'pi pi-id-card',
        route: '/kepegawaian/asn',
        roles: [Role.ADMIN, Role.SUPER_ADMIN, Role.PENANDATANGAN],
      },
    ],
  },
  {
    key: 'pengaturan',
    label: 'Pengaturan',
    icon: 'pi pi-cog',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    items: [
      {
        key: 'pengaturan-kop',
        label: 'Kop Surat',
        icon: 'pi pi-file-edit',
        route: '/pengaturan/kop-surat',
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
      },
      {
        key: 'pengaturan-pengguna',
        label: 'Pengguna',
        icon: 'pi pi-user-edit',
        route: '/pengaturan/pengguna',
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
      },
    ],
  },
];

// Filter menu items by role recursively
function filterByRole(items: typeof allMenuItems, role: string): any[] {
  const isPenandatangan = role === Role.PENANDATANGAN || localStorage.getItem('user_is_penandatangan') === 'true';

  return items
    .filter((item) => {
      if (!item.roles) return true;
      if (item.roles.includes(role as RoleType)) return true;
      if (isPenandatangan && item.roles.includes(Role.PENANDATANGAN)) return true;
      return false;
    })
    .map((item) => ({
      ...item,
      items: item.items
        ? item.items.filter((sub) => {
            if (!sub.roles) return true;
            if (sub.roles.includes(role as RoleType)) return true;
            if (isPenandatangan && sub.roles.includes(Role.PENANDATANGAN)) return true;
            return false;
          })
        : undefined,
    }))
    .filter((item) => !item.items || item.items.length > 0 || item.route);
}

const menuItems = computed(() => filterByRole(allMenuItems, props.userRole || Role.USER));

// Auto-expand the active panel on route change
const expandedKeys = ref<Record<string, boolean>>({});

function syncExpandedToRoute() {
  const path = router.currentRoute.value.path;
  expandedKeys.value = {};
  for (const item of menuItems.value) {
    if (item.items?.some((sub: any) => path.startsWith(sub.route))) {
      expandedKeys.value[item.key] = true;
    }
  }
}

watch(() => router.currentRoute.value.path, syncExpandedToRoute, { immediate: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
const userInitial = computed(() => {
  if (props.userName) return props.userName.charAt(0).toUpperCase();
  if (props.username) return props.username.charAt(0).toUpperCase();
  return 'U';
});

const isActive = (route?: string) => {
  if (!route) return false;
  return router.currentRoute.value.path === route;
};

const isParentActive = (children?: any[]) => {
  if (!children) return false;
  return children.some((sub) => router.currentRoute.value.path.startsWith(sub.route));
};

const handleCollapsedParentClick = (item: any) => {
  expandedKeys.value[item.key] = true;
  emit('toggle');
};
</script>

<template>
  <aside
    class="flex flex-col bg-surface border-r border-border transition-all duration-200 z-20 select-none shadow-sm"
    :class="collapsed ? 'w-20' : 'w-64'"
  >
    <!-- Brand / Header -->
    <!-- Collapsed: center just the toggle button. Expanded: logo + text + toggle. -->
    <div
      class="h-16 flex items-center bg-[#0F4C81] dark:bg-surface border-b border-[#0d4373] dark:border-border text-white dark:text-text-main flex-shrink-0"
      :class="collapsed ? 'justify-center px-0' : 'justify-between px-4'"
    >
      <router-link v-if="!collapsed" to="/" class="flex items-center gap-3 overflow-hidden min-w-0">
        <div
          class="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/20 dark:border-slate-700"
        >
          <img :src="logoUrl" alt="Logo Kab. Banggai Laut" class="w-full h-full object-contain" />
        </div>
        <div class="flex flex-col min-w-0">
          <span class="font-bold text-base text-white dark:text-text-main tracking-tight truncate">
            SI-SPD
          </span>
          <span class="text-xs text-white/80 dark:text-text-muted truncate">
            Sekda Kab. Banggai Laut
          </span>
        </div>
      </router-link>

      <button
        type="button"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-white dark:text-text-main bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 active:bg-white/30 transition-colors border border-white/10 dark:border-white/5 flex-shrink-0"
        :title="collapsed ? 'Buka Sidebar' : 'Tutup Sidebar'"
        @click="emit('toggle')"
      >
        <i :class="collapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-left'" class="text-xs" />
      </button>
    </div>

    <!-- Nav: expanded → PanelMenu | collapsed → icon list -->
    <nav class="flex-1 overflow-y-auto py-3">
      <!-- Expanded: PrimeVue PanelMenu with router-link slot -->
      <PanelMenu
        v-if="!collapsed"
        v-model:expandedKeys="expandedKeys"
        :model="menuItems"
        multiple
        class="gov-panelmenu px-2"
      >
        <template #item="{ item }">
          <!-- Leaf item with route -->
          <router-link
            v-if="item.route"
            v-slot="{ href, navigate }"
            :to="item.route"
            custom
          >
            <a
              :href="href"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer w-full"
              :class="
                isActive(item.route)
                  ? 'bg-primary text-white dark:text-[#0F172A] font-semibold shadow-sm'
                  : 'text-text-main hover:bg-canvas hover:text-primary'
              "
              @click="navigate"
            >
              <i
                :class="[
                  item.icon,
                  'text-base flex-shrink-0',
                  isActive(item.route) ? 'text-white dark:text-[#0F172A]' : 'text-text-muted',
                ]"
              />
              <span class="truncate">{{ item.label }}</span>
            </a>
          </router-link>

          <!-- Group header (has sub-items, no route) -->
          <a
            v-else
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer w-full"
            :class="
              item.items?.some((s: any) => isActive(s.route))
                ? 'text-primary font-semibold'
                : 'text-text-main hover:bg-canvas hover:text-primary'
            "
          >
            <i
              :class="[
                item.icon,
                'text-base flex-shrink-0',
                item.items?.some((s: any) => isActive(s.route)) ? 'text-primary' : 'text-text-muted',
              ]"
            />
            <span class="truncate flex-1">{{ item.label }}</span>
          </a>
        </template>
      </PanelMenu>

      <!-- Collapsed: top-level icon-only list (submenus hidden until expanded) -->
      <div v-else class="flex flex-col items-center gap-1.5 px-2">
        <template v-for="item in menuItems" :key="item.key">
          <!-- Top-level item with direct route -->
          <router-link
            v-if="item.route"
            :to="item.route"
            class="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
            :class="
              isActive(item.route)
                ? 'bg-primary text-white dark:text-[#0F172A] shadow-sm font-semibold'
                : 'text-text-muted hover:bg-canvas hover:text-primary'
            "
            :title="item.label"
          >
            <i :class="[item.icon, 'text-lg']" />
          </router-link>

          <!-- Top-level item with submenus: show parent category icon, click to expand -->
          <button
            v-else
            type="button"
            class="w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
            :class="
              isParentActive(item.items)
                ? 'bg-primary text-white dark:text-[#0F172A] shadow-sm font-semibold'
                : 'text-text-muted hover:bg-canvas hover:text-primary'
            "
            :title="item.label"
            @click="handleCollapsedParentClick(item)"
          >
            <i :class="[item.icon, 'text-lg']" />
          </button>
        </template>
      </div>
    </nav>

    <!-- User Profile Footer -->
    <div class="p-3 border-t border-border bg-canvas flex-shrink-0">
      <div v-if="!collapsed" class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-9 h-9 rounded-full bg-primary text-white dark:text-[#0F172A] font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm border border-primary/20"
          >
            {{ userInitial }}
          </div>
          <div class="min-w-0 flex flex-col">
            <span class="text-xs font-semibold text-text-main truncate">
              {{ userName || 'Tamu' }}
            </span>
            <span class="text-xs text-text-muted truncate">{{ userRole || 'USER' }}</span>
          </div>
        </div>
        <GovButton
          icon="pi pi-sign-out"
          severity="secondary"
          variant="text"
          title="Keluar dari Sistem"
          @click="emit('logout')"
        />
      </div>

      <div v-else class="flex flex-col items-center gap-2">
        <div
          class="w-9 h-9 rounded-full bg-primary text-white dark:text-[#0F172A] font-bold text-sm flex items-center justify-center shadow-sm"
          :title="userName || 'Tamu'"
        >
          {{ userInitial }}
        </div>
        <GovButton
          icon="pi pi-sign-out"
          severity="secondary"
          variant="text"
          title="Keluar dari Sistem"
          @click="emit('logout')"
        />
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Strip PanelMenu's built-in panel borders/backgrounds — we style via #item slot */
.gov-panelmenu :deep(.p-panelmenu-panel) {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin-bottom: 2px;
}

.gov-panelmenu :deep(.p-panelmenu-header) {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
}

.gov-panelmenu :deep(.p-panelmenu-header-content) {
  background: transparent !important;
  border: none !important;
  border-radius: 0.5rem !important;
  padding: 0 !important;
}

.gov-panelmenu :deep(.p-panelmenu-header-link) {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
}

/* Hide the default PanelMenu header icon/label — we render our own via #item */
.gov-panelmenu :deep(.p-panelmenu-header-icon),
.gov-panelmenu :deep(.p-panelmenu-header-label) {
  display: none !important;
}

/* Keep the toggle chevron */
.gov-panelmenu :deep(.p-panelmenu-submenu-icon) {
  color: var(--color-text-muted) !important;
  font-size: 0.65rem !important;
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
}

.gov-panelmenu :deep(.p-panelmenu-header-content) {
  position: relative;
}

/* Content / submenu area */
.gov-panelmenu :deep(.p-panelmenu-content) {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}

.gov-panelmenu :deep(.p-panelmenu-root-list) {
  padding: 0 0 0 0.75rem !important;
  gap: 2px !important;
  display: flex;
  flex-direction: column;
}

.gov-panelmenu :deep(.p-panelmenu-item-content) {
  background: transparent !important;
  border-radius: 0.5rem !important;
}

.gov-panelmenu :deep(.p-panelmenu-item-link) {
  padding: 0 !important;
  background: transparent !important;
}

/* Hide default item icon/label — rendered in #item slot */
.gov-panelmenu :deep(.p-panelmenu-item-icon),
.gov-panelmenu :deep(.p-panelmenu-item-label) {
  display: none !important;
}

/* No gap between panels */
.gov-panelmenu :deep(.p-panelmenu) {
  gap: 0 !important;
}
</style>
