<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import {
  GovButton,
  GovCard,
  GovInputText,
  GovCheckbox,
  GovTable,
} from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';

export interface KopSuratItem {
  id: string;
  nama: string;
  keterangan: string;
  fileName: string;
  storedFileName?: string;
  fileSize: string;
  paperSize?: string;
  isDefault: boolean;
  createdAt: string;
  pdfUrl?: string;
}

const STORAGE_KEY = 'kop_surat_pdf_list';

const defaultFallbackList: KopSuratItem[] = [
  {
    id: 'kop-1',
    nama: 'Kop 1 (Sekretariat Daerah)',
    keterangan: 'Berkas template PDF kop dinas resmi Sekretariat Daerah',
    fileName: 'kop_resmi_setda.pdf',
    storedFileName: 'kop_setda_default.pdf',
    fileSize: '1.2 KB',
    paperSize: 'A4',
    isDefault: true,
    createdAt: '2026-09-01',
    pdfUrl: '/api/kop-surat/kop-1/stream',
  },
];

const list = ref<KopSuratItem[]>([]);
const isDialogOpen = ref(false);
const selectedKop = ref<KopSuratItem | null>(null);
const toast = useGovToast();
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isSubmitting = ref(false);

const form = ref({
  nama: '',
  keterangan: '',
  isDefault: false,
});

const activePreview = computed<KopSuratItem | null>(() => {
  if (selectedKop.value) return selectedKop.value;
  return list.value.find((item) => item.isDefault) || list.value[0] || null;
});

const activePdfBlobUrl = ref<string | null>(null);
const isLoadingPdf = ref<boolean>(false);

watch(
  () => activePreview.value?.id,
  async (newId) => {
    if (activePdfBlobUrl.value) {
      URL.revokeObjectURL(activePdfBlobUrl.value);
      activePdfBlobUrl.value = null;
    }
    if (!newId) return;

    isLoadingPdf.value = true;
    try {
      const res = await apiFetch(`/api/kop-surat/${newId}/stream`);
      if (res.ok) {
        const blob = await res.blob();
        activePdfBlobUrl.value = URL.createObjectURL(blob);
      }
    } catch (err) {
      console.error('Gagal memuat pratinjau PDF:', err);
    } finally {
      isLoadingPdf.value = false;
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (activePdfBlobUrl.value) {
    URL.revokeObjectURL(activePdfBlobUrl.value);
  }
});

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  const file = files[0];
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    toast.warn('Hanya berkas format PDF (.pdf) yang diperbolehkan.');
    target.value = '';
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    toast.warn('Ukuran berkas PDF melebihi batas 10 MB.');
    target.value = '';
    return;
  }

  selectedFile.value = file;
};

const loadData = async () => {
  try {
    const res = await apiFetch('/api/kop-surat');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        list.value = data;
        return;
      }
    }
  } catch {
    // API not reachable or offline, fallback to local cache
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      list.value = JSON.parse(saved);
      return;
    } catch {
      // fallback
    }
  }

  list.value = [...defaultFallbackList];
};

const openUploadDialog = () => {
  selectedFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
  form.value = {
    nama: `Kop ${list.value.length + 1}`,
    keterangan: '',
    isDefault: list.value.length === 0,
  };
  isDialogOpen.value = true;
};

const handleSave = async () => {
  if (!form.value.nama.trim()) {
    toast.warn('Label / nama kop surat wajib diisi.');
    return;
  }
  if (!selectedFile.value) {
    toast.warn('Silakan pilih berkas PDF kop surat terlebih dahulu.');
    return;
  }

  isSubmitting.value = true;

  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('nama', form.value.nama.trim());
    formData.append('keterangan', form.value.keterangan.trim());
    formData.append('isDefault', String(form.value.isDefault));

    const res = await apiFetch('/api/kop-surat/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const newItem = await res.json();
      await loadData();
      selectedKop.value = newItem;
      isDialogOpen.value = false;
      toast.success(`Berkas PDF ${newItem.nama} berhasil diunggah.`);
      return;
    }
  } catch {
    // Fallback local save if server unavailable
  } finally {
    isSubmitting.value = false;
  }

  // Local fallback
  const id = `kop-${Date.now()}`;
  const pdfBlobUrl = URL.createObjectURL(selectedFile.value);
  const newItem: KopSuratItem = {
    id,
    nama: form.value.nama.trim(),
    keterangan: form.value.keterangan.trim(),
    fileName: selectedFile.value.name,
    fileSize: formatBytes(selectedFile.value.size),
    isDefault: form.value.isDefault || list.value.length === 0,
    createdAt: new Date().toISOString().split('T')[0],
    pdfUrl: pdfBlobUrl,
  };

  if (newItem.isDefault) {
    list.value.forEach((k) => {
      k.isDefault = false;
    });
  }

  list.value.push(newItem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value));
  selectedKop.value = newItem;
  isDialogOpen.value = false;
  toast.success(`Berkas PDF ${newItem.nama} berhasil disimpan.`);
};

const handleSetDefault = async (item: KopSuratItem) => {
  try {
    const res = await apiFetch(`/api/kop-surat/${item.id}/default`, {
      method: 'PATCH',
    });
    if (res.ok) {
      await loadData();
      selectedKop.value = item;
      toast.success(`${item.nama} ditetapkan sebagai kop surat utama (default).`);
      return;
    }
  } catch {
    // Local fallback
  }

  list.value.forEach((k) => {
    k.isDefault = k.id === item.id;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value));
  selectedKop.value = item;
  toast.success(`${item.nama} ditetapkan sebagai kop surat utama (default).`);
};

const handleDelete = async (item: KopSuratItem) => {
  if (list.value.length <= 1) {
    toast.warn('Minimal harus ada 1 berkas kop surat tersimpan.');
    return;
  }

  try {
    const res = await apiFetch(`/api/kop-surat/${item.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await loadData();
      if (selectedKop.value?.id === item.id) {
        selectedKop.value = null;
      }
      toast.success(`Berkas kop ${item.nama} berhasil dihapus.`);
      return;
    }
  } catch {
    // Local fallback
  }

  const wasDefault = item.isDefault;
  list.value = list.value.filter((k) => k.id !== item.id);
  if (wasDefault && list.value.length > 0) {
    list.value[0].isDefault = true;
  }
  if (selectedKop.value?.id === item.id) {
    selectedKop.value = null;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value));
  toast.success(`Berkas kop ${item.nama} berhasil dihapus.`);
};

const handlePreview = (item: KopSuratItem) => {
  selectedKop.value = item;
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-main tracking-tight">
          Pengaturan Kop Surat
        </h1>
        <p class="text-sm text-text-muted mt-0.5">
          Unggah dan kelola berkas PDF kop surat resmi Sekretariat Daerah Kabupaten Banggai Laut untuk dokumen SPD.
        </p>
      </div>

      <GovButton
        label="Unggah Berkas PDF"
        icon="pi pi-upload"
        severity="primary"
        @click="openUploadDialog"
      />
    </div>

    <!-- Table of Stored PDF Kop Surat -->
    <GovCard>
      <template #title>
        <div class="flex items-center justify-between text-base font-semibold text-text-main">
          <div class="flex items-center gap-2">
            <i class="pi pi-folder text-primary"></i>
            <span>Daftar Berkas PDF Kop Surat</span>
          </div>
          <span class="text-xs text-text-muted font-normal">
            Direktori Penyimpanan: <code class="font-mono text-primary bg-blue-50 dark:bg-primary/15 px-1.5 py-0.5 rounded border border-blue-100 dark:border-primary/25">uploads/kop-surat/</code> ({{ list.length }} berkas)
          </span>
        </div>
      </template>

      <template #content>
        <GovTable :value="list" :paginator="true" :rows="5">
          <!-- Column: Ikon & Format -->
          <Column header="Tipe Berkas" class="w-28 text-center">
            <template #body>
              <div class="flex items-center justify-center">
                <div class="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
                  <i class="pi pi-file-pdf text-xl"></i>
                </div>
              </div>
            </template>
          </Column>

          <!-- Column: Nama Kop -->
          <Column field="nama" header="Label / Nama Kop" sortable>
            <template #body="{ data }">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-text-main">
                    {{ data.nama }}
                  </span>
                  <Tag
                    v-if="data.isDefault"
                    value="Utama (Default SPD)"
                    severity="success"
                  />
                </div>
                <div v-if="data.keterangan" class="text-xs text-text-muted">
                  {{ data.keterangan }}
                </div>
              </div>
            </template>
          </Column>

          <!-- Column: Nama Berkas di Folder -->
          <Column header="Berkas di Folder Server">
            <template #body="{ data }">
              <div class="text-xs text-text-muted space-y-0.5">
                <div class="font-mono text-text-main font-medium truncate max-w-xs">
                  {{ data.fileName }}
                </div>
                <div class="text-text-muted font-mono">
                  Ukuran: {{ data.fileSize || '-' }} • {{ data.createdAt }}
                </div>
              </div>
            </template>
          </Column>

          <!-- Column: Ukuran Kertas -->
          <Column field="paperSize" header="Ukuran Kertas" class="w-36">
            <template #body="{ data }">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-canvas text-text-main border border-border">
                <i class="pi pi-file mr-1 text-text-muted"></i>
                {{ data.paperSize || 'A4' }}
              </span>
            </template>
          </Column>

          <!-- Column: Aksi -->
          <Column header="Aksi" body-class="text-right">
            <template #body="{ data }">
              <div class="flex items-center justify-end gap-1.5">
                <GovButton
                  icon="pi pi-eye"
                  severity="secondary"
                  title="Pratinjau PDF"
                  @click="handlePreview(data)"
                />
                <GovButton
                  v-if="!data.isDefault"
                  icon="pi pi-check"
                  severity="secondary"
                  title="Jadikan Default"
                  @click="handleSetDefault(data)"
                />
                <GovButton
                  v-if="list.length > 1"
                  icon="pi pi-trash"
                  severity="danger"
                  title="Hapus dari Folder"
                  @click="handleDelete(data)"
                />
              </div>
            </template>
          </Column>
        </GovTable>
      </template>
    </GovCard>

    <!-- PDF Document Live Preview Card -->
    <GovCard v-if="activePreview && activePdfBlobUrl">
      <template #title>
        <div class="flex items-center justify-between text-base font-semibold text-text-main">
          <div class="flex items-center gap-2">
            <i class="pi pi-file-pdf text-red-600 dark:text-red-400"></i>
            <span>Pratinjau Berkas PDF: {{ activePreview.nama }} ({{ activePreview.fileName }})</span>
          </div>
          <div class="flex items-center gap-2">
            <Tag
              v-if="activePreview.isDefault"
              value="Default Aktif"
              severity="info"
            />
            <a
              :href="activePdfBlobUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-xs text-primary hover:text-accent hover:underline px-2.5 py-1 bg-blue-50 dark:bg-primary/15 border border-blue-200 dark:border-primary/25 rounded font-medium transition-colors"
            >
              <i class="pi pi-external-link text-xs"></i>
              <span>Buka di Tab Baru</span>
            </a>
          </div>
        </div>
      </template>

      <template #content>
        <div class="bg-canvas p-4 rounded-xl flex flex-col items-center border border-border">
          <div class="w-full bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
            <object
              :data="activePdfBlobUrl"
              type="application/pdf"
              class="w-full h-portal block"
            >
              <div class="p-8 text-center space-y-3">
                <i class="pi pi-file-pdf text-4xl text-text-muted"></i>
                <p class="text-sm text-text-main">
                  Pratinjau PDF disajikan langsung dari memori terautentikasi aman.
                </p>
                <a
                  :href="activePdfBlobUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-block text-xs text-primary hover:text-accent underline font-medium"
                >
                  Klik di sini untuk mengunduh atau membuka PDF
                </a>
              </div>
            </object>
          </div>
        </div>
      </template>
    </GovCard>

    <!-- Upload PDF Dialog Modal -->
    <Dialog
      v-model:visible="isDialogOpen"
      :modal="true"
      header="Unggah Berkas PDF Kop Surat"
      class="w-full max-w-xl"
    >
      <form class="space-y-4 pt-2" @submit.prevent="handleSave">
        <!-- Hidden file input for PDF -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".pdf,application/pdf"
          class="hidden"
          @change="onFileSelected"
        />

        <!-- Label / Nama Kop -->
        <div class="space-y-1">
          <label for="formNama" class="text-xs font-semibold text-text-main">
            Label / Nama Kop Surat
          </label>
          <GovInputText
            id="formNama"
            v-model="form.nama"
            placeholder="Contoh: Kop 1 (Sekretariat Daerah), Kop 2 (Staf Ahli)"
            block
            required
          />
        </div>

        <!-- Keterangan Penggunaan -->
        <div class="space-y-1">
          <label for="formKeterangan" class="text-xs font-semibold text-text-main">
            Keterangan / Penggunaan (Opsional)
          </label>
          <GovInputText
            id="formKeterangan"
            v-model="form.keterangan"
            placeholder="Contoh: Digunakan untuk seluruh SPD reguler Sekretariat Daerah"
            block
          />
        </div>

        <!-- PDF Upload Dropzone Area -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-text-main">
            Pilih Berkas PDF Kop Surat
          </label>

          <!-- Dropzone box -->
          <div
            class="border-2 border-dashed border-slate-300 dark:border-border hover:border-primary rounded-xl p-5 text-center cursor-pointer transition-colors bg-canvas"
            @click="triggerFileInput"
          >
            <i class="pi pi-file-pdf text-3xl text-red-500 mb-2"></i>
            <div class="text-sm font-semibold text-text-main">
              Klik untuk memilih berkas PDF
            </div>
            <div class="text-xs text-text-muted mt-1">
              Hanya format berkas PDF (.pdf) • Maksimal 10 MB
            </div>
          </div>

          <!-- Selected File Details Banner -->
          <div
            v-if="selectedFile"
            class="flex items-center justify-between p-3 bg-blue-50 dark:bg-primary/10 border border-blue-200 dark:border-primary/25 rounded-lg text-xs"
          >
            <div class="flex items-center gap-2 min-w-0">
              <i class="pi pi-file-pdf text-red-600 text-lg flex-shrink-0"></i>
              <div class="truncate">
                <span class="font-medium text-text-main block truncate">{{ selectedFile.name }}</span>
                <span class="text-text-muted">{{ formatBytes(selectedFile.size) }}</span>
              </div>
            </div>
            <GovButton
              icon="pi pi-times"
              severity="secondary"
              title="Batalkan pilihan"
              @click="selectedFile = null"
            />
          </div>
        </div>

        <!-- Default Checkbox -->
        <div class="flex items-center gap-2 pt-1">
          <GovCheckbox
            id="formIsDefault"
            v-model="form.isDefault"
            input-id="formIsDefault"
          />
          <label for="formIsDefault" class="text-sm text-text-main cursor-pointer select-none">
            Jadikan Kop Surat Utama (Default untuk dokumen SPD)
          </label>
        </div>

        <!-- Dialog Footer Actions -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
            type="button"
            @click="isDialogOpen = false"
          />
          <GovButton
            label="Unggah ke Folder"
            icon="pi pi-upload"
            severity="primary"
            type="submit"
            :disabled="isSubmitting || !selectedFile"
          />
        </div>
      </form>
    </Dialog>
  </div>
</template>
