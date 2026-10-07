<script setup lang="ts">
import { computed } from 'vue';

export interface SpdData {
  id?: string;
  nomorSpd?: string;
  pemberiPerintah?: string;
  pegawai?: {
    nama: string;
    nip: string;
    pangkat: string;
    golongan: string;
    jabatan: string;
    unitKerja?: string;
  } | null;
  dalamRangka: string;
  alatAngkut: string;
  tempatBerangkat: string;
  tempatTujuan: string;
  lamaHari: number;
  tanggalBerangkat: string | Date | null;
  tanggalKembali?: string | Date | null;
  skpd?: string;
  kodeRekening?: string | null;
  tingkatBiaya?: string | null;
  pengikut?: string | null;
  keterangan?: string | null;
  createdAt?: string | Date;
}

export interface OfficialSigner {
  nama: string;
  nip: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
}

const props = withDefaults(
  defineProps<{
    spd: SpdData;
    showKop?: boolean;
    signer?: OfficialSigner | null;
    paperSize?: 'Legal' | 'A4';
  }>(),
  {
    showKop: true,
    signer: null,
    paperSize: 'Legal',
  }
);

// Terbilang helper
const angkaTerbilang = (n: number): string => {
  const kata = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
  ];
  if (!n || n <= 0) return 'nol';
  if (n < 12) return kata[n];
  if (n < 20) return `${kata[n - 10]} belas`;
  if (n < 100) return `${kata[Math.floor(n / 10)]} puluh${n % 10 ? ' ' + kata[n % 10] : ''}`;
  return String(n);
};

// Indonesian date formatting
const formatIndonesianDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Calculate tanggal kembali if not present
const computedTanggalKembali = computed(() => {
  if (props.spd.tanggalKembali) {
    return formatIndonesianDate(props.spd.tanggalKembali);
  }
  if (!props.spd.tanggalBerangkat) return '-';
  const tgl = new Date(props.spd.tanggalBerangkat);
  tgl.setDate(tgl.getDate() + Math.max(0, (props.spd.lamaHari || 1) - 1));
  return formatIndonesianDate(tgl);
});

// Parse maksud perjalanan dinas into list of numbered items
const parsedMaksudList = computed<string[]>(() => {
  const text = props.spd.dalamRangka || '';
  if (!text.trim()) return ['-'];

  // Check lines separated by newline
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 0) {
    return lines.map((line) => line.replace(/^\d+[\.\)]\s*/, ''));
  }

  return [text.replace(/^\d+[\.\)]\s*/, '').trim()];
});

// Default signer fallback (Sekretaris Daerah Kab. Banggai Laut)
const activeSigner = computed<OfficialSigner>(() => {
  if (props.signer) return props.signer;
  return {
    nama: 'Saiful U. Usuria, SE., M.Si',
    nip: '19750510 200012 1 004',
    pangkat: 'Pembina Utama Muda',
    golongan: 'IV/c',
    jabatan: 'Sekretaris Daerah',
  };
});

// Determine signer title label
const signerLabel = computed(() => {
  const p = props.spd.pemberiPerintah || '';
  if (p.toLowerCase().includes('kuasa')) {
    return 'KUASA PENGGUNA ANGGARAN';
  }
  return 'PENGGUNA ANGGARAN';
});
</script>

<template>
  <div
    class="spd-document-sheet print:m-0 bg-white text-black"
    :class="[
      paperSize === 'Legal' ? 'sheet-legal' : 'sheet-a4',
      showKop ? 'with-kop' : 'without-kop',
    ]"
  >
    <!-- 1. HEADER KOP SURAT (Dapat dinonaktifkan untuk cetak di blanko fisik) -->
    <header v-if="showKop" class="kop-header">
      <div class="kop-content flex items-center justify-between gap-4">
        <!-- Logo Resmi Kab. Banggai Laut -->
        <div class="kop-logo-wrapper flex-shrink-0">
          <img
            src="/logo.png"
            alt="Logo Kab. Banggai Laut"
            class="kop-logo h-[86px] w-auto object-contain"
          />
        </div>

        <!-- Teks Kop Surat Resmi -->
        <div class="kop-text flex-1 text-center leading-tight">
          <h2 class="text-[17px] font-bold tracking-wide uppercase m-0 p-0">
            PEMERINTAH KABUPATEN BANGGAI LAUT
          </h2>
          <h1 class="text-[19px] font-extrabold tracking-wider uppercase m-0 p-0 mt-0.5">
            SEKRETARIAT DAERAH
          </h1>
          <p class="text-[12px] font-normal tracking-normal m-0 p-0 mt-1">
            JL. JOGUGU ZAKARIA No. 01 Tlp/Fax ( 0462 )21369 Kode pos. 94891
          </p>
          <p class="text-[13px] font-bold tracking-widest uppercase m-0 p-0">
            BANGGAI
          </p>
        </div>
      </div>

      <!-- Garis Ganda Standar Tata Naskah Dinas -->
      <div class="kop-divider mt-2">
        <div class="border-t-[2.5px] border-black"></div>
        <div class="border-t-[0.8px] border-black mt-[1.8px]"></div>
      </div>
    </header>

    <!-- Space placeholder when printing on pre-printed official stationery -->
    <div v-else class="blanko-kop-spacer"></div>

    <!-- 2. METADATA NOMOR SURAT (Kanan Atas) -->
    <section class="metadata-section flex justify-end mt-2">
      <div class="w-[260px] text-[13px] leading-snug">
        <div class="grid grid-cols-[72px_10px_1fr]">
          <div>Lembar ke</div><div>:</div><div></div>
          <div>Kode No.</div><div>:</div><div></div>
          <div>Nomor</div><div>:</div><div class="font-bold">{{ spd.nomorSpd || '/SPD/2026' }}</div>
        </div>
      </div>
    </section>

    <!-- 3. JUDUL DOKUMEN (SURAT PERJALANAN DINAS) -->
    <section class="title-section text-center my-3">
      <h2 class="text-[15px] font-bold uppercase underline tracking-wide">
        SURAT PERJALANAN DINAS
      </h2>
      <p class="text-[14px] font-bold tracking-normal -mt-0.5">
        (SPD)
      </p>
    </section>

    <!-- 4. TABEL STANDAR 10 POIN (Permendagri / Perbup Banggai Laut) -->
    <main class="table-section">
      <table class="spd-table w-full border-collapse border border-black text-[13px] leading-[1.3]">
        <tbody>
          <!-- Poin 1: Pengguna Anggaran -->
          <tr>
            <td class="col-no">1.</td>
            <td class="col-desc">Pengguna Anggaran</td>
            <td class="col-val font-semibold uppercase">
              SEKRETARIS DAERAH KAB. BANGGAI LAUT
            </td>
          </tr>

          <!-- Poin 2: Nama / NIP Pegawai -->
          <tr>
            <td class="col-no">2.</td>
            <td class="col-desc">
              Nama/Nip Pegawai yang melaksanakan Perjalanan Dinas
            </td>
            <td class="col-val">
              <div class="grid grid-cols-[14px_1fr]">
                <div>:</div>
                <div class="font-bold uppercase">{{ spd.pegawai?.nama || '-' }}</div>
                <div>:</div>
                <div>{{ spd.pegawai?.nip || '-' }}</div>
              </div>
            </td>
          </tr>

          <!-- Poin 3: Pangkat, Jabatan, Tingkat Biaya -->
          <tr>
            <td class="col-no">3.</td>
            <td class="col-desc">
              <div>a. Pangkat dan Golongan</div>
              <div>b. Jabatan/Instansi</div>
              <div>c. Tingkat Biaya Perjalanan</div>
            </td>
            <td class="col-val">
              <div>a. {{ spd.pegawai?.pangkat || '-' }} {{ spd.pegawai?.golongan || '' }}</div>
              <div>b. {{ spd.pegawai?.jabatan || '-' }}</div>
              <div>c. {{ spd.tingkatBiaya || '' }}</div>
            </td>
          </tr>

          <!-- Poin 4: Maksud Perjalanan Dinas (Output Bernomor Otomatis) -->
          <tr>
            <td class="col-no">4.</td>
            <td class="col-desc">Maksud Perjalanan Dinas</td>
            <td class="col-val">
              <div class="flex items-start">
                <span class="w-[14px] flex-shrink-0">:</span>
                <div class="flex-1 space-y-1.5 text-justify">
                  <div
                    v-for="(item, idx) in parsedMaksudList"
                    :key="idx"
                    class="flex items-start"
                  >
                    <span v-if="parsedMaksudList.length > 1" class="w-[18px] flex-shrink-0 font-medium">{{ idx + 1 }}.</span>
                    <span class="flex-1">{{ item }}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Poin 5: Alat Angkut -->
          <tr>
            <td class="col-no">5.</td>
            <td class="col-desc">Alat angkut yang dipergunakan</td>
            <td class="col-val">
              {{ spd.alatAngkut || '-' }}
            </td>
          </tr>

          <!-- Poin 6: Tempat Berangkat & Tujuan -->
          <tr>
            <td class="col-no">6.</td>
            <td class="col-desc">
              <div>a. Tempat Berangkat</div>
              <div>b. Tempat Tujuan</div>
            </td>
            <td class="col-val">
              <div>a. {{ spd.tempatBerangkat || 'Banggai' }}</div>
              <div>b. {{ spd.tempatTujuan || '-' }}</div>
            </td>
          </tr>

          <!-- Poin 7: Lama Perjalanan & Tanggal -->
          <tr>
            <td class="col-no">7.</td>
            <td class="col-desc">
              <div>a. Lamanya Perjalanan dinas</div>
              <div>b. Tanggal Berangkat</div>
              <div>c. Tanggal harus kembali/tiba ditempat yang baru</div>
            </td>
            <td class="col-val">
              <div>a. {{ spd.lamaHari }} ( {{ angkaTerbilang(spd.lamaHari) }} ) Hari</div>
              <div>b. {{ formatIndonesianDate(spd.tanggalBerangkat) }}</div>
              <div>c. {{ computedTanggalKembali }}</div>
            </td>
          </tr>

          <!-- Poin 8: Pengikut -->
          <tr>
            <td class="col-no">8.</td>
            <td class="col-desc">
              Pengikut : Nama
            </td>
            <td class="col-val p-0">
              <table class="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr class="border-b border-black text-center font-normal">
                    <th class="w-1/2 py-0.5 border-r border-black font-normal">Tanggal Lahir</th>
                    <th class="w-1/2 py-0.5 font-normal">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-b border-black text-center">
                    <td class="border-r border-black py-0.5 text-black/50">1. -</td>
                    <td class="py-0.5 text-black/50">-</td>
                  </tr>
                  <tr class="border-b border-black text-center">
                    <td class="border-r border-black py-0.5 text-black/50">2. -</td>
                    <td class="py-0.5 text-black/50">-</td>
                  </tr>
                  <tr class="text-center">
                    <td class="border-r border-black py-0.5 text-black/50">3. -</td>
                    <td class="py-0.5 text-black/50">-</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Poin 9: Pembebanan Anggaran -->
          <tr>
            <td class="col-no">9.</td>
            <td class="col-desc">
              <div>Pembebanan Anggaran</div>
              <div>a. SKPD</div>
              <div>b. Kode Rekening</div>
            </td>
            <td class="col-val">
              <div>&nbsp;</div>
              <div>a. {{ spd.skpd || 'Bagian Umum Setda Kab. Banggai Laut' }}</div>
              <div>b. {{ spd.kodeRekening || '' }}</div>
            </td>
          </tr>

          <!-- Poin 10: Keterangan Lain-lain -->
          <tr>
            <td class="col-no">10.</td>
            <td class="col-desc">Keterangan Lain – lain</td>
            <td class="col-val">
              {{ spd.keterangan || '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </main>

    <!-- 5. BLOK TANDA TANGAN (Bawah Kanan) -->
    <footer class="signature-section mt-5 flex justify-end">
      <div class="w-[300px] text-[13px] leading-snug">
        <div class="grid grid-cols-[100px_10px_1fr]">
          <div>Dikeluarkan di</div><div>:</div><div>{{ spd.tempatBerangkat || 'Banggai' }}</div>
          <div>Pada Tanggal</div><div>:</div><div>{{ formatIndonesianDate(spd.createdAt || spd.tanggalBerangkat) }}</div>
        </div>

        <div class="mt-4 font-bold uppercase tracking-wider">
          {{ signerLabel }}
        </div>

        <!-- Signature wet space -->
        <div class="h-[75px]"></div>

        <div>
          <div class="font-bold underline text-[13.5px]">
            {{ activeSigner.nama }}
          </div>
          <div>
            {{ activeSigner.pangkat }}, {{ activeSigner.golongan }}
          </div>
          <div>
            NIP. {{ activeSigner.nip }}
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 
  PONYTAIL STANDARD:
  Font Times New Roman & Exact Margins for Official Indonesian Legal Document
*/
.spd-document-sheet {
  font-family: 'Times New Roman', Times, Georgia, serif !important;
  color: #000000 !important;
  background-color: #ffffff !important;
  box-sizing: border-box;
}

.spd-document-sheet *,
.spd-document-sheet h1,
.spd-document-sheet h2,
.spd-document-sheet h3,
.spd-document-sheet p,
.spd-document-sheet td,
.spd-document-sheet th,
.spd-document-sheet span,
.spd-document-sheet div {
  color: #000000 !important;
  font-family: 'Times New Roman', Times, Georgia, serif !important;
}

/* Legal Format: 215.9mm x 355.6mm (8.5 x 14 in) */
.sheet-legal {
  width: 215.9mm;
  min-height: 355.6mm;
}

/* A4 Fallback: 210mm x 297mm */
.sheet-a4 {
  width: 210mm;
  min-height: 297mm;
}

/* Exact Margins from PDF Analysis:
   Left: 16mm (60px)
   Right: 16mm (60px)
   Top with Kop: 12mm (45px)
   Top without Kop: 48mm (181px) - matches blangko fisik
   Bottom: 20mm (75px)
*/
.with-kop {
  padding: 12mm 16mm 20mm 16mm;
}

.without-kop {
  padding: 48mm 16mm 20mm 16mm;
}

.blanko-kop-spacer {
  height: 0px;
}

/* Table styling with exact 10-point columns */
.spd-table {
  border: 1px solid #000000;
  border-collapse: collapse;
}

.spd-table td,
.spd-table th {
  border: 1px solid #000000;
  vertical-align: top;
  padding: 3px 6px;
  color: #000000;
}

/* Proportions: No (36px / ~5.2%), Uraian (287px / ~41.6%), Nilai (367px / ~53.2%) */
.col-no {
  width: 36px;
  text-align: center;
  font-weight: 500;
}

.col-desc {
  width: 287px;
}

.col-val {
  width: 367px;
}

/* PRINT MEDIA QUERIES */
@media print {
  @page {
    size: 215.9mm 355.6mm;
    margin: 0;
  }

  body {
    background: transparent !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .spd-document-sheet {
    margin: 0 !important;
    box-shadow: none !important;
    width: 215.9mm !important;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
}
</style>
