<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { AutoCompleteCompleteEvent } from 'primevue/autocomplete';
import {
  GovAutoComplete,
  GovTextarea,
  GovSelect,
  GovButton,
  GovDatePicker,
  GovInputText,
  GovInputNumber,
  GovMultiSelect,
} from '../components/core';
import { MODA_TRANSPORTASI_OPTIONS } from '@si-setda/shared-types';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';

interface AsnOption {
  id: string;
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
}

interface KopSuratOption {
  id: string;
  nama: string;
  fileName: string;
  paperSize: string;
  isDefault: boolean;
}

const router = useRouter();
const route = useRoute();
const toast = useGovToast();

const suratTugasId = computed(() => (route.params.id as string) || null);
const isEditMode = computed(() => !!suratTugasId.value);
const loadingExisting = ref(false);
const existingData = ref<any>(null);

const getInitialForm = () => ({
  pegawaiList: [] as AsnOption[],
  maksudList: [''] as string[],
  kopSuratId: null as string | null,
  tanggalSurat: new Date(),
  alatAngkut: [] as string[],
  tempatBerangkat: 'Banggai',
  tempatTujuan: '',
  lamaHari: 1,
  tanggalBerangkat: null as Date | null,
});

const form = reactive(getInitialForm());

const resetForm = () => {
  Object.assign(form, getInitialForm());
  const defaultKop = kopSuratList.value.find((k) => k.isDefault) || kopSuratList.value[0];
  if (defaultKop) {
    form.kopSuratId = defaultKop.id;
  }
  existingData.value = null;
  createdSuratTugas.value = null;
  submitSuccess.value = false;
  Object.keys(errors).forEach((k) => delete errors[k]);
};

// Kop Surat Options
const kopSuratList = ref<KopSuratOption[]>([]);
const loadingKop = ref(false);

const loadKopSurat = async () => {
  loadingKop.value = true;
  try {
    const res = await apiFetch('/api/kop-surat');
    if (res.ok) {
      kopSuratList.value = await res.json();
      const defaultKop = kopSuratList.value.find((k) => k.isDefault) || kopSuratList.value[0];
      if (defaultKop && !form.kopSuratId && !isEditMode.value) {
        form.kopSuratId = defaultKop.id;
      }
    }
  } catch {
    kopSuratList.value = [];
  } finally {
    loadingKop.value = false;
  }
};

// Lazy Search ASN
const asnSuggestions = ref<AsnOption[]>([]);
const loadingAsn = ref(false);
const currentSearchQuery = ref<AsnOption | string | null>(null);

const handleSearchAsn = async (event: AutoCompleteCompleteEvent) => {
  const query = event.query.trim();
  if (!query) {
    asnSuggestions.value = [];
    return;
  }
  loadingAsn.value = true;
  try {
    const res = await apiFetch(`/api/pegawai?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data: AsnOption[] = await res.json();
      const selectedIds = new Set(form.pegawaiList.map((p) => p.id));
      asnSuggestions.value = data.filter((item) => !selectedIds.has(item.id));
    }
  } catch {
    asnSuggestions.value = [];
  } finally {
    loadingAsn.value = false;
  }
};

const handleSelectAsn = (event: any) => {
  const selected = event.value as AsnOption;
  if (selected && selected.id) {
    if (!form.pegawaiList.some((p) => p.id === selected.id)) {
      form.pegawaiList.push(selected);
    }
  }
  currentSearchQuery.value = null;
  if (errors.pegawai) {
    delete errors.pegawai;
  }
};

const removeAsn = (index: number) => {
  form.pegawaiList.splice(index, 1);
};

// Dalam Rangka Multi-Agenda
const totalMaksudChars = computed(() => {
  return form.maksudList.reduce((acc, str) => acc + (str ? str.length : 0), 0);
});

const addMaksudItem = () => {
  form.maksudList.push('');
};

const removeMaksudItem = (index: number) => {
  if (form.maksudList.length > 1) {
    form.maksudList.splice(index, 1);
  }
};

// Load existing data for Edit Mode
const loadExistingData = async (id: string) => {
  loadingExisting.value = true;
  try {
    const res = await apiFetch(`/api/surat-tugas/${id}`);
    if (res.ok) {
      const data = await res.json();
      existingData.value = data;

      // Map ASN
      form.pegawaiList = data.pegawaiList?.length
        ? data.pegawaiList
        : (data.spdList || []).map((s: any) => s.pegawai).filter(Boolean);

      // Map multi agenda
      const lines = (data.dalamRangka || '')
        .split(/\r?\n/)
        .map((l: string) => l.trim().replace(/^\d+[\.\)]\s*/, ''))
        .filter(Boolean);
      form.maksudList = lines.length > 0 ? lines : [''];

      if (data.kopSuratId) form.kopSuratId = data.kopSuratId;
      if (data.tanggalSurat) form.tanggalSurat = new Date(data.tanggalSurat);

      if (data.alatAngkut) {
        form.alatAngkut = data.alatAngkut.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else {
        form.alatAngkut = [];
      }
      form.tempatBerangkat = data.tempatBerangkat || 'Banggai';
      form.tempatTujuan = data.tempatTujuan || '';
      form.lamaHari = data.lamaHari || 1;
      if (data.tanggalBerangkat) {
        form.tanggalBerangkat = new Date(data.tanggalBerangkat);
      } else {
        form.tanggalBerangkat = null;
      }
    } else {
      toast.error('Gagal memuat data Surat Tugas yang akan diedit');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem');
  } finally {
    loadingExisting.value = false;
  }
};

const transportOptions = [...MODA_TRANSPORTASI_OPTIONS];

const angkaTerbilang = (n: number): string => {
  const kata = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (n <= 0) return 'nol';
  if (n < 12) return kata[n];
  if (n < 20) return `${kata[n - 10]} belas`;
  if (n < 100) return `${kata[Math.floor(n / 10)]} puluh${n % 10 ? ' ' + kata[n % 10] : ''}`;
  return String(n);
};

const lamaPerjalananDisplay = computed(() => {
  const days = Number(form.lamaHari) || 0;
  return `${days} (${angkaTerbilang(days)}) Hari`;
});

const alatAngkutDisplay = computed(() => {
  return form.alatAngkut.length > 0 ? form.alatAngkut.join(', ') : '-';
});

const calculatedTanggalKembali = computed(() => {
  if (!form.tanggalBerangkat || !form.lamaHari) return null;
  const d = new Date(form.tanggalBerangkat);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + (Number(form.lamaHari) - 1));
  return d;
});

const formatDate = (date: Date | null): string => {
  if (!date) return '-';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

onMounted(async () => {
  await loadKopSurat();
  if (isEditMode.value && suratTugasId.value) {
    await loadExistingData(suratTugasId.value);
  } else {
    resetForm();
  }
});

watch(
  () => route.fullPath,
  async () => {
    if (isEditMode.value && suratTugasId.value) {
      await loadExistingData(suratTugasId.value);
    } else {
      resetForm();
    }
  }
);

// Validasi & Form Handling
const errors = reactive<Record<string, string>>({});
const isSubmitting = ref(false);
const submitSuccess = ref(false);
const createdSuratTugas = ref<any>(null);

const validate = (): boolean => {
  Object.keys(errors).forEach((k) => delete errors[k]);

  if (form.pegawaiList.length === 0) {
    errors.pegawai = 'Minimal satu Pegawai Pelaksana (ASN) wajib dipilih.';
  }

  const validMaksud = form.maksudList.map((m) => m.trim()).filter(Boolean);
  if (validMaksud.length === 0) {
    errors.dalamRangka = 'Maksud penugasan / dalam rangka wajib diisi minimal 1 agenda.';
  } else if (totalMaksudChars.value > 1000) {
    errors.dalamRangka = 'Total karakter maksud penugasan maksimal 1000 karakter.';
  }

  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) {
    toast.error('Mohon periksa input form yang belum sesuai.');
    return;
  }

  isSubmitting.value = true;
  try {
    const formattedDalamRangka = form.maksudList
      .map((m) => m.trim())
      .filter(Boolean)
      .join('\n');

    const payload = {
      pegawaiIds: form.pegawaiList.map((p) => p.id),
      dalamRangka: formattedDalamRangka,
      kopSuratId: form.kopSuratId,
      tanggalSurat: form.tanggalSurat,
      alatAngkut: form.alatAngkut.length > 0 ? form.alatAngkut.join(', ') : undefined,
      tempatBerangkat: form.tempatBerangkat.trim() || undefined,
      tempatTujuan: form.tempatTujuan.trim() || undefined,
      lamaHari: form.lamaHari ? Number(form.lamaHari) : undefined,
      tanggalBerangkat: form.tanggalBerangkat ? form.tanggalBerangkat.toISOString() : undefined,
    };

    const url = isEditMode.value
      ? `/api/surat-tugas/${suratTugasId.value}`
      : '/api/surat-tugas';
    const method = isEditMode.value ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      createdSuratTugas.value = data;
      submitSuccess.value = true;
      toast.success(
        isEditMode.value
          ? `Perubahan Surat Tugas nomor ${data.nomorSurat} berhasil disimpan!`
          : `Surat Tugas berhasil diterbitkan! Nomor: ${data.nomorSurat}`,
        'Surat Tugas Tersimpan'
      );
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menyimpan Surat Tugas');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem saat menyimpan Surat Tugas');
  } finally {
    isSubmitting.value = false;
  }
};

const handleDownloadPdf = async (id: string) => {
  try {
    const res = await apiFetch(`/api/surat-tugas/${id}/pdf`);
    if (!res.ok) throw new Error('Gagal mengunduh dokumen PDF Surat Tugas');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Surat_Tugas_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    toast.error(err.message || 'Gagal mengunduh PDF');
  }
};

const handleCancel = () => {
  router.back();
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 pb-12">
    <!-- Breadcrumb & Header -->
    <div>
      <div class="flex items-center gap-2 text-xs font-medium text-text-muted mb-1">
        <router-link to="/" class="hover:underline">Beranda</router-link>
        <span>/</span>
        <router-link to="/surat-tugas" class="hover:underline">Surat Tugas</router-link>
        <span>/</span>
        <span class="text-text-main font-semibold">{{ isEditMode ? 'Edit Surat Tugas' : 'Buat Surat Tugas' }}</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-text-main">
        {{ isEditMode ? 'Edit Surat Tugas' : 'Buat Surat Tugas' }}
      </h1>
      <p class="text-sm text-text-muted mt-0.5">
        {{ isEditMode ? `Memperbarui rincian surat tugas nomor ${existingData?.nomorSurat || ''}.` : 'Formulir penerbitan Surat Tugas penugasan personil ASN Sekretariat Daerah Kab. Banggai Laut.' }}
      </p>
    </div>

    <!-- Loading Skeleton for Edit Mode -->
    <div v-if="loadingExisting" class="py-16 text-center space-y-3">
      <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
      <p class="text-sm text-text-muted">Memuat data Surat Tugas...</p>
    </div>

    <!-- Alert Success -->
    <div
      v-else-if="submitSuccess && createdSuratTugas"
      class="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-emerald-900 dark:text-emerald-100"
    >
      <div>
        <span class="font-bold">Berhasil!</span> Surat Tugas nomor
        <span class="font-mono font-bold">{{ createdSuratTugas.nomorSurat }}</span> telah tersimpan.
        <span v-if="createdSuratTugas.spdList?.length"> ({{ createdSuratTugas.spdList.length }} dokumen SPD terhubung)</span>
        <span v-else class="text-xs block text-emerald-800 dark:text-emerald-200 mt-0.5">Dokumen SPD dapat diterbitkan kapan saja melalui tombol "Terbitkan SPD" pada halaman Pratinjau Dokumen.</span>
      </div>
      <div class="flex items-center gap-2">
        <GovButton
          label="Lihat & Cetak Dokumen"
          icon="pi pi-eye"
          severity="primary"
          size="small"
          @click="router.push(`/surat-tugas/cetak/${createdSuratTugas.id}`)"
        />
        <GovButton
          label="Unduh PDF"
          icon="pi pi-file-pdf"
          severity="secondary"
          variant="outlined"
          size="small"
          @click="handleDownloadPdf(createdSuratTugas.id)"
        />
      </div>
    </div>

    <!-- Main Card Form -->
    <div v-if="!loadingExisting" class="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        
        <!-- 1. Pegawai Pelaksana (Multiple ASN Lazy Search) -->
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-semibold text-text-main">
              1. Pegawai Pelaksana Penugasan (ASN) <span class="text-red-500">*</span>
            </label>
            <p class="text-xs text-text-muted mt-0.5">
              Cari nama atau NIP pegawai pelaksana tugas. Dapat memilih lebih dari satu ASN.
            </p>
          </div>

          <!-- Lazy Autocomplete Input -->
          <GovAutoComplete
            v-model="currentSearchQuery"
            :suggestions="asnSuggestions"
            :loading="loadingAsn"
            option-label="nama"
            placeholder="Ketik Nama atau NIP Pegawai untuk menambahkan..."
            :invalid="!!errors.pegawai && form.pegawaiList.length === 0"
            @complete="handleSearchAsn"
            @item-select="handleSelectAsn"
          >
            <template #option="{ option }">
              <div class="py-1">
                <div class="font-medium text-sm text-text-main">{{ option.nama }}</div>
                <div class="text-xs text-text-muted">
                  NIP: {{ option.nip }} &bull; {{ option.jabatan }} ({{ option.pangkat }} - {{ option.golongan }})
                </div>
              </div>
            </template>
          </GovAutoComplete>

          <!-- List Pegawai Terpilih -->
          <div v-if="form.pegawaiList.length > 0" class="space-y-2 pt-1">
            <div class="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Daftar Pegawai Ditugaskan ({{ form.pegawaiList.length }} Orang):
            </div>
            <div class="space-y-2">
              <div
                v-for="(pegawai, index) in form.pegawaiList"
                :key="pegawai.id"
                class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-border rounded-lg text-xs"
              >
                <div class="flex items-center gap-3">
                  <div class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-primary font-bold text-xs flex items-center justify-center font-mono flex-shrink-0">
                    {{ index + 1 }}
                  </div>
                  <div>
                    <div class="font-semibold text-sm text-text-main">{{ pegawai.nama }}</div>
                    <div class="text-text-muted">
                      NIP: {{ pegawai.nip }} &bull; {{ pegawai.jabatan }} &bull; {{ pegawai.pangkat }} ({{ pegawai.golongan }})
                    </div>
                  </div>
                </div>
                <GovButton
                  type="button"
                  icon="pi pi-times"
                  severity="danger"
                  variant="text"
                  rounded
                  size="small"
                  title="Hapus pegawai ini"
                  @click="removeAsn(index)"
                />
              </div>
            </div>
          </div>

          <small v-if="errors.pegawai" class="text-red-500 text-xs block">
            {{ errors.pegawai }}
          </small>
        </div>

        <hr class="border-border" />

        <!-- 2. Dalam Rangka (Maksud Penugasan Multi-Agenda) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <label class="block text-sm font-semibold text-text-main">
                2. Dalam Rangka (Maksud Penugasan) <span class="text-red-500">*</span>
              </label>
              <p class="text-xs text-text-muted mt-0.5">
                Dapat menambahkan lebih dari satu agenda/tujuan tugas. Output dokumen akan bernomor secara otomatis.
              </p>
            </div>
            <span
              class="text-xs transition-colors flex-shrink-0"
              :class="totalMaksudChars >= 1000 ? 'text-amber-500 font-semibold' : 'text-text-muted'"
            >
              {{ totalMaksudChars }}/1000
            </span>
          </div>

          <!-- List Input Agenda Dinamis -->
          <div class="space-y-2.5">
            <div
              v-for="(_, index) in form.maksudList"
              :key="index"
              class="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-900/40 p-2.5 border border-border rounded-lg"
            >
              <div class="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-primary font-bold text-xs flex items-center justify-center font-mono">
                {{ index + 1 }}
              </div>
              <div class="flex-1">
                <GovTextarea
                  v-model="form.maksudList[index]"
                  :rows="2"
                  :placeholder="index === 0 ? 'Contoh: Melaksanakan koordinasi dan konsultasi teknis terkait...' : `Agenda penugasan ke-${index + 1}...`"
                  :invalid="!!errors.dalamRangka && !form.maksudList[index].trim()"
                />
              </div>
              <GovButton
                v-if="form.maksudList.length > 1"
                type="button"
                icon="pi pi-trash"
                severity="danger"
                variant="text"
                rounded
                class="mt-0.5 flex-shrink-0"
                title="Hapus agenda ini"
                @click="removeMaksudItem(index)"
              />
            </div>
          </div>

          <div class="flex items-center justify-between pt-1">
            <GovButton
              type="button"
              label="Tambah Agenda / Maksud Lain"
              icon="pi pi-plus"
              severity="secondary"
              variant="outlined"
              size="small"
              @click="addMaksudItem"
            />
            <small v-if="errors.dalamRangka" class="text-red-500 text-xs">
              {{ errors.dalamRangka }}
            </small>
          </div>
        </div>

        <hr class="border-border" />

        <!-- 3. Pengaturan Dokumen (Kop Surat & Tanggal) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="block text-sm font-semibold text-text-main">
              3. Kop Surat Dinas
            </label>
            <GovSelect
              v-model="form.kopSuratId"
              :options="kopSuratList"
              option-label="nama"
              option-value="id"
              placeholder="Pilih Template Kop Surat"
              :loading="loadingKop"
            />
            <p class="text-xs text-text-muted">
              Pilihan template kop dinas resmi yang akan dilekatkan pada dokumen PDF.
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-semibold text-text-main">
              4. Tanggal Surat
            </label>
            <GovDatePicker
              v-model="form.tanggalSurat"
              date-format="dd/mm/yy"
            />
            <p class="text-xs text-text-muted">
              Tanggal penetapan yang tercantum pada titi mangsa surat.
            </p>
          </div>
        </div>

        <hr class="border-border" />

        <!-- 5. Parameter Perjalanan Dinas (Tujuan, Transportasi & Durasi - Digunakan saat Menerbitkan SPD) -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-text-main">
              5. Rincian Perjalanan Dinas (Opsional untuk Penerbitan SPD)
            </label>
            <p class="text-xs text-text-muted mt-0.5">
              Rincian ini dapat diisi sekarang untuk otomatis mengisi data penerbitan Surat Perjalanan Dinas (SPD).
            </p>
          </div>

          <!-- Alat Angkut -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-text-main">
              Alat Angkut / Moda Transportasi
            </label>
            <GovMultiSelect
              v-model="form.alatAngkut"
              :options="transportOptions"
              placeholder="Pilih moda transportasi..."
              display="chip"
            />
            <div class="text-[11px] text-text-muted">
              Format Dokumen: <span class="font-medium text-text-main">{{ alatAngkutDisplay }}</span>
            </div>
          </div>

          <!-- Tempat Berangkat & Tempat Tujuan -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-text-main">
                Tempat Berangkat
              </label>
              <GovInputText
                v-model="form.tempatBerangkat"
                placeholder="Contoh: Banggai"
                block
              />
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-semibold text-text-main">
                Tempat Tujuan
              </label>
              <GovInputText
                v-model="form.tempatTujuan"
                placeholder="Contoh: Palu / Luwuk / Jakarta"
                block
              />
            </div>
          </div>

          <!-- Lama Perjalanan & Tanggal Berangkat -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-text-main">
                Lama Perjalanan Dinas
              </label>
              <GovInputNumber
                v-model="form.lamaHari"
                :min="1"
                :max="90"
                :step="1"
                button-layout="horizontal"
              />
              <div class="text-[11px] text-text-muted">
                Format Hasil: <span class="font-semibold text-primary">{{ lamaPerjalananDisplay }}</span>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-semibold text-text-main">
                Tanggal Berangkat
              </label>
              <GovDatePicker
                v-model="form.tanggalBerangkat"
                date-format="dd/mm/yy"
                placeholder="Pilih tanggal keberangkatan"
              />
              <div v-if="calculatedTanggalKembali" class="text-[11px] text-text-muted">
                Estimasi Kembali: <span class="font-medium text-text-main">{{ formatDate(calculatedTanggalKembali) }}</span>
              </div>
            </div>
          </div>
        </div>

        <hr class="border-border" />

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <GovButton
            type="button"
            label="Batal"
            severity="secondary"
            variant="outlined"
            @click="handleCancel"
          />
          <GovButton
            type="submit"
            :label="isEditMode ? 'Simpan Perubahan' : 'Simpan & Terbitkan Surat Tugas'"
            icon="pi pi-check"
            severity="primary"
            :loading="isSubmitting"
          />
        </div>

      </form>
    </div>
  </div>
</template>
