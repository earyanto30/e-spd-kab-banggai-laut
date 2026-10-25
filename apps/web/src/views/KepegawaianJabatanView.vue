<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
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
import type { JabatanDto } from '@si-setda/shared-types';

interface JabatanWithCount extends JabatanDto {
  _count?: {
    pegawaiList: number;
  };
}

const toast = useGovToast();

const list = ref<JabatanWithCount[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const isDialogOpen = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const isSubmitting = ref(false);

const form = ref({
  nama: '',
  keterangan: '',
  urutan: 0,
});

const loadData = async () => {
  loading.value = true;
  try {
    const url = searchQuery.value.trim()
      ? `/api/jabatan?query=${encodeURIComponent(searchQuery.value.trim())}`
      : '/api/jabatan';
    const res = await apiFetch(url);
    if (res.ok) {
      list.value = await res.json();
    } else {
      toast.error('Gagal memuat data jabatan');
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
    nama: '',
    keterangan: '',
    urutan: list.value.length + 1,
  };
  isDialogOpen.value = true;
};

const openEditDialog = (item: JabatanWithCount) => {
  isEditing.value = true;
  editingId.value = item.id;
  form.value = {
    nama: item.nama,
    keterangan: item.keterangan || '',
    urutan: item.urutan || 0,
  };
  isDialogOpen.value = true;
};

const handleSave = async () => {
  if (!form.value.nama.trim()) {
    toast.error('Nama jabatan resmi wajib diisi');
    return;
  }

  isSubmitting.value = true;
  try {
    const payload = {
      nama: form.value.nama.trim(),
      keterangan: form.value.keterangan?.trim() || '',
      urutan: Number(form.value.urutan) || 0,
    };

    let res: Response;
    if (isEditing.value && editingId.value) {
      res = await apiFetch(`/api/jabatan/${editingId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch('/api/jabatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      toast.success(
        isEditing.value
          ? 'Data jabatan berhasil diperbarui'
          : 'Jabatan baru berhasil ditambahkan'
      );
      isDialogOpen.value = false;
      await loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menyimpan data jabatan');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan jaringan');
  } finally {
    isSubmitting.value = false;
  }
};

const handleDelete = async (item: JabatanWithCount) => {
  const count = item._count?.pegawaiList || 0;
  const msg = count > 0
    ? `Hapus jabatan "${item.nama}"? Terdapat ${count} pegawai yang saat ini menggunakan jabatan ini. Hubungan jabatan pada pegawai akan dilepas.`
    : `Hapus jabatan "${item.nama}"?`;

  if (!confirm(msg)) {
    return;
  }

  try {
    const res = await apiFetch(`/api/jabatan/${item.id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      toast.success('Jabatan berhasil dihapus');
      await loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Gagal menghapus jabatan');
    }
  } catch (err: any) {
    toast.error(err.message || 'Terjadi kesalahan jaringan');
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Page -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text-main tracking-tight">
          Data Master Jabatan
        </h1>
        <p class="text-sm text-text-muted mt-0.5">
          Tabel referensi jabatan resmi untuk mendefinisikan posisi pegawai (ASN) dan hierarki penandatanganan di lingkungan Sekretariat Daerah.
        </p>
      </div>

      <GovButton
        label="Tambah Jabatan"
        icon="pi pi-plus"
        severity="primary"
        @click="openCreateDialog"
      />
    </div>

    <!-- Search & Filter Card -->
    <GovCard>
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="relative w-full sm:w-96">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm"></i>
          <GovInputText
            v-model="searchQuery"
            placeholder="Cari nama jabatan atau keterangan..."
            class="w-full pl-9"
            @input="loadData"
          />
        </div>
        <div class="text-xs text-text-muted font-medium">
          Total: <strong class="text-text-main">{{ list.length }}</strong> Jabatan Terdaftar
        </div>
      </div>
    </GovCard>

    <!-- Table of Jabatan -->
    <GovCard>
      <GovTable
        :value="list"
        :loading="loading"
        data-key="id"
        paginator
        :rows="10"
        :rows-per-page-options="[10, 20, 50]"
        responsive-layout="scroll"
        class="text-sm"
      >
        <template #empty>
          <div class="py-12 text-center text-text-muted">
            <i class="pi pi-briefcase text-4xl mb-3 text-border block"></i>
            <p>Tidak ada data jabatan ditemukan.</p>
          </div>
        </template>

        <Column field="urutan" header="No" sortable style="width: 70px" class="text-center">
          <template #body="{ data }">
            <span class="font-mono text-xs text-text-muted">{{ data.urutan }}</span>
          </template>
        </Column>

        <Column field="nama" header="Nama Jabatan" sortable style="min-width: 260px">
          <template #body="{ data }">
            <div class="font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-briefcase text-primary text-xs"></i>
              <span>{{ data.nama }}</span>
            </div>
            <div v-if="data.keterangan" class="text-xs text-text-muted mt-0.5">
              {{ data.keterangan }}
            </div>
          </template>
        </Column>

        <Column header="Pegawai Terkait" style="width: 160px" class="text-center">
          <template #body="{ data }">
            <Tag
              :value="`${data._count?.pegawaiList || 0} Pegawai`"
              :severity="data._count?.pegawaiList ? 'info' : 'secondary'"
              class="text-xs"
            />
          </template>
        </Column>

        <Column header="Aksi" style="width: 120px" class="text-center">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1.5">
              <GovButton
                icon="pi pi-pencil"
                severity="secondary"
                variant="outlined"
                size="small"
                v-tooltip.top="'Ubah Jabatan'"
                @click="openEditDialog(data)"
              />
              <GovButton
                icon="pi pi-trash"
                severity="danger"
                variant="outlined"
                size="small"
                v-tooltip.top="'Hapus Jabatan'"
                @click="handleDelete(data)"
              />
            </div>
          </template>
        </Column>
      </GovTable>
    </GovCard>

    <!-- Create/Edit Modal Dialog -->
    <Dialog
      v-model:visible="isDialogOpen"
      :modal="true"
      :header="isEditing ? 'Ubah Data Jabatan' : 'Tambah Master Jabatan Baru'"
      class="w-full max-w-lg"
    >
      <form class="space-y-4 pt-2" @submit.prevent="handleSave">
        <div class="space-y-1">
          <label for="jabatanNama" class="text-xs font-semibold text-text-main">
            Nama Jabatan Resmi <span class="text-red-500">*</span>
          </label>
          <GovInputText
            id="jabatanNama"
            v-model="form.nama"
            placeholder="Contoh: Kepala Bagian Umum"
            block
            required
          />
        </div>

        <div class="space-y-1">
          <label for="jabatanKeterangan" class="text-xs font-semibold text-text-main">
            Keterangan / Eselon / Ruang Lingkup
          </label>
          <GovTextarea
            id="jabatanKeterangan"
            v-model="form.keterangan"
            placeholder="Contoh: Eselon III/a - Pimpinan Bagian Umum Sekretariat Daerah"
            rows="3"
            block
          />
        </div>

        <div class="space-y-1">
          <label for="jabatanUrutan" class="text-xs font-semibold text-text-main">
            Urutan Tampilan
          </label>
          <GovInputNumber
            id="jabatanUrutan"
            v-model="form.urutan"
            :min="0"
            :max="999"
            block
          />
          <p class="text-[11px] text-text-muted">
            Semakin kecil angka urutan, semakin atas posisi jabatan pada daftar pilihan.
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-border">
          <GovButton
            type="button"
            label="Batal"
            severity="secondary"
            variant="outlined"
            @click="isDialogOpen = false"
          />
          <GovButton
            type="submit"
            :label="isEditing ? 'Simpan Perubahan' : 'Tambah Jabatan'"
            icon="pi pi-check"
            severity="primary"
            :loading="isSubmitting"
          />
        </div>
      </form>
    </Dialog>
  </div>
</template>
