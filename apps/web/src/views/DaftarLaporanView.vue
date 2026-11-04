<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
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

const rawList = ref<LaporanItem[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const filterStatusLaporan = ref<'ALL' | 'SUDAH' | 'BELUM'>('ALL');
const filterPejabat = ref<string>('ALL');

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

    // Keyword Search
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const numMatch = (item.nomorSpd || '').toLowerCase().includes(q);
      const stMatch = (item.suratTugas?.nomorSurat || '').toLowerCase().includes(q);
      const pegMatch = (item.pegawai?.nama || '').toLowerCase().includes(q) || (item.pegawai?.nip || '').includes(q);
      const purposeMatch = (item.dalamRangka || '').toLowerCase().includes(q);
      const officialMatch = (item.laporan?.penandatangan || '').toLowerCase().includes(q);
      return numMatch || stMatch || pegMatch || purposeMatch || officialMatch;
    }

    return true;
  });
});

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

const handlePrintDirect = async (item: LaporanItem) => {
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
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 3000);
        }, 200);
      };
      toast.success('Dokumen Laporan Perjalanan Dinas siap dicetak');
    } else {
      toast.error('Gagal mencetak dokumen Laporan');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan saat memproses cetak');
  }
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
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (printAfter) {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
            }, 3000);
          }, 200);
        };
        toast.success('Laporan berhasil disimpan dan siap dicetak');
      } else {
        const a = document.createElement('a');
        a.href = url;
        const cleanNum = (activeItem.value.nomorSpd || 'SPD').replace(/[\/\\]/g, '_').trim();
        a.download = `Laporan_SPD_${cleanNum}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success('Laporan berhasil disimpan dan diunduh');
      }

      showModal.value = false;
      await fetchList();
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

    <!-- Main Table Container -->
    <GovCard>
      <!-- Filter Toolbar -->
      <div class="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div class="flex flex-wrap items-center gap-2.5 flex-1">
          <div class="w-full sm:w-64">
            <GovInputText
              v-model="searchQuery"
              placeholder="Cari nomor SPD, pegawai, maksud..."
              block
            />
          </div>
          <div class="w-full sm:w-48">
            <GovSelect
              v-model="filterStatusLaporan"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              block
            />
          </div>
          <div class="w-full sm:w-48">
            <GovSelect
              v-model="filterPejabat"
              :options="pejabatOptions"
              option-label="label"
              option-value="value"
              block
            />
          </div>
        </div>
        <GovButton
          label="Segarkan"
          icon="pi pi-refresh"
          severity="secondary"
          variant="outlined"
          size="small"
          :loading="loading"
          @click="fetchList"
        />
      </div>

      <!-- Data Table -->
      <GovTable
        :value="filteredList"
        :loading="loading"
        responsive-layout="scroll"
        data-key="id"
      >
        <template #empty>
          <div class="py-12 text-center text-text-muted">
            <i class="pi pi-inbox text-3xl mb-2 block opacity-40"></i>
            Tidak ada dokumen Laporan Perjalanan Dinas yang sesuai filter.
          </div>
        </template>

        <Column header="No." :style="{ width: '60px' }">
          <template #body="{ index }">
            <span class="text-xs text-text-muted">{{ index + 1 }}</span>
          </template>
        </Column>

        <Column header="Dokumen Penugasan" :style="{ minWidth: '220px' }">
          <template #body="{ data }">
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-text-main font-mono">
                  {{ data.nomorSpd }}
                </span>
              </div>
              <div class="text-[11px] text-text-muted font-mono flex items-center gap-1">
                <i class="pi pi-file-edit text-[10px]"></i>
                <span>ST: {{ data.suratTugas?.nomorSurat || '-' }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Pegawai Pelaksana" :style="{ minWidth: '180px' }">
          <template #body="{ data }">
            <div>
              <div class="font-medium text-xs text-text-main">
                {{ data.pegawai?.nama || '-' }}
              </div>
              <div class="text-[11px] text-text-muted">
                NIP: {{ data.pegawai?.nip || '-' }}
              </div>
            </div>
          </template>
        </Column>

        <Column header="Maksud Perjalanan" :style="{ minWidth: '240px' }">
          <template #body="{ data }">
            <div class="text-xs text-text-main line-clamp-2" :title="data.dalamRangka">
              {{ data.dalamRangka }}
            </div>
            <div class="text-[11px] text-text-muted mt-0.5">
              Durasi: {{ data.lamaHari ? `${data.lamaHari} hari` : '-' }}
            </div>
          </template>
        </Column>

        <Column header="Pejabat Tujuan" :style="{ minWidth: '150px' }">
          <template #body="{ data }">
            <span v-if="data.laporan?.penandatangan" class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-primary border border-blue-200 dark:border-blue-800">
              {{ data.laporan.penandatangan }}
            </span>
            <span v-else class="text-xs text-text-muted italic">-</span>
          </template>
        </Column>

        <Column header="Tanggal Laporan" :style="{ width: '130px' }">
          <template #body="{ data }">
            <span class="text-xs text-text-main">
              {{ formatDate(data.laporan?.tanggalLaporan) }}
            </span>
          </template>
        </Column>

        <Column header="Status" :style="{ width: '120px' }">
          <template #body="{ data }">
            <Tag
              :value="data.laporan ? 'Sudah Dibuat' : 'Belum Dibuat'"
              :severity="data.laporan ? 'success' : 'warn'"
              class="text-[10px] font-semibold"
            />
          </template>
        </Column>

        <Column header="Aksi" :style="{ width: '160px', textAlign: 'right' }" frozen align-frozen="right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-1">
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
                  severity="secondary"
                  variant="text"
                  size="small"
                  rounded
                  title="Sunting Laporan"
                  @click="openEditor(data)"
                />
              </template>

              <!-- Jika Laporan Belum Ada -->
              <template v-else>
                <GovButton
                  v-if="canCreate"
                  label="Buat Laporan"
                  icon="pi pi-plus"
                  severity="success"
                  variant="outlined"
                  size="small"
                  @click="openEditor(data)"
                />
                <span v-else class="text-xs text-text-muted italic">Belum dibuat</span>
              </template>
            </div>
          </template>
        </Column>
      </GovTable>
    </GovCard>

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
  </div>
</template>
