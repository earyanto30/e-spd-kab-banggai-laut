<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import {
  GovButton,
  GovCard,
  GovInputText,
  GovPassword,
  GovCheckbox,
  GovMessage,
  GovTable,
} from '../components/core';
import { Role, RoleType } from '@si-setda/shared-types';

export interface LinkedPegawai {
  id: string;
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  unitKerja: string;
}

export interface UserItem {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: RoleType;
  isActive: boolean;
  pegawaiId?: string | null;
  createdAt: string;
  updatedAt: string;
  pegawai?: LinkedPegawai | null;
}

export interface PegawaiOption {
  id: string;
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  unitKerja: string;
  status: string;
}

const list = ref<UserItem[]>([]);
const pegawaiOptions = ref<PegawaiOption[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const roleFilter = ref<string>('SEMUA');
const statusFilter = ref<string>('SEMUA');

const isFormDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const isEditing = ref(false);
const selectedUser = ref<UserItem | null>(null);
const alertMessage = ref<string | null>(null);
const alertSeverity = ref<'success' | 'error' | 'warn'>('success');

const currentLoggedInUsername = localStorage.getItem('username') || '';

// Form state
const form = ref<{
  id?: string;
  pegawaiId: string;
  username: string;
  name: string;
  email: string;
  role: RoleType;
  password: string;
  isActive: boolean;
}>({
  pegawaiId: '',
  username: '',
  name: '',
  email: '',
  role: Role.USER,
  password: '',
  isActive: true,
});

const showAlert = (message: string, severity: 'success' | 'error' | 'warn' = 'success') => {
  alertMessage.value = message;
  alertSeverity.value = severity;
  setTimeout(() => {
    alertMessage.value = null;
  }, 4000);
};

const loadUsers = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (searchQuery.value.trim()) params.append('q', searchQuery.value.trim());
    if (roleFilter.value !== 'SEMUA') params.append('role', roleFilter.value);
    if (statusFilter.value !== 'SEMUA') params.append('isActive', statusFilter.value);

    const res = await fetch(`/api/users?${params.toString()}`);
    if (res.ok) {
      list.value = await res.json();
    } else {
      showAlert('Gagal memuat data pengguna dari server', 'error');
    }
  } catch {
    showAlert('Koneksi ke backend API terputus', 'error');
  } finally {
    loading.value = false;
  }
};

const loadPegawaiOptions = async (userId?: string) => {
  try {
    const url = userId
      ? `/api/users/pegawai-options?userId=${encodeURIComponent(userId)}`
      : '/api/users/pegawai-options';
    const res = await fetch(url);
    if (res.ok) {
      pegawaiOptions.value = await res.json();
    }
  } catch {
    pegawaiOptions.value = [];
  }
};

const onPegawaiSelected = () => {
  if (!form.value.pegawaiId) return;
  const found = pegawaiOptions.value.find((p) => p.id === form.value.pegawaiId);
  if (found) {
    if (!isEditing.value || !form.value.username) {
      form.value.username = found.nip.replace(/\s+/g, '');
    }
    if (!isEditing.value || !form.value.name) {
      form.value.name = found.nama;
    }
    if (!form.value.email && (found as any).email) {
      form.value.email = (found as any).email;
    }
  }
};

const filteredList = computed(() => {
  return list.value.filter((user) => {
    const matchesRole = roleFilter.value === 'SEMUA' || user.role === roleFilter.value;
    const matchesStatus =
      statusFilter.value === 'SEMUA' ||
      (statusFilter.value === 'aktif' && user.isActive) ||
      (statusFilter.value === 'nonaktif' && !user.isActive);

    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return matchesRole && matchesStatus;

    const matchesQuery =
      user.name.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      (user.email && user.email.toLowerCase().includes(q)) ||
      (user.pegawai && user.pegawai.nama.toLowerCase().includes(q)) ||
      (user.pegawai && user.pegawai.nip.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')));

    return matchesRole && matchesStatus && matchesQuery;
  });
});

const totalUsers = computed(() => list.value.length);
const totalSuperAdmin = computed(() => list.value.filter((u) => u.role === Role.SUPER_ADMIN).length);
const totalAdmin = computed(() => list.value.filter((u) => u.role === Role.ADMIN).length);
const totalLinkedAsn = computed(() => list.value.filter((u) => !!u.pegawaiId).length);

const openCreateDialog = async () => {
  isEditing.value = false;
  selectedUser.value = null;
  form.value = {
    pegawaiId: '',
    username: '',
    name: '',
    email: '',
    role: Role.STAFF,
    password: '',
    isActive: true,
  };
  await loadPegawaiOptions();
  isFormDialogOpen.value = true;
};

const openEditDialog = async (item: UserItem) => {
  isEditing.value = true;
  selectedUser.value = item;
  form.value = {
    id: item.id,
    pegawaiId: item.pegawaiId || '',
    username: item.username,
    name: item.name,
    email: item.email || '',
    role: item.role,
    password: '',
    isActive: item.isActive,
  };
  await loadPegawaiOptions(item.id);
  isFormDialogOpen.value = true;
};

const handleSave = async () => {
  if (!form.value.username.trim() || !form.value.name.trim()) {
    showAlert('Username/NIP dan Nama Lengkap wajib diisi.', 'warn');
    return;
  }

  if (!isEditing.value && (!form.value.password || form.value.password.length < 6)) {
    showAlert('Kata sandi awal wajib diisi minimal 6 karakter untuk pengguna baru.', 'warn');
    return;
  }

  try {
    const payload: any = {
      username: form.value.username.trim(),
      name: form.value.name.trim(),
      email: form.value.email.trim() || null,
      role: form.value.role,
      isActive: form.value.isActive,
      pegawaiId: form.value.pegawaiId || null,
    };

    if (form.value.password && form.value.password.trim().length >= 6) {
      payload.password = form.value.password.trim();
    }

    if (isEditing.value && form.value.id) {
      const res = await fetch(`/api/users/${form.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Gagal memperbarui pengguna' }));
        showAlert(err.message || 'Gagal memperbarui pengguna', 'error');
        return;
      }

      showAlert('Data pengguna login berhasil diperbarui');
    } else {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Gagal membuat pengguna baru' }));
        showAlert(err.message || 'Gagal membuat pengguna baru', 'error');
        return;
      }

      showAlert('Akun login pengguna berhasil ditambahkan');
    }

    isFormDialogOpen.value = false;
    await loadUsers();
  } catch (e: any) {
    showAlert('Terjadi kesalahan saat memproses data pengguna', 'error');
  }
};

const handleToggleStatus = async (item: UserItem) => {
  try {
    const res = await fetch(`/api/users/${item.id}/toggle-status`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Gagal mengubah status akun' }));
      showAlert(err.message || 'Gagal mengubah status akun', 'error');
      return;
    }

    showAlert(`Status akun '${item.username}' berhasil diperbarui`);
    await loadUsers();
  } catch {
    showAlert('Gagal mengubah status akun pengguna', 'error');
  }
};

const openDeleteConfirm = (item: UserItem) => {
  selectedUser.value = item;
  isDeleteDialogOpen.value = true;
};

const handleDelete = async () => {
  if (!selectedUser.value) return;

  try {
    const res = await fetch(`/api/users/${selectedUser.value.id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Gagal menghapus pengguna' }));
      showAlert(err.message || 'Gagal menghapus pengguna', 'error');
      return;
    }

    showAlert(`Akun login '${selectedUser.value.name}' berhasil dihapus`);
    isDeleteDialogOpen.value = false;
    selectedUser.value = null;
    await loadUsers();
  } catch {
    showAlert('Gagal menghapus pengguna', 'error');
  }
};

const getRoleBadgeSeverity = (role: RoleType | string) => {
  switch (role) {
    case Role.SUPER_ADMIN:
      return 'danger';
    case Role.ADMIN:
      return 'info';
    case Role.STAFF:
      return 'warn';
    default:
      return 'secondary';
  }
};

onMounted(async () => {
  await loadUsers();
  await loadPegawaiOptions();
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Page -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <router-link to="/" class="text-xs text-slate-400 hover:text-blue-900 dark:hover:text-amber-400">
            Beranda
          </router-link>
          <span class="text-xs text-slate-300">/</span>
          <span class="text-xs text-slate-500">Pengaturan Sistem</span>
          <span class="text-xs text-slate-300">/</span>
          <span class="text-xs font-semibold text-blue-900 dark:text-amber-400">Pengguna Sistem</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight mt-1">
          Pengaturan Pengguna Sistem (Login User)
        </h1>
        <p class="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
          Kelola otorisasi akses pengguna, keterhubungan akun ke ASN, dan peranan sistem (RBAC).
        </p>
      </div>

      <div class="flex items-center gap-3">
        <GovButton
          label="Segarkan"
          icon="pi pi-refresh"
          severity="secondary"
          @click="loadUsers"
        />
        <GovButton
          label="Tambah Pengguna"
          icon="pi pi-user-plus"
          severity="primary"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Alert Message Component -->
    <GovMessage
      v-if="alertMessage"
      :severity="alertSeverity"
    >
      {{ alertMessage }}
    </GovMessage>

    <!-- Summary KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <GovCard>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Total Akun Login
              </div>
              <div class="text-2xl font-bold text-slate-800 dark:text-zinc-100 mt-1">
                {{ totalUsers }}
              </div>
            </div>
            <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-zinc-800 text-blue-900 dark:text-amber-400 flex items-center justify-center">
              <i class="pi pi-users text-lg"></i>
            </div>
          </div>
        </template>
      </GovCard>

      <GovCard>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Super Admin
              </div>
              <div class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {{ totalSuperAdmin }}
              </div>
            </div>
            <div class="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
              <i class="pi pi-shield text-lg"></i>
            </div>
          </div>
        </template>
      </GovCard>

      <GovCard>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Admin Sistem
              </div>
              <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {{ totalAdmin }}
              </div>
            </div>
            <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <i class="pi pi-cog text-lg"></i>
            </div>
          </div>
        </template>
      </GovCard>

      <GovCard>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Taut Akun Pegawai ASN
              </div>
              <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {{ totalLinkedAsn }}
              </div>
            </div>
            <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <i class="pi pi-id-card text-lg"></i>
            </div>
          </div>
        </template>
      </GovCard>
    </div>

    <!-- Main Content Table Card -->
    <GovCard>
      <template #content>
        <!-- Filter Toolbar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-zinc-800">
          <div class="flex-1 max-w-md">
            <GovInputText
              v-model="searchQuery"
              placeholder="Cari berdasarkan nama, username / NIP..."
              icon="pi pi-search"
              block
            />
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Filter Role -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-slate-600 dark:text-zinc-400">Peran:</span>
              <select
                v-model="roleFilter"
                class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="SEMUA">Semua Peran</option>
                <option :value="Role.SUPER_ADMIN">SUPER_ADMIN</option>
                <option :value="Role.ADMIN">ADMIN</option>
                <option :value="Role.STAFF">STAFF</option>
                <option :value="Role.USER">USER</option>
              </select>
            </div>

            <!-- Filter Status -->
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-slate-600 dark:text-zinc-400">Status:</span>
              <select
                v-model="statusFilter"
                class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        <!-- DataTable Component -->
        <GovTable
          :value="filteredList"
          :paginator="true"
          :rows="10"
          :rows-per-page-options="[10, 20, 50]"
          responsive-layout="scroll"
        >
          <!-- Column: No -->
          <Column header="No" class="w-12 text-center">
            <template #body="{ index }">
              <span class="text-xs text-slate-400 font-mono">{{ index + 1 }}</span>
            </template>
          </Column>

          <!-- Column: Profil & Akun -->
          <Column field="name" header="Nama & Username / NIP" class="min-w-64">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-blue-900 text-amber-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {{ data.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="text-sm font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                    <span>{{ data.name }}</span>
                    <span
                      v-if="data.username === currentLoggedInUsername"
                      class="text-xs font-normal text-blue-600 bg-blue-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded"
                    >
                      (Akun Anda)
                    </span>
                  </div>
                  <div class="text-xs font-mono text-slate-500 dark:text-zinc-400">
                    ID/NIP: <span class="font-medium text-slate-700 dark:text-zinc-300">{{ data.username }}</span>
                  </div>
                  <div v-if="data.email" class="text-xs text-slate-400">
                    {{ data.email }}
                  </div>
                </div>
              </div>
            </template>
          </Column>

          <!-- Column: Tautan ASN Pegawai -->
          <Column header="Tautan ASN Pegawai" class="min-w-56">
            <template #body="{ data }">
              <div v-if="data.pegawai" class="space-y-0.5">
                <div class="text-xs font-medium text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <i class="pi pi-id-card text-blue-900 dark:text-amber-400 text-xs"></i>
                  <span>{{ data.pegawai.nama }}</span>
                </div>
                <div class="text-xs text-slate-500 dark:text-zinc-400">
                  {{ data.pegawai.jabatan }}
                </div>
                <div class="text-xs text-slate-400">
                  {{ data.pegawai.unitKerja }}
                </div>
              </div>
              <div v-else>
                <Tag
                  value="Non-ASN / Belum Ditautkan"
                  severity="secondary"
                  class="text-xs"
                />
              </div>
            </template>
          </Column>

          <!-- Column: Peran (RBAC) -->
          <Column field="role" header="Peran Otorisasi" class="w-36 text-center">
            <template #body="{ data }">
              <Tag
                :value="data.role"
                :severity="getRoleBadgeSeverity(data.role)"
              />
            </template>
          </Column>

          <!-- Column: Status Aktif -->
          <Column field="isActive" header="Status Akun" class="w-32 text-center">
            <template #body="{ data }">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                :class="data.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="data.isActive ? 'bg-emerald-500' : 'bg-red-500'"></span>
                {{ data.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </template>
          </Column>

          <!-- Column: Aksi -->
          <Column header="Aksi" body-class="text-right" class="w-40">
            <template #body="{ data }">
              <div class="flex items-center justify-end gap-1.5">
                <!-- Toggle Status Button -->
                <GovButton
                  :icon="data.isActive ? 'pi pi-ban' : 'pi pi-check-circle'"
                  :severity="data.isActive ? 'secondary' : 'primary'"
                  :title="data.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'"
                  :disabled="data.username === '198801152010011002' && data.isActive"
                  @click="handleToggleStatus(data)"
                />

                <!-- Edit Button -->
                <GovButton
                  icon="pi pi-pencil"
                  severity="secondary"
                  title="Ubah Pengguna"
                  @click="openEditDialog(data)"
                />

                <!-- Delete Button -->
                <GovButton
                  icon="pi pi-trash"
                  severity="danger"
                  title="Hapus Pengguna"
                  :disabled="data.username === '198801152010011002' || data.username === currentLoggedInUsername"
                  @click="openDeleteConfirm(data)"
                />
              </div>
            </template>
          </Column>
        </GovTable>
      </template>
    </GovCard>

    <!-- Create / Edit Dialog Modal -->
    <Dialog
      v-model:visible="isFormDialogOpen"
      :modal="true"
      :header="isEditing ? 'Ubah Pengguna Sistem' : 'Tambah Pengguna Sistem Baru'"
      class="w-full max-w-xl"
    >
      <form class="space-y-4 pt-2" @submit.prevent="handleSave">
        <!-- Opsi Tautkan ASN -->
        <div class="space-y-1">
          <label for="userPegawai" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            Tautkan ke Pegawai ASN (Opsional)
          </label>
          <select
            id="userPegawai"
            v-model="form.pegawaiId"
            class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-900"
            @change="onPegawaiSelected"
          >
            <option value="">-- Tidak Ditautkan (Akun Sistem Bebas) --</option>
            <option
              v-for="pegawai in pegawaiOptions"
              :key="pegawai.id"
              :value="pegawai.id"
            >
              {{ pegawai.nama }} (NIP: {{ pegawai.nip }}) - {{ pegawai.jabatan }}
            </option>
          </select>
          <p class="text-xs text-slate-400">
            Memilih ASN akan otomatis mengisikan NIP sebagai username login dan nama pegawai.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="usernameInput" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Username / NIP Login <span class="text-red-500">*</span>
            </label>
            <GovInputText
              id="usernameInput"
              v-model="form.username"
              placeholder="cth. 198801152010011002"
              block
              required
            />
          </div>

          <div class="space-y-1">
            <label for="nameInput" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Nama Lengkap Pengguna <span class="text-red-500">*</span>
            </label>
            <GovInputText
              id="nameInput"
              v-model="form.name"
              placeholder="cth. Fadli A. Arsad"
              block
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="emailInput" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Email Kedinasan (Opsional)
            </label>
            <GovInputText
              id="emailInput"
              v-model="form.email"
              type="email"
              placeholder="cth. user@setda.go.id"
              block
            />
          </div>

          <div class="space-y-1">
            <label for="roleInput" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Peran Otorisasi (RBAC) <span class="text-red-500">*</span>
            </label>
            <select
              id="roleInput"
              v-model="form.role"
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-900"
              required
            >
              <option :value="Role.SUPER_ADMIN">SUPER_ADMIN (Akses Penuh Seluruh Sistem)</option>
              <option :value="Role.ADMIN">ADMIN (Pengelola SPD & ASN)</option>
              <option :value="Role.STAFF">STAFF (Operator Pembuatan Surat)</option>
              <option :value="Role.USER">USER (Pengguna Biasa / Lihat Agenda)</option>
            </select>
          </div>
        </div>

        <!-- Password input -->
        <div class="space-y-1">
          <label for="passwordInput" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            {{ isEditing ? 'Ubah Kata Sandi (Kosongkan jika tidak diubah)' : 'Kata Sandi Awal' }}
            <span v-if="!isEditing" class="text-red-500">*</span>
          </label>
          <GovPassword
            id="passwordInput"
            v-model="form.password"
            :placeholder="isEditing ? 'Masukkan kata sandi baru (minimal 6 karakter)' : 'Minimal 6 karakter'"
            block
            :feedback="false"
            :toggle-mask="true"
            :required="!isEditing"
          />
        </div>

        <!-- Status Aktif Checkbox -->
        <div class="pt-1">
          <GovCheckbox
            id="isActiveCheckbox"
            v-model="form.isActive"
            label="Akun Aktif (Dapat digunakan untuk masuk ke dalam sistem)"
          />
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <GovButton
            label="Batal"
            severity="secondary"
            type="button"
            @click="isFormDialogOpen = false"
          />
          <GovButton
            :label="isEditing ? 'Simpan Perubahan' : 'Buat Pengguna'"
            icon="pi pi-check"
            severity="primary"
            type="submit"
          />
        </div>
      </form>
    </Dialog>

    <!-- Delete Confirmation Modal -->
    <Dialog
      v-model:visible="isDeleteDialogOpen"
      :modal="true"
      header="Konfirmasi Hapus Pengguna"
      class="w-full max-w-md"
    >
      <div class="space-y-4 pt-1">
        <p class="text-xs text-slate-600 dark:text-zinc-300">
          Apakah Anda yakin ingin menghapus akun pengguna
          <strong class="text-slate-800 dark:text-zinc-100">{{ selectedUser?.name }}</strong>
          (Username: <code class="font-mono text-red-600">{{ selectedUser?.username }}</code>)?
        </p>
        <p class="text-xs text-slate-400">
          Tindakan ini tidak dapat dibatalkan. Data riwayat dokumen yang sudah dibuat akan tetap tersimpan.
        </p>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <GovButton
            label="Batal"
            severity="secondary"
            type="button"
            @click="isDeleteDialogOpen = false"
          />
          <GovButton
            label="Hapus Pengguna"
            icon="pi pi-trash"
            severity="danger"
            type="button"
            @click="handleDelete"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
