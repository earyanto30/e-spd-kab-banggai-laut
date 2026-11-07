<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  GovButton,
  GovCard,
  GovInputText,
  GovPassword,
  GovSelect,
  GovMessage,
} from '../components/core';
import { apiFetch } from '../utils/api';
import { useGovToast } from '../composables/useGovToast';
import type { OnboardingSubmitDto, SystemStatusDto } from '@si-setda/shared-types';

const router = useRouter();
const toast = useGovToast();

const currentStep = ref(1);
const totalSteps = 3;

const loadingInitial = ref(true);
const isSubmitting = ref(false);
const errorMessage = ref('');

// Step 1: Admin password
const adminForm = reactive({
  password: '',
  confirmPassword: '',
});

// Step 2: KPA (Kepala Bagian Umum)
const kpaForm = reactive({
  nama: '',
  nip: '',
  pangkat: 'Pembina',
  golongan: 'IV/a',
  jabatan: 'Kepala Bagian Umum',
  unitKerja: 'Bagian Umum Sekretariat Daerah',
});

// Step 3: PA (Sekretaris Daerah)
const paForm = reactive({
  nama: '',
  nip: '',
  pangkat: 'Pembina Utama Muda',
  golongan: 'IV/c',
  jabatan: 'Sekretaris Daerah',
  unitKerja: 'Sekretariat Daerah',
});

// Reference data for Jabatan and Golongan options
const jabatanOptions = ref<Array<{ id: string; nama: string }>>([]);

const pangkatGolonganOptions = [
  { pangkat: 'Juru Muda', golongan: 'I/a' },
  { pangkat: 'Juru Muda Tingkat I', golongan: 'I/b' },
  { pangkat: 'Juru', golongan: 'I/c' },
  { pangkat: 'Juru Tingkat I', golongan: 'I/d' },
  { pangkat: 'Pengatur Muda', golongan: 'II/a' },
  { pangkat: 'Pengatur Muda Tingkat I', golongan: 'II/b' },
  { pangkat: 'Pengatur', golongan: 'II/c' },
  { pangkat: 'Pengatur Tingkat I', golongan: 'II/d' },
  { pangkat: 'Penata Muda', golongan: 'III/a' },
  { pangkat: 'Penata Muda Tingkat I', golongan: 'III/b' },
  { pangkat: 'Penata', golongan: 'III/c' },
  { pangkat: 'Penata Tingkat I', golongan: 'III/d' },
  { pangkat: 'Pembina', golongan: 'IV/a' },
  { pangkat: 'Pembina Tingkat I', golongan: 'IV/b' },
  { pangkat: 'Pembina Utama Muda', golongan: 'IV/c' },
  { pangkat: 'Pembina Utama Madya', golongan: 'IV/d' },
  { pangkat: 'Pembina Utama', golongan: 'IV/e' },
];

const golonganSelectOptions = pangkatGolonganOptions.map((item) => ({
  label: `${item.pangkat} (${item.golongan})`,
  value: item.golongan,
  pangkat: item.pangkat,
}));

const onKpaGolonganChange = (selectedGolongan: string) => {
  const match = pangkatGolonganOptions.find((p) => p.golongan === selectedGolongan);
  if (match) {
    kpaForm.pangkat = match.pangkat;
  }
};

const onPaGolonganChange = (selectedGolongan: string) => {
  const match = pangkatGolonganOptions.find((p) => p.golongan === selectedGolongan);
  if (match) {
    paForm.pangkat = match.pangkat;
  }
};

const checkStatusAndPreload = async () => {
  loadingInitial.value = true;
  try {
    const [statusRes, jabatanRes, pegawaiRes] = await Promise.all([
      apiFetch('/api/system/status'),
      apiFetch('/api/jabatan'),
      apiFetch('/api/pegawai?isPenandatangan=true'),
    ]);

    if (statusRes.ok) {
      const status: SystemStatusDto = await statusRes.json();
      if (status.isOnboardingCompleted) {
        localStorage.setItem('onboarding_completed', 'true');
        toast.info('Sistem SI-SPD telah diinisialisasi sebelumnya.');
        router.replace('/');
        return;
      }
    }

    if (jabatanRes.ok) {
      jabatanOptions.value = await jabatanRes.json();
    }

    if (pegawaiRes.ok) {
      const penandatanganList = await pegawaiRes.json();
      if (Array.isArray(penandatanganList)) {
        const kpaMatch = penandatanganList.find((p: any) =>
          (p.jabatan || '').toLowerCase().includes('bagian umum')
        );
        if (kpaMatch) {
          kpaForm.nama = kpaMatch.nama;
          kpaForm.nip = kpaMatch.nip;
          kpaForm.pangkat = kpaMatch.pangkat;
          kpaForm.golongan = kpaMatch.golongan;
          kpaForm.jabatan = kpaMatch.jabatan;
          kpaForm.unitKerja = kpaMatch.unitKerja;
        }

        const paMatch = penandatanganList.find((p: any) =>
          (p.jabatan || '').toLowerCase().includes('sekretaris daerah') || (p.jabatan || '').toLowerCase().includes('sekda')
        );
        if (paMatch) {
          paForm.nama = paMatch.nama;
          paForm.nip = paMatch.nip;
          paForm.pangkat = paMatch.pangkat;
          paForm.golongan = paMatch.golongan;
          paForm.jabatan = paMatch.jabatan;
          paForm.unitKerja = paMatch.unitKerja;
        }
      }
    }
  } catch (err: any) {
    console.error('Gagal memeriksa status inisialisasi:', err);
  } finally {
    loadingInitial.value = false;
  }
};

const validateStep1 = (): boolean => {
  errorMessage.value = '';
  if (!adminForm.password) {
    errorMessage.value = 'Kata sandi baru Administrator wajib diisi.';
    return false;
  }
  if (adminForm.password.length < 6) {
    errorMessage.value = 'Kata sandi minimal 6 karakter.';
    return false;
  }
  if (adminForm.password !== adminForm.confirmPassword) {
    errorMessage.value = 'Konfirmasi kata sandi tidak cocok.';
    return false;
  }
  return true;
};

const validateStep2 = (): boolean => {
  errorMessage.value = '';
  if (!kpaForm.nama.trim()) {
    errorMessage.value = 'Nama pejabat KPA wajib diisi.';
    return false;
  }
  if (!kpaForm.nip.trim()) {
    errorMessage.value = 'NIP pejabat KPA wajib diisi.';
    return false;
  }
  if (!kpaForm.jabatan.trim()) {
    errorMessage.value = 'Jabatan pejabat KPA wajib diisi.';
    return false;
  }
  return true;
};

const validateStep3 = (): boolean => {
  errorMessage.value = '';
  if (!paForm.nama.trim()) {
    errorMessage.value = 'Nama pejabat PA wajib diisi.';
    return false;
  }
  if (!paForm.nip.trim()) {
    errorMessage.value = 'NIP pejabat PA wajib diisi.';
    return false;
  }
  if (!paForm.jabatan.trim()) {
    errorMessage.value = 'Jabatan pejabat PA wajib diisi.';
    return false;
  }
  return true;
};

const nextStep = () => {
  if (currentStep.value === 1 && !validateStep1()) return;
  if (currentStep.value === 2 && !validateStep2()) return;
  if (currentStep.value < totalSteps) {
    currentStep.value++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const prevStep = () => {
  errorMessage.value = '';
  if (currentStep.value > 1) {
    currentStep.value--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const submitOnboarding = async () => {
  if (!validateStep1() || !validateStep2() || !validateStep3()) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  const payload: OnboardingSubmitDto = {
    adminPassword: adminForm.password,
    kpa: {
      nama: kpaForm.nama.trim(),
      nip: kpaForm.nip.trim(),
      pangkat: kpaForm.pangkat.trim(),
      golongan: kpaForm.golongan.trim(),
      jabatan: kpaForm.jabatan.trim(),
      unitKerja: kpaForm.unitKerja.trim(),
    },
    pa: {
      nama: paForm.nama.trim(),
      nip: paForm.nip.trim(),
      pangkat: paForm.pangkat.trim(),
      golongan: paForm.golongan.trim(),
      jabatan: paForm.jabatan.trim(),
      unitKerja: paForm.unitKerja.trim(),
    },
  };

  try {
    const res = await apiFetch('/api/system/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      localStorage.setItem('onboarding_completed', 'true');
      toast.success('Inisialisasi sistem berhasil! Selamat datang di SI-SPD.');
      router.replace('/');
    } else {
      const err = await res.json().catch(() => ({}));
      errorMessage.value = err.message || 'Gagal menyimpan konfigurasi onboarding';
      toast.error(errorMessage.value);
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Terjadi kesalahan jaringan atau server';
    toast.error(errorMessage.value);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  checkStatusAndPreload();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0b1329] py-10 px-4 sm:px-6 flex flex-col justify-center items-center">
    <!-- Header Logo & Branding -->
    <div class="max-w-2xl w-full text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-sm">
        <i class="pi pi-verified text-3xl"></i>
      </div>
      <h1 class="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight">
        Inisialisasi Awal SI-SPD
      </h1>
      <p class="text-sm text-text-muted mt-2 max-w-lg mx-auto leading-relaxed">
        Selamat datang di Sistem Informasi Surat Perjalanan Dinas Sekretariat Daerah Kabupaten Banggai Laut. Mohon lengkapi konfigurasi awal berikut sebelum memulai.
      </p>
    </div>

    <!-- Loading Placeholder -->
    <div v-if="loadingInitial" class="w-full max-w-2xl py-24 text-center space-y-4">
      <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
      <p class="text-sm text-text-muted font-medium">Memeriksa status inisialisasi sistem...</p>
    </div>

    <!-- Stepper Wizard Card -->
    <GovCard v-else class="w-full max-w-2xl shadow-xl border border-border">
      <template #content>
        <!-- Steps Indicator Bar -->
        <div class="mb-8">
          <div class="flex items-center justify-between relative">
            <div class="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-border w-full z-0"></div>
            <div
              class="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary transition-all duration-300 z-0"
              :style="{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }"
            ></div>

            <!-- Step 1 Indicator -->
            <div class="relative z-10 flex flex-col items-center">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                :class="[
                  currentStep === 1
                    ? 'bg-primary text-white ring-4 ring-primary/20 shadow-md'
                    : currentStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface border-2 border-border text-text-muted'
                ]"
              >
                <i v-if="currentStep > 1" class="pi pi-check text-xs"></i>
                <span v-else>1</span>
              </div>
              <span class="text-[11px] font-semibold mt-1.5 text-text-main">Keamanan Admin</span>
            </div>

            <!-- Step 2 Indicator -->
            <div class="relative z-10 flex flex-col items-center">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                :class="[
                  currentStep === 2
                    ? 'bg-primary text-white ring-4 ring-primary/20 shadow-md'
                    : currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface border-2 border-border text-text-muted'
                ]"
              >
                <i v-if="currentStep > 2" class="pi pi-check text-xs"></i>
                <span v-else>2</span>
              </div>
              <span class="text-[11px] font-semibold mt-1.5 text-text-main">Pejabat KPA</span>
            </div>

            <!-- Step 3 Indicator -->
            <div class="relative z-10 flex flex-col items-center">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                :class="[
                  currentStep === 3
                    ? 'bg-primary text-white ring-4 ring-primary/20 shadow-md'
                    : 'bg-surface border-2 border-border text-text-muted'
                ]"
              >
                <span>3</span>
              </div>
              <span class="text-[11px] font-semibold mt-1.5 text-text-main">Pejabat PA</span>
            </div>
          </div>
        </div>

        <!-- Feedback Alert -->
        <GovMessage v-if="errorMessage" severity="error" class="mb-6">
          {{ errorMessage }}
        </GovMessage>

        <!-- STEP 1: CHANGE ADMIN PASSWORD -->
        <div v-if="currentStep === 1" class="space-y-5 animate-fadeIn">
          <div class="border-b border-border pb-3">
            <h2 class="text-base font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-shield text-primary"></i>
              <span>Langkah 1: Perbarui Kata Sandi Super Admin</span>
            </h2>
            <p class="text-xs text-text-muted mt-1 leading-relaxed">
              Demi keamanan instalasi baru, ganti kata sandi bawaan default (<code class="font-mono text-primary bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">admin123</code>) menjadi kata sandi yang aman.
            </p>
          </div>

          <div class="space-y-4 pt-1">
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Username Administrator
              </label>
              <GovInputText
                value="admin"
                disabled
                block
                class="opacity-70 bg-slate-100 dark:bg-slate-800/60 font-mono text-xs"
              />
              <span class="text-[11px] text-text-muted">Username default akun Super Administrator.</span>
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Kata Sandi Baru <span class="text-red-500">*</span>
              </label>
              <GovPassword
                v-model="adminForm.password"
                placeholder="Masukkan minimal 6 karakter..."
                block
                :toggle-mask="true"
                :feedback="false"
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Konfirmasi Kata Sandi Baru <span class="text-red-500">*</span>
              </label>
              <GovPassword
                v-model="adminForm.confirmPassword"
                placeholder="Ulangi kata sandi baru..."
                block
                :toggle-mask="true"
                :feedback="false"
              />
            </div>
          </div>
        </div>

        <!-- STEP 2: PEJABAT KPA (KEPALA BAGIAN UMUM) -->
        <div v-else-if="currentStep === 2" class="space-y-5 animate-fadeIn">
          <div class="border-b border-border pb-3">
            <h2 class="text-base font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-user text-primary"></i>
              <span>Langkah 2: Tentukan Pejabat Kuasa Pengguna Anggaran (KPA)</span>
            </h2>
            <p class="text-xs text-text-muted mt-1 leading-relaxed">
              Penandatanganan SPD kategori KPA secara resmi dimandatkan kepada <strong>Kepala Bagian Umum</strong>. Masukkan data pejabat definitif atau Pelaksana Tugas (Plt.) yang menjabat saat ini.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div class="space-y-1 sm:col-span-2">
              <label class="block text-xs font-semibold text-text-main">
                Nama Lengkap & Gelar Pejabat KPA <span class="text-red-500">*</span>
              </label>
              <GovInputText
                v-model="kpaForm.nama"
                placeholder="Contoh: Dedy Kurniawan, S.STP, M.AP"
                block
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Nomor Induk Pegawai (NIP) <span class="text-red-500">*</span>
              </label>
              <GovInputText
                v-model="kpaForm.nip"
                placeholder="Contoh: 19850214 200412 1 001"
                block
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Pangkat / Golongan Ruang <span class="text-red-500">*</span>
              </label>
              <GovSelect
                v-model="kpaForm.golongan"
                :options="golonganSelectOptions"
                option-label="label"
                option-value="value"
                placeholder="Pilih Pangkat / Golongan"
                class="w-full text-xs"
                @change="onKpaGolonganChange(kpaForm.golongan)"
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Jabatan Kedinasan <span class="text-red-500">*</span>
              </label>
              <GovInputText
                v-model="kpaForm.jabatan"
                placeholder="Contoh: Kepala Bagian Umum"
                block
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Unit Kerja
              </label>
              <GovInputText
                v-model="kpaForm.unitKerja"
                placeholder="Bagian Umum Sekretariat Daerah"
                block
              />
            </div>
          </div>
        </div>

        <!-- STEP 3: PEJABAT PA (SEKRETARIS DAERAH) -->
        <div v-else-if="currentStep === 3" class="space-y-5 animate-fadeIn">
          <div class="border-b border-border pb-3">
            <h2 class="text-base font-bold text-text-main flex items-center gap-2">
              <i class="pi pi-briefcase text-primary"></i>
              <span>Langkah 3: Tentukan Pejabat Pengguna Anggaran (PA)</span>
            </h2>
            <p class="text-xs text-text-muted mt-1 leading-relaxed">
              Penandatanganan SPD kategori PA berkedudukan pada <strong>Sekretaris Daerah (Sekda)</strong> atau Pelaksana Harian (Plh.)/Plt. Masukkan data pejabat yang berwenang.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div class="space-y-1 sm:col-span-2">
              <label class="block text-xs font-semibold text-text-main">
                Nama Lengkap & Gelar Pejabat PA (Sekda) <span class="text-red-500">*</span>
              </label>
              <GovInputText
                v-model="paForm.nama"
                placeholder="Contoh: Drs. SAIFUL A. USITA, MM"
                block
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Nomor Induk Pegawai (NIP) <span class="text-red-500">*</span>
              </label>
              <GovInputText
                v-model="paForm.nip"
                placeholder="Contoh: 19680514 199303 1 005"
                block
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Pangkat / Golongan Ruang <span class="text-red-500">*</span>
              </label>
              <GovSelect
                v-model="paForm.golongan"
                :options="golonganSelectOptions"
                option-label="label"
                option-value="value"
                placeholder="Pilih Pangkat / Golongan"
                class="w-full text-xs"
                @change="onPaGolonganChange(paForm.golongan)"
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Jabatan Kedinasan <span class="text-red-500">*</span>
              </label>
              <GovInputText
                v-model="paForm.jabatan"
                placeholder="Contoh: Sekretaris Daerah"
                block
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-text-main">
                Unit Kerja
              </label>
              <GovInputText
                v-model="paForm.unitKerja"
                placeholder="Sekretariat Daerah"
                block
              />
            </div>
          </div>

          <!-- Summary Confirmation Box -->
          <div class="mt-6 p-4 rounded-xl bg-blue-50/60 dark:bg-primary/10 border border-blue-200 dark:border-primary/20 text-xs space-y-2">
            <div class="font-bold text-primary flex items-center gap-2">
              <i class="pi pi-info-circle"></i>
              <span>Ringkasan Konfigurasi Awal Sistem</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-main pt-1">
              <div>
                <span class="text-text-muted block text-[11px]">Pejabat KPA (Kabag Umum):</span>
                <strong>{{ kpaForm.nama || '-' }}</strong> (NIP: {{ kpaForm.nip || '-' }})
              </div>
              <div>
                <span class="text-text-muted block text-[11px]">Pejabat PA (Sekda):</span>
                <strong>{{ paForm.nama || '-' }}</strong> (NIP: {{ paForm.nip || '-' }})
              </div>
            </div>
          </div>
        </div>

        <!-- Wizard Navigation Buttons -->
        <div class="flex items-center justify-between pt-8 border-t border-border mt-8">
          <GovButton
            v-if="currentStep > 1"
            label="Sebelumnya"
            icon="pi pi-arrow-left"
            severity="secondary"
            variant="outlined"
            size="small"
            :disabled="isSubmitting"
            @click="prevStep"
          />
          <div v-else></div>

          <div class="flex items-center gap-3">
            <GovButton
              v-if="currentStep < totalSteps"
              label="Lanjutkan"
              icon="pi pi-arrow-right"
              icon-pos="right"
              severity="primary"
              size="small"
              @click="nextStep"
            />
            <GovButton
              v-else
              label="Simpan & Selesaikan Inisialisasi"
              icon="pi pi-check"
              severity="success"
              size="small"
              :loading="isSubmitting"
              @click="submitOnboarding"
            />
          </div>
        </div>
      </template>
    </GovCard>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.25s ease-out forwards;
}
</style>
