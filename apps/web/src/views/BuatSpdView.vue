<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { AutoCompleteCompleteEvent } from 'primevue/autocomplete';
import {
  GovSelectButton,
  GovAutoComplete,
  GovTextarea,
  GovMultiSelect,
  GovInputText,
  GovInputNumber,
  GovDatePicker,
  GovSelect,
  GovButton,
  GovMessage,
} from '../components/core';
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

const spdId = computed(() => (route.params.id as string) || null);
const isEditMode = computed(() => !!spdId.value);
const existingSpd = ref<any>(null);
const loadingExisting = ref(false);

interface PenandatanganOption {
  id: string;
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
}

const getInitialForm = () => ({
  pemberiPerintah: 'Pengguna Anggaran (PA)',
  pegawai: null as AsnOption | null,
  penandatanganId: null as string | null,
  maksudList: [''] as string[],
  alatAngkut: [] as string[],
  tempatBerangkat: 'Banggai',
  tempatTujuan: '',
  lamaHari: 1,
  tanggalBerangkat: null as Date | null,
  kopSuratId: null as string | null,
});

// 1. Form State
const form = reactive(getInitialForm());
const penandatanganOptions = ref<PenandatanganOption[]>([]);
const loadingPenandatangan = ref(false);

const resetForm = () => {
  Object.assign(form, getInitialForm());
  const defaultKop = kopSuratList.value.find((k) => k.isDefault) || kopSuratList.value[0];
  if (defaultKop) {
    form.kopSuratId = defaultKop.id;
  }
  existingSpd.value = null;
  createdSpd.value = null;
  submitSuccess.value = false;
  submitError.value = '';
  Object.keys(errors).forEach((key) => delete errors[key]);
};

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

const errors = reactive<Record<string, string>>({});
const isSubmitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref('');
const createdSpd = ref<any>(null);

const pemberiPerintahOptions = [
  'Kuasa Pengguna Anggaran (KPA)',
  'Pengguna Anggaran (PA)',
];

const transportOptions = [
  'Mobil Dinas',
  'Pesawat',
  'Speedboat / Kapal Laut',
  'Kendaraan Roda Dua',
  'Angkutan Umum Darat',
];

// 2. Lazy ASN Search
const asnSuggestions = ref<AsnOption[]>([]);
const loadingAsn = ref(false);

const handleSearchAsn = async (event: AutoCompleteCompleteEvent) => {
  const query = event.query?.trim() || '';
  loadingAsn.value = true;
  try {
    const res = await apiFetch(`/api/pegawai?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      asnSuggestions.value = await res.json();
    } else {
      asnSuggestions.value = [];
    }
  } catch {
    asnSuggestions.value = [];
  } finally {
    loadingAsn.value = false;
  }
};

// 3. Kop Surat Options (Input #9)
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

const loadPenandatangan = async () => {
  loadingPenandatangan.value = true;
  try {
    const res = await apiFetch('/api/pegawai?isPenandatangan=true');
    if (res.ok) {
      penandatanganOptions.value = await res.json();
      if (!form.penandatanganId && !isEditMode.value && penandatanganOptions.value.length > 0) {
        form.penandatanganId = penandatanganOptions.value[0].id;
      }
    }
  } catch {
    penandatanganOptions.value = [];
  } finally {
    loadingPenandatangan.value = false;
  }
};

const selectedKop = computed(() => {
  return kopSuratList.value.find((k) => k.id === form.kopSuratId);
});

// Load Existing SPD for Edit Mode
const loadExistingSpd = async (id: string) => {
  loadingExisting.value = true;
  try {
    const res = await apiFetch(`/api/spd/${id}`);
    if (res.ok) {
      const data = await res.json();
      existingSpd.value = data;

      form.pemberiPerintah = data.pemberiPerintah || 'Pengguna Anggaran (PA)';
      form.pegawai = data.pegawai || null;

      // Parse multi-agenda
      const lines = (data.dalamRangka || '')
        .split(/\r?\n/)
        .map((l: string) => l.trim().replace(/^\d+[\.\)]\s*/, ''))
        .filter(Boolean);
      form.maksudList = lines.length > 0 ? lines : [''];

      // Parse alatAngkut
      if (data.alatAngkut) {
        form.alatAngkut = data.alatAngkut.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else {
        form.alatAngkut = [];
      }

      form.tempatBerangkat = data.tempatBerangkat || 'Banggai';
      form.tempatTujuan = data.tempatTujuan || '';
      form.lamaHari = Number(data.lamaHari) || 1;
      form.tanggalBerangkat = data.tanggalBerangkat ? new Date(data.tanggalBerangkat) : null;
      if (data.kopSuratId) {
        form.kopSuratId = data.kopSuratId;
      }
      if (data.penandatanganId) {
        form.penandatanganId = data.penandatanganId;
      } else if (data.penandatangan?.id) {
        form.penandatanganId = data.penandatangan.id;
      } else if (data.suratTugas?.penandatanganId) {
        form.penandatanganId = data.suratTugas.penandatanganId;
      } else if (data.suratTugas?.penandatangan?.id) {
        form.penandatanganId = data.suratTugas.penandatangan.id;
      }
    } else {
      submitError.value = 'Gagal memuat data Surat Perjalanan Dinas yang akan diedit.';
    }
  } catch (err: any) {
    submitError.value = err.message || 'Terjadi kesalahan saat memuat data SPD.';
  } finally {
    loadingExisting.value = false;
  }
};

const hasParentSuratTugas = computed(() => {
  return !!(existingSpd.value?.suratTugasId || existingSpd.value?.suratTugas);
});

onMounted(async () => {
  await Promise.all([loadKopSurat(), loadPenandatangan()]);
  if (isEditMode.value && spdId.value) {
    await loadExistingSpd(spdId.value);
  } else {
    resetForm();
  }
});

watch(
  () => route.fullPath,
  async () => {
    if (isEditMode.value && spdId.value) {
      await loadExistingSpd(spdId.value);
    } else {
      resetForm();
    }
  }
);

// 4. Format Lama Perjalanan: [value] ([terbilang]) Hari
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

// 5. Format Output Alat Angkut
const alatAngkutDisplay = computed(() => {
  return form.alatAngkut.length > 0 ? form.alatAngkut.join(', ') : '-';
});

// Validasi
const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key]);

  if (!form.pemberiPerintah) errors.pemberiPerintah = 'Pemberi perintah wajib dipilih.';
  if (!form.pegawai) errors.pegawai = 'Pegawai pelaksana perjalanan dinas wajib dipilih.';
  
  const validMaksud = form.maksudList.map((m) => m.trim()).filter(Boolean);
  if (validMaksud.length === 0) {
    errors.dalamRangka = 'Maksud perjalanan dinas wajib diisi minimal 1 agenda kegiatan.';
  } else if (totalMaksudChars.value > 700) {
    errors.dalamRangka = 'Total karakter maksud perjalanan dinas maksimal 700 karakter.';
  }

  if (form.alatAngkut.length === 0) errors.alatAngkut = 'Pilih minimal satu alat angkut.';
  if (!form.tempatBerangkat.trim()) errors.tempatBerangkat = 'Tempat berangkat wajib diisi.';
  if (!form.tempatTujuan.trim()) errors.tempatTujuan = 'Tempat tujuan wajib diisi.';
  if (!form.lamaHari || form.lamaHari < 1) errors.lamaHari = 'Lama perjalanan minimal 1 hari.';
  if (!form.tanggalBerangkat) errors.tanggalBerangkat = 'Tanggal berangkat wajib dipilih.';
  if (!form.kopSuratId) errors.kopSuratId = 'Kop surat dinas wajib dipilih.';
  if (!form.penandatanganId) errors.penandatanganId = 'Pejabat Penandatangan SPD wajib dipilih.';

  return Object.keys(errors).length === 0;
};

// Submit handler
const handleSubmit = async () => {
  if (!validate()) {
    toast.warn('Mohon periksa dan lengkapi isian formulir yang wajib diisi.');
    return;
  }

  isSubmitting.value = true;
  submitSuccess.value = false;
  submitError.value = '';

  const validItems = form.maksudList
    .map((item) => item.trim())
    .filter(Boolean);

  const formattedDalamRangka = validItems
    .map((item, idx) => {
      const clean = item.replace(/^\d+[\.\)]\s*/, '');
      return validItems.length > 1 ? `${idx + 1}. ${clean}` : clean;
    })
    .join('\n');

  try {
    const payload = {
      pemberiPerintah: form.pemberiPerintah,
      pegawaiId: form.pegawai!.id,
      penandatanganId: form.penandatanganId || undefined,
      dalamRangka: formattedDalamRangka,
      alatAngkut: alatAngkutDisplay.value,
      tempatBerangkat: form.tempatBerangkat.trim(),
      tempatTujuan: form.tempatTujuan.trim(),
      lamaHari: Number(form.lamaHari),
      tanggalBerangkat: form.tanggalBerangkat!.toISOString(),
      kopSuratId: form.kopSuratId || undefined,
    };

    const url = isEditMode.value ? `/api/spd/${spdId.value}` : '/api/spd';
    const method = isEditMode.value ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      createdSpd.value = await res.json();
      submitSuccess.value = true;
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const num = createdSpd.value?.nomorSpd ? ` (Nomor: ${createdSpd.value.nomorSpd})` : '';
      toast.success(
        isEditMode.value
          ? `Perubahan Surat Perjalanan Dinas berhasil disimpan${num}!`
          : `Surat Perjalanan Dinas berhasil diterbitkan${num}!`,
        'Dokumen SPD Tersimpan'
      );
    } else {
      const err = await res.json().catch(() => ({}));
      submitError.value = err.message || (isEditMode.value ? 'Gagal memperbarui data SPD' : 'Gagal menyimpan data SPD');
      toast.error(submitError.value);
    }
  } catch (err: any) {
    submitError.value = err.message || 'Terjadi kesalahan sistem saat menyimpan SPD';
    toast.error(submitError.value);
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/spd');
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 pb-12">
    <!-- Breadcrumb & Header -->
    <div>
      <div class="flex items-center gap-2 text-xs font-medium text-text-muted mb-1">
        <router-link to="/" class="hover:underline">Beranda</router-link>
        <span>/</span>
        <router-link to="/spd" class="hover:underline">Surat Perjalanan Dinas</router-link>
        <span>/</span>
        <span class="text-text-main font-semibold">{{ isEditMode ? 'Edit SPD' : 'Buat SPD' }}</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-text-main">
        {{ isEditMode ? 'Edit Surat Perjalanan Dinas (SPD)' : 'Buat Surat Perjalanan Dinas (SPD)' }}
      </h1>
      <p class="text-sm text-text-muted mt-0.5">
        {{ isEditMode ? `Memperbarui rincian surat perjalanan dinas nomor ${existingSpd?.nomorSpd || ''}.` : 'Formulir pengajuan dan penerbitan Surat Perjalanan Dinas Sekretariat Daerah Kab. Banggai Laut.' }}
      </p>
    </div>

    <!-- Loading Skeleton for Edit Mode -->
    <div v-if="loadingExisting" class="py-16 text-center space-y-3">
      <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
      <p class="text-sm text-text-muted">Memuat data Surat Perjalanan Dinas...</p>
    </div>

    <!-- Feedback -->
    <GovMessage v-if="submitSuccess" severity="success" class="mb-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span class="font-semibold">Berhasil!</span> {{ isEditMode ? 'Perubahan Surat Perjalanan Dinas telah tersimpan untuk Nomor:' : 'Surat Perjalanan Dinas telah tersimpan dengan Nomor:' }}
          <span class="font-mono font-bold">{{ createdSpd?.nomorSpd }}</span>.
        </div>
        <div class="flex items-center gap-2">
          <GovButton
            label="Lihat & Cetak Dokumen SPD"
            icon="pi pi-print"
            size="small"
            severity="primary"
            @click="router.push('/spd/cetak/' + (createdSpd?.id || spdId))"
          />
        </div>
      </div>
    </GovMessage>

    <GovMessage v-if="submitError" severity="error" class="mb-4">
      {{ submitError }}
    </GovMessage>

    <!-- Main Card Form -->
    <div class="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        
        <!-- 1. Pemberi Perintah -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-text-main">
            1. Pejabat Pemberi Perintah <span class="text-red-500">*</span>
          </label>
          <GovSelectButton
            v-model="form.pemberiPerintah"
            :options="pemberiPerintahOptions"
            :invalid="!!errors.pemberiPerintah"
            class="w-full sm:w-auto"
          />
          <small v-if="errors.pemberiPerintah" class="text-red-500 text-xs block">
            {{ errors.pemberiPerintah }}
          </small>
        </div>

        <hr class="border-border" />

        <!-- 2. Pegawai Pelaksana (Lazy Search) -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-text-main">
            2. Pegawai Pelaksana Perjalanan Dinas (ASN) <span class="text-red-500">*</span>
          </label>
          <GovAutoComplete
            v-model="form.pegawai"
            :suggestions="asnSuggestions"
            :loading="loadingAsn"
            option-label="nama"
            placeholder="Ketik Nama atau NIP Pegawai..."
            :invalid="!!errors.pegawai"
            @complete="handleSearchAsn"
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

          <div v-if="form.pegawai" class="p-3 bg-slate-50 dark:bg-slate-900/50 border border-border rounded-lg text-xs space-y-1">
            <div class="font-semibold text-text-main">{{ form.pegawai.nama }}</div>
            <div class="text-text-muted">NIP: {{ form.pegawai.nip }} | Jabatan: {{ form.pegawai.jabatan }}</div>
          </div>

          <small v-if="errors.pegawai" class="text-red-500 text-xs block">
            {{ errors.pegawai }}
          </small>
        </div>

        <!-- 3. Maksud / Dalam Rangka (Dukungan Multi Agenda) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <label class="block text-sm font-semibold text-text-main">
                3. Dalam Rangka (Maksud Perjalanan Dinas) <span class="text-red-500">*</span>
              </label>
              <p class="text-xs text-text-muted mt-0.5">
                Dapat menambahkan lebih dari satu agenda/tujuan kegiatan. Output dokumen akan bernomor secara otomatis.
              </p>
            </div>
            <span
              class="text-xs transition-colors flex-shrink-0"
              :class="totalMaksudChars >= 700 ? 'text-amber-500 font-semibold' : 'text-text-muted'"
            >
              {{ totalMaksudChars }}/700
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
                  :placeholder="index === 0 ? 'Contoh: Mendampingi Bupati Banggai Laut dalam menghadiri Upacara...' : `Agenda kegiatan ke-${index + 1}...`"
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

        <!-- 4. Alat Angkut -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-text-main">
            4. Alat Angkut / Moda Transportasi <span class="text-red-500">*</span>
          </label>
          <GovMultiSelect
            v-model="form.alatAngkut"
            :options="transportOptions"
            placeholder="Pilih moda transportasi..."
            display="chip"
            :invalid="!!errors.alatAngkut"
          />
          <div class="text-xs text-text-muted">
            Format Dokumen: <span class="font-medium text-text-main">{{ alatAngkutDisplay }}</span>
          </div>
          <small v-if="errors.alatAngkut" class="text-red-500 text-xs block">
            {{ errors.alatAngkut }}
          </small>
        </div>

        <!-- 5 & 6. Tempat Berangkat & Tempat Tujuan -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-semibold text-text-main">
              5. Tempat Berangkat <span class="text-red-500">*</span>
            </label>
            <GovInputText
              v-model="form.tempatBerangkat"
              placeholder="Contoh: Banggai"
              :invalid="!!errors.tempatBerangkat"
              block
            />
            <small v-if="errors.tempatBerangkat" class="text-red-500 text-xs block">
              {{ errors.tempatBerangkat }}
            </small>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-semibold text-text-main">
              6. Tempat Tujuan <span class="text-red-500">*</span>
            </label>
            <GovInputText
              v-model="form.tempatTujuan"
              placeholder="Contoh: Palu / Luwuk / Jakarta"
              :invalid="!!errors.tempatTujuan"
              block
            />
            <small v-if="errors.tempatTujuan" class="text-red-500 text-xs block">
              {{ errors.tempatTujuan }}
            </small>
          </div>
        </div>

        <!-- 7 & 8. Lama Perjalanan & Tanggal Berangkat -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-semibold text-text-main">
              7. Lama Perjalanan Dinas <span class="text-red-500">*</span>
            </label>
            <GovInputNumber
              v-model="form.lamaHari"
              :min="1"
              :max="90"
              :step="1"
              button-layout="horizontal"
              :invalid="!!errors.lamaHari"
            />
            <div class="text-xs text-text-muted">
              Format Hasil: <span class="font-semibold text-primary">{{ lamaPerjalananDisplay }}</span>
            </div>
            <small v-if="errors.lamaHari" class="text-red-500 text-xs block">
              {{ errors.lamaHari }}
            </small>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-semibold text-text-main">
              8. Tanggal Berangkat <span class="text-red-500">*</span>
            </label>
            <GovDatePicker
              v-model="form.tanggalBerangkat"
              date-format="dd/mm/yy"
              placeholder="Pilih tanggal keberangkatan"
              :invalid="!!errors.tanggalBerangkat"
            />
            <small v-if="errors.tanggalBerangkat" class="text-red-500 text-xs block">
              {{ errors.tanggalBerangkat }}
            </small>
          </div>
        </div>

        <hr class="border-border" />

        <!-- 9. Kop Surat Dinas -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-text-main">
            9. Template Kop Surat Dinas <span class="text-red-500">*</span>
          </label>
          <GovSelect
            v-model="form.kopSuratId"
            :options="kopSuratList"
            option-label="nama"
            option-value="id"
            placeholder="Pilih template kop surat dinas..."
            :invalid="!!errors.kopSuratId"
            :loading="loadingKop"
          >
            <template #option="{ option }">
              <div class="flex items-center justify-between w-full py-1">
                <div class="flex items-center gap-2">
                  <i class="pi pi-file-pdf text-red-500 text-sm"></i>
                  <span class="font-medium text-sm text-text-main">{{ option.nama }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-text-muted font-mono">
                    {{ option.paperSize }}
                  </span>
                  <span
                    v-if="option.isDefault"
                    class="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-primary/20 text-primary font-semibold"
                  >
                    Default
                  </span>
                </div>
              </div>
            </template>
          </GovSelect>

          <!-- Selected Kop Info Preview -->
          <div
            v-if="selectedKop"
            class="p-3 bg-slate-50 dark:bg-slate-900/50 border border-border rounded-lg text-xs flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <i class="pi pi-check-circle text-primary text-xs"></i>
              <span class="text-text-main font-medium">{{ selectedKop.nama }}</span>
            </div>
            <span class="text-text-muted">Ukuran: {{ selectedKop.paperSize }} &bull; {{ selectedKop.fileName }}</span>
          </div>

          <small v-if="errors.kopSuratId" class="text-red-500 text-xs block">
            {{ errors.kopSuratId }}
          </small>
        </div>

        <hr class="border-border" />

        <!-- 10. Pejabat Penandatangan SPD -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-sm font-semibold text-text-main">
              10. Pejabat Penandatangan SPD <span class="text-red-500">*</span>
            </label>
            <span
              v-if="hasParentSuratTugas"
              class="text-xs text-primary font-medium flex items-center gap-1"
            >
              <i class="pi pi-link text-xs"></i>
              Mengikuti Surat Tugas Induk ({{ existingSpd?.suratTugas?.nomorSurat || 'Surat Tugas' }})
            </span>
          </div>
          <GovSelect
            v-model="form.penandatanganId"
            :options="penandatanganOptions"
            option-label="nama"
            option-value="id"
            placeholder="Pilih Pejabat Penandatangan..."
            :invalid="!!errors.penandatanganId"
            :loading="loadingPenandatangan"
            :disabled="hasParentSuratTugas"
          >
            <template #option="{ option }">
              <div class="py-1">
                <div class="font-medium text-sm text-text-main">{{ option.nama }}</div>
                <div class="text-xs text-text-muted">
                  NIP: {{ option.nip }} &bull; {{ option.jabatan }}
                </div>
              </div>
            </template>
          </GovSelect>
          <small v-if="errors.penandatanganId" class="text-red-500 text-xs block">
            {{ errors.penandatanganId }}
          </small>
          <p v-else class="text-xs text-text-muted">
            <span v-if="hasParentSuratTugas">
              Pejabat penandatangan SPD ini terkunci otomatis mengikuti pejabat penandatangan pada Surat Tugas induk.
            </span>
            <span v-else>
              Pejabat yang berwenang menandatangani lembar Surat Perjalanan Dinas (KPA / Pengguna Anggaran / Sekda).
            </span>
          </p>
        </div>

        <!-- Submission Footer -->
        <div class="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-end gap-3">
          <GovButton
            type="button"
            label="Batal"
            icon="pi pi-times"
            severity="secondary"
            variant="outlined"
            @click="handleCancel"
          />
          <GovButton
            type="submit"
            :label="isEditMode ? 'Simpan Perubahan SPD' : 'Simpan / Buat SPD'"
            icon="pi pi-check"
            severity="primary"
            :loading="isSubmitting"
          />
        </div>
      </form>
    </div>
  </div>
</template>
