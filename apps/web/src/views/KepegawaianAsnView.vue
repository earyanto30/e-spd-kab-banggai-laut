<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import {
  GovButton,
  GovCard,
  GovInputText,
  GovMessage,
  GovTable,
} from '../components/core';

export interface AsnPegawai {
  id: string;
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  unitKerja: string;
  status: 'PNS' | 'PPPK';
  email: string;
  noHp: string;
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
    status: 'PNS',
    email: 'bambang.soeprapto@setda.go.id',
    noHp: '081234567890',
  },
  {
    id: 'asn-2',
    nip: '19740821 199903 2 002',
    nama: 'Ir. Hj. Siti Rahmawati, MT',
    pangkat: 'Pembina Utama Muda',
    golongan: 'IV/c',
    jabatan: 'Asisten Pemerintahan dan Kesra',
    unitKerja: 'Sekretariat Daerah - Asisten I',
    status: 'PNS',
    email: 'siti.rahmawati@setda.go.id',
    noHp: '081234567891',
  },
  {
    id: 'asn-3',
    nip: '19850214 200412 1 001',
    nama: 'Dedy Kurniawan, S.STP, M.AP',
    pangkat: 'Pembina',
    golongan: 'IV/a',
    jabatan: 'Kepala Bagian Umum dan Protokol',
    unitKerja: 'Sekretariat Daerah - Bagian Umum',
    status: 'PNS',
    email: 'dedy.kurniawan@setda.go.id',
    noHp: '081234567892',
  },
  {
    id: 'asn-4',
    nip: '19890610 201101 2 008',
    nama: 'Ratna Juwita, S.H., M.H.',
    pangkat: 'Penata Tingkat I',
    golongan: 'III/d',
    jabatan: 'Kepala Bagian Hukum',
    unitKerja: 'Sekretariat Daerah - Bagian Hukum',
    status: 'PNS',
    email: 'ratna.juwita@setda.go.id',
    noHp: '081234567893',
  },
  {
    id: 'asn-5',
    nip: '19920315 201802 1 003',
    nama: 'Fajar Prasetyo, S.Kom',
    pangkat: 'Penata',
    golongan: 'III/c',
    jabatan: 'Pranata Komputer Ahli Muda',
    unitKerja: 'Sekretariat Daerah - Bagian Organisasi',
    status: 'PNS',
    email: 'fajar.prasetyo@setda.go.id',
    noHp: '081234567894',
  },
  {
    id: 'asn-6',
    nip: '19951104 202012 2 011',
    nama: 'Nurul Aini, A.Md',
    pangkat: 'Pengatur',
    golongan: 'II/c',
    jabatan: 'Pengelola Administrasi Perjalanan Dinas',
    unitKerja: 'Sekretariat Daerah - Bagian Umum',
    status: 'PNS',
    email: 'nurul.aini@setda.go.id',
    noHp: '081234567895',
  },
  {
    id: 'asn-7',
    nip: '19900720 202321 1 005',
    nama: 'Eko Wahyudi, S.AP',
    pangkat: 'Ahli Pertama',
    golongan: 'IX',
    jabatan: 'Analis Kebijakan',
    unitKerja: 'Sekretariat Daerah - Bagian Perekonomian',
    status: 'PPPK',
    email: 'eko.wahyudi@setda.go.id',
    noHp: '081234567896',
  },
];

const list = ref<AsnPegawai[]>([]);
const searchQuery = ref('');
const statusFilter = ref<'SEMUA' | 'PNS' | 'PPPK'>('SEMUA');
const isFormDialogOpen = ref(false);
const isDetailDialogOpen = ref(false);
const isEditing = ref(false);
const selectedAsn = ref<AsnPegawai | null>(null);
const alertMessage = ref<string | null>(null);

const form = ref<AsnPegawai>({
  id: '',
  nip: '',
  nama: '',
  pangkat: '',
  golongan: '',
  jabatan: '',
  unitKerja: 'Sekretariat Daerah',
  status: 'PNS',
  email: '',
  noHp: '',
});

const loadData = async () => {
  try {
    const res = await fetch('/api/pegawai');
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

const showAlert = (message: string) => {
  alertMessage.value = message;
  setTimeout(() => {
    alertMessage.value = null;
  }, 3500);
};

const totalPns = computed(() => list.value.filter((a) => a.status === 'PNS').length);
const totalPppk = computed(() => list.value.filter((a) => a.status === 'PPPK').length);

const filteredList = computed(() => {
  return list.value.filter((asn) => {
    const matchesStatus = statusFilter.value === 'SEMUA' || asn.status === statusFilter.value;
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
    status: 'PNS',
    email: '',
    noHp: '',
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
    showAlert('NIP, Nama Lengkap, dan Jabatan wajib diisi.');
    return;
  }

  try {
    if (isEditing.value) {
      const res = await fetch(`/api/pegawai/${form.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.value),
      });
      if (res.ok) {
        await loadData();
        isFormDialogOpen.value = false;
        showAlert('Data pegawai berhasil diperbarui di database.');
        return;
      }
    } else {
      const res = await fetch('/api/pegawai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.value),
      });
      if (res.ok) {
        await loadData();
        isFormDialogOpen.value = false;
        showAlert('Data pegawai baru berhasil disimpan ke database.');
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
  showAlert(isEditing.value ? 'Data pegawai berhasil diperbarui.' : 'Data pegawai baru berhasil ditambahkan.');
};

const handleDelete = async (item: AsnPegawai) => {
  try {
    const res = await fetch(`/api/pegawai/${item.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await loadData();
      showAlert(`Data pegawai ${item.nama} berhasil dihapus dari database.`);
      return;
    }
  } catch {
    // local fallback
  }

  list.value = list.value.filter((a) => a.id !== item.id);
  persistData();
  showAlert(`Data pegawai ${item.nama} berhasil dihapus.`);
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
        <h1 class="text-2xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight">
          Data Pegawai (ASN)
        </h1>
        <p class="text-sm text-slate-500 dark:text-zinc-400">
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

    <!-- Alert / Feedback -->
    <div v-if="alertMessage">
      <GovMessage severity="success" :closable="true">
        {{ alertMessage }}
      </GovMessage>
    </div>

    <!-- Stats Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-900 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <i class="pi pi-users text-2xl"></i>
        </div>
        <div>
          <div class="text-xs text-slate-500 dark:text-zinc-400 font-medium">Total Pegawai ASN</div>
          <div class="text-2xl font-bold text-slate-800 dark:text-zinc-100">{{ list.length }}</div>
        </div>
      </div>

      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
          <i class="pi pi-id-card text-2xl"></i>
        </div>
        <div>
          <div class="text-xs text-slate-500 dark:text-zinc-400 font-medium">Pegawai Negeri Sipil (PNS)</div>
          <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{{ totalPns }}</div>
        </div>
      </div>

      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
          <i class="pi pi-briefcase text-2xl"></i>
        </div>
        <div>
          <div class="text-xs text-slate-500 dark:text-zinc-400 font-medium">PPPK / Perjanjian Kerja</div>
          <div class="text-2xl font-bold text-amber-700 dark:text-amber-400">{{ totalPppk }}</div>
        </div>
      </div>
    </div>

    <!-- Main Table Card -->
    <GovCard>
      <template #title>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 text-base font-semibold text-slate-700 dark:text-zinc-200">
          <div class="flex items-center gap-2">
            <i class="pi pi-list text-gov-primary dark:text-amber-400"></i>
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
            <div class="flex items-center border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-zinc-800">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium transition-colors"
                :class="statusFilter === 'SEMUA' ? 'bg-blue-900 text-white dark:bg-zinc-700' : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700/50'"
                @click="statusFilter = 'SEMUA'"
              >
                Semua
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-200 dark:border-zinc-700"
                :class="statusFilter === 'PNS' ? 'bg-blue-900 text-white dark:bg-zinc-700' : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700/50'"
                @click="statusFilter = 'PNS'"
              >
                PNS
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-200 dark:border-zinc-700"
                :class="statusFilter === 'PPPK' ? 'bg-blue-900 text-white dark:bg-zinc-700' : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700/50'"
                @click="statusFilter = 'PPPK'"
              >
                PPPK
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
                <div class="font-semibold text-slate-800 dark:text-zinc-100 text-sm">
                  {{ data.nama }}
                </div>
                <div class="font-mono text-xs text-slate-500 dark:text-zinc-400">
                  NIP. {{ data.nip }}
                </div>
              </div>
            </template>
          </Column>

          <!-- Column: Jabatan & Unit Kerja -->
          <Column field="jabatan" header="Jabatan & Unit Kerja" sortable>
            <template #body="{ data }">
              <div class="space-y-0.5">
                <div class="text-xs font-medium text-slate-800 dark:text-zinc-200">
                  {{ data.jabatan }}
                </div>
                <div class="text-xs text-slate-500 dark:text-zinc-400">
                  {{ data.unitKerja }}
                </div>
              </div>
            </template>
          </Column>

          <!-- Column: Pangkat / Golongan -->
          <Column field="golongan" header="Pangkat / Golongan" class="w-48">
            <template #body="{ data }">
              <div class="space-y-0.5">
                <div class="text-xs text-slate-700 dark:text-zinc-300">
                  {{ data.pangkat }}
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 dark:bg-zinc-800 text-blue-900 dark:text-amber-400 border border-slate-200 dark:border-zinc-700">
                  Gol. {{ data.golongan }}
                </span>
              </div>
            </template>
          </Column>

          <!-- Column: Status -->
          <Column field="status" header="Status" class="w-24 text-center">
            <template #body="{ data }">
              <Tag
                :value="data.status"
                :severity="data.status === 'PNS' ? 'success' : 'warn'"
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
        <div class="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg">
          <div class="w-14 h-14 rounded-full bg-blue-900 text-amber-300 font-bold text-xl flex items-center justify-center flex-shrink-0">
            {{ selectedAsn.nama.charAt(0) }}
          </div>
          <div class="min-w-0">
            <div class="font-bold text-slate-800 dark:text-zinc-100 text-base">
              {{ selectedAsn.nama }}
            </div>
            <div class="font-mono text-xs text-slate-500">
              NIP. {{ selectedAsn.nip }}
            </div>
            <div class="mt-1">
              <Tag
                :value="selectedAsn.status"
                :severity="selectedAsn.status === 'PNS' ? 'success' : 'warn'"
              />
            </div>
          </div>
        </div>

        <!-- Detail Information Rows -->
        <div class="space-y-2 text-xs">
          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
            <span class="text-slate-500">Jabatan:</span>
            <span class="font-medium text-slate-800 dark:text-zinc-200 text-right">{{ selectedAsn.jabatan }}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
            <span class="text-slate-500">Unit Kerja:</span>
            <span class="font-medium text-slate-800 dark:text-zinc-200 text-right">{{ selectedAsn.unitKerja }}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
            <span class="text-slate-500">Pangkat / Golongan:</span>
            <span class="font-medium text-slate-800 dark:text-zinc-200 text-right">{{ selectedAsn.pangkat }} (Gol. {{ selectedAsn.golongan }})</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
            <span class="text-slate-500">Alamat Email:</span>
            <span class="font-mono text-slate-800 dark:text-zinc-200">{{ selectedAsn.email || '-' }}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
            <span class="text-slate-500">No. Handphone / WhatsApp:</span>
            <span class="font-mono text-slate-800 dark:text-zinc-200">{{ selectedAsn.noHp || '-' }}</span>
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
      :header="isEditing ? 'Ubah Data Pegawai ASN' : 'Tambah Pegawai ASN Baru'"
      class="w-full max-w-xl"
    >
      <form class="space-y-4 pt-2" @submit.prevent="handleSave">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="asnNip" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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
            <label for="asnNama" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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
            <label for="asnPangkat" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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
            <label for="asnGolongan" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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
            <label for="asnJabatan" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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
            <label for="asnUnitKerja" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label for="asnEmail" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Email Kedinasan
            </label>
            <GovInputText
              id="asnEmail"
              v-model="form.email"
              type="email"
              placeholder="Contoh: pegawai@setda.go.id"
              block
            />
          </div>

          <div class="space-y-1">
            <label for="asnNoHp" class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              No. Handphone / WhatsApp
            </label>
            <GovInputText
              id="asnNoHp"
              v-model="form.noHp"
              placeholder="Contoh: 081234567890"
              block
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            Status Kepegawaian
          </label>
          <div class="flex items-center gap-4 pt-1">
            <label class="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-zinc-300">
              <input
                v-model="form.status"
                type="radio"
                value="PNS"
                name="statusAsn"
                class="text-blue-900"
              />
              <span>Pegawai Negeri Sipil (PNS)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-zinc-300">
              <input
                v-model="form.status"
                type="radio"
                value="PPPK"
                name="statusAsn"
                class="text-blue-900"
              />
              <span>Pegawai Pemerintah dengan Perjanjian Kerja (PPPK)</span>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
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
