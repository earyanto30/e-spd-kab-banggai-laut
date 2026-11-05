<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Tag from 'primevue/tag';
import {
  GovButton,
  GovSelect,
  GovMessage,
} from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';

export interface SpdWithLaporanData {
  id: string;
  nomorSpd: string;
  pemberiPerintah: string;
  dalamRangka: string;
  alatAngkut: string;
  tempatBerangkat: string;
  tempatTujuan: string;
  lamaHari?: number | null;
  tanggalBerangkat?: string | null;
  tanggalKembali?: string | null;
  status: string;
  pegawai?: {
    id: string;
    nama: string;
    nip: string;
    pangkat: string;
    golongan: string;
    jabatan: string;
  };
  kopSurat?: {
    id: string;
    nama: string;
    fileName: string;
    paperSize: string;
  };
  suratTugas?: {
    id: string;
    nomorSurat: string;
    dalamRangka: string;
    tanggalSurat: string;
  };
  laporan?: {
    id: string;
    hasilPerjalanan: string;
    penandatangan: string;
    tanggalLaporan?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

const route = useRoute();
const router = useRouter();
const toast = useGovToast();

const spdId = route.params.id as string;

const loading = ref(true);
const errorMessage = ref('');
const spd = ref<SpdWithLaporanData | null>(null);

const fontFamily = ref('arial');
const fontOptions = [
  { label: 'Arial', value: 'arial' },
  { label: 'Times New Roman', value: 'times' },
];

// PDF Preview & Generation
const isDownloadingPdf = ref(false);
const activePdfUrl = ref<string | null>(null);
const isLoadingPdfPreview = ref(false);

const buildPdfQuery = () => {
  const params = new URLSearchParams();
  params.set('fontFamily', fontFamily.value);
  return params.toString();
};

const loadPdfPreview = async () => {
  if (activePdfUrl.value) {
    URL.revokeObjectURL(activePdfUrl.value);
    activePdfUrl.value = null;
  }
  isLoadingPdfPreview.value = true;
  try {
    const q = buildPdfQuery();
    const res = await apiFetch(`/api/spd/${spdId}/laporan-pdf?${q}`);
    if (res.ok) {
      const blob = await res.blob();
      activePdfUrl.value = URL.createObjectURL(blob);
    } else {
      const err = await res.json().catch(() => ({}));
      errorMessage.value = err.message || 'Gagal memuat dokumen PDF laporan';
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Terjadi kesalahan sistem saat memuat PDF laporan';
  } finally {
    isLoadingPdfPreview.value = false;
  }
};

const handleDownloadPdf = async () => {
  isDownloadingPdf.value = true;
  try {
    const q = buildPdfQuery();
    const res = await apiFetch(`/api/spd/${spdId}/laporan-pdf?${q}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNum = (spd.value?.nomorSpd || 'SPD').replace(/[\/\\]/g, '_').trim();
      a.download = `Laporan_SPD_${cleanNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Dokumen PDF Laporan SPD ${spd.value?.nomorSpd || ''} berhasil diunduh`);
    } else {
      errorMessage.value = 'Gagal mengunduh dokumen PDF laporan';
      toast.error(errorMessage.value);
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Terjadi kesalahan sistem saat mengunduh PDF laporan';
    toast.error(errorMessage.value);
  } finally {
    isDownloadingPdf.value = false;
  }
};

const handlePrint = () => {
  if (!activePdfUrl.value) {
    loadPdfPreview().then(() => handlePrint());
    return;
  }
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = activePdfUrl.value;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 3000);
    }, 200);
  };
};

const handleBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/laporan');
  }
};

const handleEdit = () => {
  router.push(`/laporan/buat?spdId=${spdId}`);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const fetchData = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await apiFetch(`/api/spd/${spdId}`);
    if (res.ok) {
      spd.value = await res.json();
      if (spd.value?.laporan) {
        await loadPdfPreview();
      }
    } else {
      errorMessage.value = 'Dokumen Surat Perjalanan Dinas tidak ditemukan.';
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal mengambil data dokumen';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Controls (No-Print) -->
    <div class="no-print max-w-5xl mx-auto space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <i class="pi pi-file-check text-xl"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-bold text-text-main">
                Pratinjau Laporan Perjalanan Dinas
              </h1>
              <span class="text-xs px-2 py-0.5 rounded font-mono bg-blue-100 dark:bg-blue-900/40 text-primary font-semibold">
                {{ spd?.nomorSpd || '-' }}
              </span>
              <Tag
                value="DOKUMEN RESMI"
                severity="success"
                class="text-[10px] font-bold"
              />
            </div>
            <p class="text-xs text-text-muted mt-0.5">
              Format Standar Laporan Hasil Penugasan &bull; Rata Kiri-Kanan &bull; Ukuran Legal
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <GovButton
            label="Kembali"
            icon="pi pi-arrow-left"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="handleBack"
            title="Kembali ke halaman sebelumnya"
          />

          <GovButton
            label="Sunting Laporan"
            icon="pi pi-pencil"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="handleEdit"
            title="Edit isi dan hasil perjalanan dinas ini"
          />

          <GovButton
            label="Lihat SPD"
            icon="pi pi-external-link"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="router.push(`/spd/cetak/${spdId}`)"
            title="Buka dokumen Surat Perjalanan Dinas (SPD) terkait"
          />

          <GovButton
            label="Unduh PDF"
            icon="pi pi-file-pdf"
            severity="secondary"
            variant="outlined"
            size="small"
            :loading="isDownloadingPdf"
            @click="handleDownloadPdf"
            title="Unduh berkas PDF resmi Laporan Perjalanan Dinas"
          />

          <GovButton
            label="Cetak Dokumen"
            icon="pi pi-print"
            severity="primary"
            size="small"
            @click="handlePrint"
            title="Cetak langsung dokumen PDF laporan"
          />
        </div>
      </div>

      <!-- Quick Document Settings -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4 text-xs">
        <div class="flex flex-wrap items-center gap-6">
          <!-- Pejabat Penandatangan Tujuan -->
          <div class="flex items-center gap-2">
            <span class="text-text-muted">Kepada Yth:</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium">
              <i class="pi pi-user-check text-xs text-emerald-600 dark:text-emerald-400"></i>
              <span>{{ spd?.laporan?.penandatangan || '-' }}</span>
            </span>
          </div>

          <!-- Pegawai Pelaksana -->
          <div class="flex items-center gap-2">
            <span class="text-text-muted">Pelaksana:</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-medium">
              <i class="pi pi-user text-xs text-primary"></i>
              <span>{{ spd?.pegawai?.nama || '-' }}</span>
            </span>
          </div>

          <!-- Font Selector -->
          <div class="flex items-center gap-2">
            <span class="text-text-muted">Font:</span>
            <GovSelect
              v-model="fontFamily"
              :options="fontOptions"
              option-label="label"
              option-value="value"
              class="w-44 text-xs"
              @change="loadPdfPreview()"
            />
          </div>
        </div>

        <div class="flex items-center gap-3 text-text-muted">
          <span>
            Tanggal Laporan: <strong class="text-text-main">{{ formatDate(spd?.laporan?.tanggalLaporan) }}</strong>
          </span>
          <span>&bull;</span>
          <span>
            Ukuran: <strong class="text-text-main font-mono">Legal (8.5" &times; 14")</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- Error Feedback -->
    <div v-if="errorMessage" class="no-print max-w-5xl mx-auto mb-6">
      <GovMessage severity="error">{{ errorMessage }}</GovMessage>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="no-print flex justify-center py-16">
      <div class="flex items-center gap-3 text-text-muted">
        <i class="pi pi-spin pi-spinner text-xl text-primary"></i>
        <span>Memuat data dokumen Laporan Perjalanan Dinas...</span>
      </div>
    </div>

    <!-- Jika Laporan Belum Dibuat -->
    <div v-else-if="spd && !spd.laporan" class="no-print max-w-5xl mx-auto">
      <div class="bg-surface border border-dashed border-amber-300 dark:border-amber-700 rounded-xl p-8 text-center space-y-4">
        <div class="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <i class="pi pi-exclamation-triangle text-2xl"></i>
        </div>
        <div>
          <h3 class="text-base font-bold text-text-main">
            Laporan Belum Dibuat
          </h3>
          <p class="text-xs text-text-muted mt-1 max-w-md mx-auto">
            Dokumen SPD nomor <strong class="font-mono text-text-main">{{ spd.nomorSpd }}</strong> belum memiliki isi Laporan Perjalanan Dinas.
          </p>
        </div>
        <div>
          <GovButton
            label="Buat Laporan Sekarang"
            icon="pi pi-plus"
            severity="primary"
            size="small"
            @click="handleEdit"
          />
        </div>
      </div>
    </div>

    <!-- NATIVE PDF PREVIEW -->
    <div v-else-if="spd" class="document-preview-wrapper flex flex-col items-center pb-16 px-4">
      <div v-if="isLoadingPdfPreview" class="py-20 text-center space-y-3">
        <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
        <p class="text-xs text-text-muted">Sedang merender berkas PDF resmi Laporan Perjalanan Dinas...</p>
      </div>

      <div v-else-if="activePdfUrl" class="w-full max-w-5xl space-y-3">
        <div class="w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden">
          <object
            :key="activePdfUrl"
            :data="activePdfUrl"
            type="application/pdf"
            class="w-full h-[980px] block"
          >
            <div class="p-12 text-center space-y-4">
              <i class="pi pi-file-pdf text-5xl text-primary"></i>
              <p class="text-base text-text-main font-semibold">
                Pratinjau Dokumen PDF Resmi
              </p>
              <p class="text-xs text-text-muted">
                Peramban Anda tidak mendukung penampil PDF langsung. Silakan klik tombol di bawah untuk mengunduh dokumen.
              </p>
              <GovButton
                label="Unduh Berkas PDF Sekarang"
                icon="pi pi-download"
                severity="primary"
                size="small"
                @click="handleDownloadPdf"
              />
            </div>
          </object>
        </div>

        <!-- Ringkasan Rincian Laporan -->
        <div class="w-full no-print bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div class="border-b border-border pb-3">
            <h3 class="text-sm font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-info-circle text-primary"></i>
              <span>Rincian Hasil Perjalanan Dinas</span>
            </h3>
            <p class="text-xs text-text-muted mt-0.5">
              Data laporan hasil pelaksanaan tugas yang tercatat pada sistem.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="space-y-2">
              <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span class="text-text-muted">Nomor SPD:</span>
                <span class="font-mono font-semibold text-text-main">{{ spd.nomorSpd }}</span>
              </div>
              <div class="flex items-center justify-between border-b border-border/60 pb-1.5" v-if="spd.suratTugas?.nomorSurat">
                <span class="text-text-muted">Nomor Surat Tugas:</span>
                <span class="font-mono text-text-main">{{ spd.suratTugas.nomorSurat }}</span>
              </div>
              <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span class="text-text-muted">Pegawai Pelaksana:</span>
                <span class="font-medium text-text-main">{{ spd.pegawai?.nama || '-' }}</span>
              </div>
              <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span class="text-text-muted">NIP / Jabatan:</span>
                <span class="text-text-main">{{ spd.pegawai?.nip || '-' }} &bull; {{ spd.pegawai?.jabatan || '-' }}</span>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span class="text-text-muted">Tempat Tujuan:</span>
                <span class="font-medium text-text-main">{{ spd.tempatTujuan || '-' }}</span>
              </div>
              <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span class="text-text-muted">Lama Perjalanan:</span>
                <span class="text-text-main">{{ spd.lamaHari ? `${spd.lamaHari} hari` : '-' }} (Berangkat: {{ formatDate(spd.tanggalBerangkat) }})</span>
              </div>
              <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span class="text-text-muted">Pejabat Tujuan:</span>
                <span class="font-medium text-text-main">{{ spd.laporan?.penandatangan || '-' }}</span>
              </div>
              <div class="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span class="text-text-muted">Tanggal Laporan:</span>
                <span class="text-text-main">{{ formatDate(spd.laporan?.tanggalLaporan) }}</span>
              </div>
            </div>
          </div>

          <div class="pt-2">
            <span class="block text-xs font-semibold text-text-main mb-1.5">Hasil Perjalanan Dinas:</span>
            <div class="p-3.5 bg-surface-ground rounded-lg border border-border text-xs text-text-main leading-relaxed whitespace-pre-wrap text-justify">
              {{ spd.laporan?.hasilPerjalanan || '-' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  :deep(.no-print),
  .no-print {
    display: none !important;
  }
}
</style>
