# Progress Pelaksanaan Pengembangan SI-SPD

**Sistem Informasi Surat Perjalanan Dinas (SI-SPD)**  
*Sekretariat Daerah Kabupaten Banggai Laut, Sulawesi Tengah*

Dokumen ini mencatat ringkasan progres, arsitektur yang telah diimplementasikan, serta status roadmap pengerjaan sistem SI-SPD.

---

## 📊 Status Roadmap Proyek

| Fase | Deskripsi | Status | Tanggal Penyelesaian |
|---|---|:---:|:---:|
| **Fase 0** | Fondasi Monorepo, Autentikasi, Master ASN, Kop Surat, & Form UI Buat SPD | ✅ **Selesai** | 07 Okt 2026 |
| **Fase 1** | Backend Database & Persistence SPD (Prisma, Shared Types, REST API, Auto-Numbering) | ✅ **Selesai** | 07 Okt 2026 |
| **Fase 2** | Layout Dokumen Resmi (Tabel 10 Poin), Font Times New Roman, Margin Presisi & Generator Cetak | ✅ **Selesai** | 07 Okt 2026 |
| **Fase 3** | Manajemen Riwayat SPD, Filter Status, Cetak Ulang & Ekspor Laporan CSV | ✅ **Selesai** | 07 Okt 2026 |
| **Penyempurnaan** | Dukungan Multi-Agenda Dinamis "Dalam Rangka" & Penomoran Otomatis Presisi | ✅ **Selesai** | 07 Okt 2026 |

---

## 🚀 Rincian Implementasi per Fase

### ✅ Fase 0: Fondasi & Antarmuka UI (Selesai)
- **Monorepo & Workspace:** Turborepo + pnpm (`apps/api`, `apps/web`, `packages/shared-types`).
- **Autentikasi & RBAC:** Modul auth berbasis JWT guard dengan role `SUPER_ADMIN`, `ADMIN`, `STAFF`, dan `USER`.
- **Master Data Pegawai (ASN):** CRUD lengkap data pegawai/ASN, NIP, pangkat, golongan, jabatan, dan status kepegawaian.
- **Manajemen Kop Surat Dinas:** Penyimpanan file PDF kop dinas, stream inline, serta penanda kop default.
- **Formulir Buat SPD (9 Input Terstandar):**
  1. Pejabat Pemberi Perintah (*Pengguna Anggaran / Kuasa Pengguna Anggaran*)
  2. Pegawai Pelaksana Perjalanan Dinas (*Lazy autocomplete search ASN*)
  3. Maksud Perjalanan Dinas (*Textarea dengan batas maksimal 700 karakter & counter reaktif*)
  4. Alat Angkut / Moda Transportasi (*Multiselect chips*)
  5. Tempat Berangkat (*Default: Banggai*)
  6. Tempat Tujuan
  7. Lama Perjalanan Dinas (*Input number dengan konversi otomatis terbilang: [X] ([terbilang]) Hari*)
  8. Tanggal Berangkat (*Date picker*)
  9. Template Kop Surat Dinas (*Select dropdown dari master kop*)
- **Komponen Inti Reusable (`apps/web/src/components/core/`):**
  - `GovSelectButton`, `GovAutoComplete`, `GovTextarea`, `GovMultiSelect`, `GovInputNumber`, `GovDatePicker`, `GovSelect`, `GovInputText`, `GovButton`, `GovMessage`, `GovCard`, `GovPassword`, `GovCheckbox`.
- **Dukungan Dark Mode:** Tema Aura PrimeVue 4 disesuaikan penuh di `apps/web/src/style.css` untuk mencegah background putih saat hover/fokus di dark mode.

---

### ✅ Fase 1: Backend Database & Persistence SPD (Selesai)
- **Skema Database Prisma (`apps/api/prisma/schema.prisma`):**
  - Menambahkan model `Spd` dengan relasi ke `Pegawai` (`pegawaiId`) dan relasi opsional ke `KopSurat` (`kopSuratId`).
  - Kolom model:
    - `id` (CUID, Primary Key)
    - `nomorSpd` (Unique, nomor resmi surat)
    - `pemberiPerintah` (PA / KPA)
    - `pegawaiId` (Foreign Key -> `Pegawai`)
    - `dalamRangka` (Maksud perjalanan dinas)
    - `alatAngkut` (Moda transportasi)
    - `tempatBerangkat` & `tempatTujuan`
    - `lamaHari` (Integer hari perjalanan)
    - `tanggalBerangkat` & `tanggalKembali` (DateTime)
    - `skpd` (Default: *"Bagian Umum Sekretariat Daerah Kab. Banggai Laut"*)
    - `kodeRekening`, `tingkatBiaya`, `pengikut`, `keterangan`
    - `kopSuratId` (Foreign Key -> `KopSurat`)
    - `status` (DRAFT / DISETUJUI / SELESAI / BATAL)
    - `createdAt` & `updatedAt`
  - Relasi balik `spdList Spd[]` ditambahkan pada model `Pegawai` dan `KopSurat`.
  - Migrasi Prisma SQLite telah dieksekusi: `20261007124156_add_spd`.
- **Shared Types & Zod Validations (`packages/shared-types`):**
  - Enum status `SpdStatus`: `DRAFT`, `DISETUJUI`, `SELESAI`, `BATAL`.
  - Skema Zod `SpdSchema`, `CreateSpdSchema`, dan `UpdateSpdSchema`.
  - Tipe DTO: `SpdDto`, `CreateSpdDto`, dan `UpdateSpdDto`.
- **Modul Backend NestJS (`apps/api/src/spd/`):**
  - `SpdService`:
    - Auto-penomoran dinamis format `XXX/SPD/SETDA/YYYY` berdasarkan hitungan sequence tahun berjalan dan pencegahan tabrakan nomor (*collision check*).
    - Kalkulasi otomatis `tanggalKembali` = `tanggalBerangkat` + (`lamaHari` - 1) hari jika tanggal kepulangan tidak ditentukan eksplisit.
    - Pencarian fleksibel (`findAll`) mendukung query teks (nomor, maksud, tujuan, nama pegawai, NIP) dan filter status.
    - Operasi `findById`, `create`, `update`, dan `delete` dengan `include: { pegawai: true, kopSurat: true }`.
  - `SpdController`:
    - Endpoints `@Get()`, `@Get(':id')`, `@Post()`, `@Put(':id')`, `@Delete(':id')` dilindungi `AuthGuard` dan otorisasi RBAC `@Roles(...)`.
  - `SpdModule`:
    - Didaftarkan ke dalam `AppModule`.
- **Integrasi Frontend (`apps/web/src/views/BuatSpdView.vue`):**
  - Submit form mengirim request `POST /api/spd` menggunakan utilitas `apiFetch`.
  - Menampilkan alert feedback sukses dengan Nomor SPD yang baru terbit (`GovMessage severity="success"`).
  - Menampilkan alert pesan kesalahan jika validasi atau request API gagal.
- **Verifikasi & Build:**
  - Build seluruh monorepo (`@si-setda/shared-types`, `@si-setda/api`, `@si-setda/web`) berhasil tanpa error TypeScript.
  - Script uji integrasi langsung ke database SQLite terverifikasi berhasil (CRUD, penomoran, kalkulasi tanggal).

---

### ✅ Fase 2: Layout Dokumen Resmi, Font Times New Roman & Margin Presisi (Selesai)
- **Komponen Dokumen Resmi (`apps/web/src/components/spd/SpdDocument.vue`):**
  - **Tipografi Ketat:** Seluruh elemen teks, heading, tabel, nomor, dan tanda tangan menggunakan font keluarga serif **`Times New Roman`, Times, Georgia, serif** (`!important`).
  - **Dimensi Kertas Presisi:** Format baku **Legal / F4** (lebar `215.9mm` / `8.5"`, tinggi `355.6mm` / `14"` / `816px x 1344px @ 96 DPI`).
  - **Margin Presisi Sesuai Standar Tata Naskah Dinas:**
    - Margin Kiri: `16mm` (`60px`)
    - Margin Kanan: `16mm` (`60px`)
    - Margin Atas dengan Kop Surat: `12mm` (`45px`)
    - Margin Atas tanpa Kop Surat (untuk cetak di atas blangko kertas fisik ber-kop resmi): `48mm` (`181px`)
    - Margin Bawah: `20mm` (`75px`)
  - **Tabel Standar 10 Poin (Permendagri / Perbup Banggai Laut):**
    - Kolom 1 (Nomor): `36px` (~5.2% / ~9.5mm), rata tengah
    - Kolom 2 (Uraian): `287px` (~41.6% / ~76mm)
    - Kolom 3 (Rincian/Nilai): `367px` (~53.2% / ~97mm)
    - Poin 1 s/d 10: Pengguna Anggaran, Nama/NIP, Pangkat/Jabatan/Tingkat Biaya, Maksud Dinas, Alat Angkut, Tempat Berangkat & Tujuan, Lama Hari & Rentang Tanggal, Subtabel Pengikut 3 Baris, Pembebanan Anggaran (SKPD & Rekening), dan Keterangan Lain.
  - **Header Kop Surat:** Lambang resmi Kabupaten Banggai Laut (`/logo.png`) di sebelah kiri, nama instansi bertingkat, alamat lengkap, dan garis ganda pembatas resmi (*double border line*).
  - **Opsi Cetak Blangko Fisik:** Toggle reaktif "Tampilkan Kop Surat Resmi" yang secara otomatis menyesuaikan margin atas kertas tanpa menggeser tabel.
  - **Blok Tanda Tangan:** Tanggal penerbitan, penandatangan PA / KPA, ruang tanda tangan basah / cap stempel resmi (tinggi `75px`), nama pejabat bertanda tangan tebal bergaris bawah, pangkat/golongan, dan NIP.
- **Halaman Pratinjau & Cetak SPD (`apps/web/src/views/SpdDetailPrintView.vue`):**
  - Rute `/spd/cetak/:id` dan alias `/spd/preview/:id`.
  - Bilah alat pratinjau (`no-print`): tombol kembali, pemilih pejabat penandatangan, toggle kop surat, dan tombol aksi "Cetak SPD" (`window.print()`).
  - Efek bayangan lembar dokumen di layar (*paper shadow*) dengan kontras tajam.
  - Pengaturan cetak global di `apps/web/src/style.css` (`@media print`): menyembunyikan seluruh UI navigasi, sidebar, topbar, dan tombol secara otomatis, menyisakan dokumen murni tanpa noda pada hasil cetak.
- **Integrasi Alur Pengguna di `BuatSpdView.vue`:**
  - Tombol aksi primer **"Lihat & Cetak Dokumen SPD"** langsung muncul pada banner konfirmasi sukses setelah form SPD disimpan.
- **Verifikasi Pengujian Visual Playwright:**
  - Telah diverifikasi visual melalui Playwright di browser: render screen, toggle kop surat, dark mode isolation, dan emulasi media `@media print`.

---

### ✅ Fase 3: Riwayat & Manajemen SPD (Selesai)
- **Halaman Riwayat & Manajemen SPD (`apps/web/src/views/DaftarSpdView.vue`):**
  - **Ringkasan Metrik Dinamis:** Kartu indikator jumlah Total Dokumen, Disetujui, Draf, dan Selesai yang terhitung secara realtime.
  - **Pencarian & Penyaringan:** Input filter pencarian realtime (Nomor SPD, Pegawai, NIP, Maksud, Tujuan) serta pemilih dropdown status (*Semua, DRAFT, DISETUJUI, SELESAI, BATAL*).
  - **Tabel Data Terstruktur (`GovTable`):**
    - Kolom Nomor SPD berkode monospace yang dapat diklik langsung untuk pratinjau/cetak.
    - Kolom Pegawai Pelaksana (Nama berbobot tebal, NIP, Pangkat/Golongan, Jabatan).
    - Kolom Maksud Perjalanan Dinas dengan teks terpotong rapi (*line clamp*).
    - Kolom Tujuan & Jadwal keberangkatan.
    - Kolom Status dengan badge warna dinamis (*Amber untuk Draf, Sky/Biru untuk Disetujui, Emerald/Hijau untuk Selesai, Rose/Merah untuk Batal*).
    - Kolom Aksi terpadu: Cetak/Pratinjau cepat, Ubah Status, dan Hapus.
  - **Modal Dialog Interaktif:**
    - Dialog Ubah Status: Mengubah status SPD secara instan dengan request `PATCH /api/spd/:id/status`.
    - Dialog Konfirmasi Hapus: Mencegah penghapusan tidak disengaja dengan validasi konfirmasi sebelum `DELETE /api/spd/:id`.
  - **Fitur Ekspor Laporan CSV:** Tombol "Ekspor CSV" yang langsung mengunduh rekapitulasi data perjalanan dinas berformat spreadsheet UTF-8 dengan penamaan berkas otomatis sesuai tanggal unduh (`Rekap_SPD_Banggai_Laut_[YYYY-MM-DD].csv`).
- **Pembaruan Navigasi & Rute:**
  - Rute utama `/spd` (dengan alias `/spd/daftar`, `/spd/riwayat`) mengarah ke halaman `DaftarSpdView.vue`.
  - Submenu "Daftar Riwayat SPD" ditambahkan pada posisi teratas menu *Surat Perjalanan Dinas* di `GovSidebar.vue`.
- **Penyempurnaan Backend API (`apps/api/src/spd/`):**
  - Penambahan filter tanggal (`startDate`, `endDate`) dan penanganan fleksibel untuk filter status pada `SpdService.findAll`.
  - Endpoint baru `@Patch(':id/status')` pada `SpdController` untuk pembaruan status cepat.
- **Verifikasi Visual Playwright:**
  - Verifikasi render tabel, kartu metrik, dialog pembaruan status, dan proses download file CSV telah diuji dan lulus 100%.

---

### ✅ Penyempurnaan: Multi-Agenda Dinamis "Dalam Rangka" & Penomoran Otomatis (Selesai)
- **Formulir Input Dinamis (`apps/web/src/views/BuatSpdView.vue`):**
  - Mengubah input #3 "Dalam Rangka" menjadi daftar multi-item dinamis (`form.maksudList: string[]`).
  - Badge nomor urut bulat untuk tiap agenda kegiatan.
  - Tombol "+ Tambah Agenda / Maksud Lain" untuk menambahkan agenda dinamis tanpa batas batasan jumlah item.
  - Tombol aksi hapus (ikon trash) pada item ke-2 dst.
  - Penghitung batas karakter gabungan reaktif (`/700`) dengan peringatan visual ketika mendekati batas kuota.
  - Serialisasi data otomatis saat submit: jika terdapat lebih dari 1 agenda, diformat bernomor urut berbaris baru (`1. [Agenda 1]\n2. [Agenda 2]...`), dan jika hanya 1 agenda disimpan sebagai teks murni tanpa nomor pembuka.
- **Render Dokumen Resmi Poin 4 (`apps/web/src/components/spd/SpdDocument.vue`):**
  - Parsing cerdas `parsedMaksudList` yang memecah teks maksud perjalanan dinas berdasarkan pemisah baris baru dan menormalkan penomoran.
  - Layout hanging indent presisi:
    - Tanda titik dua (`:`) tetap di kolom terdepan (`w-[14px]`).
    - Penomoran otomatis (`1.`, `2.`, dst.) pada kolom nomor tetap (`w-[18px]`).
    - Rata teks kiri-kanan (`text-justify`) dengan baris-baris terusan yang lurus vertikal di bawah teks agenda (hanging indent).
    - Jika hanya 1 agenda, teks langsung mengikuti titik dua tanpa penomoran redundan.
- **Verifikasi Visual Playwright:**
  - Pengujian pembuatan SPD dengan 2 agenda berhasil disimpan dengan nomor `004/SPD/SETDA/2026`.
  - Verifikasi screenshot cetak membuktikan hasil cetak di Poin 4 identik dengan contoh naskah dinas resmi Kabupaten Banggai Laut.

