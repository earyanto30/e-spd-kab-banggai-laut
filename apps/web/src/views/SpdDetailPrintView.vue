<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Tag from 'primevue/tag';
import { GovButton, GovSelect, GovMessage } from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';

export interface OfficialSigner {
  id?: string;
  nama: string;
  nip: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
}

export interface SpdDetailData {
  id?: string;
  nomorSpd?: string;
  status?: string;
  pemberiPerintah?: string;
  penandatanganId?: string | null;
  penandatangan?: {
    id: string;
    nama: string;
    nip: string;
    jabatan: string;
    pangkat: string;
    golongan: string;
  } | null;
  pegawai?: {
    nama: string;
    nip: string;
    pangkat: string;
    golongan: string;
    jabatan: string;
    unitKerja?: string;
  } | null;
  dalamRangka: string;
  alatAngkut: string;
  tempatBerangkat: string;
  tempatTujuan: string;
  lamaHari: number;
  tanggalBerangkat: string | Date | null;
  tanggalKembali?: string | Date | null;
  skpd?: string;
  kodeRekening?: string | null;
  tingkatBiaya?: string | null;
  pengikut?: string | null;
  keterangan?: string | null;
  kopSuratId?: string | null;
  kopSurat?: {
    id: string;
    nama: string;
    fileName: string;
    paperSize?: string;
  } | null;
  penandatanganNama?: string | null;
  penandatanganJabatan?: string | null;
  penandatanganPangkat?: string | null;
  penandatanganNip?: string | null;
  suratTugasId?: string | null;
  suratTugas?: {
    id: string;
    nomorSurat?: string;
    penandatanganId?: string | null;
    penandatangan?: {
      id: string;
      nama: string;
      nip: string;
      jabatan: string;
    } | null;
    penandatanganNama?: string | null;
    penandatanganJabatan?: string | null;
    penandatanganPangkat?: string | null;
    penandatanganNip?: string | null;
  } | null;
  createdAt?: string | Date;
}

const route = useRoute();
const router = useRouter();
const toast = useGovToast();

const spdId = route.params.id as string;
const spd = ref<SpdDetailData | null>(null);
const loading = ref(true);
const errorMessage = ref('');

// Signer choices
const signersList = ref<OfficialSigner[]>([
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
]);

const selectedSigner = ref<OfficialSigner>(signersList.value[0]);

const fontFamily = ref<'arial' | 'times'>('arial');
const fontOptions = [
  { label: 'Arial', value: 'arial' },
  { label: 'Times New Roman', value: 'times' },
];

// PDF Generation & Preview
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
    const res = await apiFetch(`/api/spd/${spdId}/pdf?${q}`);
    if (res.ok) {
      const blob = await res.blob();
      activePdfUrl.value = URL.createObjectURL(blob);
    } else {
      const err = await res.json().catch(() => ({}));
      errorMessage.value = err.message || 'Gagal memuat dokumen PDF resmi';
    }
  } catch (err: any) {
    console.error('Gagal memuat PDF:', err);
    errorMessage.value = err.message || 'Terjadi kesalahan sistem saat memuat PDF';
  } finally {
    isLoadingPdfPreview.value = false;
  }
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
    router.push('/spd');
  }
};

const isPenandatanganUser = computed(() => {
  return localStorage.getItem('user_is_penandatangan') === 'true' ||
         localStorage.getItem('user_role') === 'PENANDATANGAN' ||
         localStorage.getItem('user_role') === 'ADMIN' ||
         localStorage.getItem('user_role') === 'SUPER_ADMIN';
});

const isSigningDoc = ref(false);

const handleSignSpd = async () => {
  isSigningDoc.value = true;
  try {
    const res = await apiFetch(`/api/spd/${spdId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DISETUJUI' }),
    });
    if (res.ok) {
      toast.success(
        `Surat Perjalanan Dinas ${spd.value?.nomorSpd || ''} berhasil ditandatangani!`,
        'Tanda Tangan Berhasil'
      );
      if (spd.value) {
        spd.value.status = 'DISETUJUI';
      }
      await loadPdfPreview();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menandatangani SPD');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem');
  } finally {
    isSigningDoc.value = false;
  }
};

const handleRevertSpd = async () => {
  isSigningDoc.value = true;
  try {
    const res = await apiFetch(`/api/spd/${spdId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DRAFT' }),
    });
    if (res.ok) {
      toast.warn(
        `Tanda tangan pada SPD ${spd.value?.nomorSpd || ''} telah dibatalkan.`,
        'Status Dikembalikan ke Draf'
      );
      if (spd.value) {
        spd.value.status = 'DRAFT';
      }
      await loadPdfPreview();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal membatalkan tanda tangan');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem');
  } finally {
    isSigningDoc.value = false;
  }
};

const fetchSpd = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [spdRes, signersRes] = await Promise.all([
      apiFetch(`/api/spd/${spdId}`),
      apiFetch('/api/pegawai?isPenandatangan=true'),
    ]);

    if (spdRes.ok) {
      spd.value = await spdRes.json();
    } else {
      const err = await spdRes.json().catch(() => ({}));
      errorMessage.value = err.message || 'Gagal memuat dokumen SPD';
      return;
    }

    if (signersRes.ok) {
      const data = await signersRes.json();
      if (Array.isArray(data) && data.length > 0) {
        signersList.value = data.map((p: any) => ({
          id: p.id,
          nama: p.nama,
          nip: p.nip,
          pangkat: p.pangkat,
          golongan: p.golongan,
          jabatan: p.jabatan,
        }));

        const targetSignerId = spd.value?.penandatanganId ||
          spd.value?.penandatangan?.id ||
          spd.value?.suratTugas?.penandatanganId ||
          spd.value?.suratTugas?.penandatangan?.id;

        const docNip = (spd.value?.penandatanganNip || spd.value?.suratTugas?.penandatanganNip || '').replace(/[^0-9]/g, '');
        const docName = (spd.value?.penandatanganNama || spd.value?.suratTugas?.penandatanganNama || '').toLowerCase().trim();
        const userNip = (localStorage.getItem('user_nip') || '').replace(/[^0-9]/g, '');
        const userName = (localStorage.getItem('user_name') || '').toLowerCase().trim();

        let matched = signersList.value.find((s) => {
          if (targetSignerId && s.id === targetSignerId) return true;
          const sNip = (s.nip || '').replace(/[^0-9]/g, '');
          const sName = (s.nama || '').toLowerCase().trim();
          if (docNip && sNip && docNip.includes(sNip)) return true;
          if (docName && (sName.includes(docName) || docName.includes(sName))) return true;
          return false;
        });

        if (!matched && (localStorage.getItem('user_role') === 'PENANDATANGAN' || localStorage.getItem('user_is_penandatangan') === 'true')) {
          matched = signersList.value.find((s) => {
            const sNip = (s.nip || '').replace(/[^0-9]/g, '');
            const sName = (s.nama || '').toLowerCase().trim();
            if (userNip && sNip && userNip.includes(sNip)) return true;
            if (userName && (sName.includes(userName) || userName.includes(sName))) return true;
            return false;
          });
        }

        selectedSigner.value = matched || signersList.value[0];
      }
    }

    await loadPdfPreview();
  } catch (err: any) {
    errorMessage.value = err.message || 'Terjadi kesalahan sistem saat memuat SPD';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchSpd();
});
</script>

<template>
  <div class="print-container">
    <!-- TOOLBAR CONTROLS -->
    <div class="no-print max-w-5xl mx-auto mb-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold text-text-main">
                Dokumen PDF Resmi SPD
              </h1>
              <span class="text-xs px-2 py-0.5 rounded font-mono bg-blue-100 dark:bg-blue-900/40 text-primary font-semibold">
                {{ spd?.nomorSpd || 'DRAFT' }}
              </span>
              <Tag
                :value="spd?.status === 'DISETUJUI' ? 'DISETUJUI / DITANDATANGANI' : 'DRAFT'"
                :severity="spd?.status === 'DISETUJUI' ? 'success' : 'warn'"
                class="text-[10px] font-bold"
              />
            </div>
            <p class="text-xs text-text-muted mt-0.5">
              Format Standar Permendagri / Perbup &bull; Terpadu Kop Surat Resmi &bull; Ukuran Legal
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
            v-if="spd?.status === 'DRAFT' && isPenandatanganUser"
            label="Tandatangani SPD"
            icon="pi pi-check-circle"
            severity="success"
            size="small"
            :loading="isSigningDoc"
            @click="handleSignSpd"
            title="Tandatangani resmi dokumen Surat Perjalanan Dinas ini"
          />
          <GovButton
            v-else-if="spd?.status === 'DISETUJUI' && isPenandatanganUser"
            label="Batal Tanda Tangan"
            icon="pi pi-undo"
            severity="warn"
            variant="outlined"
            size="small"
            :loading="isSigningDoc"
            @click="handleRevertSpd"
            title="Batalkan persetujuan / kembalikan status ke Draf"
          />
          <GovButton
            label="Edit Surat"
            icon="pi pi-pencil"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="router.push(`/spd/edit/${spdId}`)"
            title="Edit data dan rincian dokumen SPD ini"
          />
          <GovButton
            label="Unduh PDF"
            icon="pi pi-file-pdf"
            severity="secondary"
            variant="outlined"
            size="small"
            :loading="isDownloadingPdf"
            @click="handleDownloadPdf"
            title="Unduh berkas PDF resmi terpadu dengan kop surat"
          />
          <GovButton
            label="Cetak Dokumen"
            icon="pi pi-print"
            severity="primary"
            size="small"
            @click="handlePrint"
            title="Cetak langsung dokumen PDF resmi"
          />
        </div>
      </div>

      <!-- Quick Document Settings -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4 text-xs">
        <div class="flex flex-wrap items-center gap-6">
          <!-- Penandatangan Info (Ditetapkan saat pembuatan SPD / mengikuti Surat Tugas) -->
          <div class="flex items-center gap-2">
            <span class="text-text-muted">Pejabat Penandatangan:</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-medium">
              <i class="pi pi-user-check text-xs text-primary"></i>
              <span>{{ spd?.penandatangan?.nama || spd?.penandatanganNama || spd?.suratTugas?.penandatangan?.nama || spd?.suratTugas?.penandatanganNama || '-' }}</span>
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

    <!-- NATIVE PDF PREVIEW -->
    <div v-else-if="spd" class="document-preview-wrapper flex flex-col items-center pb-16 px-4">
      <div v-if="isLoadingPdfPreview" class="py-20 text-center space-y-3">
        <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
        <p class="text-xs text-text-muted">Sedang merender PDF resmi dengan kop surat...</p>
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
