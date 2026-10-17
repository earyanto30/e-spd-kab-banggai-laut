<script setup lang="ts">
import { computed } from 'vue';

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
  }>(),
  {
    fontFamily: 'arial',
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

const roleTitleProper = computed(() =>
  isKpa.value ? 'Kuasa Pengguna Anggaran' : 'Pengguna Anggaran'
);

const signerNama = computed(() => {
  return props.signer?.nama || props.spd?.penandatanganNama || props.spd?.penandatangan?.nama || '';
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

const transitRows = [
  { num: 'II.' },
  { num: 'III.' },
  { num: 'IV.' },
  { num: 'V.' },
];
</script>

<template>
  <div
    class="spd-page-break spd-back-page bg-white text-black p-8 max-w-[215.9mm] min-h-[355.6mm] mx-auto text-[9.5pt] leading-normal"
    :class="fontFamily === 'times' ? 'font-serif' : 'font-sans'"
  >
    <!-- Tabel Visum Perjalanan Dinas (Halaman Belakang) -->
    <div class="border-b border-black">
      <!-- ROW I: Keberangkatan Awal (Tanpa border di atas, kiri, maupun pemisah tengah) -->
      <div class="grid grid-cols-2 border-b border-black">
        <!-- Kolom Kiri: Kosong -->
        <div class="p-2"></div>

        <!-- Kolom Kanan: Rincian Keberangkatan & Penandatangan -->
        <div class="p-2.5 text-[9pt] space-y-1">
          <div class="grid grid-cols-[130px_10px_1fr]">
            <span class="font-medium">I. &nbsp;Berangkat dari</span>
            <span>:</span>
            <span>{{ spd?.tempatBerangkat || 'Banggai' }}</span>
          </div>
          <div class="grid grid-cols-[130px_10px_1fr]">
            <span class="pl-4 text-[7.5pt] text-gray-700">(Tempat Kedudukan)</span>
            <span></span>
            <span></span>
          </div>
          <div class="grid grid-cols-[130px_10px_1fr]">
            <span class="pl-4">Ke</span>
            <span>:</span>
            <span>{{ spd?.tempatTujuan || '' }}</span>
          </div>
          <div class="grid grid-cols-[130px_10px_1fr]">
            <span class="pl-4">Pada Tanggal</span>
            <span>:</span>
            <span>{{ formatIndonesianDate(spd?.tanggalBerangkat) }}</span>
          </div>
          <div class="grid grid-cols-[130px_10px_1fr] pt-1">
            <span class="pl-4">{{ roleTitleProper }}</span>
            <span></span>
            <span></span>
          </div>

          <!-- Ruang Tanda Tangan Fisik -->
          <div class="h-12"></div>

          <div class="pl-4">
            <div class="font-bold underline text-[9.5pt] inline-block">{{ signerNama }}</div>
            <div class="text-[8.5pt]">NIP. {{ signerNip }}</div>
          </div>
        </div>
      </div>

      <!-- ROW II s/d V: Catatan Tempat Transit / Tujuan Visum -->
      <div
        v-for="row in transitRows"
        :key="row.num"
        class="grid grid-cols-2 border-b border-black min-h-[82px]"
      >
        <!-- Kolom Kiri: Tiba di -->
        <div class="p-2.5 border-r border-black flex flex-col justify-between text-[9pt]">
          <div class="space-y-1">
            <div class="grid grid-cols-[100px_10px_1fr]">
              <span class="font-medium">{{ row.num }} &nbsp;Tiba di</span>
              <span>:</span>
              <span></span>
            </div>
            <div class="grid grid-cols-[100px_10px_1fr]">
              <span class="pl-4">Pada Tanggal</span>
              <span>:</span>
              <span></span>
            </div>
          </div>
          <div class="text-center text-[8pt] text-gray-600 mt-6">
            (....................................................................)
          </div>
        </div>

        <!-- Kolom Kanan: Berangkat dari -->
        <div class="p-2.5 flex flex-col justify-between text-[9pt]">
          <div class="space-y-1">
            <div class="grid grid-cols-[100px_10px_1fr]">
              <span>Berangkat dari</span>
              <span>:</span>
              <span></span>
            </div>
            <div class="grid grid-cols-[100px_10px_1fr]">
              <span>Ke</span>
              <span>:</span>
              <span></span>
            </div>
            <div class="grid grid-cols-[100px_10px_1fr]">
              <span>Pada Tanggal</span>
              <span>:</span>
              <span></span>
            </div>
          </div>
          <div class="text-center text-[8pt] text-gray-600 mt-3">
            (....................................................................)
          </div>
        </div>
      </div>

      <!-- ROW VI: Kepulangan & Pemeriksaan -->
      <div class="grid grid-cols-2 border-b border-black min-h-[110px]">
        <!-- Kolom Kiri: Tiba Kembali di Tempat Kedudukan -->
        <div class="p-2.5 border-r border-black text-[9pt] space-y-1">
          <div class="grid grid-cols-[100px_10px_1fr]">
            <span class="font-medium">VI. Tiba di</span>
            <span>:</span>
            <span>{{ spd?.tempatBerangkat || 'Banggai' }}</span>
          </div>
          <div class="grid grid-cols-[100px_10px_1fr]">
            <span class="pl-4">Pada Tanggal</span>
            <span>:</span>
            <span>{{ formatIndonesianDate(spd?.tanggalKembali) }}</span>
          </div>
          <div class="grid grid-cols-[100px_10px_1fr] pt-1">
            <span class="pl-4">{{ roleTitleProper }}</span>
            <span></span>
            <span></span>
          </div>

          <!-- Ruang Tanda Tangan Fisik -->
          <div class="h-10"></div>

          <div class="pl-4">
            <div class="font-bold underline text-[9.5pt] inline-block">{{ signerNama }}</div>
            <div class="text-[8.5pt]">Nip. {{ signerNip }}</div>
          </div>
        </div>

        <!-- Kolom Kanan: Pernyataan Pemeriksaan -->
        <div class="p-2.5 text-[8.5pt] leading-relaxed">
          Telah diperiksa, dengan keterangan bahwa perjalanan Dinas tersebut diatas benar dilakukan atas
          perintahnya dan semata mata untuk kepentingan jabatan dalam waktu yang sesingkat - singkatnya.
        </div>
      </div>

      <!-- ROW VII: Catatan Lain-lain -->
      <div class="p-2 border-b border-black text-[9pt]">
        <span class="font-medium">VII. &nbsp;Catatan Lain-lain</span>
      </div>

      <!-- ROW VIII: Perhatian -->
      <div class="p-2.5 text-[8.5pt] leading-relaxed space-y-1">
        <div class="font-medium text-[9pt]">VIII. Perhatian</div>
        <p class="text-justify text-[8pt]">
          PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal
          berangkat / tiba serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan keuangan
          negara apabila negara mendapat rugi akibat kesalahan, kelalaian, dan kealpaannya.
        </p>
      </div>
    </div>

    <!-- Tanda Tangan Bawah (Di luar tabel, sebelah kanan) -->
    <div class="mt-6 flex justify-end">
      <div class="w-[230px] text-center text-[9.5pt] space-y-1">
        <div class="font-bold text-[10pt] uppercase tracking-wide">
          {{ roleTitleUpper }}
        </div>
        <div class="h-16"></div>
        <div class="font-bold underline text-[10pt]">{{ signerNama }}</div>
        <div class="text-[9pt]">NIP. {{ signerNip }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .spd-page-break {
    page-break-before: always !important;
    break-before: page !important;
  }
}
</style>
