<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import {
  GovButton,
  GovInputText,
  GovSelect,
  GovTable,
  GovTextarea,
  GovDatePicker,
  GovCard,
} from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';

export interface LaporanItem {
  id: string; // spd id
  nomorSpd: string;
  pemberiPerintah: string;
  pegawai?: {
    nama: string;
    nip: string;
    jabatan: string;
    pangkat?: string;
    golongan?: string;
  } | null;
  suratTugas?: {
    id: string;
    nomorSurat: string;
    tanggalSurat?: string;
  } | null;
  dalamRangka: string;
  tempatBerangkat?: string;
  tempatTujuan?: string;
  lamaHari?: number | null;
  tanggalBerangkat?: string;
  tanggalKembali?: string;
  status: string;
  laporan?: {
    id: string;
    hasilPerjalanan: string;
    penandatangan: string;
    tanggalLaporan: string;
  } | null;
}

const router = useRouter();
const toast = useGovToast();

const userRole = localStorage.getItem('user_role') || 'USER';
const canCreate = computed(() => ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole));
const canDelete = computed(() => ['SUPER_ADMIN', 'ADMIN'].includes(userRole));

const rawList = ref<LaporanItem[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const filterStatusLaporan = ref<'ALL' | 'SUDAH' | 'BELUM'>('ALL');
const filterPejabat = ref<string>('ALL');
const dateRange = ref<(Date | null)[] | null>(null);

const statusOptions = [
  { label: 'Semua Status Laporan', value: 'ALL' },
  { label: 'Sudah Dibuat', value: 'SUDAH' },
  { label: 'Belum Dibuat', value: 'BELUM' },
];

const pejabatOptions = [
  { label: 'Semua Pejabat Tujuan', value: 'ALL' },
  { label: 'Bupati', value: 'Bupati' },
  { label: 'Wakil Bupati', value: 'Wakil Bupati' },
  { label: 'Kepala Bagian', value: 'Kepala Bagian' },
  { label: 'Sekertaris Daerah', value: 'Sekertaris Daerah' },
];

const penandatanganFormOptions = [
  { label: 'Bupati (Bupati Banggai Laut)', value: 'Bupati' },
  { label: 'Wakil Bupati (Wakil Bupati Banggai Laut)', value: 'Wakil Bupati' },
  { label: 'Kepala Bagian (Kepala Bagian Umum Setda)', value: 'Kepala Bagian' },
  { label: 'Sekertaris Daerah (Sekretaris Daerah Kab. Banggai Laut)', value: 'Sekertaris Daerah' },
];

// Stats computed
const totalSelesai = computed(() => rawList.value.filter((i) => !!i.laporan).length);
const totalMenunggu = computed(() => rawList.value.filter((i) => i.status === 'DISETUJUI' && !i.laporan && !!i.lamaHari).length);
const totalSpdDisetujui = computed(() => rawList.value.filter((i) => i.status === 'DISETUJUI').length);

const filteredList = computed(() => {
  return rawList.value.filter((item) => {
    // Only show approved SPDs that have duration, or items that already have laporan
    const isEligible = (item.status === 'DISETUJUI' && !!item.lamaHari) || !!item.laporan;
    if (!isEligible) return false;

    // Filter Status Laporan
    if (filterStatusLaporan.value === 'SUDAH' && !item.laporan) return false;
    if (filterStatusLaporan.value === 'BELUM' && !!item.laporan) return false;

    // Filter Pejabat
    if (filterPejabat.value !== 'ALL') {
      if (item.laporan?.penandatangan !== filterPejabat.value) return false;
    }

    // Filter Rentang Tanggal (berdasarkan tanggal laporan atau tanggal berangkat SPD)
    if (dateRange.value && dateRange.value[0]) {
      const targetDateStr = item.laporan?.tanggalLaporan || item.tanggalBerangkat;
      if (!targetDateStr) return false;
      const targetDate = new Date(targetDateStr);
      targetDate.setHours(0, 0, 0, 0);

      const start = new Date(dateRange.value[0]);
      start.setHours(0, 0, 0, 0);
      if (targetDate < start) return false;

      if (dateRange.value[1]) {
        const end = new Date(dateRange.value[1]);
        end.setHours(23, 59, 59, 999);
        if (targetDate > end) return false;
      }
    }

    // Keyword Search
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const numMatch = (item.nomorSpd || '').toLowerCase().includes(q);
      const stMatch = (item.suratTugas?.nomorSurat || '').toLowerCase().includes(q);
      const pegMatch = (item.pegawai?.nama || '').toLowerCase().includes(q) || (item.pegawai?.nip || '').includes(q);
      const purposeMatch = (item.dalamRangka || '').toLowerCase().includes(q);
      const destMatch = (item.tempatTujuan || '').toLowerCase().includes(q);
      const officialMatch = (item.laporan?.penandatangan || '').toLowerCase().includes(q);
      return numMatch || stMatch || pegMatch || purposeMatch || destMatch || officialMatch;
    }

    return true;
  });
});

const handleSearch = () => {
  // filteredList is reactive, but explicit search trigger supports keyboard Enter and Cari button
};

const handleDateChange = () => {
  // Triggers reactivity
};

const handleResetFilters = () => {
  searchQuery.value = '';
  filterStatusLaporan.value = 'ALL';
  filterPejabat.value = 'ALL';
  dateRange.value = null;
};

const fetchList = async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/api/spd');
    if (res.ok) {
      const data = await res.json();
      rawList.value = data;
    } else {
      toast.error('Gagal memuat daftar laporan perjalanan');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat memuat data');
  } finally {
    loading.value = false;
  }
};

// Modal Editor State
const showModal = ref(false);
const activeItem = ref<LaporanItem | null>(null);
const showDeleteModal = ref(false);
const itemToDelete = ref<LaporanItem | null>(null);
const isDeleting = ref(false);

const openDeleteConfirm = (item: LaporanItem) => {
  itemToDelete.value = item;
  showDeleteModal.value = true;
};

const handleDeleteLaporan = async () => {
  if (!itemToDelete.value) return;
  isDeleting.value = true;
  try {
    const res = await apiFetch(`/api/spd/${itemToDelete.value.id}/laporan`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success(`Laporan untuk SPD ${itemToDelete.value.nomorSpd} berhasil dihapus.`);
      showDeleteModal.value = false;
      itemToDelete.value = null;
      await fetchList();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menghapus laporan perjalanan dinas.');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat menghapus laporan.');
  } finally {
    isDeleting.value = false;
  }
};
const isSubmitting = ref(false);
const isPrinting = ref(false);

const modalForm = ref({
  penandatangan: 'Kepala Bagian' as 'Bupati' | 'Wakil Bupati' | 'Kepala Bagian' | 'Sekertaris Daerah',
  hasilPerjalanan: '',
  tanggalLaporan: new Date() as Date | null,
});

const modalError = ref('');

const openEditor = (item: LaporanItem) => {
  activeItem.value = item;
  modalError.value = '';

  const isKpa = (item.pemberiPerintah || '').toLowerCase().includes('kuasa');
  const defaultOfficial = isKpa ? 'Sekertaris Daerah' : 'Kepala Bagian';

  modalForm.value.penandatangan = (item.laporan?.penandatangan as any) || defaultOfficial;
  modalForm.value.hasilPerjalanan = item.laporan?.hasilPerjalanan || '';
  if (item.laporan?.tanggalLaporan) {
    modalForm.value.tanggalLaporan = new Date(item.laporan.tanggalLaporan);
  } else if (item.tanggalKembali) {
    modalForm.value.tanggalLaporan = new Date(item.tanggalKembali);
  } else {
    modalForm.value.tanggalLaporan = new Date();
  }

  showModal.value = true;
};

const handleDownloadPdf = async (item: LaporanItem) => {
  if (!item.laporan) {
    openEditor(item);
    return;
  }

  try {
    const res = await apiFetch(`/api/spd/${item.id}/laporan-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hasilPerjalanan: item.laporan.hasilPerjalanan,
        penandatangan: item.laporan.penandatangan,
        tanggalLaporan: item.laporan.tanggalLaporan,
        fontFamily: 'arial',
      }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNum = (item.nomorSpd || 'SPD').replace(/[\/\\]/g, '_').trim();
      a.download = `Laporan_SPD_${cleanNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Dokumen Laporan Perjalanan Dinas berhasil diunduh');
    } else {
      toast.error('Gagal mengunduh berkas Laporan');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat mengunduh berkas');
  }
};

const handlePrintDirect = (item: LaporanItem) => {
  if (!item.laporan) {
    openEditor(item);
    return;
  }
  router.push(`/laporan/cetak/${item.id}`);
};

const submitModalSave = async (printAfter: boolean = false) => {
  if (!activeItem.value) return;
  modalError.value = '';

  if (!modalForm.value.hasilPerjalanan.trim()) {
    modalError.value = 'Uraian hasil pelaksanaan perjalanan dinas wajib diisi.';
    return;
  }

  if (printAfter) {
    isPrinting.value = true;
  } else {
    isSubmitting.value = true;
  }

  try {
    const payload = {
      hasilPerjalanan: modalForm.value.hasilPerjalanan.trim(),
      penandatangan: modalForm.value.penandatangan,
      tanggalLaporan: modalForm.value.tanggalLaporan ? modalForm.value.tanggalLaporan.toISOString() : undefined,
      fontFamily: 'arial',
    };

    const res = await apiFetch(`/api/spd/${activeItem.value.id}/laporan-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showModal.value = false;
      await fetchList();

      if (printAfter) {
        toast.success('Laporan berhasil disimpan. Membuka pratinjau cetak...');
        router.push(`/laporan/cetak/${activeItem.value.id}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNum = (activeItem.value.nomorSpd || 'SPD').replace(/[\/\\]/g, '_').trim();
      a.download = `Laporan_SPD_${cleanNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Laporan berhasil disimpan dan diunduh');
    } else {
      const err = await res.json().catch(() => ({}));
      modalError.value = err.message || 'Gagal menyimpan laporan perjalanan dinas';
    }
  } catch (err: any) {
    modalError.value = err.message || 'Terjadi kesalahan sistem saat menyimpan laporan';
  } finally {
    isSubmitting.value = false;
    isPrinting.value = false;
  }
};

const formatDate = (dateStr?: string | Date | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-text-main">
          Daftar Laporan Perjalanan Dinas
        </h1>
        <p class="text-sm text-text-muted mt-1">
          Manajemen dan pencetakan laporan hasil perjalanan dinas resmi berdasarkan Surat Perjalanan Dinas (SPD).
        </p>
      </div>
      <div v-if="canCreate">
        <GovButton
          label="Buat Laporan Baru"
          icon="pi pi-plus"
          severity="primary"
          @click="router.push('/laporan/buat')"
        />
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <GovCard class="border-l-4 border-l-emerald-500">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Laporan Selesai
            </div>
            <div class="text-2xl font-bold text-text-main mt-1">
              {{ totalSelesai }}
            </div>
          </div>
          <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <i class="pi pi-check-circle text-xl"></i>
          </div>
        </div>
      </GovCard>

      <GovCard class="border-l-4 border-l-amber-500">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Menunggu Pelaporan
            </div>
            <div class="text-2xl font-bold text-text-main mt-1">
              {{ totalMenunggu }}
            </div>
          </div>
          <div class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
            <i class="pi pi-clock text-xl"></i>
          </div>
        </div>
      </GovCard>

      <GovCard class="border-l-4 border-l-primary">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold uppercase tracking-wider text-text-muted">
              SPD Disetujui
            </div>
            <div class="text-2xl font-bold text-text-main mt-1">
              {{ totalSpdDisetujui }}
            </div>
          </div>
          <div class="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-primary">
            <i class="pi pi-briefcase text-xl"></i>
          </div>
        </div>
      </GovCard>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="flex-1 flex flex-wrap items-center gap-2.5">
        <!-- Search Input -->
        <div class="w-full sm:w-64 md:w-56 lg:w-72">
          <GovInputText
            v-model="searchQuery"
            placeholder="Cari nomor SPD, pegawai, maksud..."
            block
            @keydown.enter="handleSearch"
          />
        </div>

        <!-- Status Filter -->
        <div class="w-full sm:w-36 lg:w-44">
          <GovSelect
            v-model="filterStatusLaporan"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            placeholder="Filter Status"
            @change="handleSearch"
          />
        </div>

        <!-- Pejabat Filter -->
        <div class="w-full sm:w-36 lg:w-44">
          <GovSelect
            v-model="filterPejabat"
            :options="pejabatOptions"
            option-label="label"
            option-value="value"
            placeholder="Pejabat Tujuan"
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
          v-if="searchQuery || filterStatusLaporan !== 'ALL' || filterPejabat !== 'ALL' || (dateRange && dateRange[0])"
          label="Reset"
          icon="pi pi-filter-slash"
          severity="secondary"
          variant="outlined"
          @click="handleResetFilters"
        />

        <GovButton
          label="Segarkan"
          icon="pi pi-refresh"
          severity="secondary"
          variant="outlined"
          :loading="loading"
          @click="fetchList"
        />
      </div>

      <div class="text-xs text-text-muted flex-shrink-0 self-end md:self-center">
        Menampilkan <strong class="text-text-main font-semibold">{{ filteredList.length }}</strong> data
      </div>
    </div>

    <!-- Main Table Container -->
    <div class="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      <!-- Data Table -->
      <GovTable
        :value="filteredList"
        :loading="loading"
        :paginator="true"
        :rows="10"
        data-key="id"
        class="!border-0 !rounded-none !shadow-none [&_.p-datatable-table]:!table-fixed [&_.p-datatable-table]:!w-full"
      >
        <template #empty>
          <div class="py-12 text-center text-text-muted">
            <i class="pi pi-inbox text-3xl mb-2 block opacity-40"></i>
            Tidak ada dokumen Laporan Perjalanan Dinas yang sesuai filter.
          </div>
        </template>

        <Column header="No." :style="{ width: '45px' }">
          <template #body="{ index }">
            <span class="text-xs text-text-muted">{{ index + 1 }}</span>
          </template>
        </Column>

        <Column header="Dokumen Penugasan" :style="{ width: '210px' }">
          <template #body="{ data }">
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-text-main font-mono">
                  {{ data.nomorSpd }}
                </span>
              </div>
              <div class="text-[11px] text-text-muted font-mono flex items-center gap-1">
                <i class="pi pi-file-edit text-[10px]"></i>
                <span class="truncate max-w-[170px]" :title="data.suratTugas?.nomorSurat">ST: {{ data.suratTugas?.nomorSurat || '-' }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Pegawai Pelaksana" :style="{ width: '170px' }">
          <template #body="{ data }">
            <div>
              <div class="font-medium text-xs text-text-main truncate" :title="data.pegawai?.nama">
                {{ data.pegawai?.nama || '-' }}
              </div>
              <div class="text-[11px] text-text-muted">
                NIP: {{ data.pegawai?.nip || '-' }}
              </div>
            </div>
          </template>
        </Column>

        <Column header="Maksud Perjalanan" :style="{ width: '190px' }">
          <template #body="{ data }">
            <div class="text-xs text-text-main line-clamp-2" :title="data.dalamRangka">
              {{ data.dalamRangka }}
            </div>
            <div class="text-[11px] text-text-muted mt-0.5">
              Durasi: {{ data.lamaHari ? `${data.lamaHari} hari` : '-' }}
            </div>
          </template>
        </Column>

        <Column
          header="Pejabat Tujuan"
          header-class="text-center"
          body-class="text-center"
          :style="{ width: '120px' }"
        >
          <template #body="{ data }">
            <span class="text-xs text-text-main">
              {{ data.laporan?.penandatangan || '-' }}
            </span>
          </template>
        </Column>

        <Column
          header="Tanggal Laporan"
          header-class="text-center"
          body-class="text-center"
          :style="{ width: '110px' }"
        >
          <template #body="{ data }">
            <span class="text-xs text-text-main">
              {{ formatDate(data.laporan?.tanggalLaporan) }}
            </span>
          </template>
        </Column>

        <Column
          header="Status"
          header-class="text-center"
          body-class="text-center"
          :style="{ width: '135px' }"
        >
          <template #body="{ data }">
            <div class="flex items-center justify-center">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
                :class="data.laporan
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="data.laporan ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-amber-500 dark:bg-amber-400'"
                ></span>
                {{ data.laporan ? 'Sudah Dibuat' : 'Belum Dibuat' }}
              </span>
            </div>
          </template>
        </Column>

        <Column
          header="Aksi"
          header-class="text-center"
          body-class="text-center"
          :style="{ width: '150px' }"
        >
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1">
              <!-- Jika Laporan Sudah Ada -->
              <template v-if="data.laporan">
                <GovButton
                  icon="pi pi-print"
                  severity="primary"
                  variant="text"
                  size="small"
                  rounded
                  title="Cetak Laporan Langsung"
                  @click="handlePrintDirect(data)"
                />
                <GovButton
                  icon="pi pi-file-pdf"
                  severity="secondary"
                  variant="text"
                  size="small"
                  rounded
                  title="Unduh Berkas PDF"
                  @click="handleDownloadPdf(data)"
                />
                <GovButton
                  v-if="canCreate"
                  icon="pi pi-pencil"
                  severity="info"
                  variant="text"
                  size="small"
                  rounded
                  title="Sunting Laporan"
                  @click="openEditor(data)"
                />
                <GovButton
                  v-if="canDelete"
                  icon="pi pi-trash"
                  severity="danger"
                  variant="text"
                  size="small"
                  rounded
                  title="Hapus Laporan"
                  @click="openDeleteConfirm(data)"
                />
              </template>

              <!-- Jika Laporan Belum Ada -->
              <template v-else>
                <button
                  v-if="canCreate"
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap shadow-2xs"
                  @click="openEditor(data)"
                >
                  <i class="pi pi-plus text-[10px]"></i>
                  <span>Buat Laporan</span>
                </button>
                <span v-else class="text-xs text-text-muted italic">Belum dibuat</span>
              </template>
            </div>
          </template>
        </Column>
      </GovTable>
    </div>

    <!-- Modal Dialog Edit/Buat Laporan Cepat -->
    <Dialog
      v-model:visible="showModal"
      modal
      :header="activeItem?.laporan ? 'Sunting Laporan Perjalanan Dinas' : 'Buat Laporan Perjalanan Dinas'"
      :style="{ width: '680px' }"
      class="p-dialog-gov"
    >
      <div class="space-y-4 pt-2">
        <!-- Error Alert -->
        <div v-if="modalError" class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-xs">
          {{ modalError }}
        </div>

        <!-- Info Context Card -->
        <div class="bg-slate-50 dark:bg-slate-900 border border-border rounded-lg p-3 text-xs space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-text-muted">Nomor Dokumen SPD:</span>
            <span class="font-mono font-bold text-primary">{{ activeItem?.nomorSpd || '-' }}</span>
          </div>
          <div class="flex items-center justify-between" v-if="activeItem?.suratTugas?.nomorSurat">
            <span class="text-text-muted">Surat Tugas Induk:</span>
            <span class="font-mono text-text-main">{{ activeItem?.suratTugas?.nomorSurat }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-text-muted">Pegawai Pelaksana:</span>
            <span class="font-semibold text-text-main">{{ activeItem?.pegawai?.nama || '-' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-text-muted">Lama Perjalanan:</span>
            <span class="font-medium text-text-main">{{ activeItem?.lamaHari ? `${activeItem.lamaHari} hari` : '-' }}</span>
          </div>
          <div class="pt-1.5 border-t border-border/60">
            <span class="text-text-muted block mb-0.5">Maksud Perjalanan:</span>
            <span class="text-text-main italic block leading-relaxed">{{ activeItem?.dalamRangka || '-' }}</span>
          </div>
        </div>

        <!-- Penanda Tangan Field -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-text-main">
            Penanda Tangan / Pejabat Tujuan Laporan <span class="text-red-500">*</span>
          </label>
          <GovSelect
            v-model="modalForm.penandatangan"
            :options="penandatanganFormOptions"
            option-label="label"
            option-value="value"
            placeholder="Pilih Pejabat Penanda Tangan..."
            class="w-full"
          />
          <p class="text-[11px] text-text-muted">
            <span class="text-primary font-medium">Aturan Sistem:</span>
            SPD Pengguna Anggaran (PA) otomatis memilih Kepala Bagian; SPD Kuasa Pengguna Anggaran (KPA) otomatis memilih Sekertaris Daerah.
          </p>
        </div>

        <!-- Tanggal Laporan Field -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-text-main">
            Tanggal Laporan
          </label>
          <GovDatePicker
            v-model="modalForm.tanggalLaporan"
            date-format="dd/mm/yy"
            placeholder="Pilih tanggal laporan..."
            class="w-full"
          />
        </div>

        <!-- Hasil Perjalanan Free Text Field -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-text-main">
            Hasil Perjalanan Dinas (Free Text) <span class="text-red-500">*</span>
          </label>
          <GovTextarea
            v-model="modalForm.hasilPerjalanan"
            rows="7"
            placeholder="Tuliskan uraian hasil pelaksanaan perjalanan dinas secara lengkap (mendukung multi-paragraf)..."
            class="text-justify"
            block
          />
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="showModal = false"
            :disabled="isSubmitting || isPrinting"
          />
          <GovButton
            label="Simpan & Unduh PDF"
            icon="pi pi-download"
            severity="secondary"
            variant="outlined"
            size="small"
            :loading="isSubmitting"
            :disabled="isPrinting"
            @click="submitModalSave(false)"
          />
          <GovButton
            label="Simpan & Cetak Laporan"
            icon="pi pi-print"
            severity="success"
            size="small"
            :loading="isPrinting"
            :disabled="isSubmitting"
            @click="submitModalSave(true)"
          />
        </div>
      </template>
    </Dialog>

    <!-- Modal Konfirmasi Hapus Laporan -->
    <Dialog
      v-model:visible="showDeleteModal"
      modal
      header="Konfirmasi Hapus Laporan"
      :style="{ width: '420px' }"
      :closable="!isDeleting"
    >
      <div class="py-2 text-sm text-text-main space-y-2">
        <p>
          Apakah Anda yakin ingin menghapus data laporan perjalanan dinas untuk SPD:
        </p>
        <p class="font-mono font-bold text-primary bg-canvas p-2 rounded-lg border border-border">
          {{ itemToDelete?.nomorSpd }}
        </p>
        <p class="text-xs text-text-muted">
          Tindakan ini hanya akan menghapus laporan perjalanan dinas, dokumen SPD dan Surat Tugas tetap tersimpan.
        </p>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            :disabled="isDeleting"
            @click="showDeleteModal = false"
          />
          <GovButton
            label="Hapus Laporan"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            :loading="isDeleting"
            @click="handleDeleteLaporan"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
