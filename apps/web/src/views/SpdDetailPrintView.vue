<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SpdDocument, { SpdData, OfficialSigner } from '../components/spd/SpdDocument.vue';
import { GovButton, GovSelect, GovCheckbox, GovMessage } from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';

const route = useRoute();
const router = useRouter();
const toast = useGovToast();

const spdId = route.params.id as string;
const spd = ref<SpdData | null>(null);
const loading = ref(true);
const errorMessage = ref('');

// Print & Display options
const showKop = ref(true);
const paperSize = ref<'Legal' | 'A4'>('Legal');

// Signer choices
const signersList: OfficialSigner[] = [
  {
    nama: 'Saiful U. Usuria, SE., M.Si',
    nip: '19750510 200012 1 004',
    pangkat: 'Pembina Utama Muda',
    golongan: 'IV/c',
    jabatan: 'Sekretaris Daerah',
  },
  {
    nama: 'Fadli A. Arsad',
    nip: '198801152010011002',
    pangkat: 'Pembina Utama Muda',
    golongan: 'IV/c',
    jabatan: 'Sekretaris Daerah',
  },
  {
    nama: 'Dedy Kurniawan, S.STP, M.AP',
    nip: '19850214 200412 1 001',
    pangkat: 'Pembina',
    golongan: 'IV/a',
    jabatan: 'Kepala Bagian Umum (KPA)',
  },
];

const selectedSigner = ref<OfficialSigner>(signersList[0]);

const fetchSpd = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await apiFetch(`/api/spd/${spdId}`);
    if (res.ok) {
      spd.value = await res.json();
    } else {
      const err = await res.json().catch(() => ({}));
      errorMessage.value = err.message || 'Gagal memuat dokumen SPD';
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Terjadi kesalahan sistem saat memuat SPD';
  } finally {
    loading.value = false;
  }
};

const handlePrint = () => {
  window.print();
};

const handleBack = () => {
  router.push('/spd/buat');
};

// PDF Generation with uploaded Kop Surat
const isDownloadingPdf = ref(false);
const activePdfUrl = ref<string | null>(null);
const isLoadingPdfPreview = ref(false);
const viewMode = ref<'html' | 'pdf'>('html');

const buildPdfQuery = () => {
  const params = new URLSearchParams();
  if (selectedSigner.value) {
    params.set('signerNama', selectedSigner.value.nama);
    params.set('signerNip', selectedSigner.value.nip);
    params.set('signerPangkat', selectedSigner.value.pangkat);
    params.set('signerGolongan', selectedSigner.value.golongan);
    params.set('signerJabatan', selectedSigner.value.jabatan);
  }
  return params.toString();
};

const handleDownloadPdf = async () => {
  isDownloadingPdf.value = true;
  try {
    const q = buildPdfQuery();
    const res = await apiFetch(`/api/spd/${spdId}/pdf?${q}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNum = (spd.value?.nomorSpd || 'SPD').replace(/[\/\\]/g, '_');
      a.download = `SPD_${cleanNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Dokumen PDF ${spd.value?.nomorSpd || ''} berhasil diunduh`);
    } else {
      errorMessage.value = 'Gagal mengunduh dokumen PDF resmi';
      toast.error(errorMessage.value);
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Terjadi kesalahan sistem saat mengunduh PDF';
    toast.error(errorMessage.value);
  } finally {
    isDownloadingPdf.value = false;
  }
};

const loadPdfPreview = async () => {
  if (activePdfUrl.value) {
    URL.revokeObjectURL(activePdfUrl.value);
    activePdfUrl.value = null;
  }
  isLoadingPdfPreview.value = true;
  try {
    const q = buildPdfQuery();
    const res = await apiFetch(`/api/spd/${spdId}/pdf?${q}`);
    if (res.ok) {
      const blob = await res.blob();
      activePdfUrl.value = URL.createObjectURL(blob);
    }
  } catch (err) {
    console.error('Gagal memuat PDF:', err);
  } finally {
    isLoadingPdfPreview.value = false;
  }
};

const toggleViewMode = (mode: 'html' | 'pdf') => {
  viewMode.value = mode;
  if (mode === 'pdf' && !activePdfUrl.value) {
    loadPdfPreview();
  }
};

onMounted(() => {
  fetchSpd();
});
</script>

<template>
  <div class="print-container">
    <!-- TOOLBAR CONTROLS (Hidden when printing) -->
    <div class="no-print max-w-5xl mx-auto mb-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <GovButton
            icon="pi pi-arrow-left"
            variant="text"
            severity="secondary"
            @click="handleBack"
            title="Kembali ke formulir"
          />
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold text-text-main">
                Pratinjau Dokumen SPD
              </h1>
              <span class="text-xs px-2 py-0.5 rounded font-mono bg-blue-100 dark:bg-blue-900/40 text-primary font-semibold">
                {{ spd?.nomorSpd || 'DRAFT' }}
              </span>
            </div>
            <p class="text-xs text-text-muted mt-0.5">
              Format Standar Permendagri / Perbup &bull; Font Times New Roman &bull; Margin Presisi
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <GovButton
            label="Kembali"
            icon="pi pi-arrow-left"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="handleBack"
          />
          <GovButton
            label="Edit SPD"
            icon="pi pi-pencil"
            severity="info"
            variant="outlined"
            size="small"
            @click="router.push(`/spd/edit/${spdId}`)"
            title="Edit data dan rincian dokumen SPD ini"
          />
          <GovButton
            label="Unduh PDF Resmi"
            icon="pi pi-file-pdf"
            severity="danger"
            size="small"
            :loading="isDownloadingPdf"
            @click="handleDownloadPdf"
            title="Unduh berkas PDF asli yang digabungkan langsung dengan kop surat yang diunggah"
          />
          <GovButton
            label="Cetak SPD"
            icon="pi pi-print"
            severity="primary"
            size="small"
            @click="handlePrint"
          />
        </div>
      </div>

      <!-- Quick Document Settings & View Mode Toggle -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4 text-xs">
        <div class="flex flex-wrap items-center gap-6">
          <!-- View Mode Selector -->
          <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              :class="viewMode === 'html' ? 'bg-white dark:bg-slate-700 text-primary font-semibold shadow-xs' : 'text-text-muted hover:text-text-main'"
              @click="toggleViewMode('html')"
            >
              <i class="pi pi-align-left mr-1"></i>
              Lembar Dokumen
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              :class="viewMode === 'pdf' ? 'bg-white dark:bg-slate-700 text-primary font-semibold shadow-xs' : 'text-text-muted hover:text-text-main'"
              @click="toggleViewMode('pdf')"
            >
              <i class="pi pi-file-pdf mr-1 text-red-500"></i>
              Pratinjau PDF Asli
            </button>
          </div>

          <!-- Kop Surat Toggle (for HTML print) -->
          <label v-if="viewMode === 'html'" class="flex items-center gap-2 cursor-pointer font-medium text-text-main">
            <GovCheckbox v-model="showKop" :binary="true" />
            <span>Tampilkan Kop Surat Resmi</span>
            <span class="text-text-muted font-normal">
              (Hapus centang jika mencetak di atas kertas blangko fisik)
            </span>
          </label>

          <!-- Penandatangan Selector -->
          <div class="flex items-center gap-2">
            <span class="text-text-muted">Pejabat Penandatangan:</span>
            <GovSelect
              v-model="selectedSigner"
              :options="signersList"
              option-label="nama"
              class="w-64 text-xs"
              @change="viewMode === 'pdf' && loadPdfPreview()"
            />
          </div>
        </div>

        <div class="flex items-center gap-3 text-text-muted">
          <span v-if="spd?.kopSurat">
            Kop: <strong class="text-text-main">{{ spd.kopSurat.nama }}</strong>
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
        <span>Memuat data dokumen Surat Perjalanan Dinas...</span>
      </div>
    </div>

    <!-- DOCUMENT SHEET PREVIEW (HTML Mode) -->
    <div v-else-if="spd && viewMode === 'html'" class="document-preview-wrapper flex justify-center pb-16">
      <div class="document-sheet-shadow rounded-sm border border-slate-300 dark:border-slate-700">
        <SpdDocument
          :spd="spd"
          :show-kop="showKop"
          :signer="selectedSigner"
          :paper-size="paperSize"
        />
      </div>
    </div>

    <!-- NATIVE PDF PREVIEW (PDF Mode with Uploaded Kop) -->
    <div v-else-if="spd && viewMode === 'pdf'" class="document-preview-wrapper flex flex-col items-center pb-16 px-4">
      <div v-if="isLoadingPdfPreview" class="py-20 text-center space-y-3">
        <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
        <p class="text-xs text-text-muted">Sedang merender PDF resmi dengan kop surat...</p>
      </div>
      <div v-else-if="activePdfUrl" class="w-full max-w-4xl space-y-3">
        <div class="w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden">
          <object
            :data="activePdfUrl"
            type="application/pdf"
            class="w-full h-[980px] block"
          >
            <div class="p-8 text-center space-y-3">
              <i class="pi pi-file-pdf text-4xl text-text-muted"></i>
              <p class="text-sm text-text-main">
                Pratinjau berkas PDF resmi terpadu dengan kop surat.
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-sheet-shadow {
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.15), 0 0 3px rgba(0, 0, 0, 0.1);
}

@media print {
  /* Hide all outside chrome */
  :deep(.no-print),
  .no-print {
    display: none !important;
  }

  /* Reset wrappers */
  .print-container,
  .document-preview-wrapper,
  .document-sheet-shadow {
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    display: block !important;
  }
}
</style>
