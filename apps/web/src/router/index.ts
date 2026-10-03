import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { Role, RoleType, hasRequiredRole } from '@si-setda/shared-types';

declare module 'vue-router' {
  interface RouteMeta {
    roles?: RoleType[];
    requiresAuth?: boolean;
    hideNavbar?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: {
      hideNavbar: true,
    },
  },
  {
    path: '/unauthorized',
    name: 'Unauthorized',
    component: () => import('../views/UnauthorizedView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/spd/kop-surat',
    alias: '/pengaturan/kop-surat',
    name: 'PengaturanKopSurat',
    component: () => import('../views/PengaturanKopSuratView.vue'),
    meta: {
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN],
    },
  },
  {
    path: '/kepegawaian/asn',
    alias: '/kepegawaian',
    name: 'KepegawaianAsn',
    component: () => import('../views/KepegawaianAsnView.vue'),
    meta: {
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN],
    },
  },
  {
    path: '/pengaturan/pengguna',
    alias: ['/pengaturan/users', '/pengaturan'],
    name: 'PengaturanPengguna',
    component: () => import('../views/PengaturanPenggunaView.vue'),
    meta: {
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN],
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: () => {
      const token = localStorage.getItem('auth_token');
      return token ? '/' : '/login';
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global authentication & RBAC navigation guard
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('auth_token');
  const currentUserRole = (localStorage.getItem('user_role') as RoleType) || Role.USER;

  // 1. If not logged in, redirect any route except /login to /login
  if (!token) {
    if (to.name !== 'Login') {
      return next({
        name: 'Login',
        query: to.path !== '/' ? { redirect: to.fullPath } : undefined,
      });
    }
    return next();
  }

  // 2. If already logged in and navigating to /login, redirect to Home
  if (to.name === 'Login') {
    return next({ name: 'Home' });
  }

  // 3. RBAC role guard for protected routes
  const allowedRoles = to.meta.roles;
  if (allowedRoles && !hasRequiredRole(currentUserRole, allowedRoles)) {
    return next({ name: 'Unauthorized' });
  }

  next();
});

export default router;
