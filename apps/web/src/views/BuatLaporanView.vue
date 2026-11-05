<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { AutoCompleteCompleteEvent } from 'primevue/autocomplete';
import Tag from 'primevue/tag';
import {
  GovButton,
  GovSelect,
  GovTextarea,
  GovDatePicker,
  GovCard,
  GovAutoComplete,
} from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';

export interface SpdEligibleItem {
  id: string;
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
  tempatBerangkat?: string;
  tempatTujuan?: string;
  status: string;
  laporan?: {
    id: string;
    hasilPerjalanan: string;
    penandatangan: string;
    tanggalLaporan: string;
  } | null;
}

const router = useRouter();
const route = useRoute();
const toast = useGovToast();

const loadingSpds = ref(false);
const eligibleSpds = ref<SpdEligibleItem[]>([]);
const selectedSpdRaw = ref<any>(null);
const spdSuggestions = ref<SpdEligibleItem[]>([]);
const isSubmitting = ref(false);
const isPrinting = ref(false);
const isDownloading = ref(false);
const formError = ref('');

const penandatanganOptions = [
  { label: 'Kepala Bagian (Kepala Bagian Umum Setda)', value: 'Kepala Bagian' },
  { label: 'Sekertaris Daerah (Sekretaris Daerah Kab. Banggai Laut)', value: 'Sekertaris Daerah' },
  { label: 'Bupati (Bupati Banggai Laut)', value: 'Bupati' },
  { label: 'Wakil Bupati (Wakil Bupati Banggai Laut)', value: 'Wakil Bupati' },
];

const form = ref({
  penandatangan: 'Kepala Bagian' as 'Bupati' | 'Wakil Bupati' | 'Kepala Bagian' | 'Sekertaris Daerah',
  tanggalLaporan: new Date() as Date | null,
  hasilPerjalanan: '',
});

const selectedSpd = computed<SpdEligibleItem | null>(() => {
  if (!selectedSpdRaw.value) return null;
  if (typeof selectedSpdRaw.value === 'object' && selectedSpdRaw.value.id) {
    return selectedSpdRaw.value;
  }
  return eligibleSpds.value.find((s) => s.id === selectedSpdRaw.value) || null;
});

const selectedSpdId = computed(() => selectedSpd.value?.id || '');

const formatSpdLabel = (item: any) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const num = item.nomorSpd || 'SPD';
  const name = item.pegawai?.nama ? ` - ${item.pegawai.nama}` : '';
  return `${num}${name}`;
};

const handleSearchSpd = (event: AutoCompleteCompleteEvent) => {
  const query = (event.query || '').toLowerCase().trim();
  if (!query) {
    spdSuggestions.value = [];
    return;
  }
  spdSuggestions.value = eligibleSpds.value.filter((item) => {
    const num = (item.nomorSpd || '').toLowerCase();
    const peg = (item.pegawai?.nama || '').toLowerCase();
    const nip = (item.pegawai?.nip || '').toLowerCase();
    const st = (item.suratTugas?.nomorSurat || '').toLowerCase();
    const purpose = (item.dalamRangka || '').toLowerCase();
    return (
      num.includes(query) ||
      peg.includes(query) ||
      nip.includes(query) ||
      st.includes(query) ||
      purpose.includes(query)
    );
  });
};

const onSpdSelected = (event: any) => {
  selectedSpdRaw.value = event.value;
};

const clearSelectedSpd = () => {
  selectedSpdRaw.value = null;
  spdSuggestions.value = [];
};

const isKpa = computed(() => {
  return (selectedSpd.value?.pemberiPerintah || '').toLowerCase().includes('kuasa');
});

const defaultSuggestedPenandatangan = computed(() => {
  return isKpa.value ? 'Sekertaris Daerah' : 'Kepala Bagian';
});

// Update form fields when selected SPD changes
watch(
  selectedSpd,
  (spd) => {
    if (!spd) return;
    formError.value = '';

    const defaultOfficial = (spd.pemberiPerintah || '').toLowerCase().includes('kuasa')
      ? 'Sekertaris Daerah'
      : 'Kepala Bagian';

    if (spd.laporan) {
      form.value.penandatangan = (spd.laporan.penandatangan as any) || defaultOfficial;
      form.value.hasilPerjalanan = spd.laporan.hasilPerjalanan || '';
      form.value.tanggalLaporan = spd.laporan.tanggalLaporan
        ? new Date(spd.laporan.tanggalLaporan)
        : spd.tanggalKembali
        ? new Date(spd.tanggalKembali)
        : new Date();
    } else {
      form.value.penandatangan = defaultOfficial;
      form.value.hasilPerjalanan = '';
      form.value.tanggalLaporan = spd.tanggalKembali
        ? new Date(spd.tanggalKembali)
        : new Date();
    }
  },
  { immediate: true }
);

const fetchSpdList = async () => {
  loadingSpds.value = true;
  try {
    const res = await apiFetch('/api/spd');
    if (res.ok) {
      const data: SpdEligibleItem[] = await res.json();
      // Eligible SPDs must be DISETUJUI with duration, SELESAI, or already have laporan
      eligibleSpds.value = data.filter(
        (item) => (item.status === 'DISETUJUI' && !!item.lamaHari) || item.status === 'SELESAI' || !!item.laporan
      );

      // Check query param spdId or route param id
      const qSpdId = (route.params.id as string) || (route.query.spdId as string) || '';
      if (qSpdId) {
        const found = eligibleSpds.value.find((s) => s.id === qSpdId);
        if (found) {
          selectedSpdRaw.value = found;
        }
      }
    } else {
      toast.error('Gagal mengambil daftar dokumen SPD');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat mengambil data SPD');
  } finally {
    loadingSpds.value = false;
  }
};

const formatDate = (val?: string | Date | null) => {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

const validateForm = (): boolean => {
  formError.value = '';
  if (!selectedSpdId.value) {
    formError.value = 'Silakan pilih Surat Perjalanan Dinas (SPD) terlebih dahulu.';
    return false;
  }
  if (!form.value.penandatangan) {
    formError.value = 'Silakan tentukan pejabat penanda tangan / tujuan laporan.';
    return false;
  }
  if (!form.value.hasilPerjalanan.trim()) {
    formError.value = 'Uraian hasil pelaksanaan perjalanan dinas wajib diisi.';
    return false;
  }
  return true;
};

// 1. Simpan Data Laporan Saja
const handleSaveOnly = async () => {
  if (!validateForm()) return;
  isSubmitting.value = true;
  try {
    const res = await apiFetch(`/api/spd/${selectedSpdId.value}/laporan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hasilPerjalanan: form.value.hasilPerjalanan.trim(),
        penandatangan: form.value.penandatangan,
        tanggalLaporan: form.value.tanggalLaporan ? form.value.tanggalLaporan.toISOString() : undefined,
        fontFamily: 'arial',
      }),
    });

    if (res.ok) {
      toast.success('Laporan Perjalanan Dinas berhasil disimpan');
      router.push(`/laporan/cetak/${selectedSpdId.value}`);
    } else {
      const errData = await res.json().catch(() => ({}));
      formError.value = errData.message || 'Gagal menyimpan laporan perjalanan dinas';
      toast.error(formError.value);
    }
  } catch (err: any) {
    formError.value = err.message || 'Terjadi kesalahan sistem saat menyimpan laporan';
    toast.error(formError.value);
  } finally {
    isSubmitting.value = false;
  }
};

// 2. Simpan & Unduh Berkas PDF
const handleSaveAndDownload = async () => {
  if (!validateForm()) return;
  isDownloading.value = true;
  try {
    const res = await apiFetch(`/api/spd/${selectedSpdId.value}/laporan-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hasilPerjalanan: form.value.hasilPerjalanan.trim(),
        penandatangan: form.value.penandatangan,
        tanggalLaporan: form.value.tanggalLaporan ? form.value.tanggalLaporan.toISOString() : undefined,
        fontFamily: 'arial',
      }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanNum = (selectedSpd.value?.nomorSpd || 'SPD').replace(/[\/\\]/g, '_').trim();
      a.download = `Laporan_SPD_${cleanNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success('Laporan berhasil disimpan dan dokumen PDF berhasil diunduh');
      router.push(`/laporan/cetak/${selectedSpdId.value}`);
    } else {
      const errData = await res.json().catch(() => ({}));
      formError.value = errData.message || 'Gagal membuat berkas PDF laporan';
      toast.error(formError.value);
    }
  } catch (err: any) {
    formError.value = err.message || 'Terjadi kesalahan sistem saat mengunduh berkas';
    toast.error(formError.value);
  } finally {
    isDownloading.value = false;
  }
};

// 3. Simpan & Ke Halaman Cetak Laporan
const handleSaveAndPrint = async () => {
  if (!validateForm()) return;
  isPrinting.value = true;
  try {
    const res = await apiFetch(`/api/spd/${selectedSpdId.value}/laporan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hasilPerjalanan: form.value.hasilPerjalanan.trim(),
        penandatangan: form.value.penandatangan,
        tanggalLaporan: form.value.tanggalLaporan ? form.value.tanggalLaporan.toISOString() : undefined,
        fontFamily: 'arial',
      }),
    });

    if (res.ok) {
      toast.success('Laporan berhasil disimpan. Membuka halaman pratinjau cetak...');
      router.push(`/laporan/cetak/${selectedSpdId.value}`);
    } else {
      const errData = await res.json().catch(() => ({}));
      formError.value = errData.message || 'Gagal menyimpan laporan perjalanan dinas';
      toast.error(formError.value);
    }
  } catch (err: any) {
    formError.value = err.message || 'Terjadi kesalahan sistem saat menyimpan laporan';
    toast.error(formError.value);
  } finally {
    isPrinting.value = false;
  }
};

onMounted(() => {
  fetchSpdList();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Breadcrumbs -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-text-muted mb-1.5">
          <router-link to="/" class="hover:text-primary transition-colors flex items-center gap-1">
            <i class="pi pi-home text-[11px]"></i>
            <span>Beranda</span>
          </router-link>
          <span class="text-text-muted/60">/</span>
          <router-link to="/laporan" class="hover:text-primary transition-colors">
            Laporan Perjalanan
          </router-link>
          <span class="text-text-muted/60">/</span>
          <span class="text-text-main font-medium">Buat Laporan</span>
        </nav>
        <h1 class="text-xl font-bold tracking-tight text-text-main">
          Buat Laporan Perjalanan Dinas
        </h1>
        <p class="text-xs text-text-muted mt-0.5">
          Pilih dokumen Surat Perjalanan Dinas (SPD) yang telah disetujui untuk menyusun laporan hasil perjalanan dinas.
        </p>
      </div>

      <!-- Action Nav -->
      <div class="flex items-center gap-2">
        <GovButton
          label="Kembali ke Daftar"
          icon="pi pi-arrow-left"
          variant="outlined"
          severity="secondary"
          size="small"
          @click="router.push('/laporan')"
        />
      </div>
    </div>

    <!-- Alert Error Global -->
    <div
      v-if="formError"
      class="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-start gap-2.5"
    >
      <i class="pi pi-exclamation-triangle text-base mt-0.5 shrink-0 text-red-500"></i>
      <div>
        <span class="font-semibold block mb-0.5">Terjadi Kesalahan Form:</span>
        <span>{{ formError }}</span>
      </div>
    </div>

    <!-- Main Grid Content -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Column: Selection & SPD Detail Card (5 cols) -->
      <div class="lg:col-span-5 space-y-6">
        <!-- 1. Selection Card -->
        <GovCard title="1. Pilih Dokumen SPD">
          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-text-main">
                  Surat Perjalanan Dinas (SPD) <span class="text-red-500">*</span>
                </label>
                <span class="text-[10px] text-text-muted flex items-center gap-1 font-normal">
                  <i class="pi pi-search text-[9px] text-primary"></i>
                  Ketik untuk mencari
                </span>
              </div>

              <!-- AutoComplete Input: Only shows list when searching -->
              <div class="relative">
                <GovAutoComplete
                  v-model="selectedSpdRaw"
                  :suggestions="spdSuggestions"
                  :loading="loadingSpds"
                  :option-label="formatSpdLabel"
                  placeholder="Ketik nomor SPD atau nama pegawai untuk mencari..."
                  class="w-full"
                  @complete="handleSearchSpd"
                  @item-select="onSpdSelected"
                >
                  <template #option="{ option }">
                    <div class="py-1.5 space-y-0.5 w-full border-b border-border/40 last:border-0">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-mono font-bold text-primary text-xs">{{ option.nomorSpd }}</span>
                        <Tag
                          :value="option.laporan ? 'Sudah Ada Laporan' : 'Belum Ada Laporan'"
                          :severity="option.laporan ? 'info' : 'secondary'"
                          class="text-[9px] px-1.5 py-0.5"
                        />
                      </div>
                      <div class="text-xs text-text-main font-medium">
                        {{ option.pegawai?.nama || 'Tanpa Pegawai' }}
                        <span v-if="option.pegawai?.nip" class="text-[11px] text-text-muted font-mono font-normal">
                          ({{ option.pegawai?.nip }})
                        </span>
                      </div>
                      <div v-if="option.dalamRangka" class="text-[11px] text-text-muted truncate max-w-sm">
                        {{ option.dalamRangka }}
                      </div>
                    </div>
                  </template>

                  <template #empty>
                    <div class="p-3 text-center text-xs text-text-muted">
                      <i class="pi pi-search-minus block mb-1 text-base opacity-40"></i>
                      Tidak ada dokumen SPD yang cocok dengan kata kunci pencarian.
                    </div>
                  </template>
                </GovAutoComplete>
              </div>

              <!-- Selected SPD Quick Chip / Clearer -->
              <div
                v-if="selectedSpd"
                class="flex items-center justify-between p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs"
              >
                <div class="flex items-center gap-2 truncate">
                  <i class="pi pi-check-circle text-primary text-sm shrink-0"></i>
                  <div class="truncate">
                    <span class="font-mono font-bold text-primary mr-1.5">{{ selectedSpd.nomorSpd }}</span>
                    <span class="text-text-main font-medium truncate">{{ selectedSpd.pegawai?.nama || 'Tanpa Pegawai' }}</span>
                  </div>
                </div>
                <GovButton
                  label="Ganti"
                  icon="pi pi-times"
                  size="small"
                  variant="outlined"
                  severity="secondary"
                  class="text-[10px] py-1 px-2 shrink-0 ml-2"
                  @click="clearSelectedSpd"
                />
              </div>

              <p class="text-[11px] text-text-muted" v-else>
                Daftar dokumen hanya akan muncul ketika Anda mengetik nomor SPD, nama pegawai, atau perihal penugasan.
              </p>
            </div>

            <!-- Empty state when no SPD found -->
            <div
              v-if="!loadingSpds && eligibleSpds.length === 0"
              class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-2"
            >
              <div class="flex items-start gap-2">
                <i class="pi pi-info-circle text-sm mt-0.5 shrink-0"></i>
                <span>Belum ada dokumen SPD berstatus disetujui yang siap dibuatkan laporan.</span>
              </div>
              <router-link
                to="/spd"
                class="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px]"
              >
                Lihat Daftar SPD
                <i class="pi pi-arrow-right text-[10px]"></i>
              </router-link>
            </div>
          </div>
        </GovCard>

        <!-- 2. SPD Detail Summary Card -->
        <GovCard title="Informasi Dokumen Penugasan" v-if="selectedSpd">
          <div class="space-y-3.5 text-xs">
            <!-- Status Alert if already has Laporan -->
            <div
              v-if="selectedSpd.laporan"
              class="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-xs flex items-start gap-2"
            >
              <i class="pi pi-info-circle text-sm mt-0.5 shrink-0 text-blue-500"></i>
              <div>
                <span class="font-semibold block mb-0.5">Laporan Sudah Dibuat Sebelumnya</span>
                <span class="text-[11px] leading-relaxed">
                  SPD ini telah memiliki laporan perjalanan per tanggal {{ formatDate(selectedSpd.laporan.tanggalLaporan) }}. Menyimpan formulir ini akan memperbarui isi laporan tersebut.
                </span>
              </div>
            </div>

            <!-- Details List -->
            <div class="space-y-2.5 divide-y divide-border/60">
              <div class="flex items-center justify-between pt-1">
                <span class="text-text-muted">Nomor SPD:</span>
                <span class="font-mono font-bold text-primary">{{ selectedSpd.nomorSpd }}</span>
              </div>

              <div class="flex items-center justify-between pt-2">
                <span class="text-text-muted">Surat Tugas Induk:</span>
                <span class="font-mono text-text-main">{{ selectedSpd.suratTugas?.nomorSurat || '-' }}</span>
              </div>

              <div class="flex items-center justify-between pt-2">
                <span class="text-text-muted">Pemberi Perintah:</span>
                <Tag
                  :value="selectedSpd.pemberiPerintah"
                  :severity="isKpa ? 'warn' : 'info'"
                  class="text-[10px] font-medium"
                />
              </div>

              <div class="flex items-start justify-between pt-2 gap-3">
                <span class="text-text-muted shrink-0">Pegawai Pelaksana:</span>
                <div class="text-right">
                  <div class="font-semibold text-text-main">{{ selectedSpd.pegawai?.nama || '-' }}</div>
                  <div class="text-[11px] text-text-muted font-mono">NIP. {{ selectedSpd.pegawai?.nip || '-' }}</div>
                  <div class="text-[10px] text-text-muted mt-0.5">
                    {{ selectedSpd.pegawai?.pangkat || '' }} ({{ selectedSpd.pegawai?.golongan || '-' }})
                  </div>
                  <div class="text-[10px] text-text-muted">{{ selectedSpd.pegawai?.jabatan || '-' }}</div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2">
                <span class="text-text-muted">Rute Perjalanan:</span>
                <span class="font-medium text-text-main">
                  {{ selectedSpd.tempatBerangkat || 'Banggai' }} &rarr; {{ selectedSpd.tempatTujuan || '-' }}
                </span>
              </div>

              <div class="flex items-center justify-between pt-2">
                <span class="text-text-muted">Waktu Pelaksanaan:</span>
                <span class="font-medium text-text-main">
                  {{ selectedSpd.lamaHari || '-' }} Hari
                  <span class="text-text-muted font-normal text-[11px]">
                    ({{ formatDate(selectedSpd.tanggalBerangkat) }} s/d {{ formatDate(selectedSpd.tanggalKembali) }})
                  </span>
                </span>
              </div>

              <div class="pt-2">
                <span class="text-text-muted block mb-1">Maksud Perjalanan Dinas:</span>
                <div class="p-2.5 bg-slate-50 dark:bg-slate-900 border border-border/80 rounded text-text-main italic leading-relaxed text-[11px]">
                  {{ selectedSpd.dalamRangka || '-' }}
                </div>
              </div>
            </div>
          </div>
        </GovCard>
      </div>

      <!-- Right Column: Form Laporan Perjalanan Dinas (7 cols) -->
      <div class="lg:col-span-7 space-y-6">
        <GovCard title="2. Formulir Laporan Hasil Perjalanan Dinas">
          <div v-if="!selectedSpd" class="py-12 text-center text-text-muted space-y-2">
            <i class="pi pi-arrow-left text-3xl opacity-30 block mb-2"></i>
            <span class="text-xs">Pilih dokumen SPD di sebelah kiri untuk mulai mengisi laporan hasil perjalanan dinas.</span>
          </div>

          <div v-else class="space-y-5">
            <!-- Penanda Tangan Field -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-text-main">
                  Pejabat Penanda Tangan / Tujuan Laporan <span class="text-red-500">*</span>
                </label>
                <span class="text-[11px] text-primary font-medium">
                  Rekomendasi: {{ defaultSuggestedPenandatangan }}
                </span>
              </div>
              <GovSelect
                v-model="form.penandatangan"
                :options="penandatanganOptions"
                option-label="label"
                option-value="value"
                placeholder="Pilih Pejabat Penanda Tangan..."
                class="w-full"
              />
              <p class="text-[11px] text-text-muted leading-relaxed">
                <i class="pi pi-info-circle text-[10px] mr-0.5 text-primary"></i>
                <span class="text-primary font-medium">Ketentuan Default:</span>
                SPD Pengguna Anggaran (PA) otomatis memilih Kepala Bagian; SPD Kuasa Pengguna Anggaran (KPA) otomatis memilih Sekertaris Daerah. Anda dapat mengubah pilihan pejabat di atas jika diperlukan.
              </p>
            </div>

            <!-- Tanggal Laporan Field -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-text-main">
                Tanggal Laporan
              </label>
              <GovDatePicker
                v-model="form.tanggalLaporan"
                date-format="dd/mm/yy"
                placeholder="Pilih tanggal laporan..."
                class="w-full"
              />
              <p class="text-[11px] text-text-muted">
                Tanggal ditetapkannya laporan perjalanan dinas (biasanya pada hari terakhir pelaksanaan atau setelah kembali).
              </p>
            </div>

            <!-- Hasil Perjalanan Free Text Field -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-text-main">
                  Hasil Perjalanan Dinas (Free Text) <span class="text-red-500">*</span>
                </label>
                <span class="text-[11px] text-text-muted">
                  {{ form.hasilPerjalanan.length }} karakter
                </span>
              </div>
              <GovTextarea
                v-model="form.hasilPerjalanan"
                rows="10"
                placeholder="Tuliskan laporan pelaksanaan perjalanan dinas secara rinci, meliputi:&#10;1. Waktu dan lokasi pelaksanaan tugas&#10;2. Pihak atau instansi yang ditemui/dikunjungi&#10;3. Pokok-pokok pembahasan serta hasil koordinasi/konsultasi&#10;4. Kesimpulan dan saran tindak lanjut..."
                class="text-justify"
                block
              />
              <p class="text-[11px] text-text-muted">
                Mendukung teks panjang multi-paragraf yang akan otomatis diformat rapi pada dokumen cetak PDF resmi.
              </p>
            </div>

            <!-- Actions Footer -->
            <div class="pt-4 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <GovButton
                label="Batal"
                severity="secondary"
                variant="outlined"
                size="small"
                :disabled="isSubmitting || isDownloading || isPrinting"
                @click="router.push('/laporan')"
              />

              <div class="flex flex-wrap items-center gap-2">
                <GovButton
                  label="Simpan Laporan"
                  icon="pi pi-save"
                  severity="secondary"
                  size="small"
                  :loading="isSubmitting"
                  :disabled="isDownloading || isPrinting"
                  @click="handleSaveOnly"
                />

                <GovButton
                  label="Simpan & Cetak Laporan"
                  icon="pi pi-print"
                  severity="primary"
                  size="small"
                  :loading="isPrinting"
                  :disabled="isSubmitting || isDownloading"
                  @click="handleSaveAndPrint"
                />

                <GovButton
                  label="Simpan & Unduh PDF"
                  icon="pi pi-file-pdf"
                  severity="primary"
                  size="small"
                  :loading="isDownloading"
                  :disabled="isSubmitting || isPrinting"
                  @click="handleSaveAndDownload"
                />
              </div>
            </div>
          </div>
        </GovCard>
      </div>
    </div>
  </div>
</template>
