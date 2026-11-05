# Activity Diagram Specification: SI-SPD Banggai Laut

This document defines the behavioral Activity Diagrams and operational workflows for the Sistem Informasi Surat Perjalanan Dinas (SI-SPD) platform. It provides cross-functional swimlane maps illustrating human-to-system interactions, branching logic, asynchronous states, and document lifecycles. The visual Draw.io diagram file is available at [`docs/activity-diagram.drawio`](activity-diagram.drawio).

---

## 1. Notation and Modeling Standards

The activity diagrams adhere to standard UML 2.0 Activity Diagram specifications:
- **Initial Node:** Denotes the invocation entry point of a business process (solid circle).
- **Action State:** Represents an atomic executable operation or computational task (rounded rectangle).
- **Decision Node:** Evaluates runtime conditional guards with mutually exclusive outgoing branches (diamond).
- **Merge Node:** Recombines alternate control paths into a unified execution flow (diamond).
- **Swimlane / Partition:** Allocates operational responsibility across architectural actors or subsystems (vertical column).
- **Activity Final Node:** Terminates control flow across all active branches (concentric circle).

---

## 2. Activity Diagram 1: End-to-End Travel Document Issuance & Verification Map

The primary cross-functional activity map below coordinates user actions, automated backend procedures, and executive approval lifecycles across three distinct swimlanes:

```mermaid
flowchart TD
    subgraph SwimlaneUser ["Pengguna / Staff"]
        StartNode(( )) --> ActLogin["Masuk ke Sistem (Login JWT)"]
        ActInputST["Input Agenda Tugas, Pilih ASN & Dasar Hukum"]
        ActCfgSPD["Buka Modal Terbitkan SPD & Atur Parameter"]
        DecConfirmSPD{"Konfirmasi Terbitkan SPD?"}
        EndCancelSPD((( )))
        ActPrintDoc["Unduh PDF Resmi (Lembar Depan & Belakang)"]
        ActAuthorReport["Input Narasi Hasil Perjalanan pada Laporan SPD"]
    end

    subgraph SwimlaneSystem ["Sistem SI-SPD"]
        ActVerifyAuth["Verifikasi Kredensial (Scrypt & Timing-Safe)"]
        DecAuth{"Kredensial Valid?"}
        ActAuthErr["Tampilkan Notifikasi Kredensial Salah"]
        ActGenSTNum["Auto-Generate Nomor ST & Simpan Draf"]
        DecKpaMode{"Mode KPA atau PA?"}
        ActGenKpa["Terapkan Prefix KPA & Pejabat Kabag Umum"]
        ActGenPa["Gunakan Nomor Biasa & Pejabat Sekda"]
        ActSaveSpds["Generate Dokumen SPD untuk Setiap ASN"]
        ActMarkApproved["Perbarui Status ke DISETUJUI (Sah)"]
        ActStreamPDF["Stream Vector PDF (Tabel 10-Poin & Visum)"]
        ActSaveLaporan["Validasi Status DISETUJUI, Simpan & Render PDF Legal"]
        EndFinal((( )))
    end

    subgraph SwimlaneApprover ["Pejabat Penandatangan (PA / KPA)"]
        ActReviewDoc["Pemeriksaan Itinerary & Beban Anggaran"]
        DecApprove{"Setujui Dokumen?"}
        ActRejectST["Kembalikan ke Draf untuk Revisi"]
    end

    ActLogin --> ActVerifyAuth
    ActVerifyAuth --> DecAuth
    DecAuth -- Tidak --> ActAuthErr
    ActAuthErr --> ActLogin
    DecAuth -- Ya --> ActInputST

    ActInputST --> ActGenSTNum
    ActGenSTNum --> ActCfgSPD
    ActCfgSPD --> DecConfirmSPD

    DecConfirmSPD -- Batal --> EndCancelSPD
    DecConfirmSPD -- Konfirmasi --> DecKpaMode

    DecKpaMode -- Mode KPA --> ActGenKpa
    DecKpaMode -- Mode PA --> ActGenPa

    ActGenKpa --> ActSaveSpds
    ActGenPa --> ActSaveSpds

    ActSaveSpds --> ActReviewDoc
    ActReviewDoc --> DecApprove

    DecApprove -- Revisi --> ActRejectST
    ActRejectST --> ActInputST

    DecApprove -- Setuju --> ActMarkApproved
    ActMarkApproved --> ActPrintDoc
    ActPrintDoc --> ActStreamPDF

    ActStreamPDF --> ActAuthorReport
    ActAuthorReport --> ActSaveLaporan
    ActSaveLaporan --> EndFinal
```

---

## 3. Activity Diagram 2: User Authentication & Session Security Flow

This activity map models credential capture, brute-force mitigation, timing-safe verification, and JWT session initialization:

```mermaid
flowchart TD
    StartAuth(( )) --> InputCreds["Masukkan Username / NIP dan Password"]
    InputCreds --> SubmitLogin["Kirim Request POST /api/auth/login"]
    SubmitLogin --> QueryUser["Query Akun Pengguna pada Database"]
    QueryUser --> CheckUserExists{"Akun Ditemukan & Aktif?"}

    CheckUserExists -- Tidak --> ShowNotFound["Tampilkan Kesalahan: Akun Tidak Ditemukan"]
    ShowNotFound --> InputCreds

    CheckUserExists -- Ya --> ComputeScrypt["Hitung Hash Password via ScryptSync"]
    ComputeScrypt --> CompareHash["Verifikasi Hash via timingSafeEqual"]
    CompareHash --> CheckPasswordMatch{"Password Cocok?"}

    CheckPasswordMatch -- Tidak --> ShowWrongPass["Tampilkan Kesalahan: Kata Sandi Salah"]
    ShowWrongPass --> InputCreds

    CheckPasswordMatch -- Ya --> SignJWT["Generate JWT Token (HMAC-SHA256, TTL 24h)"]
    SignJWT --> StoreSession["Simpan Token pada localStorage Browser"]
    StoreSession --> RouteDashboard["Navigasi ke Beranda / Dashboard"]
    RouteDashboard --> EndAuth((( )))
```

---

## 4. Activity Diagram 3: On-Demand Child SPD Generation & Parameter Synchronization

This workflow details how administrative staff issue individual child SPDs from an existing multi-assignee assignment order:

```mermaid
flowchart TD
    StartGen(( )) --> OpenDetailST["Buka Tampilan Pratinjau Surat Tugas"]
    OpenDetailST --> ClickGenBtn["Klik Tombol Terbitkan / Ubah SPD"]
    ClickGenBtn --> OpenModal["Tampilkan Modal Parameter SPD"]
    OpenModal --> FillParams["Atur Alat Angkut, Tanggal, Durasi & Otoritas PA/KPA"]
    FillParams --> ClickSubmit["Submit Konfigurasi ke Server"]

    ClickSubmit --> FetchParentST["Query Data Surat Tugas & Roster ASN"]
    FetchParentST --> CheckAuthority{"Otoritas Penerbitan?"}

    CheckAuthority -- KPA (Kabag Umum) --> ApplyKpaPrefix["Format Nomor: KPA[Seq]/SPD/SETDA/[Year]"]
    CheckAuthority -- PA (Sekretaris Daerah) --> ApplyPaFormat["Format Nomor: [Seq]/SPD/SETDA/[Year]"]

    ApplyKpaPrefix --> IteratePegawai["Iterasi Setiap Pegawai ID Terdaftar"]
    ApplyPaFormat --> IteratePegawai

    IteratePegawai --> CheckExistingSPD{"SPD Pegawai Sudah Ada?"}
    CheckExistingSPD -- Ya --> UpdateChildSPD["Update Parameter Itinerary SPD yang Ada"]
    CheckExistingSPD -- Tidak --> InsertChildSPD["Buat Dokumen Baru SPD Terhubung ke suratTugasId"]

    UpdateChildSPD --> CheckMoreASN{"Masih Ada ASN Berikutnya?"}
    InsertChildSPD --> CheckMoreASN

    CheckMoreASN -- Ya --> IteratePegawai
    CheckMoreASN -- Tidak --> ReturnUpdatedList["Kembalikan Data Surat Tugas dengan Daftar SPD"]
    ReturnUpdatedList --> RefreshUI["Perbarui Tampilan Kartu SPD & Link PDF"]
    RefreshUI --> EndGen((( )))
```

---

## 5. Activity Diagram 4: Official Document Vector PDF Compilation & Duplex Layout

This activity map describes how `SpdPdfService` assembles the front 10-point travel order table and reverse visum transit table:

```mermaid
flowchart TD
    StartPDF(( )) --> ReqPDF["Request Unduh / Cetak PDF (/api/spd/:id/pdf)"]
    ReqPDF --> LoadEntities["Query Data SPD, Pegawai, Surat Tugas & Kop"]
    LoadEntities --> ResolveKop["Cari Berkas Kop Surat pada File Storage (uploads/)"]
    ResolveKop --> LoadBuffer["PDFDocument.load Buffer Berkas Kop"]
    LoadBuffer --> EmbedTypography["Embed Standard Fonts: Times-Roman & Times-Roman-Bold"]

    EmbedTypography --> DrawTopHeader["Gambar Metadata Kanan Atas & Judul Dokumen"]
    DrawTopHeader --> InitGrid["Inisialisasi Tabel 10-Poin Standar Margin 36pt"]
    InitGrid --> LoopRows["Iterasi dan Gambar Baris 1 s/d 10"]

    LoopRows --> CheckPoint7{"Tanggal Berangkat Diisi?"}
    CheckPoint7 -- Ya --> RenderDates["Render Durasi, Tanggal Berangkat & Kembali"]
    CheckPoint7 -- Tidak --> LeavePoint7Blank["Biarkan Kolom Poin 7 Bersih dan Kosong"]

    RenderDates --> CheckSignSpace{"Sisa Ruang Halaman Cukup untuk Tanda Tangan?"}
    LeavePoint7Blank --> CheckSignSpace

    CheckSignSpace -- Cukup --> DrawSign["Gambar Blok Tanda Tangan Pejabat Pengesah"]
    CheckSignSpace -- Kurang --> AddOverflowPage["Tambah Halaman Baru dengan Running Header - 2 -"]
    AddOverflowPage --> DrawSign

    DrawSign --> AppendVisumPage["Tambah Halaman Belakang: Tabel Visum Dinas 8 Baris"]
    AppendVisumPage --> DrawVisumDividers["Gambar Sumbu Pembagi Tengah Vertikal pada X = 306pt"]
    DrawVisumDividers --> DrawVisumSign["Gambar Tanda Tangan KPA/PA Lembar Belakang"]

    DrawVisumSign --> SaveBytes["pdfDoc.save() ke Uint8Array Buffer"]
    SaveBytes --> StreamResponse["Kirim HTTP Stream application/pdf (Inline Disposition)"]
    StreamResponse --> DisplayViewer["Tampilkan Pratinjau PDF pada Browser"]
    DisplayViewer --> EndPDF((( )))
```

---

## 6. Activity Diagram 5: Laporan Perjalanan Dinas Lifecycle & Reporting

This process controls narrative accountability reporting submitted after official travel:

```mermaid
flowchart TD
    StartLap(( )) --> SelectSPD["Pilih SPD dari Daftar Dokumen"]
    SelectSPD --> CheckEligibility{"Status DISETUJUI & Durasi > 0?"}

    CheckEligibility -- Tidak --> LockAction["Nonaktifkan Form & Tampilkan Alasan Pemblokiran"]
    LockAction --> SelectSPD

    CheckEligibility -- Ya --> AutoResolvePejabat["Auto-Resolve Pejabat Tujuan: PA ke Kabag, KPA ke Sekda"]
    AutoResolvePejabat --> InputNarrative["Tulis Uraian Narasi Hasil Perjalanan Dinas"]
    InputNarrative --> ClickPrint["Klik Tombol Cetak / Unduh Laporan PDF"]

    ClickPrint --> UpsertDB["Upsert Data ke Tabel LaporanPerjalanan (onDelete: Cascade)"]
    UpsertDB --> CreateLegalCanvas["Buat Dokumen PDF Ukuran Legal (612 x 1008 pt)"]
    CreateLegalCanvas --> DrawLapHeader["Gambar Judul LAPORAN PERJALANAN DINAS & Kepada Yth"]
    DrawLapHeader --> DrawPoints13["Gambar Poin 1-3: Dasar, Maksud & Lama Perjalanan"]

    DrawPoints13 --> ParseParagraphs["Pecah Teks Hasil Perjalanan Menjadi Paragraf"]
    ParseParagraphs --> WrapJustified["Bungkus Teks Rata Kiri-Kanan (Justified, Width 417pt)"]
    WrapJustified --> CheckPageOverflow{"Teks Melebihi Batas Bawah Margin?"}

    CheckPageOverflow -- Ya --> AddReportPage["Tambah Halaman Legal Baru"]
    AddReportPage --> DrawClosingStatement["Gambar Kalimat Penutup Laporan"]
    CheckPageOverflow -- Tidak --> DrawClosingStatement

    DrawClosingStatement --> CheckSignSpace{"Ruang Cukup untuk Blok TTD (Tinggi 110pt)?"}
    CheckSignSpace -- Kurang --> AddSignPage["Tambah Halaman Baru untuk TTD"]
    AddSignPage --> DrawTravelerSign["Gambar TTD: YANG MELAKUKAN PERJALANAN DINAS"]
    CheckSignSpace -- Cukup --> DrawTravelerSign

    DrawTravelerSign --> StreamReportPDF["Kirim Stream PDF Laporan_SPD_[Nomor].pdf"]
    StreamReportPDF --> OpenPrintDialog["Buka Dialog Cetak Otomatis pada Browser"]
    OpenPrintDialog --> EndLap((( )))
```

---

## 7. Decision Guard Logic Matrix

| Decision Node | Evaluation Criteria | True Branch Flow | False / Alternate Branch Flow |
|---|---|---|---|
| **`DecAuth`** | `user != null && timingSafeEqual(hash)` | Proceed to administrative workspace. | Return HTTP 401 & display error. |
| **`DecConfirmSPD`** | User clicks confirm in parameter dialog. | Invoke server SPD generation. | Abort modal; no records created. |
| **`DecKpaMode`** | `pemberiPerintah.includes('Kuasa')` | Prepend `KPA` prefix; bind Kabag Umum. | Standard sequence; bind Sekda. |
| **`DecApprove`** | PA/KPA verifies trip budget & itinerary. | Transition document to `DISETUJUI`. | Mark as `DRAFT` for correction or `BATAL`. |
| **`CheckEligibility`** | `status === 'DISETUJUI' && lamaHari > 0` | Open narrative report authoring editor. | Disable actions with warning pill. |
| **`CheckSignSpace`** | Remaining vertical space $\ge 110\text{ pt}$ | Render signature block on current page. | Append new page with running header. |

---

## 8. Visual Diagram File

The native Draw.io XML diagram matching this layout is stored at:
- **File Path:** [`docs/activity-diagram.drawio`](activity-diagram.drawio)
- **Format:** Native Draw.io XML structured with 3 vertical cross-functional swimlanes (`Pengguna / Staff`, `Sistem SI-SPD`, `Pejabat Penandatangan`), start/end nodes, decision diamonds, and sequential activity flows importable into [app.diagrams.net](https://app.diagrams.net).
