import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { Role, RoleType, hasRequiredRole } from '@si-setda/shared-types';
import { apiFetch } from '../utils/api';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
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
      title: 'Beranda',
      requiresAuth: true,
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: {
      title: 'Masuk',
      hideNavbar: true,
    },
  },
  {
    path: '/unauthorized',
    name: 'Unauthorized',
    component: () => import('../views/UnauthorizedView.vue'),
    meta: {
      title: 'Akses Ditolak',
      requiresAuth: true,
    },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/OnboardingView.vue'),
    meta: {
      title: 'Inisialisasi Sistem',
      requiresAuth: true,
      hideNavbar: true,
      roles: [Role.SUPER_ADMIN],
    },
  },
  {
    path: '/surat-tugas',
    alias: ['/surat-tugas/daftar'],
    name: 'DaftarSuratTugas',
    component: () => import('../views/DaftarSuratTugasView.vue'),
    meta: {
      title: 'Daftar Surat Tugas',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER],
    },
  },
  {
    path: '/surat-tugas/buat',
    name: 'BuatSuratTugas',
    component: () => import('../views/BuatSuratTugasView.vue'),
    meta: {
      title: 'Buat Surat Tugas',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF],
    },
  },
  {
    path: '/surat-tugas/edit/:id',
    name: 'EditSuratTugas',
    component: () => import('../views/BuatSuratTugasView.vue'),
    meta: {
      title: 'Edit Surat Tugas',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF],
    },
  },
  {
    path: '/surat-tugas/cetak/:id',
    alias: ['/surat-tugas/preview/:id', '/surat-tugas/:id'],
    name: 'SuratTugasDetailPrint',
    component: () => import('../views/SuratTugasDetailPrintView.vue'),
    meta: {
      title: 'Pratinjau Surat Tugas',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER],
    },
  },
  {
    path: '/spd',
    alias: ['/spd/daftar', '/spd/riwayat'],
    name: 'DaftarSpd',
    component: () => import('../views/DaftarSpdView.vue'),
    meta: {
      title: 'Daftar Surat Perjalanan Dinas (SPD)',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER],
    },
  },
  {
    path: '/spd/buat',
    name: 'BuatSpd',
    component: () => import('../views/BuatSpdView.vue'),
    meta: {
      title: 'Buat Surat Perjalanan Dinas (SPD)',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF],
    },
  },
  {
    path: '/spd/edit/:id',
    name: 'EditSpd',
    component: () => import('../views/BuatSpdView.vue'),
    meta: {
      title: 'Edit Surat Perjalanan Dinas (SPD)',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF],
    },
  },
  {
    path: '/spd/cetak/:id',
    alias: ['/spd/preview/:id', '/spd/:id'],
    name: 'SpdDetailPrint',
    component: () => import('../views/SpdDetailPrintView.vue'),
    meta: {
      title: 'Pratinjau Surat Perjalanan Dinas (SPD)',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER],
    },
  },
  {
    path: '/laporan',
    alias: ['/laporan/daftar'],
    name: 'DaftarLaporan',
    component: () => import('../views/DaftarLaporanView.vue'),
    meta: {
      title: 'Daftar Laporan Perjalanan Dinas',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER],
    },
  },
  {
    path: '/laporan/buat',
    name: 'BuatLaporan',
    component: () => import('../views/BuatLaporanView.vue'),
    meta: {
      title: 'Buat Laporan Perjalanan Dinas',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF],
    },
  },
  {
    path: '/laporan/edit/:id',
    name: 'EditLaporan',
    component: () => import('../views/BuatLaporanView.vue'),
    meta: {
      title: 'Edit Laporan Perjalanan Dinas',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF],
    },
  },
  {
    path: '/laporan/cetak/:id',
    alias: ['/laporan/preview/:id', '/laporan/:id'],
    name: 'LaporanDetailPrint',
    component: () => import('../views/LaporanDetailPrintView.vue'),
    meta: {
      title: 'Pratinjau Laporan Perjalanan Dinas',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER],
    },
  },
  {
    path: '/arsip',
    name: 'ArsipDokumen',
    component: () => import('../views/ArsipDokumenView.vue'),
    meta: {
      title: 'Arsip Dokumen',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER],
    },
  },
  {
    path: '/arsip/surat-tugas',
    name: 'ArsipSuratTugas',
    component: () => import('../views/ArsipDokumenView.vue'),
    meta: {
      title: 'Arsip Surat Tugas',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER],
    },
  },
  {
    path: '/arsip/spd',
    name: 'ArsipSpd',
    component: () => import('../views/ArsipDokumenView.vue'),
    meta: {
      title: 'Arsip Surat Perjalanan Dinas (SPD)',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER],
    },
  },
  {
    path: '/tanda-tangan/surat-tugas',
    redirect: '/surat-tugas',
  },
  {
    path: '/tanda-tangan/spd',
    redirect: '/spd',
  },
  {
    path: '/tanda-tangan',
    redirect: '/surat-tugas',
  },
  {
    path: '/pengaturan/dasar-hukum',
    name: 'PengaturanDasarHukum',
    component: () => import('../views/PengaturanDasarHukumView.vue'),
    meta: {
      title: 'Pengaturan Dasar Hukum',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN],
    },
  },
  {
    path: '/pengaturan/kop-surat',
    alias: '/spd/kop-surat',
    name: 'PengaturanKopSurat',
    component: () => import('../views/PengaturanKopSuratView.vue'),
    meta: {
      title: 'Pengaturan Kop Surat',
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
      title: 'Data Pegawai (ASN)',
      requiresAuth: true,
      roles: [Role.SUPER_ADMIN, Role.ADMIN],
    },
  },
  {
    path: '/kepegawaian/jabatan',
    name: 'KepegawaianJabatan',
    component: () => import('../views/KepegawaianJabatanView.vue'),
    meta: {
      title: 'Data Master Jabatan',
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
      title: 'Pengaturan Pengguna Sistem',
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
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, left: 0 };
  },
});

// Global authentication & RBAC navigation guard
router.beforeEach(async (to, _from, next) => {
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

  // 2. Onboarding check for SUPER_ADMIN
  if (currentUserRole === Role.SUPER_ADMIN) {
    let onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (onboardingCompleted === null && typeof window !== 'undefined') {
      try {
        const res = await apiFetch('/api/system/status');
        if (res.ok) {
          const status = await res.json();
          onboardingCompleted = status.isOnboardingCompleted ? 'true' : 'false';
          localStorage.setItem('onboarding_completed', onboardingCompleted);
        }
      } catch {
        // Fallback gracefully on network error
      }
    }

    if (onboardingCompleted === 'false') {
      if (to.name !== 'Onboarding') {
        return next({ name: 'Onboarding' });
      }
      return next();
    }

    if (onboardingCompleted === 'true' && to.name === 'Onboarding') {
      return next({ name: 'Home' });
    }
  } else if (to.name === 'Onboarding') {
    return next({ name: 'Home' });
  }

  // 3. If already logged in and navigating to /login, redirect to Home
  if (to.name === 'Login') {
    return next({ name: 'Home' });
  }

  // 4. RBAC role guard for protected routes
  const allowedRoles = to.meta.roles;
  if (allowedRoles && !hasRequiredRole(currentUserRole, allowedRoles)) {
    return next({ name: 'Unauthorized' });
  }

  next();
});

export default router;
