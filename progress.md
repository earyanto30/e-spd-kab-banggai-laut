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
| **Penyempurnaan 1** | Dukungan Multi-Agenda Dinamis "Dalam Rangka" & Penomoran Otomatis Presisi | ✅ **Selesai** | 07 Okt 2026 |
| **Penyempurnaan 2** | Integrasi Pembuatan PDF Asli Menggunakan Kop Surat dari Pengaturan Kop Surat | ✅ **Selesai** | 07 Okt 2026 |
| **Penyempurnaan 3** | Fitur Edit SPD yang Sudah Dibuat (Form Prefill Lengkap & Update API) | ✅ **Selesai** | 07 Okt 2026 |
| **Penyempurnaan 4** | Notifikasi Alert Overlay & Auto-Disappear Reusable (PrimeVue Toast) | ✅ **Selesai** | 07 Okt 2026 |

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

---

### ✅ Penyempurnaan 2: Integrasi Pembuatan PDF Asli dengan Kop Surat Unggahan (Selesai)
- **Layanan Pembuatan Dokumen PDF (`apps/api/src/spd/spd-pdf.service.ts`):**
  - Menggunakan pustaka standar industri `pdf-lib` untuk memuat berkas PDF kop surat resmi yang diunggah dari menu *Pengaturan Kop Surat* (`KOP-SPD-Legal.pdf` / `kop_setda_default.pdf`).
  - Merender seluruh konten naskah dinas SPD langsung di bawah garis ganda kop surat pada halaman pertama berkas PDF:
    - Metadata lembar, kode no, dan nomor surat di kanan atas.
    - Judul dokumen bergaris bawah `SURAT PERJALANAN DINAS (SPD)`.
    - Tabel 10 poin terstandar dengan garis presisi 0.5 pt dan font resmi `Times New Roman` (vektor tajam).
    - Dukungan multi-agenda pada poin 4 dengan format *hanging indent* bernomor urut otomatis (`1.`, `2.`, dst.).
    - Subtabel pengikut 3 baris.
    - Blok tanda tangan pejabat penandatangan (PA/KPA) yang dapat disesuaikan secara dinamis.
- **Endpoint API Streaming PDF (`apps/api/src/spd/spd.controller.ts`):**
  - Endpoint `GET /api/spd/:id/pdf` yang menghasilkan file PDF dengan header `Content-Type: application/pdf` dan nama file otomatis `SPD_[NOMOR_SPD].pdf`.
  - Mendukung query parameter data penandatangan (`signerNama`, `signerNip`, `signerPangkat`, dll).
- **Integrasi Antarmuka Pratinjau & Cetak (`apps/web/src/views/SpdDetailPrintView.vue`):**
  - Tombol aksi primer **"Unduh PDF Resmi"** (ikon PDF merah) untuk langsung mengunduh berkas PDF terpadu dengan kop surat.
  - Tab pengalih tampilan (*View Mode Switcher*):
    - **Lembar Dokumen:** Pratinjau responsif HTML untuk cetak printer langsung lewat browser (`window.print()`).
    - **Pratinjau PDF Asli:** Menampilkan viewer PDF langsung di dalam browser yang merender berkas PDF asli hasil gabungan kop surat unggahan.
- **Integrasi Tabel Riwayat SPD (`apps/web/src/views/DaftarSpdView.vue`):**
  - Penambahan tombol aksi cepat "Unduh PDF Resmi" (ikon PDF merah) pada kolom aksi setiap baris dokumen SPD.
- **Verifikasi Pengujian & Visual:**
  - Telah diuji pada dokumen SPD #004 menggunakan kop resmi `Kop SPD Legal` (`kop-1791376213740.pdf`), diverifikasi melalui Playwright dan tangkapan layar viewer PDF terbukti presisi 100%.

---

### ✅ Penyempurnaan 3: Fitur Edit SPD yang Sudah Dibuat (Selesai)
- **Routing & Mode Edit (`apps/web/src/router/index.ts` & `apps/web/src/views/BuatSpdView.vue`):**
  - Mendaftarkan rute baru `/spd/edit/:id` dengan nama `EditSpd` yang menggunakan kembali komponen formulir `BuatSpdView.vue`.
  - Deteksi mode adaptif `isEditMode = computed(() => !!route.params.id)`.
  - Fungsi `loadExistingSpd()` secara otomatis mengambil data SPD berdasarkan ID dari API (`GET /api/spd/:id`) dan memuat semua isian formulir:
    - Pejabat Pemberi Perintah (PA / KPA).
    - Pegawai Pelaksana (pencarian instan dan pemuatan profil lengkap pegawai).
    - Multi-agenda "Dalam Rangka" (dianalisis dan dipecah kembali ke dalam daftar item dinamis).
    - Alat angkut / moda transportasi (*chips array*).
    - Tempat berangkat & tujuan.
    - Lama perjalanan hari & tanggal keberangkatan.
    - Template kop surat dinas yang telah dipilih sebelumnya.
  - Judul halaman, remah roti (*breadcrumb*), dan tombol aksi otomatis beradaptasi menjadi *"Edit Surat Perjalanan Dinas"* dan *"Simpan Perubahan SPD"*.
- **Integrasi API Penyimpanan Perubahan:**
  - Fungsi pengiriman form secara dinamis memanggil `PUT /api/spd/:id` saat dalam mode edit, atau `POST /api/spd` saat membuat SPD baru.
  - Notifikasi sukses dengan toast/alert dan pengalihan otomatis ke halaman pratinjau cetak naskah dinas.
- **Akses Tombol Edit:**
  - **Tabel Riwayat SPD (`apps/web/src/views/DaftarSpdView.vue`):** Tombol aksi edit (ikon pensil hijau/biru) pada setiap baris data untuk mempercepat pengeditan langsung dari daftar.
  - **Toolbar Cetak SPD (`apps/web/src/views/SpdDetailPrintView.vue`):** Tombol aksi *"Edit SPD"* pada toolbar atas dokumen cetak untuk memudahkan revisi saat mengecek draf dokumen.
- **Verifikasi Pengujian:**
  - Telah diuji secara end-to-end melalui Playwright: membuka data SPD yang telah ada, memperbarui rute tujuan, menyimpan pembaruan, dan memastikan perubahan tersimpan dengan benar di database dan langsung tercermin pada lembar cetak.

---

### ✅ Penyempurnaan 4: Alert CRUD Overlay Reusable (PrimeVue Toast) (Selesai)
- **Komponen Inti Reusable (`apps/web/src/components/core/GovToast.vue`):**
  - Komponen wrapper berbasis PrimeVue `Toast` resmi dengan styling terintegrasi tema Civic Banggai Laut (light & dark mode).
  - Terpasang secara global di akar aplikasi (`apps/web/src/App.vue`), memastikan notifikasi tetap persisten melintasi navigasi rute dan halaman.
  - Penataan gaya fixed overlay dengan penyesuaian khusus:
    - **Posisi Selalu di Bawah Navbar:** Ditetapkan `top: 5rem !important;` (80px) pada desktop dan `top: 4.75rem / 4.5rem` pada tablet/mobile, memberikan jarak margin yang presisi di bawah navbar setinggi 64px (`h-16`) tanpa menutupi header, tombol navigasi, atau ikon tema.
    - **Adaptasi Berbagai Ukuran Layar (*Display Size Responsiveness*):**
      - *Desktop / Layar Lebar (>= 769px):* Lebar 26rem (416px) dengan posisi pojok kanan atas (`right: 1.5rem`).
      - *Tablet (<= 768px):* Menyesuaikan lebar otomatis (`width: auto`, `max-width: calc(100vw - 2rem)`) dengan margin seimbang `left: 1rem; right: 1rem`.
      - *Ponsel Kecil (<= 480px down to 320px):* Margin adaptif `left: 0.75rem; right: 0.75rem; max-width: calc(100vw - 1.5rem)`, memastikan pesan tidak pernah terpotong atau keluar dari batas layar.
    - Dilengkapi konfigurasi prop `breakpoints` terintegrasi pada komponen `Toast`.
- **Composable Reusable (`apps/web/src/composables/useGovToast.ts`):**
  - Menyediakan API yang ringkas dan strongly-typed untuk memicu notifikasi:
    - `toast.success(message, summary?, life?)` (auto-disappear default 4000ms)
    - `toast.error(message, summary?, life?)` (auto-disappear default 5000ms)
    - `toast.warn(message, summary?, life?)` (auto-disappear default 4500ms)
    - `toast.info(message, summary?, life?)` (auto-disappear default 4000ms)
  - Pengguna dapat menutup notifikasi secara manual sewaktu-waktu melalui tombol dismiss (*close button*).
- **Penggantian Alert Statis di Seluruh Modul CRUD:**
  - **Kepegawaian ASN (`KepegawaianAsnView.vue`):** Penggantian alert statis menjadi Toast saat menambah, mengedit, menghapus pegawai, serta validasi form.
  - **Pengaturan Kop Surat (`PengaturanKopSuratView.vue`):** Notifikasi Toast saat mengunggah kop PDF, menetapkan kop default, menghapus kop, dan validasi file.
  - **Pengaturan Pengguna (`PengaturanPenggunaView.vue`):** Notifikasi Toast saat membuat pengguna, memperbarui akun, mengubah status aktif/nonaktif, dan menghapus akun.
  - **Buat & Edit SPD (`BuatSpdView.vue`):** Notifikasi Toast mengambang saat penerbitan SPD baru atau penyimpanan perubahan draf SPD tanpa mengharuskan pengguna scroll kembali ke atas form.
  - **Daftar SPD (`DaftarSpdView.vue`):** Notifikasi Toast saat pembaruan status SPD, penghapusan SPD, pengunduhan berkas PDF, serta ekspor CSV.
  - **Detail & Cetak SPD (`SpdDetailPrintView.vue`):** Notifikasi Toast saat unduh PDF resmi berhasil atau gagal.
- **Verifikasi Visual Playwright Lintas Resolusi Layar:**
  - *Full HD (1920x1080):* `top: 80px`, `right: 24px`, tepat di bawah navbar (gap 16px).
  - *Laptop Standar (1366x768):* `top: 80px`, `right: 24px`, tepat di bawah navbar.
  - *Tablet (768x1024):* `top: 78.2px`, `isBelowNavbar: true`, responsif penuh di dalam batas layar (`isFullyWithinViewport: true`).
  - *Mobile Modern (390x844):* `top: 74.9px`, `isBelowNavbar: true`, margin kiri/kanan presisi, konten terbaca sempurna.
  - *Ultra-small Mobile (320x568):* `top: 72px`, `width: 296px`, tanpa overflow horizontal, 100% berada di dalam viewport.

---

### 🐛 Bugfix: Pembersihan State Formulir saat Berpindah dari Edit SPD ke Buat SPD Baru (Selesai)
- **Penyebab Masalah:** Komponen `BuatSpdView.vue` digunakan bersama oleh rute `/spd/edit/:id` dan `/spd/buat`. Secara default, Vue Router menggunakan kembali instance komponen yang sama (*component reuse*) tanpa memicu hook `onMounted`, sehingga data formulir lama dari mode edit tetap menempel saat membuka menu *"Buat SPD Baru"*.
- **Solusi Komprehensif:**
  1. **Lifecycle Unmount Guard (`apps/web/src/App.vue`):** Menambahkan `:key="$route.fullPath"` pada seluruh `<router-view>` di `App.vue`. Navigasi antar parameter/path rute secara otomatis mereset lifecycle komponen ke kondisi awal.
  2. **Reactive Form Reset Function (`apps/web/src/views/BuatSpdView.vue`):** Menambahkan fungsi `resetForm()` yang mengembalikan seluruh 9 field form, array multi-agenda, state validasi errors, dan referensi data lama ke nilai default bersih (termasuk memuat kembali kop default).
  3. **Route Watcher (`watch(() => route.fullPath, ...)`):** Mendeteksi pergantian rute secara reaktif sehingga jika berpindah ke `/spd/buat`, form langsung dibersihkan seketika.
- **Verifikasi Pengujian:** Telah diuji melalui Playwright: membuka data SPD existing (`/spd/edit/...`), berpindah ke `/spd/buat`, dan memverifikasi bahwa field `tempatTujuan`, `maksudList`, dan `pegawai` telah kembali kosong (*clean reset*).

---

### 🎨 Peningkatan UI & Perbaikan Visual (Selesai)
1. **Perbaikan Tema Gelap DatePicker PrimeVue (`apps/web/src/style.css`):**
   - Menyelaraskan seluruh elemen internal popup kalender DatePicker (`p-datepicker-panel`, `p-datepicker-calendar`, `p-datepicker-header`, navigation buttons, cell tanggal, hari ini, dan tanggal terpilih) agar sepenuhnya menggunakan palette warna gelap (`#162238`, `#1E293B`, `#F8FAFC`).
2. **Revamp Navigasi Sidebar (`apps/web/src/components/layout/GovSidebar.vue`):**
   - Mengadopsi komponen resmi PrimeVue `PanelMenu` dengan integrasi custom slot `#item` dan `router-link`.
   - Mengikuti best practice penamaan menu UX: ringkas, berbasis kata benda untuk kategori utama, dan jelas bagi pengguna.
   - Memperbaiki layout header sidebar saat posisi *collapsed* (`w-20`): menyembunyikan logo agar tombol collapse tetap terpusat (*centered*) dan tidak tumpang-tindih (*overlap*).
3. **Restrukturisasi Menu Kop Surat:**
   - Memindahkan submenu Kop Surat dari grup *"Surat Perjalanan Dinas"* ke menu *"Pengaturan"* dengan rute utama `/pengaturan/kop-surat` (tetap menyediakan alias `/spd/kop-surat` untuk backward compatibility).
   - Memperbarui tautan aksi cepat pada `HomeView.vue`.

---

### 📊 Mockup Dashboard Analitik & Visualisasi Grafis (Selesai)
- **Instalasi Pustaka Grafik (`chart.js`):** Mengintegrasikan `chart.js` untuk mendukung komponen resmi `primevue/chart`.
- **4 Kartu Indikator Kinerja Utama (KPI Metrics):**
  - *Total SPD Diterbitkan* (148 Dokumen, +14% bulan ini)
  - *SPD Sedang Aktif* (18 Pegawai minggu berjalan)
  - *ASN Pelaksana Tugas* (64 Orang ASN)
  - *Realisasi Anggaran SPD* (Rp 284,5 Jt, 78.2% pagu)
- **Berbagai Varian Grafik Analitik:**
  1. **Bar Chart (Grouped):** Statistik Penerbitan SPD per Bulan (komparasi Luar Daerah Sulteng vs Dalam Wilayah Banggai Laut).
  2. **Doughnut Chart:** Distribusi Moda Transportasi Dinas (Pesawat Udara, Kapal Feri, Speedboat Pemda, Kendaraan Darat).
  3. **Line Area Chart (Curved):** Tren Akumulasi Hari Dinas (Durasi Penugasan).
  4. **Horizontal Bar Chart:** 5 Destinasi Perjalanan Terbanyak (Palu, Luwuk, Jakarta, Makassar, Gorontalo).
- **Tabel Rekap & Akses Cepat:**
  - Tabel mockup penerbitan SPD terbaru dengan badge status (`DISETUJUI`, `SELESAI`, `DRAFT`).
  - Kartu pintasan akses cepat ke seluruh modul sistem dan info status operasional Pemda.
- **Dukungan Tema Dinamis:** Grafik otomatis menyesuaikan warna font, grid scale, dan tooltip secara reaktif saat berganti antara mode gelap dan mode terang.


