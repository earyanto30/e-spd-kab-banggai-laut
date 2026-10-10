<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import {
  GovButton,
  GovSelect,
  GovMessage,
  GovInputText,
  GovInputNumber,
  GovMultiSelect,
  GovDatePicker,
  GovSelectButton,
} from '../components/core';
import { MODA_TRANSPORTASI_OPTIONS } from '@si-setda/shared-types';
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

export interface SuratTugasDetailData {
  id: string;
  nomorSurat: string;
  dasarHukum: string;
  dalamRangka: string;
  tempatDikeluarkan: string;
  tanggalSurat: string;
  penandatanganId?: string | null;
  penandatangan?: {
    id: string;
    nama: string;
    nip: string;
    jabatan: string;
    pangkat: string;
    golongan: string;
  } | null;
  penandatanganNama: string;
  penandatanganJabatan: string;
  penandatanganPangkat: string;
  penandatanganNip: string;
  kopSuratId?: string | null;
  alatAngkut?: string | null;
  tempatTujuan?: string | null;
  lamaHari?: number | null;
  tanggalBerangkat?: string | null;
  status: string;
  pegawaiList?: Array<{
    id?: string;
    nama: string;
    nip: string;
    jabatan: string;
    pangkat: string;
    golongan: string;
  }>;
  spdList?: Array<{
    id: string;
    nomorSpd: string;
    tempatBerangkat?: string;
    tempatTujuan?: string;
    lamaHari?: number;
    tanggalBerangkat?: string;
    tanggalKembali?: string;
    status?: string;
    pegawai?: {
      nama: string;
      nip: string;
      jabatan: string;
      pangkat: string;
      golongan: string;
    };
  }>;
}

const route = useRoute();
const router = useRouter();
const toast = useGovToast();

const suratTugasId = route.params.id as string;
const data = ref<SuratTugasDetailData | null>(null);
const loading = ref(true);
const errorMessage = ref('');

// Signer choices
const signersList = ref<OfficialSigner[]>([
  {
    nama: 'ARSID HAMIDI, SH',
    nip: '19700830 200312 1 003',
    pangkat: 'Pembina',
    golongan: 'IV/a',
    jabatan: 'KEPALA BAGIAN UMUM SETDA KAB. BANGGAI LAUT',
  },
  {
    nama: 'Saiful U. Usuria, SE., M.Si',
    nip: '19750510 200012 1 004',
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

const activePdfUrl = ref<string | null>(null);
const isLoadingPdfPreview = ref(false);
const isDownloadingPdf = ref(false);

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
    const res = await apiFetch(`/api/surat-tugas/${suratTugasId}/pdf?${q}`);
    if (res.ok) {
      const blob = await res.blob();
      activePdfUrl.value = URL.createObjectURL(blob);
    } else {
      const err = await res.json().catch(() => ({}));
      errorMessage.value = err.message || 'Gagal memuat dokumen PDF Surat Tugas';
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Terjadi kesalahan sistem saat memuat PDF';
  } finally {
    isLoadingPdfPreview.value = false;
  }
};

const handleDownloadPdf = async () => {
  isDownloadingPdf.value = true;
  try {
    const q = buildPdfQuery();
    const res = await apiFetch(`/api/surat-tugas/${suratTugasId}/pdf?${q}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNum = (data.value?.nomorSurat || 'Surat_Tugas').replace(/[\/\\]/g, '_');
      a.download = `Surat_Tugas_${cleanNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Dokumen PDF ${data.value?.nomorSurat || ''} berhasil diunduh`);
    } else {
      toast.error('Gagal mengunduh dokumen PDF');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat mengunduh PDF');
  } finally {
    isDownloadingPdf.value = false;
  }
};

const isPenandatanganUser = computed(() => {
  return localStorage.getItem('user_is_penandatangan') === 'true' ||
         localStorage.getItem('user_role') === 'PENANDATANGAN' ||
         localStorage.getItem('user_role') === 'ADMIN' ||
         localStorage.getItem('user_role') === 'SUPER_ADMIN';
});

const isSigningDoc = ref(false);

const handleSignDocument = async () => {
  isSigningDoc.value = true;
  try {
    const res = await apiFetch(`/api/surat-tugas/${suratTugasId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DISETUJUI' }),
    });
    if (res.ok) {
      toast.success(
        `Surat Tugas ${data.value?.nomorSurat || ''} berhasil ditandatangani!`,
        'Tanda Tangan Berhasil'
      );
      if (data.value) {
        data.value.status = 'DISETUJUI';
      }
      await loadPdfPreview();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menandatangani Surat Tugas');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem');
  } finally {
    isSigningDoc.value = false;
  }
};

const handleRevertDocument = async () => {
  isSigningDoc.value = true;
  try {
    const res = await apiFetch(`/api/surat-tugas/${suratTugasId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DRAFT' }),
    });
    if (res.ok) {
      toast.warn(
        `Tanda tangan pada Surat Tugas ${data.value?.nomorSurat || ''} telah dibatalkan.`,
        'Status Dikembalikan ke Draf'
      );
      if (data.value) {
        data.value.status = 'DRAFT';
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

const isGeneratingSpd = ref(false);
const showSpdDialog = ref(false);
const showGenerateSpdModal = ref(false);

const pemberiPerintahOptions = ['Pengguna Anggaran (PA)', 'Kuasa Pengguna Anggaran (KPA)'];
const transportOptions = [...MODA_TRANSPORTASI_OPTIONS];

const generateForm = reactive({
  pemberiPerintah: 'Pengguna Anggaran (PA)',
  alatAngkut: ['Mobil Dinas'] as string[],
  tempatBerangkat: 'Banggai',
  tempatTujuan: '',
  lamaHari: 1,
  tanggalBerangkat: new Date() as Date | null,
});

const generateErrors = reactive<Record<string, string>>({});

const angkaTerbilang = (n: number): string => {
  const kata = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (n <= 0) return 'nol';
  if (n < 12) return kata[n];
  if (n < 20) return `${kata[n - 10]} belas`;
  if (n < 100) return `${kata[Math.floor(n / 10)]} puluh${n % 10 ? ' ' + kata[n % 10] : ''}`;
  return String(n);
};

const generateLamaPerjalananDisplay = computed(() => {
  const days = Number(generateForm.lamaHari) || 0;
  return `${days} (${angkaTerbilang(days)}) Hari`;
});

const generateAlatAngkutDisplay = computed(() => {
  return generateForm.alatAngkut.length > 0 ? generateForm.alatAngkut.join(', ') : '-';
});

const calculatedTanggalKembali = computed(() => {
  if (!generateForm.tanggalBerangkat || !generateForm.lamaHari) return null;
  const d = new Date(generateForm.tanggalBerangkat);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + (Number(generateForm.lamaHari) - 1));
  return d;
});

const openGenerateSpdModal = () => {
  Object.keys(generateErrors).forEach((k) => delete generateErrors[k]);

  if (data.value) {
    if (data.value.alatAngkut) {
      generateForm.alatAngkut = data.value.alatAngkut
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    } else {
      generateForm.alatAngkut = ['Mobil Dinas'];
    }
    generateForm.tempatTujuan = data.value.tempatTujuan || '';
    generateForm.lamaHari = data.value.lamaHari || 1;
    if (data.value.tanggalBerangkat) {
      generateForm.tanggalBerangkat = new Date(data.value.tanggalBerangkat);
    } else {
      generateForm.tanggalBerangkat = new Date();
    }
  } else {
    generateForm.alatAngkut = ['Mobil Dinas'];
    generateForm.tempatTujuan = '';
    generateForm.lamaHari = 1;
    generateForm.tanggalBerangkat = new Date();
  }

  showGenerateSpdModal.value = true;
};

const validateGenerate = (): boolean => {
  Object.keys(generateErrors).forEach((k) => delete generateErrors[k]);

  if (!generateForm.alatAngkut || generateForm.alatAngkut.length === 0) {
    generateErrors.alatAngkut = 'Pilih minimal satu alat angkut / moda transportasi.';
  }
  if (!generateForm.tempatBerangkat.trim()) {
    generateErrors.tempatBerangkat = 'Tempat berangkat wajib diisi.';
  }
  if (!generateForm.tempatTujuan.trim()) {
    generateErrors.tempatTujuan = 'Tempat tujuan wajib diisi.';
  }
  if (!generateForm.lamaHari || generateForm.lamaHari < 1) {
    generateErrors.lamaHari = 'Lama perjalanan dinas minimal 1 hari.';
  }
  if (!generateForm.tanggalBerangkat) {
    generateErrors.tanggalBerangkat = 'Tanggal berangkat wajib dipilih.';
  }

  return Object.keys(generateErrors).length === 0;
};

const submitGenerateSpd = async () => {
  if (!validateGenerate()) {
    toast.warn('Mohon periksa dan lengkapi rincian parameter penerbitan SPD.');
    return;
  }

  isGeneratingSpd.value = true;
  try {
    const payload = {
      pemberiPerintah: generateForm.pemberiPerintah,
      alatAngkut: generateForm.alatAngkut.join(', '),
      tempatBerangkat: generateForm.tempatBerangkat.trim(),
      tempatTujuan: generateForm.tempatTujuan.trim(),
      lamaHari: Number(generateForm.lamaHari),
      tanggalBerangkat: new Date(generateForm.tanggalBerangkat!).toISOString(),
    };

    const res = await apiFetch(`/api/surat-tugas/${suratTugasId}/generate-spd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const result = await res.json();
      toast.success(result.message || 'Berhasil menerbitkan SPD!', 'SPD Diterbitkan');
      showGenerateSpdModal.value = false;
      await fetchData();
      showSpdDialog.value = true;
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menerbitkan dokumen SPD');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat menerbitkan SPD');
  } finally {
    isGeneratingSpd.value = false;
  }
};

const handleGenerateSpd = () => {
  // If SPD list already exists and has records, open dialog to view / print them directly
  if (data.value?.spdList && data.value.spdList.length > 0) {
    showSpdDialog.value = true;
    return;
  }
  openGenerateSpdModal();
};

const handleBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/surat-tugas');
  }
};

const handleOpenSpdPrint = (spdId: string) => {
  showSpdDialog.value = false;
  router.push(`/spd/cetak/${spdId}`);
};

const handleOpenSpdEdit = (spdId: string) => {
  showSpdDialog.value = false;
  router.push(`/spd/edit/${spdId}`);
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

// Deletion States
const isDeletingSpd = ref(false);
const spdToDelete = ref<any | null>(null);
const showDeleteSpdConfirm = ref(false);

const confirmDeleteSpd = (spd: any) => {
  spdToDelete.value = spd;
  showDeleteSpdConfirm.value = true;
};

const handleDeleteSpd = async () => {
  if (!spdToDelete.value) return;
  isDeletingSpd.value = true;
  try {
    const res = await apiFetch(`/api/spd/${spdToDelete.value.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success(`Dokumen SPD nomor ${spdToDelete.value.nomorSpd} berhasil dihapus.`);
      showDeleteSpdConfirm.value = false;
      spdToDelete.value = null;
      await fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menghapus dokumen SPD');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat menghapus SPD');
  } finally {
    isDeletingSpd.value = false;
  }
};

const isDeletingAllSpd = ref(false);
const showDeleteAllSpdConfirm = ref(false);

const handleDeleteAllSpd = async () => {
  isDeletingAllSpd.value = true;
  try {
    const res = await apiFetch(`/api/surat-tugas/${suratTugasId}/spds`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const result = await res.json();
      toast.success(result.message || 'Seluruh dokumen SPD terhubung berhasil dihapus.');
      showDeleteAllSpdConfirm.value = false;
      showSpdDialog.value = false;
      await fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menghapus seluruh dokumen SPD');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat menghapus seluruh dokumen SPD');
  } finally {
    isDeletingAllSpd.value = false;
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

const fetchData = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [stRes, signersRes] = await Promise.all([
      apiFetch(`/api/surat-tugas/${suratTugasId}`),
      apiFetch('/api/pegawai?isPenandatangan=true'),
    ]);

    if (stRes.ok) {
      data.value = await stRes.json();
    } else {
      errorMessage.value = 'Dokumen Surat Tugas tidak ditemukan.';
      return;
    }

    if (signersRes.ok) {
      const signersData = await signersRes.json();
      if (Array.isArray(signersData) && signersData.length > 0) {
        signersList.value = signersData.map((p: any) => ({
          id: p.id,
          nama: p.nama,
          nip: p.nip,
          pangkat: p.pangkat,
          golongan: p.golongan,
          jabatan: p.jabatan,
        }));

        const targetSignerId = data.value?.penandatanganId || data.value?.penandatangan?.id;
        const docNip = (data.value?.penandatanganNip || '').replace(/[^0-9]/g, '');
        const docName = (data.value?.penandatanganNama || '').toLowerCase().trim();
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
    errorMessage.value = err.message || 'Terjadi kesalahan sistem.';
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
    <!-- Top Action Bar -->
    <div class="no-print max-w-5xl mx-auto space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold text-text-main">
                Dokumen Surat Tugas
              </h1>
              <span class="text-xs px-2 py-0.5 rounded font-mono bg-blue-100 dark:bg-blue-900/40 text-primary font-semibold">
                {{ data?.nomorSurat || 'DRAFT' }}
              </span>
              <Tag
                :value="data?.status === 'DISETUJUI' ? 'DISETUJUI / DITANDATANGANI' : 'DRAFT'"
                :severity="data?.status === 'DISETUJUI' ? 'success' : 'warn'"
                class="text-[10px] font-bold"
              />
            </div>
            <p class="text-xs text-text-muted mt-0.5">
              Dokumen Resmi Penugasan Personil ASN &bull; Terpadu Kop Surat &bull; Ukuran Legal
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
            v-if="data?.status === 'DRAFT' && isPenandatanganUser"
            label="Tandatangani Surat Tugas"
            icon="pi pi-check-circle"
            severity="success"
            size="small"
            :loading="isSigningDoc"
            @click="handleSignDocument"
            title="Tandatangani resmi dokumen Surat Tugas ini"
          />
          <GovButton
            v-else-if="data?.status === 'DISETUJUI' && isPenandatanganUser"
            label="Batal Tanda Tangan"
            icon="pi pi-undo"
            severity="warn"
            variant="outlined"
            size="small"
            :loading="isSigningDoc"
            @click="handleRevertDocument"
            title="Batalkan persetujuan / kembalikan status ke Draf"
          />
          <GovButton
            label="Edit Surat"
            icon="pi pi-pencil"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="router.push(`/surat-tugas/edit/${suratTugasId}`)"
            title="Edit rincian dokumen Surat Tugas ini"
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
          <GovButton
            :label="data?.spdList && data.spdList.length > 0 ? 'Daftar SPD' : 'Terbitkan SPD'"
            :icon="data?.spdList && data.spdList.length > 0 ? 'pi pi-list' : 'pi pi-file-import'"
            severity="success"
            variant="outlined"
            size="small"
            :loading="isGeneratingSpd"
            title="Terbitkan atau lihat Surat Perjalanan Dinas (SPD) untuk personil penugasan ini"
            @click="handleGenerateSpd"
          />
        </div>
      </div>

      <!-- Quick Document Settings -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4 text-xs">
        <div class="flex flex-wrap items-center gap-6">
          <!-- Penandatangan Info (Ditetapkan saat pembuatan Surat Tugas) -->
          <div class="flex items-center gap-2">
            <span class="text-text-muted">Pejabat Penandatangan:</span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-medium">
              <i class="pi pi-user-check text-xs text-primary"></i>
              <span>{{ data?.penandatangan?.nama || data?.penandatanganNama || '-' }}</span>
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
            Personil: <strong class="text-text-main">{{ data?.pegawaiList?.length || data?.spdList?.length || 0 }} Orang</strong>
          </span>
          <span>&bull;</span>
          <span>
            Ukuran: <strong class="text-text-main font-mono">Legal (8.5" &times; 14")</strong>
          </span>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="no-print max-w-5xl mx-auto">
      <GovMessage severity="error">{{ errorMessage }}</GovMessage>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="no-print flex justify-center py-16">
      <div class="flex items-center gap-3 text-text-muted">
        <i class="pi pi-spin pi-spinner text-xl text-primary"></i>
        <span>Memuat data dan pratinjau dokumen Surat Tugas...</span>
      </div>
    </div>

    <!-- Native PDF Object Preview -->
    <div v-else-if="data" class="flex flex-col items-center pb-16 px-4">
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

        <!-- Daftar Dokumen SPD Terhubung (Jika Sudah Diterbitkan) -->
        <div
          v-if="data?.spdList && data.spdList.length > 0"
          class="w-full no-print bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4"
        >
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <i class="pi pi-file-import text-xl"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-text-main flex flex-wrap items-center gap-2">
                  <span>Daftar Surat Perjalanan Dinas (SPD) Terhubung</span>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    {{ data.spdList.length }} Dokumen Diterbitkan
                  </span>
                </h3>
                <p class="text-xs text-text-muted mt-0.5">
                  Dokumen SPD resmi yang telah diterbitkan untuk personil yang bertugas berdasarkan Surat Tugas ini.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <GovButton
                label="Terbitkan / Ubah SPD"
                icon="pi pi-sync"
                severity="secondary"
                variant="outlined"
                size="small"
                @click="openGenerateSpdModal"
                title="Terbitkan atau ubah parameter SPD dengan rincian perjalanan dinas baru"
              />
              <GovButton
                label="Hapus Semua SPD"
                icon="pi pi-trash"
                severity="danger"
                variant="outlined"
                size="small"
                @click="showDeleteAllSpdConfirm = true"
                title="Hapus seluruh dokumen SPD yang terhubung dengan Surat Tugas ini"
              />
              <GovButton
                label="Buka Dialog Ringkasan"
                icon="pi pi-external-link"
                severity="secondary"
                variant="outlined"
                size="small"
                @click="showSpdDialog = true"
              />
            </div>
          </div>

          <!-- Grid Daftar Dokumen SPD -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div
              v-for="(spd, idx) in data.spdList"
              :key="spd.id"
              class="flex flex-col justify-between p-4 rounded-xl border border-border bg-surface-ground/30 hover:bg-surface-ground hover:border-primary/40 transition space-y-3"
            >
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <i class="pi pi-file text-primary text-xs"></i>
                    <span class="text-xs font-mono font-bold text-primary">{{ spd.nomorSpd }}</span>
                  </div>
                  <Tag
                    :value="spd.status || 'DRAFT'"
                    :severity="spd.status === 'DISETUJUI' ? 'info' : (spd.status === 'SELESAI' ? 'success' : 'warn')"
                    class="text-[10px] py-0 px-2"
                  />
                </div>

                <div>
                  <div class="text-xs font-bold text-text-main">
                    {{ idx + 1 }}. {{ spd.pegawai?.nama || 'Pegawai Pelaksana' }}
                  </div>
                  <div class="text-[11px] text-text-muted mt-0.5 flex flex-wrap gap-x-2">
                    <span>NIP: <span class="font-mono">{{ spd.pegawai?.nip || '-' }}</span></span>
                    <span>&bull;</span>
                    <span>{{ spd.pegawai?.jabatan || '-' }}</span>
                  </div>
                </div>

                <div v-if="spd.tempatTujuan || spd.tanggalBerangkat" class="text-[11px] text-text-muted bg-surface p-2 rounded-lg border border-border/60 flex items-center justify-between">
                  <div>
                    <span>Tujuan: <strong class="text-text-main">{{ spd.tempatTujuan || 'Sesuai Penugasan' }}</strong></span>
                    <span v-if="spd.lamaHari"> ({{ spd.lamaHari }} Hari)</span>
                  </div>
                  <div v-if="spd.tanggalBerangkat" class="text-[10px] font-medium text-text-muted">
                    {{ formatDate(spd.tanggalBerangkat) }}
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2 pt-2 border-t border-border/50">
                <GovButton
                  label="Buka / Cetak SPD"
                  icon="pi pi-print"
                  severity="primary"
                  size="small"
                  class="flex-1"
                  @click="handleOpenSpdPrint(spd.id)"
                />
                <GovButton
                  label="Edit"
                  icon="pi pi-pencil"
                  severity="secondary"
                  variant="outlined"
                  size="small"
                  @click="handleOpenSpdEdit(spd.id)"
                  title="Edit rincian dokumen SPD ini"
                />
                <GovButton
                  icon="pi pi-trash"
                  severity="danger"
                  variant="outlined"
                  size="small"
                  @click="confirmDeleteSpd(spd)"
                  title="Hapus dokumen SPD ini"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Banner jika belum diterbitkan -->
        <div
          v-else
          class="w-full no-print bg-surface border border-dashed border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <i class="pi pi-info-circle text-xl"></i>
            </div>
            <div>
              <h4 class="text-xs font-bold text-text-main">
                Surat Perjalanan Dinas (SPD) Belum Diterbitkan
              </h4>
              <p class="text-[11px] text-text-muted mt-0.5">
                Surat Tugas ini memiliki {{ data?.pegawaiList?.length || 0 }} personil penugasan. Klik tombol di samping untuk menerbitkan seluruh dokumen SPD secara instan.
              </p>
            </div>
          </div>

          <GovButton
            label="Terbitkan SPD Sekarang"
            icon="pi pi-file-import"
            severity="success"
            size="small"
            :loading="isGeneratingSpd"
            @click="openGenerateSpdModal"
          />
        </div>
      </div>
    </div>

    <!-- Modal Daftar SPD Terhubung -->
    <Dialog
      v-model:visible="showSpdDialog"
      modal
      header="Surat Perjalanan Dinas (SPD) Terhubung"
      :style="{ width: '560px' }"
    >
      <div class="space-y-4">
        <p class="text-xs text-text-muted">
          Berikut adalah daftar dokumen Surat Perjalanan Dinas (SPD) yang diterbitkan berdasarkan Surat Tugas nomor
          <span class="font-bold text-text-main font-mono">{{ data?.nomorSurat }}</span>.
        </p>

        <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          <div
            v-for="(spd, idx) in data?.spdList || []"
            :key="spd.id"
            class="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-ground/50 hover:bg-surface-ground transition"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold text-text-main">{{ spd.nomorSpd }}</span>
                <Tag value="DRAFT" severity="warn" class="text-[10px] py-0 px-1.5" />
              </div>
              <div class="text-xs text-text-main font-medium">
                {{ idx + 1 }}. {{ spd.pegawai?.nama || 'Pegawai' }}
              </div>
              <div class="text-[11px] text-text-muted">
                NIP: {{ spd.pegawai?.nip || '-' }} • {{ spd.pegawai?.jabatan || '-' }}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <GovButton
                label="Buka / Cetak SPD"
                icon="pi pi-external-link"
                severity="primary"
                size="small"
                @click="handleOpenSpdPrint(spd.id)"
              />
              <GovButton
                icon="pi pi-trash"
                severity="danger"
                variant="outlined"
                size="small"
                @click="confirmDeleteSpd(spd)"
                title="Hapus dokumen SPD ini"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-border">
          <div class="flex items-center gap-2">
            <GovButton
              label="Hapus Semua SPD"
              icon="pi pi-trash"
              severity="danger"
              variant="text"
              size="small"
              @click="showDeleteAllSpdConfirm = true"
            />
            <GovButton
              label="Terbitkan Ulang SPD"
              icon="pi pi-refresh"
              severity="secondary"
              variant="outlined"
              size="small"
              @click="showSpdDialog = false; openGenerateSpdModal()"
            />
          </div>
          <GovButton
            label="Tutup"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="showSpdDialog = false"
          />
        </div>
      </div>
    </Dialog>

    <!-- Modal Konfirmasi Hapus Single SPD -->
    <Dialog
      v-model:visible="showDeleteSpdConfirm"
      modal
      header="Konfirmasi Hapus Dokumen SPD"
      :style="{ width: '450px' }"
    >
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <i class="pi pi-exclamation-triangle text-xl"></i>
          </div>
          <div>
            <p class="text-sm text-text-main font-medium">
              Apakah Anda yakin ingin menghapus dokumen SPD ini?
            </p>
            <div class="mt-2 text-xs text-text-muted bg-surface-ground p-2.5 rounded-lg border border-border space-y-1">
              <div>Nomor SPD: <strong class="text-text-main font-mono">{{ spdToDelete?.nomorSpd }}</strong></div>
              <div>Personil: <strong class="text-text-main">{{ spdToDelete?.pegawai?.nama }}</strong></div>
            </div>
            <p class="text-xs text-red-600 dark:text-red-400 mt-2">
              Tindakan ini akan menghapus dokumen SPD tersebut dari sistem. Anda dapat menerbitkan ulang dokumen SPD kapan saja.
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="showDeleteSpdConfirm = false"
            :disabled="isDeletingSpd"
          />
          <GovButton
            label="Hapus SPD"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            :loading="isDeletingSpd"
            @click="handleDeleteSpd"
          />
        </div>
      </div>
    </Dialog>

    <!-- Modal Konfirmasi Hapus Seluruh SPD -->
    <Dialog
      v-model:visible="showDeleteAllSpdConfirm"
      modal
      header="Hapus Seluruh Dokumen SPD Terhubung"
      :style="{ width: '480px' }"
    >
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <i class="pi pi-exclamation-triangle text-xl"></i>
          </div>
          <div>
            <p class="text-sm text-text-main font-medium">
              Apakah Anda yakin ingin menghapus seluruh dokumen SPD yang terhubung dengan Surat Tugas ini?
            </p>
            <p class="text-xs text-text-muted mt-1.5 leading-relaxed">
              Sebanyak <strong>{{ data?.spdList?.length || 0 }} dokumen SPD</strong> akan dihapus. Surat Tugas ini akan kembali ke status belum menerbitkan SPD, dan Anda dapat menerbitkannya kembali kapan saja.
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="showDeleteAllSpdConfirm = false"
            :disabled="isDeletingAllSpd"
          />
          <GovButton
            label="Hapus Semua Dokumen SPD"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            :loading="isDeletingAllSpd"
            @click="handleDeleteAllSpd"
          />
        </div>
      </div>
    </Dialog>

    <!-- Modal Input Parameter Penerbitan SPD -->
    <Dialog
      v-model:visible="showGenerateSpdModal"
      modal
      header="Parameter Penerbitan Surat Perjalanan Dinas (SPD)"
      :style="{ width: '640px' }"
    >
      <div class="space-y-5 pt-1">
        <p class="text-xs text-text-muted">
          Rincian berikut akan diterapkan ke dokumen SPD untuk seluruh personil penugasan (<strong class="text-text-main">{{ data?.pegawaiList?.length || 0 }} personil</strong>) pada Surat Tugas nomor <span class="font-mono font-bold text-text-main">{{ data?.nomorSurat }}</span>.
        </p>

        <!-- 1. Pejabat Pemberi Perintah -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-text-main">
            1. Pejabat Pemberi Perintah <span class="text-red-500">*</span>
          </label>
          <GovSelectButton
            v-model="generateForm.pemberiPerintah"
            :options="pemberiPerintahOptions"
            class="w-full sm:w-auto"
          />
        </div>

        <!-- 2. Alat Angkut / Moda Transportasi -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-text-main">
            2. Alat Angkut / Moda Transportasi <span class="text-red-500">*</span>
          </label>
          <GovMultiSelect
            v-model="generateForm.alatAngkut"
            :options="transportOptions"
            placeholder="Pilih moda transportasi..."
            display="chip"
            :invalid="!!generateErrors.alatAngkut"
          />
          <div class="text-[11px] text-text-muted">
            Format Dokumen: <span class="font-medium text-text-main">{{ generateAlatAngkutDisplay }}</span>
          </div>
          <small v-if="generateErrors.alatAngkut" class="text-red-500 text-xs block">
            {{ generateErrors.alatAngkut }}
          </small>
        </div>

        <!-- 3 & 4. Tempat Berangkat & Tempat Tujuan -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-text-main">
              3. Tempat Berangkat <span class="text-red-500">*</span>
            </label>
            <GovInputText
              v-model="generateForm.tempatBerangkat"
              placeholder="Contoh: Banggai"
              :invalid="!!generateErrors.tempatBerangkat"
              block
            />
            <small v-if="generateErrors.tempatBerangkat" class="text-red-500 text-xs block">
              {{ generateErrors.tempatBerangkat }}
            </small>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-text-main">
              4. Tempat Tujuan <span class="text-red-500">*</span>
            </label>
            <GovInputText
              v-model="generateForm.tempatTujuan"
              placeholder="Contoh: Palu / Luwuk / Jakarta"
              :invalid="!!generateErrors.tempatTujuan"
              block
            />
            <small v-if="generateErrors.tempatTujuan" class="text-red-500 text-xs block">
              {{ generateErrors.tempatTujuan }}
            </small>
          </div>
        </div>

        <!-- 5 & 6. Lama Perjalanan & Tanggal Berangkat -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-text-main">
              5. Lama Perjalanan Dinas <span class="text-red-500">*</span>
            </label>
            <GovInputNumber
              v-model="generateForm.lamaHari"
              :min="1"
              :max="90"
              :step="1"
              button-layout="horizontal"
              :invalid="!!generateErrors.lamaHari"
            />
            <div class="text-[11px] text-text-muted">
              Format Hasil: <span class="font-semibold text-primary">{{ generateLamaPerjalananDisplay }}</span>
            </div>
            <small v-if="generateErrors.lamaHari" class="text-red-500 text-xs block">
              {{ generateErrors.lamaHari }}
            </small>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-text-main">
              6. Tanggal Berangkat <span class="text-red-500">*</span>
            </label>
            <GovDatePicker
              v-model="generateForm.tanggalBerangkat"
              date-format="dd/mm/yy"
              placeholder="Pilih tanggal keberangkatan"
              :invalid="!!generateErrors.tanggalBerangkat"
            />
            <div v-if="calculatedTanggalKembali" class="text-[11px] text-text-muted">
              Estimasi Kembali: <span class="font-medium text-text-main">{{ formatDate(calculatedTanggalKembali.toISOString()) }}</span>
            </div>
            <small v-if="generateErrors.tanggalBerangkat" class="text-red-500 text-xs block">
              {{ generateErrors.tanggalBerangkat }}
            </small>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="showGenerateSpdModal = false"
            :disabled="isGeneratingSpd"
          />
          <GovButton
            label="Terbitkan Dokumen SPD"
            icon="pi pi-check"
            severity="success"
            size="small"
            :loading="isGeneratingSpd"
            @click="submitGenerateSpd"
          />
        </div>
      </div>
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
