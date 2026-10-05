<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { AutoCompleteCompleteEvent } from 'primevue/autocomplete';
import {
  GovSelectButton,
  GovAutoComplete,
  GovTextarea,
  GovMultiSelect,
  GovInputText,
  GovInputNumber,
  GovDatePicker,
  GovButton,
  GovMessage,
} from '../components/core';
import { apiFetch } from '../utils/api';

interface AsnOption {
  id: string;
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
}

const router = useRouter();

// 1. Form State
const form = reactive({
  pemberiPerintah: 'Pengguna Anggaran (PA)',
  pegawai: null as AsnOption | null,
  dalamRangka: '',
  alatAngkut: [] as string[],
  tempatBerangkat: 'Banggai',
  tempatTujuan: '',
  lamaHari: 1,
  tanggalBerangkat: null as Date | null,
});

const errors = reactive<Record<string, string>>({});
const isSubmitting = ref(false);
const submitSuccess = ref(false);

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

// 3. Format Lama Perjalanan: [value] ([terbilang]) Hari
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

// 4. Format Output Alat Angkut
const alatAngkutDisplay = computed(() => {
  return form.alatAngkut.length > 0 ? form.alatAngkut.join(', ') : '-';
});

// Validasi
const validate = (): boolean => {
  Object.keys(errors).forEach((key) => delete errors[key]);

  if (!form.pemberiPerintah) errors.pemberiPerintah = 'Pemberi perintah wajib dipilih.';
  if (!form.pegawai) errors.pegawai = 'Pegawai pelaksana perjalanan dinas wajib dipilih.';
  if (!form.dalamRangka.trim()) {
    errors.dalamRangka = 'Maksud perjalanan dinas wajib diisi.';
  } else if (form.dalamRangka.length > 700) {
    errors.dalamRangka = 'Maksud perjalanan dinas maksimal 700 karakter.';
  }
  if (form.alatAngkut.length === 0) errors.alatAngkut = 'Pilih minimal satu alat angkut.';
  if (!form.tempatBerangkat.trim()) errors.tempatBerangkat = 'Tempat berangkat wajib diisi.';
  if (!form.tempatTujuan.trim()) errors.tempatTujuan = 'Tempat tujuan wajib diisi.';
  if (!form.lamaHari || form.lamaHari < 1) errors.lamaHari = 'Lama perjalanan minimal 1 hari.';
  if (!form.tanggalBerangkat) errors.tanggalBerangkat = 'Tanggal berangkat wajib dipilih.';

  return Object.keys(errors).length === 0;
};

// Submit handler
const handleSubmit = async () => {
  if (!validate()) return;

  isSubmitting.value = true;
  submitSuccess.value = false;

  const payload = {
    pemberiPerintah: form.pemberiPerintah,
    pegawaiId: form.pegawai?.id,
    pegawaiNama: form.pegawai?.nama,
    pegawaiNip: form.pegawai?.nip,
    dalamRangka: form.dalamRangka,
    alatAngkut: alatAngkutDisplay.value,
    tempatBerangkat: form.tempatBerangkat,
    tempatTujuan: form.tempatTujuan,
    lamaHari: form.lamaHari,
    lamaHariFormatted: lamaPerjalananDisplay.value,
    tanggalBerangkat: form.tanggalBerangkat?.toISOString(),
  };

  // ponytail: log payload, wire to POST /api/spd when database table exists
  console.log('Buat SPD Payload:', payload);
  submitSuccess.value = true;
  isSubmitting.value = false;
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
        <span>Surat Perjalanan Dinas</span>
        <span>/</span>
        <span class="text-text-main font-semibold">Buat SPD</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-text-main">
        Buat Surat Perjalanan Dinas (SPD)
      </h1>
      <p class="text-sm text-text-muted mt-0.5">
        Formulir pengajuan dan penerbitan Surat Perjalanan Dinas Sekretariat Daerah Kab. Banggai Laut.
      </p>
    </div>

    <!-- Feedback -->
    <GovMessage v-if="submitSuccess" severity="success" class="mb-4">
      Data SPD berhasil dibuat dan siap diproses lebih lanjut.
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

        <!-- 3. Maksud / Dalam Rangka -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-sm font-semibold text-text-main">
              3. Dalam Rangka (Maksud Perjalanan Dinas) <span class="text-red-500">*</span>
            </label>
            <span
              class="text-xs transition-colors"
              :class="form.dalamRangka.length >= 700 ? 'text-amber-500 font-semibold' : 'text-text-muted'"
            >
              {{ form.dalamRangka.length }}/700
            </span>
          </div>
          <GovTextarea
            v-model="form.dalamRangka"
            :rows="3"
            :maxlength="700"
            placeholder="Contoh: Menghadiri Rapat Koordinasi Teknis Perencanaan Pembangunan Daerah di Palu..."
            :invalid="!!errors.dalamRangka"
          />
          <small v-if="errors.dalamRangka" class="text-red-500 text-xs block">
            {{ errors.dalamRangka }}
          </small>
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
            label="Simpan / Buat SPD"
            icon="pi pi-check"
            severity="primary"
            :loading="isSubmitting"
          />
        </div>
      </form>
    </div>
  </div>
</template>
