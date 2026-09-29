<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
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

const syncAuthState = () => {
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

watch(
  () => route.path,
  () => {
    syncAuthState();
  }
);

onMounted(() => {
  initTheme();
  syncAuthState();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
    <!-- Blank layout for login and isolated pages -->
    <template v-if="route.meta.hideNavbar">
      <router-view />
    </template>

    <!-- Standard Administrative Sidebar Layout -->
    <template v-else>
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
          <main class="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-zinc-950 transition-colors">
            <router-view />
          </main>
        </div>
      </div>
    </template>
  </div>
</template>
