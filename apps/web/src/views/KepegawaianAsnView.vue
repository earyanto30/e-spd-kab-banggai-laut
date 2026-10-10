<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import {
  GovButton,
  GovCard,
  GovInputText,
  GovTable,
} from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';

export interface AsnPegawai {
  id: string;
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  unitKerja: string;
  isASN: boolean;
  isPenandatangan?: boolean;
  tandaTangan?: string | null;
}

const STORAGE_KEY = 'kepegawaian_asn_list';

const defaultAsnList: AsnPegawai[] = [
  {
    id: 'asn-1',
    nip: '19680512 199403 1 004',
    nama: 'Drs. H. Bambang Soeprapto, M.Si',
    pangkat: 'Pembina Utama Madya',
    golongan: 'IV/d',
    jabatan: 'Sekretaris Daerah',
    unitKerja: 'Sekretariat Daerah',
    isASN: true,
    isPenandatangan: true,
  },
  {
    id: 'asn-2',
    nip: '19740821 199903 2 002',
    nama: 'Ir. Hj. Siti Rahmawati, MT',
    pangkat: 'Pembina Utama Muda',
    golongan: 'IV/c',
    jabatan: 'Asisten Pemerintahan dan Kesra',
    unitKerja: 'Sekretariat Daerah - Asisten I',
    isASN: true,
    isPenandatangan: false,
  },
  {
    id: 'asn-3',
    nip: '19850214 200412 1 001',
    nama: 'Dedy Kurniawan, S.STP, M.AP',
    pangkat: 'Pembina',
    golongan: 'IV/a',
    jabatan: 'Kepala Bagian Umum dan Protokol',
    unitKerja: 'Sekretariat Daerah - Bagian Umum',
    isASN: true,
    isPenandatangan: true,
  },
  {
    id: 'asn-4',
    nip: '19890610 201101 2 008',
    nama: 'Ratna Juwita, S.H., M.H.',
    pangkat: 'Penata Tingkat I',
    golongan: 'III/d',
    jabatan: 'Kepala Bagian Hukum',
    unitKerja: 'Sekretariat Daerah - Bagian Hukum',
    isASN: true,
    isPenandatangan: false,
  },
  {
    id: 'asn-5',
    nip: '19920315 201802 1 003',
    nama: 'Fajar Prasetyo, S.Kom',
    pangkat: 'Penata',
    golongan: 'III/c',
    jabatan: 'Pranata Komputer Ahli Muda',
    unitKerja: 'Sekretariat Daerah - Bagian Organisasi',
    isASN: true,
    isPenandatangan: false,
  },
  {
    id: 'asn-6',
    nip: '19951104 202012 2 011',
    nama: 'Nurul Aini, A.Md',
    pangkat: 'Pengatur',
    golongan: 'II/c',
    jabatan: 'Pengelola Administrasi Perjalanan Dinas',
    unitKerja: 'Sekretariat Daerah - Bagian Umum',
    isASN: true,
    isPenandatangan: false,
  },
  {
    id: 'asn-7',
    nip: '19900720 202321 1 005',
    nama: 'Eko Wahyudi, S.AP',
    pangkat: 'Ahli Pertama',
    golongan: 'IX',
    jabatan: 'Analis Kebijakan',
    unitKerja: 'Sekretariat Daerah - Bagian Perekonomian',
    isASN: true,
    isPenandatangan: false,
  },
];

const list = ref<AsnPegawai[]>([]);
const searchQuery = ref('');
const statusFilter = ref<'SEMUA' | 'ASN' | 'NON_ASN'>('SEMUA');
const isFormDialogOpen = ref(false);
const isDetailDialogOpen = ref(false);
const isEditing = ref(false);
const selectedAsn = ref<AsnPegawai | null>(null);
const toast = useGovToast();
const signatureUrls = ref<Record<string, string>>({});
const isUploadingSignature = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const form = ref<AsnPegawai>({
  id: '',
  nip: '',
  nama: '',
  pangkat: '',
  golongan: '',
  jabatan: '',
  unitKerja: 'Sekretariat Daerah',
  isASN: true,
  isPenandatangan: false,
  tandaTangan: null,
});

const loadData = async () => {
  try {
    const res = await apiFetch('/api/pegawai');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        list.value = data;
        return;
      }
    }
  } catch {
    // API not reachable, fallback
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      list.value = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...defaultAsnList];
    } catch {
      list.value = [...defaultAsnList];
    }
  } else {
    list.value = [...defaultAsnList];
    persistData();
  }
};

const persistData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value));
};

const totalAsn = computed(() => list.value.filter((a) => a.isASN).length);
const totalNonAsn = computed(() => list.value.filter((a) => !a.isASN).length);

const filteredList = computed(() => {
  return list.value.filter((asn) => {
    const matchesStatus =
      statusFilter.value === 'SEMUA' ||
      (statusFilter.value === 'ASN' && asn.isASN) ||
      (statusFilter.value === 'NON_ASN' && !asn.isASN);
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return matchesStatus;

    const matchesQuery =
      asn.nama.toLowerCase().includes(q) ||
      asn.nip.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
      asn.jabatan.toLowerCase().includes(q) ||
      asn.unitKerja.toLowerCase().includes(q);

    return matchesStatus && matchesQuery;
  });
});

const loadSignature = async (pegawaiId: string) => {
  if (signatureUrls.value[pegawaiId]) return signatureUrls.value[pegawaiId];
  try {
    const res = await apiFetch(`/api/pegawai/${pegawaiId}/tanda-tangan`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      signatureUrls.value[pegawaiId] = url;
      return url;
    }
  } catch {}
  return null;
};

// Standarisasi Tanda Tangan: Editor Modal State
const isSignatureEditorModalOpen = ref(false);
const editorCanvasRef = ref<HTMLCanvasElement | null>(null);
const editorImage = ref<HTMLImageElement | null>(null);
const editorPreviewDataUrl = ref<string>('');
const isSavingEditorSignature = ref(false);
const editorOriginalFileName = ref<string>('');

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 300;

const editorSettings = reactive({
  scale: 100,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  removeWhiteBg: true,
  whiteThreshold: 45,
  darkenInk: true,
  inkDarkness: 70,
});

const autoFitEditorImage = (img: HTMLImageElement) => {
  editorSettings.rotation = 0;
  editorSettings.offsetX = 0;
  editorSettings.offsetY = 0;
  const maxWidth = CANVAS_WIDTH * 0.85;
  const maxHeight = CANVAS_HEIGHT * 0.85;
  const ratio = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
  editorSettings.scale = Math.round(ratio * 100);
};

const resetEditorSettings = () => {
  if (editorImage.value) {
    autoFitEditorImage(editorImage.value);
    editorSettings.removeWhiteBg = true;
    editorSettings.whiteThreshold = 45;
    editorSettings.darkenInk = true;
    editorSettings.inkDarkness = 70;
    renderEditorCanvas();
  }
};

const renderEditorCanvas = () => {
  const canvas = editorCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (!editorImage.value) {
    editorPreviewDataUrl.value = '';
    return;
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = CANVAS_WIDTH;
  offscreen.height = CANVAS_HEIGHT;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  offCtx.save();
  offCtx.translate(CANVAS_WIDTH / 2 + editorSettings.offsetX, CANVAS_HEIGHT / 2 + editorSettings.offsetY);
  offCtx.rotate((editorSettings.rotation * Math.PI) / 180);

  const scaleFactor = editorSettings.scale / 100;
  const drawWidth = editorImage.value.naturalWidth * scaleFactor;
  const drawHeight = editorImage.value.naturalHeight * scaleFactor;

  offCtx.drawImage(
    editorImage.value,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );
  offCtx.restore();

  const imgData = offCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const data = imgData.data;

  if (editorSettings.removeWhiteBg || editorSettings.darkenInk) {
    const threshold = (editorSettings.whiteThreshold / 100) * 255;
    const inkFactor = editorSettings.inkDarkness / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      if (editorSettings.removeWhiteBg) {
        if (brightness >= threshold) {
          const fadeSpan = 30;
          if (brightness >= threshold + fadeSpan) {
            data[i + 3] = 0;
            continue;
          } else {
            const alphaFrac = 1 - (brightness - threshold) / fadeSpan;
            data[i + 3] = Math.round(a * Math.max(0, alphaFrac));
          }
        }
      }

      if (editorSettings.darkenInk && data[i + 3] > 0) {
        data[i] = Math.round(r * (1 - inkFactor));
        data[i + 1] = Math.round(g * (1 - inkFactor));
        data[i + 2] = Math.round(b * (1 - inkFactor));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  editorPreviewDataUrl.value = canvas.toDataURL('image/png');
};

watch(editorSettings, () => {
  renderEditorCanvas();
});

const handleSignatureUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast.warn('Format berkas harus berupa gambar (PNG, JPG, JPEG, WebP).');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.warn('Ukuran berkas melebihi batas maksimal 5 MB.');
    return;
  }

  if (!form.value.id || form.value.id.startsWith('asn-')) {
    toast.warn('Silakan simpan data pegawai terlebih dahulu sebelum mengunggah tanda tangan.');
    return;
  }

  editorOriginalFileName.value = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      editorImage.value = img;
      autoFitEditorImage(img);
      isSignatureEditorModalOpen.value = true;
      setTimeout(() => renderEditorCanvas(), 50);
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);

  if (target) target.value = '';
};

const openEditorWithActiveSignature = () => {
  if (!form.value.id || !signatureUrls.value[form.value.id]) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    editorImage.value = img;
    editorOriginalFileName.value = form.value.tandaTangan || 'tanda-tangan-saat-ini.png';
    autoFitEditorImage(img);
    isSignatureEditorModalOpen.value = true;
    setTimeout(() => renderEditorCanvas(), 50);
  };
  img.src = signatureUrls.value[form.value.id];
};

const handleApplyEditorSignature = async () => {
  const canvas = editorCanvasRef.value;
  if (!canvas || !editorPreviewDataUrl.value) {
    toast.warn('Belum ada gambar tanda tangan di kanvas editor.');
    return;
  }

  isSavingEditorSignature.value = true;
  try {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error('Gagal memproses gambar tanda tangan dari kanvas.');
        isSavingEditorSignature.value = false;
        return;
      }

      const formData = new FormData();
      formData.append('file', blob, `ttd-${form.value.id}-standard.png`);

      const res = await apiFetch(`/api/pegawai/${form.value.id}/tanda-tangan`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const updated = await res.json();
        form.value.tandaTangan = updated.tandaTangan;
        if (signatureUrls.value[form.value.id]) {
          URL.revokeObjectURL(signatureUrls.value[form.value.id]);
          delete signatureUrls.value[form.value.id];
        }
        await loadSignature(form.value.id);
        await loadData();
        isSignatureEditorModalOpen.value = false;
        toast.success(
          `Tanda tangan resmi untuk ${form.value.nama} berhasil distandarisasi dan disimpan!`,
          'Standarisasi Berhasil'
        );
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Gagal menyimpan tanda tangan ke server.');
      }
      isSavingEditorSignature.value = false;
    }, 'image/png');
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan sistem.');
    isSavingEditorSignature.value = false;
  }
};

const handleDeleteSignature = async () => {
  if (!form.value.id) return;
  try {
    const res = await apiFetch(`/api/pegawai/${form.value.id}/tanda-tangan`, {
      method: 'DELETE',
    });
    if (res.ok) {
      if (signatureUrls.value[form.value.id]) {
        URL.revokeObjectURL(signatureUrls.value[form.value.id]);
        delete signatureUrls.value[form.value.id];
      }
      form.value.tandaTangan = null;
      await loadData();
      toast.success('Tanda tangan berhasil dihapus.');
    }
  } catch {
    toast.error('Gagal menghapus tanda tangan.');
  }
};

const openCreateDialog = () => {
  isEditing.value = false;
  form.value = {
    id: `asn-${Date.now()}`,
    nip: '',
    nama: '',
    pangkat: 'Penata Muda',
    golongan: 'III/a',
    jabatan: '',
    unitKerja: 'Sekretariat Daerah',
    isASN: true,
    isPenandatangan: false,
    tandaTangan: null,
  };
  isFormDialogOpen.value = true;
};

const openEditDialog = (item: AsnPegawai) => {
  isEditing.value = true;
  form.value = {
    ...item,
    isPenandatangan: Boolean(item.isPenandatangan),
  };
  if (item.tandaTangan) {
    loadSignature(item.id);
  }
  isFormDialogOpen.value = true;
};

const openDetailDialog = (item: AsnPegawai) => {
  selectedAsn.value = item;
  if (item.tandaTangan) {
    loadSignature(item.id);
  }
  isDetailDialogOpen.value = true;
};

const handleSave = async () => {
  if (!form.value.nip.trim() || !form.value.nama.trim() || !form.value.jabatan.trim()) {
    toast.warn('NIP, Nama Lengkap, dan Jabatan wajib diisi.');
    return;
  }

  try {
    if (isEditing.value) {
      const res = await apiFetch(`/api/pegawai/${form.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.value),
      });
      if (res.ok) {
        await loadData();
        isFormDialogOpen.value = false;
        toast.success('Data pegawai berhasil diperbarui.');
        return;
      }
    } else {
      const res = await apiFetch('/api/pegawai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.value),
      });
      if (res.ok) {
        await loadData();
        isFormDialogOpen.value = false;
        toast.success('Data pegawai baru berhasil disimpan.');
        return;
      }
    }
  } catch {
    // local fallback
  }

  if (isEditing.value) {
    const idx = list.value.findIndex((a) => a.id === form.value.id);
    if (idx !== -1) {
      list.value[idx] = { ...form.value };
    }
  } else {
    list.value.push({ ...form.value });
  }

  persistData();
  isFormDialogOpen.value = false;
  toast.success(isEditing.value ? 'Data pegawai berhasil diperbarui.' : 'Data pegawai baru berhasil ditambahkan.');
};

const handleDelete = async (item: AsnPegawai) => {
  try {
    const res = await apiFetch(`/api/pegawai/${item.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await loadData();
      toast.success(`Data pegawai ${item.nama} berhasil dihapus.`);
      return;
    }
  } catch {
    // local fallback
  }

  list.value = list.value.filter((a) => a.id !== item.id);
  persistData();
  toast.success(`Data pegawai ${item.nama} berhasil dihapus.`);
};

onMounted(() => {
  loadData();
});

onUnmounted(() => {
  Object.values(signatureUrls.value).forEach((url) => {
    URL.revokeObjectURL(url);
  });
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Page -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-main tracking-tight">
          Data Pegawai (ASN)
        </h1>
        <p class="text-sm text-text-muted mt-0.5">
          Daftar seluruh Aparatur Sipil Negara di lingkungan Sekretariat Daerah Kabupaten Banggai Laut untuk penugasan dan perjalanan dinas.
        </p>
      </div>

      <GovButton
        label="Tambah Pegawai ASN"
        icon="pi pi-user-plus"
        severity="primary"
        @click="openCreateDialog"
      />
    </div>

    <!-- Stats Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-primary/25">
          <i class="pi pi-users text-2xl"></i>
        </div>
        <div>
          <div class="text-xs text-text-muted font-medium">Total Pegawai ASN</div>
          <div class="text-2xl font-bold text-text-main mt-0.5">{{ list.length }}</div>
        </div>
      </div>

      <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-success/15 text-success flex items-center justify-center flex-shrink-0 border border-emerald-100 dark:border-success/25">
          <i class="pi pi-id-card text-2xl"></i>
        </div>
        <div>
          <div class="text-xs text-text-muted font-medium">Pegawai ASN</div>
          <div class="text-2xl font-bold text-success mt-0.5">{{ totalAsn }}</div>
        </div>
      </div>

      <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 border border-amber-100 dark:border-accent/25">
          <i class="pi pi-briefcase text-2xl"></i>
        </div>
        <div>
          <div class="text-xs text-text-muted font-medium">Pegawai Non ASN</div>
          <div class="text-2xl font-bold text-accent mt-0.5">{{ totalNonAsn }}</div>
        </div>
      </div>
    </div>

    <!-- Main Table Card -->
    <GovCard>
      <template #title>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 text-base font-semibold text-text-main">
          <div class="flex items-center gap-2">
            <i class="pi pi-list text-primary"></i>
            <span>Daftar Pegawai ASN Sekda Kab. Banggai Laut</span>
          </div>

          <!-- Search & Filter Controls -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 font-normal">
            <div class="w-full sm:w-72">
              <GovInputText
                v-model="searchQuery"
                placeholder="Cari NIP, Nama, Jabatan..."
                block
              />
            </div>

            <!-- Status Filter Toggle Buttons -->
            <div class="flex items-center border border-border rounded-lg overflow-hidden bg-surface shadow-sm">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium transition-colors"
                :class="statusFilter === 'SEMUA' ? 'bg-primary text-white dark:text-[#0F172A] font-semibold' : 'text-text-muted hover:bg-canvas hover:text-text-main'"
                @click="statusFilter = 'SEMUA'"
              >
                Semua
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium transition-colors border-l border-border"
                :class="statusFilter === 'ASN' ? 'bg-primary text-white dark:text-[#0F172A] font-semibold' : 'text-text-muted hover:bg-canvas hover:text-text-main'"
                @click="statusFilter = 'ASN'"
              >
                ASN
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium transition-colors border-l border-border"
                :class="statusFilter === 'NON_ASN' ? 'bg-primary text-white dark:text-[#0F172A] font-semibold' : 'text-text-muted hover:bg-canvas hover:text-text-main'"
                @click="statusFilter = 'NON_ASN'"
              >
                Non ASN
              </button>
            </div>
          </div>
        </div>
      </template>

      <template #content>
        <GovTable :value="filteredList" :paginator="true" :rows="5">
          <!-- Column: Nama & NIP -->
          <Column field="nama" header="Pegawai & NIP" sortable>
            <template #body="{ data }">
              <div class="space-y-0.5">
                <div class="font-semibold text-text-main text-sm">
                  {{ data.nama }}
                </div>
                <div class="font-mono text-xs text-text-muted">
                  NIP. {{ data.nip }}
                </div>
              </div>
            </template>
          </Column>

          <!-- Column: Jabatan & Unit Kerja -->
          <Column field="jabatan" header="Jabatan & Unit Kerja" sortable>
            <template #body="{ data }">
              <div class="space-y-0.5">
                <div class="text-xs font-medium text-text-main">
                  {{ data.jabatan }}
                </div>
                <div class="text-xs text-text-muted">
                  {{ data.unitKerja }}
                </div>
              </div>
            </template>
          </Column>

          <!-- Column: Pangkat / Golongan -->
          <Column field="golongan" header="Pangkat / Golongan" class="w-48">
            <template #body="{ data }">
              <div class="space-y-0.5">
                <div class="text-xs text-text-main">
                  {{ data.pangkat }}
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 dark:bg-canvas text-primary border border-border">
                  Gol. {{ data.golongan }}
                </span>
              </div>
            </template>
          </Column>

          <!-- Column: Status -->
          <Column field="isASN" header="Status" class="w-36 text-center">
            <template #body="{ data }">
              <div class="flex flex-col items-center gap-1">
                <Tag
                  :value="data.isASN ? 'ASN' : 'Non ASN'"
                  :severity="data.isASN ? 'success' : 'secondary'"
                />
                <Tag
                  v-if="data.isPenandatangan"
                  value="Penandatangan"
                  severity="info"
                  class="text-[10px]"
                />
                <span
                  v-if="data.tandaTangan"
                  class="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium"
                  title="Tanda tangan PNG tersedia"
                >
                  <i class="pi pi-check-circle"></i> TTD PNG
                </span>
              </div>
            </template>
          </Column>

          <!-- Column: Aksi -->
          <Column header="Aksi" body-class="text-right" class="w-36">
            <template #body="{ data }">
              <div class="flex items-center justify-end gap-1">
                <GovButton
                  icon="pi pi-eye"
                  size="small"
                  severity="secondary"
                  variant="text"
                  rounded
                  title="Lihat Profil Pegawai"
                  @click="openDetailDialog(data)"
                />
                <GovButton
                  icon="pi pi-pencil"
                  size="small"
                  severity="info"
                  variant="text"
                  rounded
                  title="Ubah Data"
                  @click="openEditDialog(data)"
                />
                <GovButton
                  icon="pi pi-trash"
                  size="small"
                  severity="danger"
                  variant="text"
                  rounded
                  title="Hapus Pegawai"
                  @click="handleDelete(data)"
                />
              </div>
            </template>
          </Column>
        </GovTable>
      </template>
    </GovCard>

    <!-- Detail Dialog Modal -->
    <Dialog
      v-model:visible="isDetailDialogOpen"
      :modal="true"
      header="Biodata Lengkap Pegawai ASN"
      class="w-full max-w-lg"
    >
      <div v-if="selectedAsn" class="space-y-4 pt-2">
        <!-- Top Profile Banner -->
        <div class="flex items-center gap-4 p-4 bg-canvas border border-border rounded-xl">
          <div class="w-14 h-14 rounded-full bg-primary text-white dark:text-[#0F172A] font-bold text-xl flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-primary/20">
            {{ selectedAsn.nama.charAt(0) }}
          </div>
          <div class="min-w-0">
            <div class="font-bold text-text-main text-base">
              {{ selectedAsn.nama }}
            </div>
            <div class="font-mono text-xs text-text-muted">
              NIP. {{ selectedAsn.nip }}
            </div>
            <div class="mt-1">
              <Tag
                :value="selectedAsn.isASN ? 'ASN' : 'Non ASN'"
                :severity="selectedAsn.isASN ? 'success' : 'secondary'"
              />
            </div>
          </div>
        </div>

        <!-- Detail Information Rows -->
        <div class="space-y-2 text-xs">
          <div class="flex justify-between py-1.5 border-b border-border">
            <span class="text-text-muted">Jabatan:</span>
            <span class="font-medium text-text-main text-right">{{ selectedAsn.jabatan }}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-border">
            <span class="text-text-muted">Unit Kerja:</span>
            <span class="font-medium text-text-main text-right">{{ selectedAsn.unitKerja }}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-border">
            <span class="text-text-muted">Pangkat / Golongan:</span>
            <span class="font-medium text-text-main text-right">{{ selectedAsn.pangkat }} (Gol. {{ selectedAsn.golongan }})</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-border">
            <span class="text-text-muted">Pejabat Penandatangan:</span>
            <span class="font-medium text-text-main text-right">
              {{ selectedAsn.isPenandatangan ? 'Ya (Penandatangan Surat / SPD)' : 'Bukan Penandatangan' }}
            </span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-border">
            <span class="text-text-muted">Status Tanda Tangan:</span>
            <span class="font-medium text-right" :class="selectedAsn.tandaTangan ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted'">
              {{ selectedAsn.tandaTangan ? 'Tersedia (PNG)' : 'Belum Diunggah' }}
            </span>
          </div>
        </div>

        <div v-if="selectedAsn.tandaTangan && signatureUrls[selectedAsn.id]" class="p-3 bg-slate-50 dark:bg-canvas border border-border rounded-lg text-center space-y-2">
          <div class="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Pratinjau Tanda Tangan Resmi</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono">PNG Asli (Untrimmed)</span>
          </div>
          <div class="p-3 rounded-lg border border-border inline-flex items-center justify-center min-w-[200px] min-h-[70px] bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] [background-size:12px_12px] dark:bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)]">
            <img
              :src="signatureUrls[selectedAsn.id]"
              alt="Tanda Tangan"
              class="max-h-20 max-w-full object-contain"
            />
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <GovButton
            label="Tutup"
            severity="secondary"
            variant="outlined"
            @click="isDetailDialogOpen = false"
          />
        </div>
      </div>
    </Dialog>

    <!-- Create / Edit Dialog Modal -->
    <Dialog
      v-model:visible="isFormDialogOpen"
      :modal="true"
      :header="isEditing ? 'Ubah Data Pegawai' : 'Tambah Pegawai Baru'"
      class="w-full max-w-xl"
    >
      <form class="space-y-4 pt-2" @submit.prevent="handleSave">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="asnNip" class="text-xs font-semibold text-text-main">
              Nomor Induk Pegawai (NIP)
            </label>
            <GovInputText
              id="asnNip"
              v-model="form.nip"
              placeholder="Contoh: 19850214 200412 1 001"
              block
              required
            />
          </div>

          <div class="space-y-1">
            <label for="asnNama" class="text-xs font-semibold text-text-main">
              Nama Lengkap & Gelar
            </label>
            <GovInputText
              id="asnNama"
              v-model="form.nama"
              placeholder="Contoh: Dedy Kurniawan, S.STP, M.AP"
              block
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="asnPangkat" class="text-xs font-semibold text-text-main">
              Pangkat
            </label>
            <GovInputText
              id="asnPangkat"
              v-model="form.pangkat"
              placeholder="Contoh: Penata Tingkat I"
              block
              required
            />
          </div>

          <div class="space-y-1">
            <label for="asnGolongan" class="text-xs font-semibold text-text-main">
              Golongan Ruang
            </label>
            <GovInputText
              id="asnGolongan"
              v-model="form.golongan"
              placeholder="Contoh: III/d atau IV/a"
              block
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="asnJabatan" class="text-xs font-semibold text-text-main">
              Jabatan
            </label>
            <GovInputText
              id="asnJabatan"
              v-model="form.jabatan"
              placeholder="Contoh: Kepala Bagian Umum"
              block
              required
            />
          </div>

          <div class="space-y-1">
            <label for="asnUnitKerja" class="text-xs font-semibold text-text-main">
              Unit Kerja
            </label>
            <GovInputText
              id="asnUnitKerja"
              v-model="form.unitKerja"
              placeholder="Contoh: Sekretariat Daerah"
              block
              required
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-semibold text-text-main">
            Status Kepegawaian
          </label>
          <div class="flex items-center gap-4 pt-1">
            <label class="flex items-center gap-2 cursor-pointer text-xs text-text-main">
              <input
                v-model="form.isASN"
                type="radio"
                :value="true"
                name="statusAsn"
                class="accent-primary"
              />
              <span>ASN</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer text-xs text-text-main">
              <input
                v-model="form.isASN"
                type="radio"
                :value="false"
                name="statusAsn"
                class="accent-primary"
              />
              <span>Non ASN</span>
            </label>
          </div>
        </div>

        <div class="space-y-1 pt-2 border-t border-border">
          <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-main">
            <input
              v-model="form.isPenandatangan"
              type="checkbox"
              class="rounded text-primary focus:ring-primary h-4 w-4"
            />
            <span>Tetapkan sebagai Pejabat Penandatangan Dokumen</span>
          </label>
          <p class="text-[11px] text-text-muted pl-6">
            Menandai pegawai ini sebagai pejabat yang berwenang menandatangani Surat Perjalanan Dinas (SPD) dan Surat Tugas.
          </p>
        </div>

        <!-- Signature Upload (PNG) Section -->
        <div class="space-y-2 pt-2 border-t border-border">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-text-main">
              Berkas Tanda Tangan (PNG)
            </label>
            <span v-if="form.tandaTangan" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <i class="pi pi-check-circle"></i> Berkas Terpasang
            </span>
            <span v-else class="text-[11px] text-text-muted">
              Belum ada tanda tangan
            </span>
          </div>

          <div v-if="isEditing" class="space-y-3">
            <!-- Guidelines box -->
            <div class="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg text-[11px] text-blue-950 dark:text-blue-200 space-y-1">
              <div class="flex items-center gap-1.5 font-semibold text-primary">
                <i class="pi pi-info-circle text-xs"></i>
                <span>Standar Berkas Tanda Tangan:</span>
              </div>
              <ul class="list-disc list-inside space-y-0.5 text-text-muted dark:text-blue-200/80 pl-1">
                <li>Format wajib <strong>PNG dengan latar belakang transparan</strong>.</li>
                <li>Rasio horizontal <strong>~2 : 1</strong> (rekomendasi $600 \times 300$ px, min. lebar 100 px).</li>
                <li>Ukuran berkas maksimal <strong>2 MB</strong>.</li>
                <li>Berkas disimpan asli secara utuh tanpa pemotongan otomatis.</li>
              </ul>
            </div>

            <div v-if="form.tandaTangan && signatureUrls[form.id]" class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-canvas border border-border rounded-lg mb-2">
              <div class="p-1 rounded border border-border flex items-center justify-center w-28 h-16 bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] [background-size:10px_10px] dark:bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)]">
                <img
                  :src="signatureUrls[form.id]"
                  alt="Tanda Tangan"
                  class="max-h-14 max-w-full object-contain"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold text-text-main truncate">Tanda Tangan Aktif</div>
                <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">PNG Asli Terpasang</div>
                <div class="text-[10px] text-text-muted mt-0.5">Diposisikan proporsional pada dokumen</div>
              </div>
              <GovButton
                label="Hapus"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                variant="outlined"
                type="button"
                @click="handleDeleteSignature"
              />
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleSignatureUpload"
              />
              <GovButton
                :label="form.tandaTangan ? 'Ganti Tanda Tangan' : 'Unggah & Sesuaikan Tanda Tangan'"
                icon="pi pi-upload"
                size="small"
                severity="primary"
                variant="outlined"
                type="button"
                :loading="isUploadingSignature"
                @click="fileInputRef?.click()"
              />
              <GovButton
                v-if="form.tandaTangan && signatureUrls[form.id]"
                label="Sesuaikan Tanda Tangan Aktif"
                icon="pi pi-sliders-h"
                size="small"
                severity="secondary"
                variant="outlined"
                type="button"
                @click="openEditorWithActiveSignature"
                title="Sesuaikan ukuran, posisi, atau kebersihan latar belakang tanda tangan aktif"
              />
              <span class="text-[11px] text-text-muted">PNG / JPG / Scan (Otomatis disesuaikan ke standar)</span>
            </div>
          </div>
          <div v-else class="p-3 bg-slate-50 dark:bg-canvas rounded-lg border border-border text-[11px] text-text-muted flex items-center gap-2">
            <i class="pi pi-info-circle text-primary text-base"></i>
            <span>Unggah berkas tanda tangan PNG dapat dilakukan pada menu Ubah setelah pegawai baru disimpan.</span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            type="button"
            @click="isFormDialogOpen = false"
          />
          <GovButton
            :label="isEditing ? 'Simpan Perubahan' : 'Tambah Pegawai'"
            icon="pi pi-check"
            severity="primary"
            type="submit"
          />
        </div>
      </form>
    </Dialog>

    <!-- Modal Dialog: Editor & Standarisasi Tanda Tangan Digital -->
    <Dialog
      v-model:visible="isSignatureEditorModalOpen"
      :modal="true"
      header="Sesuaikan & Standarisasi Tanda Tangan Digital"
      class="w-full max-w-2xl"
    >
      <div class="space-y-4 pt-1">
        <div class="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-950 dark:text-blue-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-info-circle text-primary text-base"></i>
            <div>
              <span class="font-bold text-primary">Standarisasi Kanvas 600 &times; 300 px (Rasio 2:1):</span>
              <p class="text-[11px] text-text-muted dark:text-blue-200/80 mt-0.5">
                Sesuaikan ukuran dan posisi tanda tangan. Seluruh goresan tanda tangan disimpan utuh tanpa terpotong (untrimmed).
              </p>
            </div>
          </div>
          <GovButton
            label="Reset / Fit"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            variant="outlined"
            class="text-[11px]"
            @click="resetEditorSettings"
          />
        </div>

        <div class="space-y-3">
          <div class="text-xs font-bold text-text-main flex items-center justify-between">
            <span>Kanvas Studio (600 &times; 300 px)</span>
            <span class="text-[10px] text-text-muted font-mono truncate max-w-[200px]">{{ editorOriginalFileName || 'tanda-tangan.png' }}</span>
          </div>

          <!-- Canvas Container with Checkerboard Background -->
          <div class="relative w-full rounded-xl border border-border overflow-hidden bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] [background-size:16px_16px] dark:bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] flex items-center justify-center shadow-inner py-3">
            <canvas
              ref="editorCanvasRef"
              :width="CANVAS_WIDTH"
              :height="CANVAS_HEIGHT"
              class="max-w-full h-auto rounded border border-slate-300 dark:border-slate-700 shadow-sm block"
            ></canvas>
          </div>

          <!-- Sliders -->
          <div class="space-y-3 pt-1">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <div class="flex justify-between text-[11px] font-medium text-text-main">
                  <span>Skala (Zoom):</span>
                  <span class="font-mono text-primary font-bold">{{ editorSettings.scale }}%</span>
                </div>
                <input
                  v-model.number="editorSettings.scale"
                  type="range"
                  min="20"
                  max="250"
                  step="1"
                  class="w-full accent-primary"
                />
              </div>

              <div class="space-y-1">
                <div class="flex justify-between text-[11px] font-medium text-text-main">
                  <span>Rotasi Kemiringan:</span>
                  <span class="font-mono text-primary font-bold">{{ editorSettings.rotation }}&deg;</span>
                </div>
                <input
                  v-model.number="editorSettings.rotation"
                  type="range"
                  min="-30"
                  max="30"
                  step="0.5"
                  class="w-full accent-primary"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <div class="flex justify-between text-[11px] font-medium text-text-main">
                  <span>Geser Posisi (X):</span>
                  <span class="font-mono text-text-muted">{{ editorSettings.offsetX }} px</span>
                </div>
                <input
                  v-model.number="editorSettings.offsetX"
                  type="range"
                  min="-200"
                  max="200"
                  step="2"
                  class="w-full accent-primary"
                />
              </div>

              <div class="space-y-1">
                <div class="flex justify-between text-[11px] font-medium text-text-main">
                  <span>Geser Posisi (Y):</span>
                  <span class="font-mono text-text-muted">{{ editorSettings.offsetY }} px</span>
                </div>
                <input
                  v-model.number="editorSettings.offsetY"
                  type="range"
                  min="-100"
                  max="100"
                  step="2"
                  class="w-full accent-primary"
                />
              </div>
            </div>

            <!-- Tools: White BG Removal & Ink Darkening -->
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div class="p-2.5 bg-slate-50 dark:bg-canvas rounded-lg border border-border space-y-1.5">
                <label class="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-text-main">
                  <input
                    v-model="editorSettings.removeWhiteBg"
                    type="checkbox"
                    class="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Hapus Kertas Putih</span>
                </label>
                <div v-if="editorSettings.removeWhiteBg" class="space-y-0.5">
                  <div class="flex justify-between text-[10px] text-text-muted">
                    <span>Sensitivitas:</span>
                    <span class="font-mono font-bold">{{ editorSettings.whiteThreshold }}%</span>
                  </div>
                  <input
                    v-model.number="editorSettings.whiteThreshold"
                    type="range"
                    min="10"
                    max="90"
                    step="1"
                    class="w-full accent-primary"
                  />
                </div>
              </div>

              <div class="p-2.5 bg-slate-50 dark:bg-canvas rounded-lg border border-border space-y-1.5">
                <label class="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-text-main">
                  <input
                    v-model="editorSettings.darkenInk"
                    type="checkbox"
                    class="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Hitamkan Tinta Resmi</span>
                </label>
                <div v-if="editorSettings.darkenInk" class="space-y-0.5">
                  <div class="flex justify-between text-[10px] text-text-muted">
                    <span>Kepekatan:</span>
                    <span class="font-mono font-bold">{{ editorSettings.inkDarkness }}%</span>
                  </div>
                  <input
                    v-model.number="editorSettings.inkDarkness"
                    type="range"
                    min="20"
                    max="100"
                    step="1"
                    class="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            @click="isSignatureEditorModalOpen = false"
          />
          <GovButton
            label="Terapkan & Simpan Tanda Tangan"
            icon="pi pi-check"
            severity="success"
            size="small"
            :loading="isSavingEditorSignature"
            :disabled="!editorPreviewDataUrl"
            @click="handleApplyEditorSignature"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
