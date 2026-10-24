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

interface DasarHukumOption {
  id: string;
  judul: string;
  isi: string;
  urutan: number;
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

interface PenandatanganOption {
  id: string;
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
}

const currentYear = new Date().getFullYear();

const getInitialForm = () => ({
  nomorSuratMode: 'custom' as 'auto' | 'custom',
  customSeq: '',
  unitCode: 'Bag.Umum',
  tahunSurat: currentYear,
  fullNomorSurat: '',
  selectedDasarHukumList: [] as DasarHukumOption[],
  pegawaiList: [] as AsnOption[],
  maksudHeader: '',
  maksudList: [''] as string[],
  kopSuratId: null as string | null,
  penandatanganId: null as string | null,
  tempatDikeluarkan: 'Banggai',
  tanggalSurat: new Date(),
});

const form = reactive(getInitialForm());
const penandatanganOptions = ref<PenandatanganOption[]>([]);
const loadingPenandatangan = ref(false);

const dasarHukumList = ref<DasarHukumOption[]>([]);
const loadingDasarHukum = ref(false);
const currentDasarHukumQuery = ref<DasarHukumOption | string | null>(null);
const dasarHukumSuggestions = ref<DasarHukumOption[]>([]);

const loadDasarHukum = async () => {
  loadingDasarHukum.value = true;
  try {
    const res = await apiFetch('/api/dasar-hukum');
    if (res.ok) {
      dasarHukumList.value = await res.json();
    }
  } catch {
    dasarHukumList.value = [];
  } finally {
    loadingDasarHukum.value = false;
  }
};

const handleSearchDasarHukum = (event: AutoCompleteCompleteEvent) => {
  const query = (event.query || '').trim();
  const selectedIds = new Set(form.selectedDasarHukumList.map((d) => d.id));
  const available = dasarHukumList.value.filter((d) => !selectedIds.has(d.id));

  if (!query) {
    dasarHukumSuggestions.value = available;
    return;
  }

  const qLower = query.toLowerCase();
  const matches = available.filter(
    (d) =>
      (d.judul && d.judul.toLowerCase().includes(qLower)) ||
      (d.isi && d.isi.toLowerCase().includes(qLower))
  );

  const exactMatch = matches.some((m) => m.judul.toLowerCase() === qLower);
  if (!exactMatch) {
    matches.push({
      id: `custom-${Date.now()}`,
      judul: query,
      isi: query,
      urutan: form.selectedDasarHukumList.length + 1,
    });
  }

  dasarHukumSuggestions.value = matches;
};

const handleSelectDasarHukum = (event: any) => {
  const selected = event.value as DasarHukumOption;
  if (selected) {
    if (!form.selectedDasarHukumList.some((d) => d.id === selected.id)) {
      form.selectedDasarHukumList.push({ ...selected });
    }
  }
  currentDasarHukumQuery.value = null;
};

const removeDasarHukum = (index: number) => {
  form.selectedDasarHukumList.splice(index, 1);
};

const previewNomorSurat = computed(() => {
  if (form.nomorSuratMode === 'auto' && !isEditMode.value) {
    return `000.1.2.3/[Otomatis]/${form.unitCode || 'Bag.Umum'}/${form.tahunSurat || currentYear}`;
  }
  const seqPart = form.customSeq.trim() || '[Nomor]';
  return `000.1.2.3/${seqPart}/${form.unitCode || 'Bag.Umum'}/${form.tahunSurat || currentYear}`;
});

const resetForm = () => {
  Object.assign(form, getInitialForm());
  const defaultKop = kopSuratList.value.find((k) => k.isDefault) || kopSuratList.value[0];
  if (defaultKop) {
    form.kopSuratId = defaultKop.id;
  }
  form.selectedDasarHukumList = [];
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
      form.maksudHeader = data.maksudHeader || '';
      const lines = (data.dalamRangka || '')
        .split(/\r?\n/)
        .map((l: string) => l.trim().replace(/^\d+[\.\)]\s*/, ''))
        .filter(Boolean);
      form.maksudList = lines.length > 0 ? lines : [''];

      if (data.nomorSurat) {
        form.fullNomorSurat = data.nomorSurat;
        // Parse parts: 000.1.2.3/[seq]/[unit]/[year]
        const parts = data.nomorSurat.split('/');
        if (parts.length >= 4) {
          form.nomorSuratMode = 'custom';
          form.customSeq = parts[1] || '';
          form.unitCode = parts[2] || 'Bag.Umum';
        } else {
          form.nomorSuratMode = 'custom';
          form.customSeq = data.nomorSurat;
        }
      }
      form.tahunSurat = currentYear;

      if (data.dasarHukum) {
        // Parse raw dasarHukum string to match existing master data or fallback item
        const raw = (data.dasarHukum as string).trim();
        const items = raw
          .split(/\n\s*\n|\r?\n(?=\d+[\.\)]\s+)/)
          .map((s) => s.trim().replace(/^\d+[\.\)]\s*/, ''))
          .filter(Boolean);

        form.selectedDasarHukumList = items.map((content, idx) => {
          const matched = dasarHukumList.value.find((d) => d.isi.trim() === content || d.judul.trim() === content);
          if (matched) return matched;
          return {
            id: `custom-${idx}`,
            judul: `Dasar Hukum ${idx + 1}`,
            isi: content,
            urutan: idx + 1,
          };
        });
      }

      if (data.tempatDikeluarkan) form.tempatDikeluarkan = data.tempatDikeluarkan;
      if (data.kopSuratId) form.kopSuratId = data.kopSuratId;
      if (data.penandatanganId) {
        form.penandatanganId = data.penandatanganId;
      } else if (data.penandatangan?.id) {
        form.penandatanganId = data.penandatangan.id;
      }
      if (data.tanggalSurat) form.tanggalSurat = new Date(data.tanggalSurat);
    } else {
      toast.error('Gagal memuat data Surat Tugas yang akan diedit');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem');
  } finally {
    loadingExisting.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadKopSurat(), loadPenandatangan(), loadDasarHukum()]);
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

  if (!form.penandatanganId) {
    errors.penandatanganId = 'Pejabat Penandatangan Surat Tugas wajib dipilih.';
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

    let finalNomorSurat: string | undefined = undefined;
    if (form.nomorSuratMode === 'custom' || isEditMode.value) {
      const seq = form.customSeq.trim();
      const unit = form.unitCode.trim() || 'Bag.Umum';
      const year = form.tahunSurat || currentYear;
      if (seq) {
        finalNomorSurat = `000.1.2.3/${seq}/${unit}/${year}`;
      }
    }

    // Gabungkan seluruh dasar hukum terpilih dipisah double newline
    const formattedDasarHukum = form.selectedDasarHukumList
      .map((d) => d.isi.trim())
      .filter(Boolean)
      .join('\n\n');

    const payload = {
      nomorSurat: finalNomorSurat,
      dasarHukum: formattedDasarHukum || undefined,
      pegawaiIds: form.pegawaiList.map((p) => p.id),
      dalamRangka: formattedDalamRangka,
      maksudHeader: form.maksudHeader?.trim() || undefined,
      tempatDikeluarkan: form.tempatDikeluarkan.trim() || 'Banggai',
      kopSuratId: form.kopSuratId,
      penandatanganId: form.penandatanganId || undefined,
      tanggalSurat: form.tanggalSurat,
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
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/surat-tugas');
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

        <!-- 1. Penomoran Surat Tugas (Dynamic & Optional) -->
        <div class="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-border">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label class="block text-sm font-semibold text-text-main">
                1. Penomoran Surat Tugas
              </label>
              <p class="text-xs text-text-muted mt-0.5">
                Format: <span class="font-mono text-primary font-semibold">000.1.2.3/[Nomor]/[Kode Unit]/[Tahun]</span>. Nomor urut bersifat opsional.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <label class="text-xs text-text-muted flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  v-model="form.nomorSuratMode"
                  value="auto"
                  :disabled="isEditMode"
                  class="text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Otomatis (Sistem)</span>
              </label>
              <label class="text-xs text-text-muted flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  v-model="form.nomorSuratMode"
                  value="custom"
                  class="text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Kustom / Manual</span>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Nomor Urut <span class="text-text-muted font-normal">(opsional)</span>
              </label>
              <GovInputText
                v-model="form.customSeq"
                :disabled="form.nomorSuratMode === 'auto' && !isEditMode"
                placeholder="Contoh: 001 atau kosongkan"
                block
              />
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Kode Unit Kerja
              </label>
              <GovInputText
                v-model="form.unitCode"
                placeholder="Contoh: Bag.Umum"
                block
              />
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Tahun Surat
              </label>
              <GovInputNumber
                v-model="form.tahunSurat"
                :min="2020"
                :max="2035"
                :use-grouping="false"
                :placeholder="String(currentYear)"
                block
              />
            </div>
          </div>

          <div class="text-xs text-text-muted pt-1 flex items-center gap-2">
            <span>Pratinjau Nomor Dokumen:</span>
            <span class="font-mono font-semibold text-text-main bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-border">
              {{ previewNomorSurat }}
            </span>
          </div>
        </div>

        <hr class="border-border" />

        <!-- 2. Dasar Hukum Penugasan (Dapat mengetik langsung dan memilih lebih dari satu dasar hukum) -->
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-semibold text-text-main">
              2. Dasar Hukum Penugasan
            </label>
            <p class="text-xs text-text-muted mt-0.5">
              Ketik nama atau regulasi dasar hukum untuk menambahkan. Setiap butir dapat disesuaikan teks redaksinya dan akan dicetak berurutan (1, 2, ...).
            </p>
          </div>

          <!-- Typeable Autocomplete Input like ASN -->
          <GovAutoComplete
            v-model="currentDasarHukumQuery"
            :suggestions="dasarHukumSuggestions"
            :loading="loadingDasarHukum"
            option-label="judul"
            placeholder="Ketik Nama atau Nomor Regulasi Dasar Hukum untuk menambahkan..."
            dropdown
            @complete="handleSearchDasarHukum"
            @item-select="handleSelectDasarHukum"
          >
            <template #option="{ option }">
              <div class="py-1 max-w-xl">
                <div class="font-medium text-sm text-text-main flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5">
                    <i v-if="option.id && option.id.startsWith('custom-')" class="pi pi-plus text-xs text-primary"></i>
                    <span>{{ option.judul }}</span>
                  </div>
                  <span
                    v-if="option.id && option.id.startsWith('custom-')"
                    class="text-[10px] bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-normal"
                  >
                    Gunakan Teks Ini
                  </span>
                </div>
                <div v-if="option.isi && option.isi !== option.judul" class="text-xs text-text-muted line-clamp-2 mt-0.5">
                  {{ option.isi }}
                </div>
              </div>
            </template>
          </GovAutoComplete>

          <!-- List Dasar Hukum Terpilih (Seperti Input Pegawai) -->
          <div v-if="form.selectedDasarHukumList.length > 0" class="space-y-2.5 pt-1">
            <div class="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Daftar Dasar Hukum Terpilih ({{ form.selectedDasarHukumList.length }} Butir):
            </div>
            <div class="space-y-2.5">
              <div
                v-for="(dh, index) in form.selectedDasarHukumList"
                :key="dh.id"
                class="p-3 bg-slate-50 dark:bg-slate-900/50 border border-border rounded-lg text-xs space-y-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <div class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-primary font-bold text-xs flex items-center justify-center font-mono flex-shrink-0">
                      {{ index + 1 }}
                    </div>
                    <span class="font-semibold text-text-main text-sm">{{ dh.judul }}</span>
                  </div>
                  <GovButton
                    type="button"
                    icon="pi pi-times"
                    severity="danger"
                    variant="text"
                    rounded
                    size="small"
                    title="Hapus dasar hukum ini"
                    @click="removeDasarHukum(index)"
                  />
                </div>
                <div>
                  <GovTextarea
                    v-model="dh.isi"
                    rows="2"
                    placeholder="Isi / konten redaksi dasar hukum..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
            Belum ada dasar hukum yang dipilih. Silakan ketik atau pilih dari saran di atas.
          </div>
        </div>

        <hr class="border-border" />
        
        <!-- 3. Pegawai Pelaksana (Multiple ASN Lazy Search) -->
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-semibold text-text-main">
              3. Pegawai Pelaksana Penugasan (ASN) <span class="text-red-500">*</span>
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

        <!-- 4. Dalam Rangka (Maksud Penugasan Multi-Agenda) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <label class="block text-sm font-semibold text-text-main">
                4. Dalam Rangka (Maksud Penugasan) <span class="text-red-500">*</span>
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

          <!-- Judul / Pengantar Maksud Penugasan (Muncul jika multiple agenda) -->
          <div v-if="form.maksudList.length > 1" class="space-y-1.5 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <label class="block text-xs font-semibold text-text-main">
              Judul / Teks Pengantar Maksud Tugas (Opsional / Tanpa Nomor)
            </label>
            <GovInputText
              v-model="form.maksudHeader"
              placeholder="Contoh: Untuk melaksanakan tugas dalam rangka:"
              class="w-full text-xs"
            />
            <p class="text-[11px] text-text-muted">
              Teks ini akan dicetak tepat di samping label <strong>Untuk :</strong> tanpa nomor urut, diikuti rincian agenda tugas bernomor di bawahnya.
            </p>
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

        <!-- 5. Pengaturan Dokumen (Kop Surat, Pejabat Penandatangan, Tempat & Tanggal) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-text-main">
              Kop Surat Dinas
            </label>
            <GovSelect
              v-model="form.kopSuratId"
              :options="kopSuratList"
              option-label="nama"
              option-value="id"
              placeholder="Pilih Kop Surat"
              :loading="loadingKop"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-text-main">
              Pejabat Penandatangan <span class="text-red-500">*</span>
            </label>
            <GovSelect
              v-model="form.penandatanganId"
              :options="penandatanganOptions"
              option-label="nama"
              option-value="id"
              placeholder="Pilih Penandatangan"
              :invalid="!!errors.penandatanganId"
              :loading="loadingPenandatangan"
            />
            <small v-if="errors.penandatanganId" class="text-red-500 text-[11px] block">
              {{ errors.penandatanganId }}
            </small>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-text-main">
              Tempat Dikeluarkan
            </label>
            <GovInputText
              v-model="form.tempatDikeluarkan"
              placeholder="Contoh: Banggai"
              block
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-text-main">
              Tanggal Surat
            </label>
            <GovDatePicker
              v-model="form.tanggalSurat"
              date-format="dd/mm/yy"
            />
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
