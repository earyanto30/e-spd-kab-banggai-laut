<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from './composables/useTheme';
import GovSidebar from './components/layout/GovSidebar.vue';
import GovHeader from './components/layout/GovHeader.vue';
import { Role, RoleType } from '@si-setda/shared-types';

const route = useRoute();
const router = useRouter();
const { initTheme } = useTheme();

const sidebarCollapsed = ref(false);
const userRole = ref<RoleType | string>(Role.USER);
const userName = ref<string | null>(null);
const currentUsername = ref<string | null>(null);
const isAuthenticated = ref(false);

const syncAuthState = () => {
  const token = localStorage.getItem('auth_token');
  isAuthenticated.value = !!token;
  userRole.value = (localStorage.getItem('user_role') as RoleType) || Role.USER;
  userName.value = localStorage.getItem('user_name');
  currentUsername.value = localStorage.getItem('username');
};

const handleLogout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_name');
  localStorage.removeItem('username');
  localStorage.setItem('user_role', Role.USER);
  syncAuthState();
  router.push('/login');
};

const showAdminLayout = computed(() => {
  return isAuthenticated.value && !route.meta.hideNavbar && route.name !== 'Login';
});

watch(
  () => route.path,
  () => {
    syncAuthState();
  },
  { immediate: true }
);

onMounted(() => {
  initTheme();
  syncAuthState();
});
</script>

<template>
  <div class="min-h-screen bg-canvas text-text-main transition-colors">
    <!-- Standard Administrative Sidebar Layout: Only when authenticated and not on isolated pages -->
    <template v-if="showAdminLayout">
      <div class="flex h-screen overflow-hidden">
        <!-- Sidebar -->
        <GovSidebar
          :collapsed="sidebarCollapsed"
          :user-role="userRole"
          :user-name="userName"
          :username="currentUsername"
          @toggle="sidebarCollapsed = !sidebarCollapsed"
          @logout="handleLogout"
        />

        <!-- Main Content Column -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <!-- Top Header -->
          <GovHeader
            :sidebar-collapsed="sidebarCollapsed"
            :user-name="userName"
            @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
          />

          <!-- View Outlet -->
          <main class="flex-1 overflow-y-auto p-6 bg-canvas transition-colors">
            <router-view />
          </main>
        </div>
      </div>
    </template>

    <!-- Clean / Blank Layout (Login, Unauthorized, or unauthenticated redirects) -->
    <template v-else>
      <router-view />
    </template>
  </div>
</template>
