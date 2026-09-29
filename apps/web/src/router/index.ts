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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// RBAC navigation guard
router.beforeEach((to, _from, next) => {
  const currentUserRole = (localStorage.getItem('user_role') as RoleType) || Role.USER;
  const requiresAuth = to.meta.requiresAuth;
  const allowedRoles = to.meta.roles;

  if (requiresAuth && allowedRoles && !hasRequiredRole(currentUserRole, allowedRoles)) {
    return next({ name: 'Unauthorized' });
  }

  next();
});

export default router;
