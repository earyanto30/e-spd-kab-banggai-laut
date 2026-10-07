<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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

const form = ref<AsnPegawai>({
  id: '',
  nip: '',
  nama: '',
  pangkat: '',
  golongan: '',
  jabatan: '',
  unitKerja: 'Sekretariat Daerah',
  isASN: true,
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
  };
  isFormDialogOpen.value = true;
};

const openEditDialog = (item: AsnPegawai) => {
  isEditing.value = true;
  form.value = { ...item };
  isFormDialogOpen.value = true;
};

const openDetailDialog = (item: AsnPegawai) => {
  selectedAsn.value = item;
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
          <Column field="isASN" header="Status" class="w-28 text-center">
            <template #body="{ data }">
              <Tag
                :value="data.isASN ? 'ASN' : 'Non ASN'"
                :severity="data.isASN ? 'success' : 'secondary'"
              />
            </template>
          </Column>

          <!-- Column: Aksi -->
          <Column header="Aksi" body-class="text-right" class="w-36">
            <template #body="{ data }">
              <div class="flex items-center justify-end gap-1.5">
                <GovButton
                  icon="pi pi-eye"
                  severity="secondary"
                  title="Lihat Profil Pegawai"
                  @click="openDetailDialog(data)"
                />
                <GovButton
                  icon="pi pi-pencil"
                  severity="secondary"
                  title="Ubah Data"
                  @click="openEditDialog(data)"
                />
                <GovButton
                  icon="pi pi-trash"
                  severity="danger"
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
        </div>

        <div class="flex justify-end pt-2">
          <GovButton
            label="Tutup"
            severity="secondary"
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

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <GovButton
            label="Batal"
            severity="secondary"
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
  </div>
</template>
