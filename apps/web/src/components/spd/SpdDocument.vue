<script setup lang="ts">
import { computed } from 'vue';
import SpdBackDocument from './SpdBackDocument.vue';

const props = withDefaults(
  defineProps<{
    spd: any;
    signer?: {
      nama?: string;
      nip?: string;
      jabatan?: string;
      pangkat?: string;
      golongan?: string;
    } | null;
    fontFamily?: 'arial' | 'times';
    includeBackPage?: boolean;
  }>(),
  {
    fontFamily: 'arial',
    includeBackPage: true,
  }
);

const isKpa = computed(() => {
  return (
    (props.signer?.jabatan || '').toLowerCase().includes('kpa') ||
    (props.signer?.jabatan || '').toLowerCase().includes('kuasa') ||
    (props.spd?.pemberiPerintah || '').toLowerCase().includes('kuasa')
  );
});

const roleTitleUpper = computed(() =>
  isKpa.value ? 'KUASA PENGGUNA ANGGARAN' : 'PENGGUNA ANGGARAN'
);

const signerNama = computed(() => {
  return props.signer?.nama || props.spd?.penandatanganNama || props.spd?.penandatangan?.nama || '';
});

const signerPangkat = computed(() => {
  return (
    props.signer?.pangkat ||
    props.spd?.penandatanganPangkat ||
    props.spd?.penandatangan?.pangkat ||
    ''
  );
});

const signerNip = computed(() => {
  return props.signer?.nip || props.spd?.penandatanganNip || props.spd?.penandatangan?.nip || '';
});

const formatIndonesianDate = (d: any): string => {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
};

const maksudLines = computed(() => {
  const text = props.spd?.dalamRangka || '';
  return text.split(/\r?\n/).filter(Boolean);
});
</script>

<template>
  <div class="spd-continuous-document">
    <!-- Halaman 1: Halaman Depan SPD -->
    <div
      class="spd-front-page bg-white text-black p-8 max-w-[215.9mm] min-h-[355.6mm] mx-auto text-[9.5pt] leading-normal shadow-sm"
      :class="fontFamily === 'times' ? 'font-serif' : 'font-sans'"
    >
      <!-- Judul Dokumen -->
      <div class="text-center space-y-1 mb-6">
        <h2 class="text-base font-bold underline tracking-wide uppercase">
          SURAT PERJALANAN DINAS (SPD)
        </h2>
        <p class="text-xs font-mono font-medium">
          Nomor: {{ spd?.nomorSpd || 'DRAFT' }}
        </p>
      </div>

      <!-- Tabel Rincian SPD (9 Kolom Standar) -->
      <table class="w-full border-collapse border border-black text-[9pt]">
        <tbody>
          <tr class="border-b border-black">
            <td class="w-8 p-1.5 border-r border-black text-center align-top">1.</td>
            <td class="w-64 p-1.5 border-r border-black align-top">Pejabat Berwenang yang memberi perintah</td>
            <td class="p-1.5 align-top font-medium">{{ isKpa ? 'Kuasa Pengguna Anggaran' : 'Pengguna Anggaran' }}</td>
          </tr>
          <tr class="border-b border-black">
            <td class="p-1.5 border-r border-black text-center align-top">2.</td>
            <td class="p-1.5 border-r border-black align-top">Nama / NIP Pegawai yang diperintahkan</td>
            <td class="p-1.5 align-top">
              <div class="font-bold">{{ spd?.pegawai?.nama || '-' }}</div>
              <div>NIP. {{ spd?.pegawai?.nip || '-' }}</div>
            </td>
          </tr>
          <tr class="border-b border-black">
            <td class="p-1.5 border-r border-black text-center align-top">3.</td>
            <td class="p-1.5 border-r border-black align-top">
              <div>a. Pangkat dan Golongan</div>
              <div>b. Jabatan / Instansi</div>
              <div>c. Tingkat Biaya Perjalanan Dinas</div>
            </td>
            <td class="p-1.5 align-top">
              <div>a. {{ spd?.pegawai?.pangkat || '-' }} ({{ spd?.pegawai?.golongan || '-' }})</div>
              <div>b. {{ spd?.pegawai?.jabatan || '-' }}</div>
              <div>c. {{ spd?.tingkatBiaya || '-' }}</div>
            </td>
          </tr>
          <tr class="border-b border-black">
            <td class="p-1.5 border-r border-black text-center align-top">4.</td>
            <td class="p-1.5 border-r border-black align-top">Maksud Perjalanan Dinas</td>
            <td class="p-1.5 align-top">
              <div v-for="(line, idx) in maksudLines" :key="idx" class="mb-0.5">
                {{ line }}
              </div>
            </td>
          </tr>
          <tr class="border-b border-black">
            <td class="p-1.5 border-r border-black text-center align-top">5.</td>
            <td class="p-1.5 border-r border-black align-top">Alat angkut yang dipergunakan</td>
            <td class="p-1.5 align-top">{{ spd?.alatAngkut || '-' }}</td>
          </tr>
          <tr class="border-b border-black">
            <td class="p-1.5 border-r border-black text-center align-top">6.</td>
            <td class="p-1.5 border-r border-black align-top">
              <div>a. Tempat Berangkat</div>
              <div>b. Tempat Tujuan</div>
            </td>
            <td class="p-1.5 align-top">
              <div>a. {{ spd?.tempatBerangkat || 'Banggai' }}</div>
              <div>b. {{ spd?.tempatTujuan || '-' }}</div>
            </td>
          </tr>
          <tr class="border-b border-black">
            <td class="p-1.5 border-r border-black text-center align-top">7.</td>
            <td class="p-1.5 border-r border-black align-top">
              <div>a. Lamanya Perjalanan Dinas</div>
              <div>b. Tanggal Berangkat</div>
              <div>c. Tanggal Harus Kembali</div>
            </td>
            <td class="p-1.5 align-top">
              <div>a. {{ spd?.lamaHari ? `${spd.lamaHari} Hari` : '-' }}</div>
              <div>b. {{ formatIndonesianDate(spd?.tanggalBerangkat) }}</div>
              <div>c. {{ formatIndonesianDate(spd?.tanggalKembali) }}</div>
            </td>
          </tr>
          <tr class="border-b border-black">
            <td class="p-1.5 border-r border-black text-center align-top">8.</td>
            <td class="p-1.5 border-r border-black align-top">Pengikut : Nama</td>
            <td class="p-1.5 align-top">{{ spd?.pengikut || '-' }}</td>
          </tr>
          <tr>
            <td class="p-1.5 border-r border-black text-center align-top">9.</td>
            <td class="p-1.5 border-r border-black align-top">
              <div>Pembebanan Anggaran:</div>
              <div>a. Instansi / SKPD</div>
              <div>b. Akun / Kode Rekening</div>
            </td>
            <td class="p-1.5 align-top">
              <div><br /></div>
              <div>a. {{ spd?.skpd || 'Sekretariat Daerah Kab. Banggai Laut' }}</div>
              <div>b. {{ spd?.kodeRekening || '-' }}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Blok Tanda Tangan Halaman Depan -->
      <div class="mt-8 flex justify-end">
        <div class="w-[230px] text-center text-[9.5pt] space-y-1">
          <div class="text-left text-[9pt] space-y-0.5">
            <div>Dikeluarkan di : Banggai</div>
            <div class="border-b border-black inline-block">
              Pada Tanggal &nbsp;: {{ formatIndonesianDate(spd?.createdAt || new Date()) }}
            </div>
          </div>
          <div class="pt-2 font-bold text-[10pt] uppercase tracking-wide">
            {{ roleTitleUpper }}
          </div>
          <div class="h-16"></div>
          <div class="font-bold underline text-[10pt]">{{ signerNama }}</div>
          <div v-if="signerPangkat" class="text-[9pt]">{{ signerPangkat }}</div>
          <div class="text-[9pt]">NIP. {{ signerNip }}</div>
        </div>
      </div>
    </div>

    <!-- Halaman 2: Halaman Belakang (Visum) -->
    <SpdBackDocument
      v-if="includeBackPage"
      :spd="spd"
      :signer="signer"
      :font-family="fontFamily"
    />
  </div>
</template>

<style scoped>
@media print {
  .spd-continuous-document {
    display: block;
  }
}
</style>
