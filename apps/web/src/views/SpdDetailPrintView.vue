<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SpdDocument, { SpdData, OfficialSigner } from '../components/spd/SpdDocument.vue';
import { GovButton, GovSelect, GovCheckbox, GovMessage } from '../components/core';
import { apiFetch } from '../utils/api';

const route = useRoute();
const router = useRouter();

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
            label="Cetak SPD"
            icon="pi pi-print"
            severity="primary"
            size="small"
            @click="handlePrint"
          />
        </div>
      </div>

      <!-- Quick Document Settings -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4 text-xs">
        <div class="flex flex-wrap items-center gap-6">
          <!-- Kop Surat Toggle -->
          <label class="flex items-center gap-2 cursor-pointer font-medium text-text-main">
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
            />
          </div>
        </div>

        <div class="text-text-muted">
          Ukuran Kertas: <strong class="text-text-main font-mono">Legal (8.5" &times; 14")</strong>
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

    <!-- DOCUMENT SHEET PREVIEW (Screen & Print) -->
    <div v-else-if="spd" class="document-preview-wrapper flex justify-center pb-16">
      <div class="document-sheet-shadow rounded-sm border border-slate-300 dark:border-slate-700">
        <SpdDocument
          :spd="spd"
          :show-kop="showKop"
          :signer="selectedSigner"
          :paper-size="paperSize"
        />
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
