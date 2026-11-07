<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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

export interface PegawaiSimple {
  id?: string;
  nama: string;
  nip: string;
  jabatan?: string;
  pangkat?: string;
  golongan?: string;
}

export interface ArchivedSpdItem {
  id: string;
  nomorSpd: string;
  pemberiPerintah: string;
  pegawaiId: string;
  pegawai?: PegawaiSimple;
  dalamRangka: string;
  alatAngkut: string;
  tempatBerangkat: string;
  tempatTujuan: string;
  lamaHari?: number;
  tanggalBerangkat?: string;
  tanggalKembali?: string;
  status: string;
  suratTugasId?: string;
  suratTugas?: {
    id: string;
    nomorSurat: string;
  };
  laporan?: {
    id: string;
  };
  createdAt: string;
}

export interface ArchivedSuratTugasItem {
  id: string;
  nomorSurat: string;
  dalamRangka: string;
  tanggalSurat: string;
  status: string;
  pegawaiList?: PegawaiSimple[];
  spdList?: Array<{
    id: string;
    nomorSpd: string;
    pegawai?: PegawaiSimple;
  }>;
  createdAt: string;
}

export type TabType = 'semua' | 'surat-tugas' | 'spd' | 'siap-arsip';

const route = useRoute();
const router = useRouter();
const toast = useGovToast();

// Tab state based on route
const activeTab = ref<TabType>('semua');

const determineTabFromRoute = () => {
  if (route.path.includes('/arsip/surat-tugas')) {
    activeTab.value = 'surat-tugas';
  } else if (route.path.includes('/arsip/spd')) {
    activeTab.value = 'spd';
  } else if (route.query.tab === 'siap-arsip') {
    activeTab.value = 'siap-arsip';
  } else {
    activeTab.value = 'semua';
  }
};

watch(() => [route.path, route.query], determineTabFromRoute, { immediate: true });

const switchTab = (tab: TabType) => {
  activeTab.value = tab;
  if (tab === 'surat-tugas') {
    router.push('/arsip/surat-tugas');
  } else if (tab === 'spd') {
    router.push('/arsip/spd');
  } else if (tab === 'siap-arsip') {
    router.push({ path: '/arsip', query: { tab: 'siap-arsip' } });
  } else {
    router.push('/arsip');
  }
};

// Data & loading states
const spdList = ref<ArchivedSpdItem[]>([]);
const stList = ref<ArchivedSuratTugasItem[]>([]);
const siapArsipList = ref<{ suratTugas: any[]; spd: any[]; totalSiapArsip: number }>({
  suratTugas: [],
  spd: [],
  totalSiapArsip: 0,
});
const loading = ref(false);
const loadingSiap = ref(false);
const searchQuery = ref('');
const dateRange = ref<(Date | null)[] | null>(null);

const userRole = localStorage.getItem('user_role') || '';
const canManage = computed(() => ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole));

// Status Restore Dialog
const isRestoreDialogOpen = ref(false);
const restoreTarget = ref<{
  type: 'SPD' | 'SURAT_TUGAS';
  id: string;
  nomor: string;
  currentStatus: string;
} | null>(null);

const restoreStatusOptions = [
  { label: 'SELESAI (Perjalanan / Penugasan Selesai)', value: 'SELESAI' },
  { label: 'DISETUJUI (Disetujui Pejabat / PA / KPA)', value: 'DISETUJUI' },
  { label: 'DRAFT (Draf Pengajuan)', value: 'DRAFT' },
  { label: 'BATAL (Dibatalkan)', value: 'BATAL' },
];
const selectedRestoreStatus = ref('SELESAI');
const isSubmittingRestore = ref(false);
const downloadingBundleId = ref<string | null>(null);
const archivingId = ref<string | null>(null);
const isArchivingAll = ref(false);

const formatDateParam = (d: Date | null | undefined): string => {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Fetch data
const loadData = async () => {
  loading.value = true;
  try {
    const spdParams: string[] = ['status=ARSIP'];
    const stParams: string[] = ['status=ARSIP'];

    if (searchQuery.value.trim()) {
      const q = encodeURIComponent(searchQuery.value.trim());
      spdParams.push(`q=${q}`);
      stParams.push(`q=${q}`);
    }

    if (dateRange.value && dateRange.value[0]) {
      const s = formatDateParam(dateRange.value[0]);
      spdParams.push(`startDate=${s}`);
      stParams.push(`startDate=${s}`);
      if (dateRange.value[1]) {
        const e = formatDateParam(dateRange.value[1]);
        spdParams.push(`endDate=${e}`);
        stParams.push(`endDate=${e}`);
      }
    }

    const [spdRes, stRes] = await Promise.all([
      apiFetch(`/api/spd?${spdParams.join('&')}`),
      apiFetch(`/api/surat-tugas?${stParams.join('&')}`),
    ]);

    if (spdRes.ok) {
      spdList.value = await spdRes.json();
    } else {
      spdList.value = [];
    }

    if (stRes.ok) {
      stList.value = await stRes.json();
    } else {
      stList.value = [];
    }
  } catch (err: any) {
    console.error('Failed to load archive data:', err);
    toast.error('Gagal memuat daftar dokumen arsip.');
  } finally {
    loading.value = false;
  }
};

const loadSiapArsip = async () => {
  loadingSiap.value = true;
  try {
    const res = await apiFetch('/api/arsip/siap-arsip');
    if (res.ok) {
      siapArsipList.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load siap arsip:', err);
  } finally {
    loadingSiap.value = false;
  }
};

onMounted(() => {
  loadData();
  loadSiapArsip();
});

const handleSearch = () => {
  loadData();
};

const handleDateChange = () => {
  if (!dateRange.value || (dateRange.value[0] && dateRange.value[1])) {
    loadData();
  }
};

const resetFilter = () => {
  searchQuery.value = '';
  dateRange.value = null;
  loadData();
};

// Summary metrics
const totalSpdCount = computed(() => spdList.value.length);
const totalSuratTugasCount = computed(() => stList.value.length);
const totalArsipCount = computed(() => totalSpdCount.value + totalSuratTugasCount.value);
const totalSiapCount = computed(() => siapArsipList.value.totalSiapArsip || 0);

// Helper for personil in Surat Tugas
const getPersonilList = (item: any): PegawaiSimple[] => {
  if (item.pegawaiList && item.pegawaiList.length > 0) {
    return item.pegawaiList;
  }
  return (item.spdList || []).map((s: any) => s.pegawai).filter(Boolean) as PegawaiSimple[];
};

// Combined items for 'semua' tab
interface UnifiedArsipItem {
  id: string;
  type: 'SURAT_TUGAS' | 'SPD';
  nomor: string;
  maksud: string;
  personil: string;
  tanggal: string;
  status: string;
  raw: ArchivedSpdItem | ArchivedSuratTugasItem;
}

const unifiedList = computed<UnifiedArsipItem[]>(() => {
  const combined: UnifiedArsipItem[] = [];

  for (const st of stList.value) {
    const personils = getPersonilList(st).map((p) => p.nama).join(', ');
    combined.push({
      id: st.id,
      type: 'SURAT_TUGAS',
      nomor: st.nomorSurat,
      maksud: st.dalamRangka,
      personil: personils || 'Personil Penugasan',
      tanggal: st.tanggalSurat,
      status: st.status,
      raw: st,
    });
  }

  for (const spd of spdList.value) {
    combined.push({
      id: spd.id,
      type: 'SPD',
      nomor: spd.nomorSpd,
      maksud: spd.dalamRangka,
      personil: spd.pegawai?.nama || 'Pegawai Pelaksana',
      tanggal: spd.tanggalBerangkat || spd.createdAt,
      status: spd.status,
      raw: spd,
    });
  }

  // Sort by date descending
  return combined.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
});

// Navigation actions
const viewSpd = (id: string) => {
  router.push(`/spd/cetak/${id}`);
};

const viewSuratTugas = (id: string) => {
  router.push(`/surat-tugas/cetak/${id}`);
};

const viewLaporan = (spdId: string) => {
  router.push(`/laporan/cetak/${spdId}`);
};

// Download Bundel Berkas Arsip Lengkap (Option A)
const downloadBundle = async (type: 'SURAT_TUGAS' | 'SPD', id: string, nomor: string) => {
  downloadingBundleId.value = id;
  try {
    const endpoint = type === 'SURAT_TUGAS'
      ? `/api/arsip/bundle/surat-tugas/${id}`
      : `/api/arsip/bundle/spd/${id}`;

    const res = await apiFetch(endpoint);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNomor = (nomor || 'Arsip').replace(/[\/\\]/g, '_');
      a.download = `BUNDEL_ARSIP_${cleanNomor}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Bundel Berkas Arsip ${nomor} berhasil diunduh lengkap.`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal mengunduh bundel arsip dokumen.');
    }
  } catch (err) {
    console.error('Download bundle error:', err);
    toast.error('Terjadi kesalahan saat mengunduh bundel arsip.');
  } finally {
    downloadingBundleId.value = null;
  }
};

// Download Individual PDF
const downloadSpdPdf = async (spd: ArchivedSpdItem) => {
  try {
    const res = await apiFetch(`/api/spd/${spd.id}/pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNomor = (spd.nomorSpd || 'SPD').replace(/[\/\\]/g, '_');
      a.download = `ARSIP_SPD_${cleanNomor}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`PDF SPD ${spd.nomorSpd} berhasil diunduh.`);
    } else {
      toast.error('Gagal mengunduh dokumen PDF SPD.');
    }
  } catch (err) {
    console.error('Download SPD PDF error:', err);
    toast.error('Terjadi kesalahan saat mengunduh PDF.');
  }
};

const downloadSuratTugasPdf = async (st: ArchivedSuratTugasItem) => {
  try {
    const res = await apiFetch(`/api/surat-tugas/${st.id}/pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNomor = (st.nomorSurat || 'SuratTugas').replace(/[\/\\]/g, '_');
      a.download = `ARSIP_SuratTugas_${cleanNomor}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`PDF Surat Tugas ${st.nomorSurat} berhasil diunduh.`);
    } else {
      toast.error('Gagal mengunduh dokumen PDF Surat Tugas.');
    }
  } catch (err) {
    console.error('Download Surat Tugas PDF error:', err);
    toast.error('Terjadi kesalahan saat mengunduh PDF.');
  }
};

// 1-Click Quick Archive (Option C)
const quickArchiveSuratTugas = async (id: string, nomor: string) => {
  archivingId.value = id;
  try {
    const res = await apiFetch(`/api/arsip/surat-tugas/${id}`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      toast.success(data.message || `Surat Tugas ${nomor} berhasil diarsipkan.`);
      await loadData();
      await loadSiapArsip();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal mengarsipkan Surat Tugas.');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat mengarsipkan.');
  } finally {
    archivingId.value = null;
  }
};

const quickArchiveSpd = async (id: string, nomor: string) => {
  archivingId.value = id;
  try {
    const res = await apiFetch(`/api/arsip/spd/${id}`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      toast.success(data.message || `SPD ${nomor} berhasil diarsipkan.`);
      await loadData();
      await loadSiapArsip();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal mengarsipkan SPD.');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat mengarsipkan.');
  } finally {
    archivingId.value = null;
  }
};

const archiveAllCompleted = async () => {
  const stIds = siapArsipList.value.suratTugas.map((s) => s.id);
  const spdIds = siapArsipList.value.spd.map((s) => s.id);
  if (stIds.length === 0 && spdIds.length === 0) {
    toast.warn('Tidak ada dokumen berstatus SELESAI yang siap diarsipkan.');
    return;
  }
  isArchivingAll.value = true;
  try {
    const res = await apiFetch('/api/arsip/bulk-archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suratTugasIds: stIds, spdIds }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(data.message || 'Seluruh dokumen selesai berhasil diarsipkan.');
      await loadData();
      await loadSiapArsip();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal mengarsipkan dokumen secara massal.');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem.');
  } finally {
    isArchivingAll.value = false;
  }
};

// Open restore status modal
const openRestoreDialog = (type: 'SPD' | 'SURAT_TUGAS', id: string, nomor: string, currentStatus: string) => {
  restoreTarget.value = { type, id, nomor, currentStatus };
  selectedRestoreStatus.value = 'SELESAI';
  isRestoreDialogOpen.value = true;
};

const confirmRestoreStatus = async () => {
  if (!restoreTarget.value) return;
  isSubmittingRestore.value = true;
  try {
    const endpoint = restoreTarget.value.type === 'SPD'
      ? `/api/spd/${restoreTarget.value.id}/status`
      : `/api/surat-tugas/${restoreTarget.value.id}/status`;

    const res = await apiFetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: selectedRestoreStatus.value }),
    });

    if (res.ok) {
      toast.success(
        `Status ${restoreTarget.value.type === 'SPD' ? 'SPD' : 'Surat Tugas'} nomor ${restoreTarget.value.nomor} berhasil diubah menjadi ${selectedRestoreStatus.value}.`
      );
      isRestoreDialogOpen.value = false;
      await loadData();
      await loadSiapArsip();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal memperbarui status dokumen.');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat memperbarui status.');
  } finally {
    isSubmittingRestore.value = false;
  }
};

// Export to CSV
const exportToCsv = () => {
  if (unifiedList.value.length === 0) {
    toast.warn('Tidak ada data arsip untuk diekspor.');
    return;
  }

  const headers = ['No', 'Tipe Dokumen', 'Nomor Dokumen', 'Personil / Pelaksana', 'Maksud Perjalanan / Penugasan', 'Tanggal Dokumen', 'Status'];
  const rows = unifiedList.value.map((item, idx) => [
    idx + 1,
    `"${item.type === 'SPD' ? 'Surat Perjalanan Dinas (SPD)' : 'Surat Tugas'}"`,
    `"${item.nomor}"`,
    `"${item.personil.replace(/"/g, '""')}"`,
    `"${(item.maksud || '').replace(/"/g, '""')}"`,
    `"${formatDate(item.tanggal)}"`,
    `"${item.status}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Daftar_Arsip_Dokumen_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success('Data arsip dokumen berhasil diekspor ke format CSV.');
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header Page -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shadow-sm border border-purple-200 dark:border-purple-800/60">
          <i class="pi pi-folder text-xl"></i>
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
            Arsip Dokumen
            <Tag value="ARSIP" severity="secondary" class="!text-xs !px-2.5 !py-0.5 font-bold" />
            <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <i class="pi pi-lock text-[10px]"></i> Terkunci (Read-Only)
            </span>
          </h1>
          <p class="text-sm text-text-muted mt-0.5">
            Pusat penyimpanan, penggabungan berkas digital terpadu, dan penelusuran dokumen Surat Tugas dan SPD resmi.
          </p>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2">
        <GovButton
          label="Ekspor CSV"
          icon="pi pi-file-excel"
          severity="secondary"
          variant="outlined"
          size="small"
          :disabled="unifiedList.length === 0"
          @click="exportToCsv"
        />
        <GovButton
          icon="pi pi-sync"
          severity="secondary"
          variant="outlined"
          size="small"
          :loading="loading || loadingSiap"
          title="Segarkan data arsip"
          @click="loadData(); loadSiapArsip()"
        />
      </div>
    </div>

    <!-- Stat Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-surface border border-border p-4 rounded-xl flex items-center gap-3 shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
          <i class="pi pi-folder-open text-lg"></i>
        </div>
        <div>
          <span class="text-xs text-text-muted font-medium block">Total Dokumen Arsip</span>
          <span class="text-xl font-bold text-text-main font-mono">{{ totalArsipCount }}</span>
        </div>
      </div>

      <div class="bg-surface border border-border p-4 rounded-xl flex items-center gap-3 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <i class="pi pi-file-edit text-lg"></i>
        </div>
        <div>
          <span class="text-xs text-text-muted font-medium block">Arsip Surat Tugas</span>
          <span class="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{{ totalSuratTugasCount }}</span>
        </div>
      </div>

      <div class="bg-surface border border-border p-4 rounded-xl flex items-center gap-3 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
        <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
          <i class="pi pi-briefcase text-lg"></i>
        </div>
        <div>
          <span class="text-xs text-text-muted font-medium block">Arsip Dokumen SPD</span>
          <span class="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{{ totalSpdCount }}</span>
        </div>
      </div>

      <!-- Quick Alert Card: Dokumen Siap Diarsipkan -->
      <div
        class="border p-4 rounded-xl flex items-center gap-3 shadow-sm transition-colors cursor-pointer"
        :class="
          totalSiapCount > 0
            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 hover:border-amber-400'
            : 'bg-surface border-border'
        "
        @click="switchTab('siap-arsip')"
      >
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          :class="totalSiapCount > 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
        >
          <i class="pi pi-inbox text-lg"></i>
        </div>
        <div>
          <span class="text-xs text-text-muted font-medium block">Siap Diarsipkan (Selesai)</span>
          <span
            class="text-xl font-bold font-mono"
            :class="totalSiapCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-main'"
          >
            {{ totalSiapCount }}
          </span>
        </div>
      </div>
    </div>

    <!-- Filter & Search Toolbar (Only for archived tabs) -->
    <div
      v-if="activeTab !== 'siap-arsip'"
      class="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
    >
      <!-- Search Input -->
      <div class="w-full md:w-80">
        <GovInputText
          v-model="searchQuery"
          placeholder="Cari nomor, pegawai, tujuan..."
          icon-left="pi pi-search"
          block
          @input="handleSearch"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Date range picker -->
        <div class="w-full sm:w-56">
          <GovDatePicker
            v-model="dateRange"
            selection-mode="range"
            placeholder="Rentang Tanggal"
            show-icon
            block
            @update:model-value="handleDateChange"
          />
        </div>

        <GovButton
          v-if="searchQuery || (dateRange && dateRange[0])"
          label="Reset"
          icon="pi pi-times"
          severity="secondary"
          variant="outlined"
          size="small"
          @click="resetFilter"
        />
      </div>
    </div>

    <!-- Tab Buttons -->
    <div class="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
      <button
        type="button"
        class="px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 flex-shrink-0"
        :class="
          activeTab === 'semua'
            ? 'bg-purple-600 text-white shadow-sm'
            : 'text-text-muted hover:text-text-main hover:bg-canvas'
        "
        @click="switchTab('semua')"
      >
        <i class="pi pi-inbox text-sm"></i>
        <span>Semua Arsip</span>
        <span
          class="px-2 py-0.5 rounded-full text-xs"
          :class="activeTab === 'semua' ? 'bg-white/20 text-white' : 'bg-canvas text-text-muted border border-border'"
        >
          {{ totalArsipCount }}
        </span>
      </button>

      <button
        type="button"
        class="px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 flex-shrink-0"
        :class="
          activeTab === 'surat-tugas'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-text-muted hover:text-text-main hover:bg-canvas'
        "
        @click="switchTab('surat-tugas')"
      >
        <i class="pi pi-file-edit text-sm"></i>
        <span>Surat Tugas</span>
        <span
          class="px-2 py-0.5 rounded-full text-xs"
          :class="activeTab === 'surat-tugas' ? 'bg-white/20 text-white' : 'bg-canvas text-text-muted border border-border'"
        >
          {{ totalSuratTugasCount }}
        </span>
      </button>

      <button
        type="button"
        class="px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 flex-shrink-0"
        :class="
          activeTab === 'spd'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-text-muted hover:text-text-main hover:bg-canvas'
        "
        @click="switchTab('spd')"
      >
        <i class="pi pi-briefcase text-sm"></i>
        <span>Surat Perjalanan Dinas (SPD)</span>
        <span
          class="px-2 py-0.5 rounded-full text-xs"
          :class="activeTab === 'spd' ? 'bg-white/20 text-white' : 'bg-canvas text-text-muted border border-border'"
        >
          {{ totalSpdCount }}
        </span>
      </button>

      <button
        type="button"
        class="px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 flex-shrink-0"
        :class="
          activeTab === 'siap-arsip'
            ? 'bg-amber-600 text-white shadow-sm'
            : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
        "
        @click="switchTab('siap-arsip')"
      >
        <i class="pi pi-folder-plus text-sm"></i>
        <span>Siap Diarsipkan</span>
        <span
          class="px-2 py-0.5 rounded-full text-xs font-bold"
          :class="activeTab === 'siap-arsip' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'"
        >
          {{ totalSiapCount }}
        </span>
      </button>
    </div>

    <!-- Data Tables Container -->
    <div class="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      <!-- 1. TAB: SEMUA ARSIP -->
      <GovTable
        v-if="activeTab === 'semua'"
        :value="unifiedList"
        :loading="loading"
        :paginator="true"
        :rows="10"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #empty>
          <div class="py-12 text-center text-text-muted space-y-2">
            <i class="pi pi-folder-open text-4xl text-purple-400/80 mb-2"></i>
            <p class="font-medium text-text-main">Belum Ada Dokumen yang Diarsipkan</p>
            <p class="text-xs">Dokumen Surat Tugas atau SPD dengan status ARSIP akan muncul di daftar ini.</p>
          </div>
        </template>

        <Column header="No." header-style="width: 4rem" class="text-center">
          <template #body="{ index }">
            <span class="text-xs text-text-muted font-mono">{{ index + 1 }}</span>
          </template>
        </Column>

        <Column header="Jenis" header-style="width: 8rem">
          <template #body="{ data }">
            <Tag
              :value="data.type === 'SPD' ? 'SPD' : 'Surat Tugas'"
              :severity="data.type === 'SPD' ? 'success' : 'info'"
              class="!text-[11px] !font-bold"
            />
          </template>
        </Column>

        <Column header="Nomor Dokumen" header-style="min-width: 13rem">
          <template #body="{ data }">
            <div class="font-mono text-xs font-semibold text-text-main">
              {{ data.nomor }}
            </div>
            <div class="text-[11px] text-text-muted mt-0.5">
              Tanggal: {{ formatDate(data.tanggal) }}
            </div>
          </template>
        </Column>

        <Column header="Personil / Pelaksana" header-style="min-width: 14rem">
          <template #body="{ data }">
            <div class="text-xs font-medium text-text-main line-clamp-1" :title="data.personil">
              {{ data.personil }}
            </div>
          </template>
        </Column>

        <Column header="Maksud / Perihal" header-style="min-width: 16rem">
          <template #body="{ data }">
            <div class="text-xs text-text-main line-clamp-2 leading-relaxed" :title="data.maksud">
              {{ data.maksud || '-' }}
            </div>
          </template>
        </Column>

        <Column header="Status" header-style="width: 8rem" class="text-center">
          <template #body>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60">
              <i class="pi pi-lock text-[10px]"></i>
              Arsip
            </div>
          </template>
        </Column>

        <Column header="Aksi" header-style="width: 14rem" class="text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-1">
              <!-- Unduh Bundel Lengkap -->
              <button
                type="button"
                class="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
                title="Unduh Bundel Berkas Arsip Lengkap (Cover + Surat Tugas + Semua SPD + Laporan)"
                :disabled="downloadingBundleId === data.id"
                @click="downloadBundle(data.type, data.id, data.nomor)"
              >
                <i :class="downloadingBundleId === data.id ? 'pi pi-spin pi-spinner' : 'pi pi-file-export'" class="text-xs"></i>
                <span class="hidden sm:inline">Bundel</span>
              </button>

              <button
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-canvas transition-colors border border-border"
                title="Lihat / Pratinjau Dokumen"
                @click="data.type === 'SPD' ? viewSpd(data.id) : viewSuratTugas(data.id)"
              >
                <i class="pi pi-eye text-xs"></i>
              </button>
              <button
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors border border-border"
                title="Unduh PDF Resmi"
                @click="data.type === 'SPD' ? downloadSpdPdf(data.raw) : downloadSuratTugasPdf(data.raw)"
              >
                <i class="pi pi-download text-xs"></i>
              </button>
              <button
                v-if="canManage"
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors border border-purple-200 dark:border-purple-800"
                title="Pulihkan / Ubah Status Arsip"
                @click="openRestoreDialog(data.type, data.id, data.nomor, data.status)"
              >
                <i class="pi pi-sync text-xs"></i>
              </button>
            </div>
          </template>
        </Column>
      </GovTable>

      <!-- 2. TAB: SURAT TUGAS -->
      <GovTable
        v-else-if="activeTab === 'surat-tugas'"
        :value="stList"
        :loading="loading"
        :paginator="true"
        :rows="10"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #empty>
          <div class="py-12 text-center text-text-muted space-y-2">
            <i class="pi pi-file-edit text-4xl text-blue-400/80 mb-2"></i>
            <p class="font-medium text-text-main">Tidak Ada Arsip Surat Tugas</p>
            <p class="text-xs">Surat Tugas yang diubah statusnya menjadi ARSIP akan tercatat di sini.</p>
          </div>
        </template>

        <Column header="No." header-style="width: 4rem" class="text-center">
          <template #body="{ index }">
            <span class="text-xs text-text-muted font-mono">{{ index + 1 }}</span>
          </template>
        </Column>

        <Column header="Nomor Surat Tugas" header-style="min-width: 14rem">
          <template #body="{ data }">
            <div class="font-mono text-xs font-semibold text-text-main">
              {{ data.nomorSurat }}
            </div>
            <div class="text-[11px] text-text-muted mt-0.5">
              Tanggal: {{ formatDate(data.tanggalSurat) }}
            </div>
          </template>
        </Column>

        <Column header="Personil Pelaksana" header-style="min-width: 15rem">
          <template #body="{ data }">
            <div class="text-xs font-medium text-text-main line-clamp-1">
              {{ getPersonilList(data).map((p) => p.nama).join(', ') || '-' }}
            </div>
            <div class="text-[11px] text-text-muted mt-0.5">
              Total: {{ getPersonilList(data).length }} Personil &bull; {{ data.spdList?.length || 0 }} Dokumen SPD
            </div>
          </template>
        </Column>

        <Column header="Maksud Penugasan" header-style="min-width: 16rem">
          <template #body="{ data }">
            <div class="text-xs text-text-main line-clamp-2 leading-relaxed" :title="data.dalamRangka">
              {{ data.dalamRangka || '-' }}
            </div>
          </template>
        </Column>

        <Column header="Status" header-style="width: 8rem" class="text-center">
          <template #body>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60">
              <i class="pi pi-lock text-[10px]"></i>
              Arsip
            </div>
          </template>
        </Column>

        <Column header="Aksi" header-style="width: 14rem" class="text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-1">
              <button
                type="button"
                class="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
                title="Unduh Bundel Berkas Arsip Lengkap (Cover + Surat Tugas + Semua SPD + Laporan)"
                :disabled="downloadingBundleId === data.id"
                @click="downloadBundle('SURAT_TUGAS', data.id, data.nomorSurat)"
              >
                <i :class="downloadingBundleId === data.id ? 'pi pi-spin pi-spinner' : 'pi pi-file-export'" class="text-xs"></i>
                <span class="hidden sm:inline">Bundel</span>
              </button>

              <button
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-canvas transition-colors border border-border"
                title="Lihat / Pratinjau Surat Tugas"
                @click="viewSuratTugas(data.id)"
              >
                <i class="pi pi-eye text-xs"></i>
              </button>
              <button
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors border border-border"
                title="Unduh PDF Resmi"
                @click="downloadSuratTugasPdf(data)"
              >
                <i class="pi pi-download text-xs"></i>
              </button>
              <button
                v-if="canManage"
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors border border-purple-200 dark:border-purple-800"
                title="Pulihkan / Ubah Status Arsip"
                @click="openRestoreDialog('SURAT_TUGAS', data.id, data.nomorSurat, data.status)"
              >
                <i class="pi pi-sync text-xs"></i>
              </button>
            </div>
          </template>
        </Column>
      </GovTable>

      <!-- 3. TAB: SPD -->
      <GovTable
        v-else-if="activeTab === 'spd'"
        :value="spdList"
        :loading="loading"
        :paginator="true"
        :rows="10"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #empty>
          <div class="py-12 text-center text-text-muted space-y-2">
            <i class="pi pi-briefcase text-4xl text-emerald-400/80 mb-2"></i>
            <p class="font-medium text-text-main">Tidak Ada Arsip Surat Perjalanan Dinas (SPD)</p>
            <p class="text-xs">Dokumen SPD yang diarsipkan akan tercatat di sini.</p>
          </div>
        </template>

        <Column header="No." header-style="width: 4rem" class="text-center">
          <template #body="{ index }">
            <span class="text-xs text-text-muted font-mono">{{ index + 1 }}</span>
          </template>
        </Column>

        <Column header="Nomor SPD" header-style="min-width: 14rem">
          <template #body="{ data }">
            <div class="font-mono text-xs font-semibold text-text-main">
              {{ data.nomorSpd }}
            </div>
            <div class="text-[11px] text-text-muted mt-0.5">
              Pemberi Perintah: {{ data.pemberiPerintah || '-' }}
            </div>
          </template>
        </Column>

        <Column header="Pegawai Pelaksana" header-style="min-width: 14rem">
          <template #body="{ data }">
            <div class="text-xs font-medium text-text-main">
              {{ data.pegawai?.nama || '-' }}
            </div>
            <div class="text-[11px] text-text-muted font-mono">
              NIP. {{ data.pegawai?.nip || '-' }}
            </div>
          </template>
        </Column>

        <Column header="Tujuan & Durasi" header-style="min-width: 12rem">
          <template #body="{ data }">
            <div class="text-xs text-text-main font-medium">
              {{ data.tempatTujuan || '-' }}
            </div>
            <div class="text-[11px] text-text-muted mt-0.5">
              Durasi: {{ data.lamaHari ? `${data.lamaHari} Hari` : '-' }}
              ({{ formatDate(data.tanggalBerangkat) }} s/d {{ formatDate(data.tanggalKembali) }})
            </div>
          </template>
        </Column>

        <Column header="Laporan" header-style="width: 8rem" class="text-center">
          <template #body="{ data }">
            <button
              v-if="data.laporan"
              type="button"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
              title="Lihat Laporan Perjalanan Dinas"
              @click="viewLaporan(data.id)"
            >
              <i class="pi pi-file-check text-[10px]"></i>
              Lihat
            </button>
            <span v-else class="text-xs text-text-muted">-</span>
          </template>
        </Column>

        <Column header="Status" header-style="width: 8rem" class="text-center">
          <template #body>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60">
              <i class="pi pi-lock text-[10px]"></i>
              Arsip
            </div>
          </template>
        </Column>

        <Column header="Aksi" header-style="width: 14rem" class="text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-1">
              <button
                type="button"
                class="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
                title="Unduh Bundel Berkas Arsip Lengkap (Cover + SPD + Laporan)"
                :disabled="downloadingBundleId === data.id"
                @click="downloadBundle('SPD', data.id, data.nomorSpd)"
              >
                <i :class="downloadingBundleId === data.id ? 'pi pi-spin pi-spinner' : 'pi pi-file-export'" class="text-xs"></i>
                <span class="hidden sm:inline">Bundel</span>
              </button>

              <button
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-canvas transition-colors border border-border"
                title="Lihat / Pratinjau SPD"
                @click="viewSpd(data.id)"
              >
                <i class="pi pi-eye text-xs"></i>
              </button>
              <button
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors border border-border"
                title="Unduh PDF Resmi"
                @click="downloadSpdPdf(data)"
              >
                <i class="pi pi-download text-xs"></i>
              </button>
              <button
                v-if="canManage"
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors border border-purple-200 dark:border-purple-800"
                title="Pulihkan / Ubah Status Arsip"
                @click="openRestoreDialog('SPD', data.id, data.nomorSpd, data.status)"
              >
                <i class="pi pi-sync text-xs"></i>
              </button>
            </div>
          </template>
        </Column>
      </GovTable>

      <!-- 4. TAB: SIAP DIARSIPKAN (OPTION C) -->
      <div v-else-if="activeTab === 'siap-arsip'" class="p-4 space-y-6">
        <!-- Banner Rekomendasi Pengarsipan -->
        <div class="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i class="pi pi-sparkles text-base"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-text-main">
                Dokumen Rekomendasi Pengarsipan Otomatis
              </h3>
              <p class="text-xs text-text-muted mt-0.5">
                Dokumen di bawah ini telah berstatus <strong>SELESAI</strong> dan siap untuk dipindahkan ke lemari Arsip Resmi secara permanen.
              </p>
            </div>
          </div>

          <GovButton
            v-if="canManage && totalSiapCount > 0"
            label="Arsipkan Semua Dokumen Selesai"
            icon="pi pi-folder-plus"
            size="small"
            :loading="isArchivingAll"
            @click="archiveAllCompleted"
          />
        </div>

        <!-- Bagian 1: Surat Tugas Selesai -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-file-edit text-blue-600"></i>
              Surat Tugas Siap Arsip ({{ siapArsipList.suratTugas.length }})
            </h4>
          </div>

          <div v-if="siapArsipList.suratTugas.length === 0" class="p-6 text-center text-xs text-text-muted border border-dashed border-border rounded-lg">
            Tidak ada Surat Tugas dengan status SELESAI saat ini.
          </div>

          <div v-else class="border border-border rounded-lg overflow-hidden divide-y divide-border">
            <div
              v-for="st in siapArsipList.suratTugas"
              :key="st.id"
              class="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-canvas transition-colors"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-bold text-text-main">{{ st.nomorSurat }}</span>
                  <Tag value="SELESAI" severity="success" class="!text-[10px] !px-1.5 !py-0" />
                  <span class="text-[11px] text-text-muted">{{ formatDate(st.tanggalSurat) }}</span>
                </div>
                <div class="text-xs text-text-main font-medium line-clamp-1">{{ st.dalamRangka }}</div>
                <div class="text-[11px] text-text-muted">
                  {{ st.spdList?.length || 0 }} Dokumen SPD terkait &bull; {{ st.penandatanganNama || '-' }}
                </div>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  class="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                  title="Unduh Pratinjau Bundel"
                  @click="downloadBundle('SURAT_TUGAS', st.id, st.nomorSurat)"
                >
                  <i class="pi pi-file-export text-xs"></i>
                  Bundel
                </button>
                <GovButton
                  v-if="canManage"
                  label="Arsipkan Sekarang"
                  icon="pi pi-folder-plus"
                  size="small"
                  :loading="archivingId === st.id"
                  @click="quickArchiveSuratTugas(st.id, st.nomorSurat)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Bagian 2: Dokumen SPD Selesai -->
        <div class="space-y-2 pt-2">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-briefcase text-emerald-600"></i>
              Dokumen SPD Siap Arsip ({{ siapArsipList.spd.length }})
            </h4>
          </div>

          <div v-if="siapArsipList.spd.length === 0" class="p-6 text-center text-xs text-text-muted border border-dashed border-border rounded-lg">
            Tidak ada dokumen SPD mandiri berstatus SELESAI saat ini.
          </div>

          <div v-else class="border border-border rounded-lg overflow-hidden divide-y divide-border">
            <div
              v-for="spd in siapArsipList.spd"
              :key="spd.id"
              class="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-canvas transition-colors"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-bold text-text-main">{{ spd.nomorSpd }}</span>
                  <Tag value="SELESAI" severity="success" class="!text-[10px] !px-1.5 !py-0" />
                  <span class="text-[11px] text-text-muted">{{ formatDate(spd.tanggalBerangkat) }}</span>
                </div>
                <div class="text-xs text-text-main font-medium">
                  {{ spd.pegawai?.nama || 'Pelaksana' }} &bull; Tujuan: {{ spd.tempatTujuan }}
                </div>
                <div class="text-[11px] text-text-muted">
                  {{ spd.dalamRangka }}
                </div>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  class="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                  title="Unduh Pratinjau Bundel"
                  @click="downloadBundle('SPD', spd.id, spd.nomorSpd)"
                >
                  <i class="pi pi-file-export text-xs"></i>
                  Bundel
                </button>
                <GovButton
                  v-if="canManage"
                  label="Arsipkan SPD"
                  icon="pi pi-folder-plus"
                  size="small"
                  :loading="archivingId === spd.id"
                  @click="quickArchiveSpd(spd.id, spd.nomorSpd)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog Pulihkan / Ubah Status Dokumen -->
    <Dialog
      v-model:visible="isRestoreDialogOpen"
      modal
      header="Perbarui Status Dokumen Arsip"
      :style="{ width: '90vw', maxWidth: '440px' }"
      class="gov-dialog"
    >
      <div v-if="restoreTarget" class="space-y-4 pt-2">
        <div class="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800/50 text-xs">
          <div class="font-bold text-text-main font-mono">
            {{ restoreTarget.type === 'SPD' ? 'SPD' : 'Surat Tugas' }}: {{ restoreTarget.nomor }}
          </div>
          <div class="text-text-muted mt-0.5">
            Status saat ini: <Tag value="ARSIP" severity="secondary" class="!text-[10px] !px-1.5" /> (Terkunci)
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-text-main">
            Pilih Status Pemulihan Baru
          </label>
          <GovSelect
            v-model="selectedRestoreStatus"
            :options="restoreStatusOptions"
            option-label="label"
            option-value="value"
            block
          />
          <p class="text-[11px] text-text-muted">
            Memilih status baru akan membuka kunci (unlock) dan memindahkan dokumen dari Arsip kembali ke alur aktif.
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="isRestoreDialogOpen = false"
          />
          <GovButton
            label="Simpan Perubahan"
            icon="pi pi-check"
            size="small"
            :loading="isSubmittingRestore"
            @click="confirmRestoreStatus"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
