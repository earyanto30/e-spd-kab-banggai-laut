<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import { GovButton, GovSelect, GovMessage, GovTextarea, GovDatePicker } from '../components/core';
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
  laporanHasil?: string | null;
  laporanPenandatangan?: string | null;
  laporanTanggal?: string | Date | null;
  laporan?: any | null;
  createdAt?: string | Date;
}

const route = useRoute();
const router = useRouter();
const toast = useGovToast();

const spdId = route.params.id as string;
const spd = ref<SpdDetailData | null>(null);
const loading = ref(true);
const errorMessage = ref('');

const userRole = localStorage.getItem('user_role') || '';
const canManage = computed(() => ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole));

// Signer choices
const signersList = ref<OfficialSigner[]>([]);
const selectedSigner = ref<OfficialSigner | null>(null);

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

const isDownloadingBundle = ref(false);
const isArchiving = ref(false);

const handleDownloadBundle = async () => {
  isDownloadingBundle.value = true;
  try {
    const res = await apiFetch(`/api/arsip/bundle/spd/${spdId}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNum = (spd.value?.nomorSpd || 'SPD').replace(/[\/\\]/g, '_');
      a.download = `BUNDEL_ARSIP_${cleanNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Bundel berkas arsip ${spd.value?.nomorSpd || ''} berhasil diunduh lengkap`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal mengunduh bundel arsip');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat mengunduh bundel arsip');
  } finally {
    isDownloadingBundle.value = false;
  }
};

const handleQuickArchive = async () => {
  isArchiving.value = true;
  try {
    const res = await apiFetch(`/api/arsip/spd/${spdId}`, { method: 'POST' });
    if (res.ok) {
      const respData = await res.json();
      toast.success(respData.message || 'SPD berhasil diarsipkan.');
      await fetchSpd();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal mengarsipkan SPD.');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat mengarsipkan.');
  } finally {
    isArchiving.value = false;
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

// --- Laporan Perjalanan Dinas State & Logic ---
const isLaporanDisabled = computed(() => {
  if (!spd.value) return true;
  if (spd.value.laporan || spd.value.status === 'SELESAI') return false;
  const isApproved = spd.value.status === 'DISETUJUI';
  const hasLamaHari = spd.value.lamaHari != null && Number(spd.value.lamaHari) > 0;
  return !isApproved || !hasLamaHari;
});

const laporanDisabledReason = computed(() => {
  if (!spd.value) return '';
  if (spd.value.laporan || spd.value.status === 'SELESAI') return '';
  if (spd.value.status !== 'DISETUJUI' && (!spd.value.lamaHari || Number(spd.value.lamaHari) <= 0)) {
    return 'Laporan Perjalanan Dinas dinonaktifkan: Dokumen SPD belum disetujui dan Lama Perjalanan belum diisi.';
  }
  if (spd.value.status !== 'DISETUJUI') {
    return 'Laporan Perjalanan Dinas dinonaktifkan: Dokumen SPD harus berstatus DISETUJUI.';
  }
  if (!spd.value.lamaHari || Number(spd.value.lamaHari) <= 0) {
    return 'Laporan Perjalanan Dinas dinonaktifkan: Lama Perjalanan Dinas harus ditentukan.';
  }
  return '';
});

const penandatanganOptions = [
  { label: 'Bupati (Bupati Banggai Laut)', value: 'Bupati' },
  { label: 'Wakil Bupati (Wakil Bupati Banggai Laut)', value: 'Wakil Bupati' },
  { label: 'Kepala Bagian (Kepala Bagian Umum Setda)', value: 'Kepala Bagian' },
  { label: 'Sekertaris Daerah (Sekretaris Daerah Kab. Banggai Laut)', value: 'Sekertaris Daerah' },
];

const showLaporanModal = ref(false);
const isGeneratingLaporan = ref(false);
const isPrintingLaporan = ref(false);

const laporanForm = reactive({
  penandatangan: 'Kepala Bagian' as 'Bupati' | 'Wakil Bupati' | 'Kepala Bagian' | 'Sekertaris Daerah',
  hasilPerjalanan: '',
  tanggalLaporan: new Date() as Date | null,
});

const laporanErrors = reactive<{ hasilPerjalanan?: string }>({});

const openLaporanModal = () => {
  laporanErrors.hasilPerjalanan = '';

  const isKpa = (spd.value?.pemberiPerintah || '').toLowerCase().includes('kuasa');
  const defaultPenandatangan = isKpa ? 'Sekertaris Daerah' : 'Kepala Bagian';

  laporanForm.penandatangan = (spd.value?.laporanPenandatangan as any) || defaultPenandatangan;
  laporanForm.hasilPerjalanan = spd.value?.laporanHasil || '';

  if (spd.value?.laporanTanggal) {
    laporanForm.tanggalLaporan = new Date(spd.value.laporanTanggal);
  } else if (spd.value?.tanggalKembali) {
    laporanForm.tanggalLaporan = new Date(spd.value.tanggalKembali);
  } else {
    laporanForm.tanggalLaporan = new Date();
  }

  showLaporanModal.value = true;
};

const validateLaporan = (): boolean => {
  laporanErrors.hasilPerjalanan = '';
  if (!laporanForm.hasilPerjalanan.trim()) {
    laporanErrors.hasilPerjalanan = 'Uraian hasil pelaksanaan perjalanan dinas wajib diisi.';
    return false;
  }
  return true;
};

const handleDownloadLaporan = async () => {
  if (!validateLaporan()) return;
  isGeneratingLaporan.value = true;
  try {
    const payload = {
      hasilPerjalanan: laporanForm.hasilPerjalanan.trim(),
      penandatangan: laporanForm.penandatangan,
      tanggalLaporan: laporanForm.tanggalLaporan ? laporanForm.tanggalLaporan.toISOString() : undefined,
      fontFamily: fontFamily.value,
    };
    const res = await apiFetch(`/api/spd/${spdId}/laporan-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
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
      toast.success('Dokumen Laporan Perjalanan Dinas berhasil diunduh');

      if (spd.value) {
        spd.value.laporanHasil = laporanForm.hasilPerjalanan;
        spd.value.laporanPenandatangan = laporanForm.penandatangan;
        spd.value.laporanTanggal = laporanForm.tanggalLaporan;
      }
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal mengunduh Laporan Perjalanan Dinas');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat membuat laporan');
  } finally {
    isGeneratingLaporan.value = false;
  }
};

const handlePrintLaporan = async () => {
  if (!validateLaporan()) return;
  isPrintingLaporan.value = true;
  try {
    const payload = {
      hasilPerjalanan: laporanForm.hasilPerjalanan.trim(),
      penandatangan: laporanForm.penandatangan,
      tanggalLaporan: laporanForm.tanggalLaporan ? laporanForm.tanggalLaporan.toISOString() : undefined,
      fontFamily: fontFamily.value,
    };
    const res = await apiFetch(`/api/spd/${spdId}/laporan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showLaporanModal.value = false;
      toast.success('Laporan berhasil disimpan. Membuka halaman pratinjau cetak...');
      router.push(`/laporan/cetak/${spdId}`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menyimpan Laporan Perjalanan Dinas');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat memproses laporan');
  } finally {
    isPrintingLaporan.value = false;
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

        if (!matched && localStorage.getItem('user_is_penandatangan') === 'true') {
          matched = signersList.value.find((s) => {
            const sNip = (s.nip || '').replace(/[^0-9]/g, '');
            const sName = (s.nama || '').toLowerCase().trim();
            if (userNip && sNip && userNip.includes(sNip)) return true;
            if (userName && (sName.includes(userName) || userName.includes(sName))) return true;
            return false;
          });
        }

        selectedSigner.value = matched || signersList.value[0] || null;
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
                :value="spd?.status === 'SELESAI' ? 'SELESAI' : (spd?.status === 'DISETUJUI' ? 'DISETUJUI / DITANDATANGANI' : (spd?.status === 'ARSIP' ? 'ARSIP' : (spd?.status === 'BATAL' ? 'BATAL' : 'DRAFT')))"
                :severity="spd?.status === 'SELESAI' ? 'success' : (spd?.status === 'DISETUJUI' ? 'info' : (spd?.status === 'ARSIP' ? 'secondary' : (spd?.status === 'BATAL' ? 'danger' : 'warn')))"
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
            v-if="spd?.status !== 'ARSIP'"
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
            label="Unduh Bundel Arsip"
            icon="pi pi-file-export"
            severity="help"
            variant="outlined"
            size="small"
            :loading="isDownloadingBundle"
            @click="handleDownloadBundle"
            title="Unduh bundel berkas arsip lengkap (Cover + SPD + Laporan)"
          />
          <GovButton
            v-if="canManage && spd?.status !== 'ARSIP' && spd?.status !== 'BATAL'"
            label="Arsipkan"
            icon="pi pi-folder-plus"
            severity="secondary"
            variant="outlined"
            size="small"
            :loading="isArchiving"
            @click="handleQuickArchive"
            title="Arsipkan SPD ini sekarang"
          />
          <GovButton
            label="Cetak Dokumen"
            icon="pi pi-print"
            severity="primary"
            size="small"
            @click="handlePrint"
            title="Cetak langsung dokumen PDF resmi"
          />
          <GovButton
            label="Laporan Perjalanan Dinas"
            icon="pi pi-file-edit"
            severity="success"
            size="small"
            :disabled="isLaporanDisabled"
            @click="openLaporanModal"
            :title="isLaporanDisabled ? laporanDisabledReason : 'Buat dan cetak Laporan Perjalanan Dinas'"
          />
        </div>
      </div>

      <!-- Banner Dokumen Terkunci (ARSIP) -->
      <div
        v-if="spd?.status === 'ARSIP'"
        class="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-purple-900 dark:text-purple-200"
      >
        <div class="flex items-center gap-2">
          <i class="pi pi-lock text-purple-600 dark:text-purple-400 text-sm"></i>
          <span>Dokumen SPD ini telah <strong>diarsipkan resmi dan dikunci (Read-Only)</strong>. Untuk mengubah data, silakan pulihkan status terlebih dahulu di menu <strong>Arsip Dokumen</strong>.</span>
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

    <!-- MODAL BUAT LAPORAN PERJALANAN DINAS -->
    <Dialog
      v-model:visible="showLaporanModal"
      modal
      header="Buat Laporan Perjalanan Dinas"
      :style="{ width: '680px' }"
      class="p-dialog-gov"
    >
      <div class="space-y-4 pt-2">
        <!-- Info Context Card -->
        <div class="bg-slate-50 dark:bg-slate-900 border border-border rounded-lg p-3 text-xs space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-text-muted">Nomor Dokumen SPD:</span>
            <span class="font-mono font-bold text-primary">{{ spd?.nomorSpd || '-' }}</span>
          </div>
          <div class="flex items-center justify-between" v-if="spd?.suratTugas?.nomorSurat">
            <span class="text-text-muted">Surat Tugas Induk:</span>
            <span class="font-mono text-text-main">{{ spd?.suratTugas?.nomorSurat }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-text-muted">Pegawai Pelaksana:</span>
            <span class="font-semibold text-text-main">{{ spd?.pegawai?.nama || '-' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-text-muted">Lama Perjalanan:</span>
            <span class="font-medium text-text-main">{{ spd?.lamaHari ? `${spd.lamaHari} hari` : '-' }}</span>
          </div>
          <div class="pt-1.5 border-t border-border/60">
            <span class="text-text-muted block mb-0.5">Maksud Perjalanan:</span>
            <span class="text-text-main italic block leading-relaxed">{{ spd?.dalamRangka || '-' }}</span>
          </div>
        </div>

        <!-- Penanda Tangan Field -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-text-main">
            Penanda Tangan / Pejabat Tujuan Laporan <span class="text-red-500">*</span>
          </label>
          <GovSelect
            v-model="laporanForm.penandatangan"
            :options="penandatanganOptions"
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
            v-model="laporanForm.tanggalLaporan"
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
            v-model="laporanForm.hasilPerjalanan"
            rows="7"
            placeholder="Tuliskan uraian hasil pelaksanaan perjalanan dinas secara lengkap (mendukung multi-paragraf)..."
            :invalid="!!laporanErrors.hasilPerjalanan"
            class="text-justify"
            block
          />
          <small v-if="laporanErrors.hasilPerjalanan" class="text-red-500 text-xs block">
            {{ laporanErrors.hasilPerjalanan }}
          </small>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="showLaporanModal = false"
            :disabled="isGeneratingLaporan || isPrintingLaporan"
          />
          <GovButton
            label="Unduh PDF"
            icon="pi pi-download"
            severity="secondary"
            variant="outlined"
            size="small"
            :loading="isGeneratingLaporan"
            :disabled="isPrintingLaporan"
            @click="handleDownloadLaporan"
          />
          <GovButton
            label="Cetak Laporan"
            icon="pi pi-print"
            severity="success"
            size="small"
            :loading="isPrintingLaporan"
            :disabled="isGeneratingLaporan"
            @click="handlePrintLaporan"
          />
        </div>
      </template>
    </Dialog>
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
