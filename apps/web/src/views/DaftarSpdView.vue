<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import {
  GovButton,
  GovDatePicker,
  GovInputText,
  GovSelect,
  GovTable,
} from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';

export interface SpdItem {
  id: string;
  nomorSpd: string;
  pemberiPerintah: string;
  pegawaiId: string;
  pegawai?: {
    id: string;
    nama: string;
    nip: string;
    pangkat: string;
    golongan: string;
    jabatan: string;
  } | null;
  dalamRangka: string;
  alatAngkut: string;
  tempatBerangkat: string;
  tempatTujuan: string;
  lamaHari: number;
  tanggalBerangkat: string;
  tanggalKembali: string;
  skpd: string;
  kodeRekening?: string | null;
  tingkatBiaya?: string | null;
  pengikut?: string | null;
  keterangan?: string | null;
  kopSuratId?: string | null;
  penandatanganNama?: string | null;
  penandatanganJabatan?: string | null;
  penandatanganPangkat?: string | null;
  penandatanganNip?: string | null;
  suratTugasId?: string | null;
  suratTugas?: {
    id: string;
    nomorSurat?: string;
  } | null;
  status: 'DRAFT' | 'DISETUJUI' | 'SELESAI' | 'BATAL';
  createdAt: string;
  updatedAt: string;
}

const router = useRouter();

const spdList = ref<SpdItem[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const statusFilter = ref('SEMUA');
const dateRange = ref<(Date | null)[] | null>(null);
const toast = useGovToast();

const userRole = localStorage.getItem('user_role') || '';
const isPenandatanganUser = computed(() => {
  return (
    userRole === 'PENANDATANGAN' ||
    localStorage.getItem('user_is_penandatangan') === 'true'
  ) && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN';
});
const loggedInUserName = localStorage.getItem('user_name') || 'Pejabat Penandatangan';

const formatDateParam = (d: Date | null | undefined): string => {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Status options for filtering & updating
const statusOptions = [
  { label: 'Semua Status', value: 'SEMUA' },
  { label: 'Draf (DRAFT)', value: 'DRAFT' },
  { label: 'Disetujui (DISETUJUI)', value: 'DISETUJUI' },
  { label: 'Selesai (SELESAI)', value: 'SELESAI' },
  { label: 'Dibatalkan (BATAL)', value: 'BATAL' },
];

const updateStatusOptions = [
  { label: 'DRAFT (Draf Pengajuan)', value: 'DRAFT' },
  { label: 'DISETUJUI (Disetujui PA/KPA)', value: 'DISETUJUI' },
  { label: 'SELESAI (Perjalanan Selesai)', value: 'SELESAI' },
  { label: 'BATAL (Dibatalkan)', value: 'BATAL' },
];

// Dialog States
const isStatusDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const activeSpd = ref<SpdItem | null>(null);
const newStatus = ref<'DRAFT' | 'DISETUJUI' | 'SELESAI' | 'BATAL'>('DRAFT');
const isSubmitting = ref(false);

// Date formatting
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Status Tag styling
const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'DISETUJUI':
      return 'info';
    case 'SELESAI':
      return 'success';
    case 'BATAL':
      return 'danger';
    case 'DRAFT':
    default:
      return 'warn';
  }
};

// Summary metrics
const totalCount = computed(() => spdList.value.length);
const disetujuiCount = computed(
  () => spdList.value.filter((s) => s.status === 'DISETUJUI').length
);
const draftCount = computed(
  () => spdList.value.filter((s) => s.status === 'DRAFT').length
);
const selesaiCount = computed(
  () => spdList.value.filter((s) => s.status === 'SELESAI').length
);

// Fetch SPD data from API
const loadSpdList = async () => {
  loading.value = true;
  try {
    let url = '/api/spd';
    const params: string[] = [];
    if (searchQuery.value.trim()) {
      params.push(`q=${encodeURIComponent(searchQuery.value.trim())}`);
    }
    if (statusFilter.value && statusFilter.value !== 'SEMUA') {
      params.push(`status=${encodeURIComponent(statusFilter.value)}`);
    }
    if (dateRange.value && dateRange.value[0]) {
      params.push(`startDate=${formatDateParam(dateRange.value[0])}`);
      if (dateRange.value[1]) {
        params.push(`endDate=${formatDateParam(dateRange.value[1])}`);
      }
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    const res = await apiFetch(url);
    if (res.ok) {
      spdList.value = await res.json();
    } else {
      spdList.value = [];
    }
  } catch (err: any) {
    console.error('Error fetching SPD:', err);
    toast.error('Gagal memuat data Surat Perjalanan Dinas');
  } finally {
    loading.value = false;
  }
};

// Actions
const handleSearch = () => {
  loadSpdList();
};

const handleDateChange = () => {
  if (!dateRange.value || (dateRange.value[0] && dateRange.value[1])) {
    loadSpdList();
  }
};

const handleResetFilters = () => {
  searchQuery.value = '';
  statusFilter.value = 'SEMUA';
  dateRange.value = null;
  loadSpdList();
};

const handleViewPrint = (id: string) => {
  router.push(`/spd/cetak/${id}`);
};

const openStatusDialog = (spd: SpdItem) => {
  activeSpd.value = spd;
  newStatus.value = spd.status;
  isStatusDialogOpen.value = true;
};

const handleUpdateStatus = async () => {
  if (!activeSpd.value) return;
  isSubmitting.value = true;
  try {
    const res = await apiFetch(`/api/spd/${activeSpd.value.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus.value }),
    });

    if (res.ok) {
      toast.success(`Status SPD nomor ${activeSpd.value.nomorSpd} berhasil diperbarui menjadi ${newStatus.value}`);
      isStatusDialogOpen.value = false;
      await loadSpdList();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal memperbarui status');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem');
  } finally {
    isSubmitting.value = false;
  }
};

const openDeleteDialog = (spd: SpdItem) => {
  activeSpd.value = spd;
  isDeleteDialogOpen.value = true;
};

const handleDelete = async () => {
  if (!activeSpd.value) return;
  isSubmitting.value = true;
  try {
    const res = await apiFetch(`/api/spd/${activeSpd.value.id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      toast.success(`SPD nomor ${activeSpd.value.nomorSpd} berhasil dihapus`);
      isDeleteDialogOpen.value = false;
      await loadSpdList();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menghapus SPD');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem');
  } finally {
    isSubmitting.value = false;
  }
};

// Sign & Revert for Pejabat Penandatangan
const isSignDialogOpen = ref(false);
const isRevertDialogOpen = ref(false);
const itemToSign = ref<SpdItem | null>(null);
const isSigning = ref(false);

const openSignDialog = (item: SpdItem) => {
  itemToSign.value = item;
  isSignDialogOpen.value = true;
};

const handleSign = async () => {
  if (!itemToSign.value) return;
  isSigning.value = true;
  try {
    const res = await apiFetch(`/api/spd/${itemToSign.value.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DISETUJUI' }),
    });
    if (res.ok) {
      toast.success(
        `Surat Perjalanan Dinas nomor ${itemToSign.value.nomorSpd} berhasil ditandatangani dan disetujui!`,
        'Tanda Tangan Berhasil'
      );
      isSignDialogOpen.value = false;
      itemToSign.value = null;
      await loadSpdList();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menandatangani SPD');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem');
  } finally {
    isSigning.value = false;
  }
};

const openRevertDialog = (item: SpdItem) => {
  itemToSign.value = item;
  isRevertDialogOpen.value = true;
};

const handleRevert = async () => {
  if (!itemToSign.value) return;
  isSigning.value = true;
  try {
    const res = await apiFetch(`/api/spd/${itemToSign.value.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DRAFT' }),
    });
    if (res.ok) {
      toast.warn(
        `Tanda tangan pada SPD nomor ${itemToSign.value.nomorSpd} telah dibatalkan. Status kembali ke Draf.`,
        'Status Dikembalikan'
      );
      isRevertDialogOpen.value = false;
      itemToSign.value = null;
      await loadSpdList();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal membatalkan tanda tangan');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem');
  } finally {
    isSigning.value = false;
  }
};

const handleDownloadPdf = async (item: SpdItem) => {
  try {
    const res = await apiFetch(`/api/spd/${item.id}/pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNum = (item.nomorSpd || 'SPD').replace(/[\/\\]/g, '_');
      a.download = `SPD_${cleanNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Dokumen PDF ${item.nomorSpd} berhasil diunduh`);
    } else {
      toast.error('Gagal mengunduh dokumen PDF resmi');
    }
  } catch (err) {
    console.error('Gagal mengunduh PDF:', err);
    toast.error('Terjadi kesalahan saat mengunduh PDF');
  }
};

// CSV Export Utility
const exportToCsv = () => {
  if (spdList.value.length === 0) return;

  const headers = [
    'No',
    'Nomor SPD',
    'Pemberi Perintah',
    'Nama Pegawai',
    'NIP Pegawai',
    'Pangkat / Golongan',
    'Jabatan',
    'Maksud Perjalanan Dinas',
    'Alat Angkut',
    'Tempat Berangkat',
    'Tempat Tujuan',
    'Lama Hari',
    'Tanggal Berangkat',
    'Tanggal Kembali',
    'SKPD',
    'Kode Rekening',
    'Status',
  ];

  const rows = spdList.value.map((s, index) => [
    index + 1,
    `"${s.nomorSpd}"`,
    `"${s.pemberiPerintah || ''}"`,
    `"${s.pegawai?.nama || ''}"`,
    `'${s.pegawai?.nip || ''}'`,
    `"${s.pegawai?.pangkat || ''} ${s.pegawai?.golongan || ''}"`,
    `"${s.pegawai?.jabatan || ''}"`,
    `"${(s.dalamRangka || '').replace(/"/g, '""')}"`,
    `"${s.alatAngkut || ''}"`,
    `"${s.tempatBerangkat || ''}"`,
    `"${s.tempatTujuan || ''}"`,
    s.lamaHari,
    `"${formatDate(s.tanggalBerangkat)}"`,
    `"${formatDate(s.tanggalKembali)}"`,
    `"${s.skpd || ''}"`,
    `"${s.kodeRekening || ''}"`,
    `"${s.status}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date().toISOString().slice(0, 10);
  a.download = `Rekap_SPD_Banggai_Laut_${now}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Rekap ${spdList.value.length} dokumen SPD berhasil diekspor ke CSV`);
};

onMounted(() => {
  loadSpdList();
});
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header Page -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-medium text-text-muted mb-1">
          <router-link to="/" class="hover:underline">Beranda</router-link>
          <span>/</span>
          <span class="text-text-main font-semibold">Surat Perjalanan Dinas</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text-main">
          Daftar Surat Perjalanan Dinas (SPD)
        </h1>
        <p class="text-sm text-text-muted mt-0.5">
          Manajemen penerbitan, riwayat, status verifikasi, dan pencetakan dokumen resmi SPD.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <GovButton
          label="Ekspor CSV"
          icon="pi pi-file-excel"
          severity="secondary"
          variant="outlined"
          @click="exportToCsv"
          :disabled="spdList.length === 0"
        />
        <GovButton
          v-if="!isPenandatanganUser"
          label="Buat SPD Baru"
          icon="pi pi-plus"
          severity="primary"
          @click="router.push('/spd/buat')"
        />
      </div>
    </div>

    <!-- Banner Scoped Signer -->
    <div
      v-if="isPenandatanganUser"
      class="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl text-sky-900 dark:text-sky-200 shadow-sm"
    >
      <i class="pi pi-shield text-xl text-sky-600 dark:text-sky-400"></i>
      <div>
        <p class="font-semibold text-sm">Mode Akses Pejabat Penandatangan</p>
        <p class="text-xs text-sky-700 dark:text-sky-300">
          Menampilkan daftar Surat Perjalanan Dinas (SPD) yang ditugaskan khusus untuk ditandatangani oleh: <strong>{{ loggedInUserName }}</strong>.
        </p>
      </div>
    </div>

    <!-- Summary Statistics Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div class="text-xs text-text-muted font-medium">Total Dokumen</div>
        <div class="text-2xl font-bold text-text-main mt-1">{{ totalCount }}</div>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div class="text-xs text-blue-600 dark:text-blue-400 font-medium">Disetujui</div>
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{{ disetujuiCount }}</div>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div class="text-xs text-amber-600 dark:text-amber-400 font-medium">Draf</div>
        <div class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ draftCount }}</div>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Selesai</div>
        <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ selesaiCount }}</div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="flex-1 flex flex-wrap items-center gap-2.5">
        <!-- Search Input -->
        <div class="w-full sm:w-64 md:w-56 lg:w-72">
          <GovInputText
            v-model="searchQuery"
            placeholder="Cari Nomor SPD, Pegawai..."
            block
            @keydown.enter="handleSearch"
          />
        </div>

        <!-- Status Filter -->
        <div class="w-full sm:w-36 lg:w-44">
          <GovSelect
            v-model="statusFilter"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            placeholder="Filter Status"
            @change="handleSearch"
          />
        </div>

        <!-- Date Range Filter -->
        <div class="w-full sm:w-48 lg:w-56">
          <GovDatePicker
            v-model="dateRange"
            selection-mode="range"
            placeholder="Rentang Tanggal"
            show-button-bar
            @update:model-value="handleDateChange"
          />
        </div>

        <GovButton
          label="Cari"
          icon="pi pi-search"
          severity="primary"
          @click="handleSearch"
        />

        <GovButton
          v-if="searchQuery || statusFilter !== 'SEMUA' || (dateRange && dateRange[0])"
          label="Reset"
          icon="pi pi-filter-slash"
          severity="secondary"
          variant="outlined"
          @click="handleResetFilters"
        />
      </div>

      <div class="text-xs text-text-muted flex-shrink-0 self-end md:self-center">
        Menampilkan <strong class="text-text-main font-semibold">{{ spdList.length }}</strong> data
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      <GovTable
        :value="spdList"
        :loading="loading"
        :paginator="true"
        :rows="10"
        data-key="id"
      >
        <template #empty>
          <div class="text-center py-12 text-text-muted">
            <i class="pi pi-folder-open text-4xl mb-3 block text-slate-400"></i>
            <p class="font-medium">Tidak ada data Surat Perjalanan Dinas yang ditemukan</p>
            <p class="text-xs text-text-muted mt-1">Coba gunakan kata kunci pencarian lain atau buat SPD baru.</p>
          </div>
        </template>

        <!-- Kolom Nomor SPD -->
        <Column field="nomorSpd" header="Nomor SPD" style="width: 180px;">
          <template #body="{ data }">
            <button
              class="font-mono font-bold text-primary hover:underline text-left"
              @click="handleViewPrint(data.id)"
              title="Klik untuk pratinjau & cetak"
            >
              {{ data.nomorSpd }}
            </button>
            <div class="text-[11px] text-text-muted mt-0.5">
              {{ formatDate(data.createdAt) }}
            </div>
          </template>
        </Column>

        <!-- Kolom Pegawai Pelaksana -->
        <Column header="Pegawai Pelaksana" style="min-width: 220px;">
          <template #body="{ data }">
            <div class="font-semibold text-text-main text-sm">
              {{ data.pegawai?.nama || '-' }}
            </div>
            <div class="text-xs text-text-muted">
              NIP: {{ data.pegawai?.nip || '-' }}
            </div>
            <div class="text-[11px] text-text-muted">
              {{ data.pegawai?.jabatan || '-' }} ({{ data.pegawai?.golongan || '' }})
            </div>
          </template>
        </Column>

        <!-- Kolom Maksud Perjalanan Dinas -->
        <Column field="dalamRangka" header="Maksud Perjalanan Dinas" style="min-width: 240px;">
          <template #body="{ data }">
            <p class="text-xs text-text-main line-clamp-2 leading-relaxed" :title="data.dalamRangka">
              {{ data.dalamRangka }}
            </p>
          </template>
        </Column>

        <!-- Kolom Tujuan & Jadwal -->
        <Column header="Tujuan & Waktu" style="width: 170px;">
          <template #body="{ data }">
            <div class="font-medium text-text-main text-xs flex items-center gap-1.5">
              <i class="pi pi-map-marker text-red-500 text-[10px]"></i>
              <span>{{ data.tempatTujuan }}</span>
            </div>
            <div class="text-[11px] text-text-muted mt-0.5">
              {{ data.lamaHari }} Hari &bull; {{ formatDate(data.tanggalBerangkat) }}
            </div>
          </template>
        </Column>

        <!-- Kolom Status -->
        <Column field="status" header="Status" style="width: 120px;">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <!-- Kolom Aksi -->
        <Column header="Aksi" style="min-width: 190px;" align-frozen="right">
          <template #body="{ data }">
            <div class="flex items-center gap-1">
              <!-- AKSI TANDATANGANI (Khusus Pejabat Penandatangan) -->
              <GovButton
                v-if="isPenandatanganUser && data.status === 'DRAFT'"
                label="Tandatangani"
                icon="pi pi-check-circle"
                size="small"
                severity="success"
                @click="openSignDialog(data)"
                title="Tandatangani SPD Resmi ini"
              />
              <GovButton
                v-else-if="isPenandatanganUser && data.status === 'DISETUJUI'"
                label="Batal TTD"
                icon="pi pi-undo"
                size="small"
                severity="warn"
                variant="outlined"
                @click="openRevertDialog(data)"
                title="Batalkan Tanda Tangan (Kembalikan ke Draf)"
              />

              <!-- Cetak / Pratinjau -->
              <GovButton
                icon="pi pi-print"
                size="small"
                severity="primary"
                variant="text"
                rounded
                @click="handleViewPrint(data.id)"
                title="Lihat & Cetak Dokumen"
              />

              <!-- Unduh PDF Resmi (Kop Surat Asli) -->
              <GovButton
                icon="pi pi-file-pdf"
                size="small"
                severity="danger"
                variant="text"
                rounded
                @click="handleDownloadPdf(data)"
                title="Unduh Berkas PDF Resmi (Kop Asli)"
              />

              <!-- Edit Dokumen SPD (Non-penandatangan) -->
              <GovButton
                v-if="!isPenandatanganUser"
                icon="pi pi-pencil"
                size="small"
                severity="info"
                variant="text"
                rounded
                @click="router.push(`/spd/edit/${data.id}`)"
                title="Edit / Ubah Data SPD"
              />

              <!-- Ubah Status (Non-penandatangan) -->
              <GovButton
                v-if="!isPenandatanganUser"
                icon="pi pi-sync"
                size="small"
                severity="secondary"
                variant="text"
                rounded
                @click="openStatusDialog(data)"
                title="Perbarui Status"
              />

              <!-- Hapus (Non-penandatangan) -->
              <GovButton
                v-if="!isPenandatanganUser"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                variant="text"
                rounded
                @click="openDeleteDialog(data)"
                title="Hapus Dokumen"
              />
            </div>
          </template>
        </Column>
      </GovTable>
    </div>

    <!-- DIALOG UBAH STATUS -->
    <Dialog
      v-model:visible="isStatusDialogOpen"
      header="Perbarui Status Surat Perjalanan Dinas"
      :modal="true"
      class="max-w-md w-full"
    >
      <div v-if="activeSpd" class="space-y-4 pt-2">
        <div class="p-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-xs space-y-1">
          <div class="font-bold text-text-main font-mono">{{ activeSpd.nomorSpd }}</div>
          <div class="text-text-muted">{{ activeSpd.pegawai?.nama }} &bull; {{ activeSpd.tempatTujuan }}</div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-text-main">
            Pilih Status Baru
          </label>
          <GovSelect
            v-model="newStatus"
            :options="updateStatusOptions"
            option-label="label"
            option-value="value"
            block
          />
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            @click="isStatusDialogOpen = false"
          />
          <GovButton
            label="Simpan Perubahan"
            severity="primary"
            :loading="isSubmitting"
            @click="handleUpdateStatus"
          />
        </div>
      </div>
    </Dialog>

    <!-- DIALOG HAPUS SPD -->
    <Dialog
      v-model:visible="isDeleteDialogOpen"
      header="Konfirmasi Hapus Surat Perjalanan Dinas"
      :modal="true"
      class="max-w-md w-full"
    >
      <div v-if="activeSpd" class="space-y-4 pt-2">
        <div class="flex items-start gap-3">
          <i class="pi pi-exclamation-triangle text-amber-500 text-2xl mt-0.5"></i>
          <div>
            <p class="text-sm font-semibold text-text-main">
              Apakah Anda yakin ingin menghapus data SPD ini?
            </p>
            <p class="text-xs text-text-muted mt-1">
              Nomor: <strong class="font-mono text-text-main">{{ activeSpd.nomorSpd }}</strong>
            </p>
            <p class="text-xs text-text-muted">
              Pelaksana: {{ activeSpd.pegawai?.nama }}
            </p>
            <p class="text-xs text-red-500 font-medium mt-2">
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            @click="isDeleteDialogOpen = false"
          />
          <GovButton
            label="Ya, Hapus"
            severity="danger"
            :loading="isSubmitting"
            @click="handleDelete"
          />
        </div>
      </div>
    </Dialog>

    <!-- DIALOG KONFIRMASI TANDA TANGAN (PEJABAT PENANDATANGAN) -->
    <Dialog
      v-model:visible="isSignDialogOpen"
      header="Konfirmasi Tanda Tangan SPD"
      :modal="true"
      class="max-w-md w-full"
    >
      <div v-if="itemToSign" class="space-y-4 pt-2">
        <div class="p-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-lg text-xs space-y-1">
          <div class="font-bold text-text-main font-mono">{{ itemToSign.nomorSpd }}</div>
          <div class="text-text-muted">Pelaksana: <strong>{{ itemToSign.pegawai?.nama }}</strong></div>
          <div class="text-text-muted">Tujuan: {{ itemToSign.tempatTujuan }} ({{ itemToSign.lamaHari }} Hari)</div>
          <div class="text-text-muted mt-1 font-semibold text-primary">Penandatangan: {{ loggedInUserName }}</div>
        </div>
        <p class="text-xs text-text-muted">
          Apakah Anda yakin ingin menandatangani dan menyetujui Surat Perjalanan Dinas ini secara resmi?
        </p>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2 pt-2">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="isSignDialogOpen = false"
            :disabled="isSigning"
          />
          <GovButton
            label="Tandatangani & Sahkan"
            icon="pi pi-check-circle"
            severity="success"
            size="small"
            :loading="isSigning"
            @click="handleSign"
          />
        </div>
      </template>
    </Dialog>

    <!-- DIALOG BATAL TANDA TANGAN (PEJABAT PENANDATANGAN) -->
    <Dialog
      v-model:visible="isRevertDialogOpen"
      header="Batalkan Tanda Tangan SPD"
      :modal="true"
      class="max-w-md w-full"
    >
      <div v-if="itemToSign" class="space-y-3 pt-2">
        <div class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1">
          <div class="font-bold text-amber-900 dark:text-amber-200 font-mono">{{ itemToSign.nomorSpd }}</div>
          <div class="text-amber-800 dark:text-amber-300">Pelaksana: {{ itemToSign.pegawai?.nama }}</div>
        </div>
        <p class="text-xs text-text-muted">
          Tanda tangan pada dokumen SPD ini akan dibatalkan dan statusnya dikembalikan ke <strong>Draf</strong>.
        </p>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2 pt-2">
          <GovButton
            label="Tutup"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="isRevertDialogOpen = false"
            :disabled="isSigning"
          />
          <GovButton
            label="Ya, Batalkan Tanda Tangan"
            icon="pi pi-undo"
            severity="warn"
            size="small"
            :loading="isSigning"
            @click="handleRevert"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
