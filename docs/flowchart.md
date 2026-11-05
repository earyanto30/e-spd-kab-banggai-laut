# Flowchart Specification: SI-SPD Banggai Laut

This document defines the standard ISO/ANSI system flowcharts for the Sistem Informasi Surat Perjalanan Dinas (SI-SPD) platform. It provides high-level and modular execution flowcharts illustrating sequential system operations, data input/output, automated decision paths, and document lifecycle progressions. The visual Draw.io diagram file is available at [`docs/flowchart.drawio`](flowchart.drawio).

---

## 1. Flowchart Standards and Symbology

The flowcharts in this document adhere to the standard ISO 5807 / ANSI flowchart conventions:
- **Terminal (Start / End):** Denotes the invocation start point or final termination state of a business process (stadium/pill shape).
- **Input / Output:** Represents data entry by a user or output delivery by the system (parallelogram).
- **Process:** Represents an internal computational action, database operation, or state change (rectangle).
- **Decision:** Evaluates a conditional expression or business rule with branching paths (diamond).
- **Document / Output:** Denotes physical or digital document generation, such as PDF compilation (document shape or output symbol).
- **Flow Line:** Indicates the chronological sequence of execution and direction of control flow (directional arrow).

---

## 2. Flowchart 1: Alur Utama Sistem SI-SPD (End-to-End System Flowchart)

This flowchart illustrates the overarching end-to-end lifecycle of travel document administration in SI-SPD, from user authentication to travel completion and final reporting:

```mermaid
flowchart TD
    StartNode(["Mulai"]) --> InputLogin[/"Input Username & Password"/]
    InputLogin --> VerifyAuth["Verifikasi Kredensial (Scrypt & Timing-Safe Check)"]
    VerifyAuth --> CheckAuth{"Kredensial Valid?"}

    CheckAuth -- "Tidak" --> ShowAuthErr["Tampilkan Notifikasi Kredensial Salah"]
    ShowAuthErr --> InputLogin

    CheckAuth -- "Ya" --> InputST[/"Input Agenda Tugas, Dasar Hukum & Pilih ASN"/]
    InputST --> SaveDraftST["Simpan Draf ST & Auto-Generate Nomor ST"]
    SaveDraftST --> ReviewDoc["Pemeriksaan oleh Pejabat Penandatangan (PA / KPA)"]
    ReviewDoc --> CheckApprove{"Surat Tugas Disetujui?"}

    CheckApprove -- "Tidak" --> RevisionDoc["Catatan Revisi Pejabat (Kembalikan ke Draf)"]
    RevisionDoc --> InputST

    CheckApprove -- "Ya" --> MarkApproved["Perbarui Status ST Menjadi DISETUJUI"]
    MarkApproved --> OpenSPDDialog["Buka Dialog Modal Terbitkan SPD"]
    OpenSPDDialog --> InputSPDParam[/"Atur Parameter SPD (Mata Anggaran, Akun & Transportasi)"/]
    InputSPDParam --> GenerateSPDs["Generate Nomor SPD & Terbitkan SPD Setiap Pegawai"]
    GenerateSPDs --> PrintOfficialDocs[/"Cetak Dokumen Resmi PDF (Surat Tugas & SPD Lembar 1-2)"/]
    PrintOfficialDocs --> ExecuteDuty["Pelaksanaan Perjalanan Dinas oleh ASN yang Bertugas"]
    ExecuteDuty --> InputReport[/"Input Laporan Hasil Perjalanan Dinas & Rincian Pengeluaran"/]
    InputReport --> SaveReport["Validasi & Simpan Laporan Perjalanan Dinas"]
    SaveReport --> PrintReportDoc[/"Cetak Dokumen Laporan Hasil Perjalanan Dinas"/]
    PrintReportDoc --> MarkCompleted["Perbarui Status Dokumen Menjadi SELESAI"]
    MarkCompleted --> EndNode(["Selesai"])
```

---

## 3. Flowchart 2: Alur Pembuatan Surat Tugas & Penerbitan SPD (ST & SPD Lifecycle)

This flowchart details the granular logic of creating a Surat Tugas and issuing corresponding on-demand child SPD documents:

```mermaid
flowchart TD
    StartST(["Mulai"]) --> OpenSTForm["Akses Halaman Buat Surat Tugas"]
    OpenSTForm --> InputSTData[/"Input Maksud Tugas, Tanggal, Lokasi & Pilih Pegawai"/]
    InputSTData --> ValidateSTInput{"Data Lengkap & Valid?"}

    ValidateSTInput -- "Tidak" --> ShowSTValidationErr["Tampilkan Pesan Validasi Form"]
    ShowSTValidationErr --> InputSTData

    ValidateSTInput -- "Ya" --> SubmitSTReq["Kirim Request POST /api/surat-tugas"]
    SubmitSTReq --> ResolveSTNum["Auto-Generate Nomor ST Format [Seq]/ST/YYYY"]
    ResolveSTNum --> SaveSTRecord["Insert Record SuratTugas ke Database (Status: DRAFT)"]
    SaveSTRecord --> RedirectToDetail["Arahkan ke Halaman Detail / Cetak Surat Tugas"]

    RedirectToDetail --> TriggerIssueModal["Operator Membuka Dialog Modal 'Terbitkan / Ubah SPD'"]
    TriggerIssueModal --> CheckExistingSPD{"Apakah SPD Sudah Ada?"}

    CheckExistingSPD -- "Ya" --> LoadExistingParams[/"Muat Parameter SPD yang Tersimpan ke Form Modal"/]
    CheckExistingSPD -- "Tidak" --> LoadDefaultParams[/"Muat Parameter Default (Biaya, Anggaran, Pejabat)"/]

    LoadExistingParams --> EditSPDParams[/"Sesuaikan Parameter (Mata Anggaran, Akun, Transportasi)"/]
    LoadDefaultParams --> EditSPDParams

    EditSPDParams --> SubmitBatchSPD["Kirim Request Batch SPD ke Server"]
    SubmitBatchSPD --> CheckSignerMode{"Mode Penandatangan KPA atau PA?"}

    CheckSignerMode -- "KPA" --> ApplyKpaPrefix["Terapkan Prefix KPA pada Nomor SPD & Jabatan KPA"]
    CheckSignerMode -- "PA" --> ApplyPaFormat["Gunakan Format Nomor Biasa & Jabatan Sekda sebagai PA"]

    ApplyKpaPrefix --> CommitSPDRecords["Simpan Record SPD Seluruh ASN (Status: DRAFT / DISETUJUI)"]
    ApplyPaFormat --> CommitSPDRecords

    CommitSPDRecords --> RenderPDFOptions[/"Tampilkan Tombol Unduh / Cetak Dokumen PDF"/]
    RenderPDFOptions --> EndST(["Selesai"])
```

---

## 4. Flowchart 3: Alur Autentikasi Pengguna & Penegakan RBAC

This flowchart models the security verification process during user authentication and subsequent role-based route guard enforcement:

```mermaid
flowchart TD
    StartAuth(["Mulai"]) --> InputCreds[/"Input Username / NIP & Password"/]
    InputCreds --> SubmitLoginReq["Kirim Request POST /api/auth/login"]
    SubmitLoginReq --> QueryDB["Cari Akun Pengguna pada Database"]
    QueryDB --> CheckUserFound{"Pengguna Ditemukan?"}

    CheckUserFound -- "Tidak" --> TimingSafeDud["Jalankan Dummy Scrypt Verify (Timing-Safe)"]
    TimingSafeDud --> Return401Err[/"HTTP 401 Unauthorized: Kredensial Salah"/]
    Return401Err --> InputCreds

    CheckUserFound -- "Ya" --> VerifyPassword["Verifikasi Password Hash via crypto.timingSafeEqual"]
    VerifyPassword --> CheckPasswordMatch{"Password Cocok?"}

    CheckPasswordMatch -- "Tidak" --> Return401Err

    CheckPasswordMatch -- "Ya" --> SignToken["Buat JSON Web Token (Payload: id, username, role, skpd)"]
    SignToken --> SendTokenToClient[/"HTTP 200 OK: Simpan Token pada Client (localStorage)"/]
    SendTokenToClient --> AccessRoute["Pengguna Mengakses Halaman Sistem"]
    AccessRoute --> EvaluateRBAC{"Role Memenuhi Syarat Hak Akses?"}

    EvaluateRBAC -- "Tidak" --> Show403Denied[/"Tampilkan Notifikasi 403 Forbidden: Akses Ditolak"/]
    EvaluateRBAC -- "Ya" --> GrantAccess[/"Izinkan Akses dan Render Tampilan Halaman"/]
    GrantAccess --> EndAuth(["Selesai"])
```

---

## 5. Flowchart 4: Alur Pelaporan Hasil Perjalanan Dinas (Laporan SPD)

This flowchart models the post-travel documentation and reporting workflow required for financial accountability:

```mermaid
flowchart TD
    StartLaporan(["Mulai"]) --> SelectApprovedDoc["Pilih Surat Tugas / SPD dengan Status DISETUJUI"]
    SelectApprovedDoc --> CheckStatusEligible{"Status Dokumen Valid (DISETUJUI)?"}

    CheckStatusEligible -- "Tidak" --> PromptStatusErr[/"Peringatan: Dokumen Belum Disetujui Pimpinan"/]
    PromptStatusErr --> SelectApprovedDoc

    CheckStatusEligible -- "Ya" --> OpenLaporanForm["Buka Form Input Laporan Perjalanan Dinas"]
    OpenLaporanForm --> InputLaporanData[/"Input Narasi Pelaksanaan, Hasil, & Tanggal Laporan"/]
    InputLaporanData --> SubmitLaporanReq["Kirim Request Simpan Laporan ke Backend"]
    SubmitLaporanReq --> SaveLaporanDB["Simpan Record Laporan Perjalanan Dinas ke Database"]
    SaveLaporanDB --> UpdateStatusSelesai["Perbarui Status Dokumen Menjadi SELESAI"]
    UpdateStatusSelesai --> GenerateLaporanPDF["Render PDF Laporan Perjalanan Dinas & Lembar Visum"]
    GenerateLaporanPDF --> DownloadPrintDoc[/"Unduh / Cetak Dokumen Pertanggungjawaban Resmi"/]
    DownloadPrintDoc --> ArchiveDoc["Arsip Dokumen Fisik & Digital Tersimpan Lengkap"]
    ArchiveDoc --> EndLaporan(["Selesai"])
```

---

## 6. Penjelasan Simbol dan Komponen Flowchart

| Simbol Flowchart | Bentuk Visual | Deskripsi Fungsi dalam Sistem SI-SPD |
| :--- | :--- | :--- |
| **Terminal** | Kapsul / Stadium `([ ... ])` | Menandai titik awal (Mulai) dan titik akhir (Selesai) dari suatu alur proses sistem. |
| **Input / Output** | Jajaran Genjang `[/ ... /]` | Mewakili interaksi input data oleh pengguna (seperti input formulir ST, parameter SPD) atau penerimaan dokumen luaran (seperti cetak PDF). |
| **Process** | Persegi Panjang `[ ... ]` | Menunjukkan aksi eksekusi pemrosesan data, kalkulasi otomatis, hashing kredensial, atau query database oleh backend NestJS. |
| **Decision** | Belah Ketupat / Diamond `{ ... }` | Menunjukkan titik percabangan kondisional yang menghasilkan dua alternatif jalur (seperti Valid/Tidak, Disetujui/Revisi, KPA/PA). |
| **Document** | Dokumen Tercetak `[/ ... /]` | Menggambarkan luaran dokumen fisik/digital resmi yang dihasilkan oleh sistem (Surat Tugas, SPD Lembar Depan, SPD Visum Belakang, Laporan Perjalanan). |
| **Flow Line** | Garis Berpanah `-->` | Menunjukkan arah aliran eksekusi instruksi dan urutan langkah sistem dari satu tahapan ke tahapan berikutnya. |

---

## 7. File Referensi Visual (Draw.io)

Model visual diagram alir sistem ini tersedia dalam format asli Draw.io pada:
- **Draw.io XML File:** [`docs/flowchart.drawio`](flowchart.drawio)
- **Kompatibilitas:** Dapat dibuka, diedit, dan diekspor ke format SVG/PNG melalui [diagrams.net](https://app.diagrams.net/) atau ekstensi Draw.io Integration di IDE.
