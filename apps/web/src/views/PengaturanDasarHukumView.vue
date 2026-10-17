<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import {
  GovButton,
  GovCard,
  GovInputText,
  GovInputNumber,
  GovTextarea,
  GovTable,
} from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';
import type { DasarHukumDto } from '@si-setda/shared-types';

const toast = useGovToast();

const list = ref<DasarHukumDto[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const isDialogOpen = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const isSubmitting = ref(false);

const form = ref({
  judul: '',
  isi: '',
  urutan: 0,
});

const loadData = async () => {
  loading.value = true;
  try {
    const url = searchQuery.value.trim()
      ? `/api/dasar-hukum?query=${encodeURIComponent(searchQuery.value.trim())}`
      : '/api/dasar-hukum';
    const res = await apiFetch(url);
    if (res.ok) {
      list.value = await res.json();
    } else {
      toast.error('Gagal memuat data dasar hukum');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan');
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  isEditing.value = false;
  editingId.value = null;
  form.value = {
    judul: '',
    isi: '',
    urutan: list.value.length + 1,
  };
  isDialogOpen.value = true;
};

const openEditDialog = (item: DasarHukumDto) => {
  isEditing.value = true;
  editingId.value = item.id;
  form.value = {
    judul: item.judul,
    isi: item.isi,
    urutan: item.urutan,
  };
  isDialogOpen.value = true;
};

const handleSave = async () => {
  if (!form.value.judul.trim()) {
    toast.error('Judul atau referensi dasar hukum wajib diisi');
    return;
  }
  if (!form.value.isi.trim()) {
    toast.error('Isi redaksi dasar hukum wajib diisi');
    return;
  }

  isSubmitting.value = true;
  try {
    const payload = {
      judul: form.value.judul.trim(),
      isi: form.value.isi.trim(),
      urutan: Number(form.value.urutan) || 0,
    };

    let res: Response;
    if (isEditing.value && editingId.value) {
      res = await apiFetch(`/api/dasar-hukum/${editingId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch('/api/dasar-hukum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Gagal menyimpan data');
    }

    toast.success(isEditing.value ? 'Dasar hukum berhasil diperbarui' : 'Dasar hukum baru berhasil ditambahkan');
    isDialogOpen.value = false;
    await loadData();
  } catch (err: any) {
    toast.error(err.message || 'Gagal menyimpan dasar hukum');
  } finally {
    isSubmitting.value = false;
  }
};

const handleDelete = async (item: DasarHukumDto) => {
  if (!confirm(`Yakin ingin menghapus dasar hukum "${item.judul}"?`)) return;

  try {
    const res = await apiFetch(`/api/dasar-hukum/${item.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success('Dasar hukum berhasil dihapus');
      await loadData();
    } else {
      toast.error('Gagal menghapus dasar hukum');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan');
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-text-main">Pengaturan Dasar Hukum</h1>
        <p class="text-sm text-text-muted mt-1">
          Kelola master data referensi dasar hukum penugasan untuk dokumen Surat Tugas resmi.
        </p>
      </div>
      <GovButton
        label="Tambah Dasar Hukum"
        icon="pi pi-plus"
        severity="primary"
        @click="openCreateDialog"
      />
    </div>

    <!-- Filter & Table Card -->
    <GovCard>
      <template #content>
        <div class="space-y-4">
          <!-- Search bar -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="w-full sm:w-80">
            <GovInputText
              v-model="searchQuery"
              placeholder="Cari dasar hukum..."
              block
              @keyup.enter="loadData"
            />
          </div>
          <GovButton
            label="Cari"
            icon="pi pi-search"
            severity="secondary"
            variant="outlined"
            @click="loadData"
          />
        </div>

        <!-- Table -->
        <GovTable :value="list" :loading="loading" data-key="id" responsive-layout="scroll">
          <template #empty>
            <div class="py-12 text-center text-text-muted">
              Belum ada data dasar hukum. Klik tombol "Tambah Dasar Hukum" untuk menambahkan referensi baru.
            </div>
          </template>

          <Column field="urutan" header="No / Urutan" style="width: 100px" sortable>
            <template #body="{ data }">
              <span class="font-mono text-sm font-semibold">{{ data.urutan }}</span>
            </template>
          </Column>

          <Column field="judul" header="Nama Dasar Hukum" style="width: 260px" sortable>
            <template #body="{ data }">
              <span class="font-semibold text-text-main">{{ data.judul }}</span>
            </template>
          </Column>

          <Column field="isi" header="Isi / Konten Redaksi Regulasi">
            <template #body="{ data }">
              <div class="text-xs text-text-main leading-relaxed line-clamp-3">
                {{ data.isi }}
              </div>
            </template>
          </Column>

          <Column header="Aksi" style="width: 120px">
            <template #body="{ data }">
              <div class="flex items-center gap-1">
                <GovButton
                  icon="pi pi-pencil"
                  severity="secondary"
                  variant="text"
                  rounded
                  size="small"
                  title="Edit"
                  @click="openEditDialog(data)"
                />
                <GovButton
                  icon="pi pi-trash"
                  severity="danger"
                  variant="text"
                  rounded
                  size="small"
                  title="Hapus"
                  @click="handleDelete(data)"
                />
              </div>
            </template>
          </Column>
        </GovTable>
        </div>
      </template>
    </GovCard>

    <!-- Dialog Create / Edit -->
    <Dialog
      v-model:visible="isDialogOpen"
      :modal="true"
      :header="isEditing ? 'Edit Dasar Hukum' : 'Tambah Dasar Hukum Baru'"
      :style="{ width: '600px' }"
      :closable="!isSubmitting"
    >
      <div class="space-y-4 pt-2">
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-text-main">
            Nama Dasar Hukum <span class="text-red-500">*</span>
          </label>
          <GovInputText
            v-model="form.judul"
            placeholder="Contoh: Peraturan Bupati Banggai Laut Nomor 12 Tahun 2023"
            block
          />
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-text-main">
            Isi / Konten Dasar Hukum <span class="text-red-500">*</span>
          </label>
          <GovTextarea
            v-model="form.isi"
            rows="5"
            placeholder="Ketik isi/konten redaksi dasar hukum penugasan secara lengkap..."
          />
        </div>

        <div class="space-y-1 pt-1">
          <label class="block text-xs font-semibold text-text-main">
            Nomor Urutan Tampil
          </label>
          <GovInputNumber
            v-model="form.urutan"
            :min="0"
            placeholder="0"
            block
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2 pt-3">
          <GovButton
            label="Batal"
            severity="secondary"
            variant="outlined"
            size="small"
            :disabled="isSubmitting"
            @click="isDialogOpen = false"
          />
          <GovButton
            :label="isSubmitting ? 'Menyimpan...' : 'Simpan'"
            icon="pi pi-check"
            severity="primary"
            size="small"
            :loading="isSubmitting"
            @click="handleSave"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
