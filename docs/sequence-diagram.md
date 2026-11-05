# Sequence Diagram Specification: SI-SPD Banggai Laut

This document specifies the dynamic runtime behavior, object interactions, message sequencing, and database persistence flows across the Sistem Informasi Surat Perjalanan Dinas (SI-SPD) platform. The visual Draw.io diagram file is available at [`docs/sequence-diagram.drawio`](class-diagram.drawio).

---

## 1. Architectural Interaction Model

The runtime sequence flows operate across five distinct execution tiers:
1. **User / Actor Tier:** Interactive input from civil servants (*Pegawai*), administrative operators (*Staff*), or certifying authorities (*Pejabat PA / KPA*).
2. **Frontend Client Interface Tier (`apps/web`):** Vue 3 reactive views, forms, and dialog modals communicating via `apiFetch`.
3. **API Controller & Security Tier (`apps/api`):** NestJS REST Controllers protected by `AuthGuard` and role metadata (`@Roles`).
4. **Domain Service & Logic Tier (`apps/api`):** Injectable services orchestrating business validations, numbering rules, and vector PDF rendering (`SpdPdfService`, `SuratTugasPdfService`).
5. **Persistence Tier (`apps/api/prisma`):** SQLite relational storage accessed through `PrismaService`.

---

## 2. Sequence Diagram 1: Authentication & Sesi Verification (Login Flow)

This sequence models user authentication, password verification using timing-safe Scrypt hashing, and session initialization via JWT:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Pegawai
    participant View as LoginView (apps/web)
    participant Ctrl as AuthController (apps/api)
    participant Svc as AuthService
    participant Crypto as CryptoUtil
    participant DB as SQLite (via Prisma)

    User->>View: Input Username/NIP and Password
    activate View
    View->>Ctrl: POST /api/auth/login { username, password }
    activate Ctrl
    Ctrl->>Svc: login(dto)
    activate Svc
    Svc->>DB: prisma.user.findFirst(query)
    activate DB
    DB-->>Svc: User Record (with hashed password)
    deactivate DB
    alt User Record Not Found
        Svc-->>Ctrl: Throw UnauthorizedException("Akun tidak ditemukan")
        Ctrl-->>View: HTTP 401 Unauthorized
        View-->>User: Display notification "Akun tidak terdaftar"
    else User Exists
        Svc->>Crypto: verifyPassword(inputPassword, storedHash)
        activate Crypto
        Crypto->>Crypto: scryptSync & timingSafeEqual
        Crypto-->>Svc: Boolean match result
        deactivate Crypto
        alt Password Mismatch
            Svc-->>Ctrl: Throw UnauthorizedException("Kata sandi salah")
            Ctrl-->>View: HTTP 401 Unauthorized
            View-->>User: Display notification "Kata sandi salah"
        else Password Valid
            Svc->>Crypto: signJwt(payload, 86400)
            activate Crypto
            Crypto-->>Svc: JWT Bearer Token String
            deactivate Crypto
            Svc-->>Ctrl: AuthResponseDto { accessToken, user }
            Ctrl-->>View: HTTP 200 OK { accessToken, user }
            deactivate Svc
            deactivate Ctrl
            View->>View: localStorage.setItem("auth_token", token)
            View-->>User: Navigate to Dashboard ("/")
            deactivate View
        end
    end
```

---

## 3. Sequence Diagram 2: Surat Tugas Creation & Sequential Numbering

This sequence details the generation of an official duty assignment order authorizing travel for one or multiple civil servants:

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Operator / Staff
    participant View as BuatSuratTugasView (apps/web)
    participant Ctrl as SuratTugasController (apps/api)
    participant Svc as SuratTugasService
    participant DB as SQLite (via Prisma)

    Staff->>View: Select multi-ASN assignees, agenda, and Dasar Hukum
    activate View
    View->>Ctrl: POST /api/surat-tugas (CreateSuratTugasDto)
    activate Ctrl
    Ctrl->>Svc: create(dto)
    activate Svc
    Svc->>DB: Query latest sequence number for year
    activate DB
    DB-->>Svc: Last sequence (e.g. 012)
    deactivate DB
    Svc->>Svc: Auto-generate nomorSurat "000.1.2.3/013/SETDA/2026"
    Svc->>DB: Verify existence of assigned pegawaiIds
    activate DB
    DB-->>Svc: Validated Pegawai entities
    deactivate DB
    Svc->>DB: prisma.suratTugas.create(data, status: "DRAFT")
    activate DB
    DB-->>Svc: Created SuratTugas entity
    deactivate DB
    Svc-->>Ctrl: Created SuratTugas entity
    deactivate Svc
    Ctrl-->>View: HTTP 201 Created
    deactivate Ctrl
    View->>View: Display success notification toast
    View-->>Staff: Route to Detail Print View (/surat-tugas/:id)
    deactivate View
```

---

## 4. Sequence Diagram 3: On-Demand Child SPD Generation & Synchronization

This sequence shows how child SPDs are issued on demand directly from a parent Surat Tugas, with automatic KPA prefixing and itinerary synchronization:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator / Staff
    participant View as SuratTugasDetailPrintView (apps/web)
    participant Modal as GenerateSpdDialog
    participant Ctrl as SuratTugasController (apps/api)
    participant STSvc as SuratTugasService
    participant SPDSvc as SpdService
    participant DB as SQLite (via Prisma)

    Admin->>View: Click "Terbitkan / Ubah SPD"
    activate View
    View->>Modal: Open parameter modal
    activate Modal
    Admin->>Modal: Configure authority mode (PA/KPA), transport, duration, dates
    Modal->>Ctrl: POST /api/surat-tugas/:id/generate-spd (dto)
    activate Ctrl
    Ctrl->>STSvc: generateSpd(id, dto)
    activate STSvc
    STSvc->>DB: Query parent SuratTugas with assigned pegawaiIds
    activate DB
    DB-->>STSvc: SuratTugas with parsed employee IDs
    deactivate DB
    loop For each assigned employee ID
        alt SPD already exists for employee
            STSvc->>DB: prisma.spd.update(itinerary parameters)
        else SPD does not exist
            STSvc->>SPDSvc: create(childSpdDto)
            activate SPDSvc
            SPDSvc->>SPDSvc: Enforce KPA prefix if KPA mode (e.g. "KPA001/SPD/SETDA/2026")
            SPDSvc->>DB: prisma.spd.create(linked to suratTugasId)
            activate DB
            DB-->>SPDSvc: Created child Spd entity
            deactivate DB
            SPDSvc-->>STSvc: Child Spd entity
            deactivate SPDSvc
        end
    end
    STSvc-->>Ctrl: Updated SuratTugas with spdList
    deactivate STSvc
    Ctrl-->>Modal: HTTP 200 OK
    deactivate Ctrl
    Modal-->>View: Close modal & refresh document state
    deactivate Modal
    View-->>Admin: Display issued child SPD cards and direct download buttons
    deactivate View
```

---

## 5. Sequence Diagram 4: Official Document Vector PDF Generation (Duplex Layout)

This sequence details the generation and HTTP streaming of an official 2-page duplex PDF document:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Pegawai
    participant View as SpdDetailPrintView (apps/web)
    participant Ctrl as SpdController (apps/api)
    participant PDFSvc as SpdPdfService
    participant FS as Local Filesystem (uploads/)
    participant DB as SQLite (via Prisma)

    User->>View: Click "Unduh Berkas PDF Resmi"
    activate View
    View->>Ctrl: GET /api/spd/:id/pdf?fontFamily=TimesRoman
    activate Ctrl
    Ctrl->>PDFSvc: generatePdf(id, signer, fontFamily)
    activate PDFSvc
    PDFSvc->>DB: prisma.spd.findUnique(include: pegawai, suratTugas, kopSurat)
    activate DB
    DB-->>PDFSvc: Full SPD entity with relations
    deactivate DB
    PDFSvc->>FS: Read Kop Surat PDF buffer from disk
    activate FS
    FS-->>PDFSvc: Binary PDF buffer
    deactivate FS
    PDFSvc->>PDFSvc: PDFDocument.load(kopBuffer) & embed TimesRoman fonts
    PDFSvc->>PDFSvc: Render Page 1 (Front): Centered title, 10-point table, signature block
    PDFSvc->>PDFSvc: Render Page 2 (Back): Tabel Visum Perjalanan Dinas with 36pt margins
    PDFSvc->>PDFSvc: pdfDoc.save() into Uint8Array buffer
    PDFSvc-->>Ctrl: { buffer, fileName: "SPD_001_SPD_2026.pdf" }
    deactivate PDFSvc
    Ctrl-->>View: HTTP 200 application/pdf stream (Content-Disposition: inline)
    deactivate Ctrl
    View-->>User: Open PDF stream in browser print viewer
    deactivate View
```

---

## 6. Sequence Diagram 5: Laporan Perjalanan Dinas Lifecycle & PDF Rendering

This sequence details the end-to-end authoring, database persistence, and vector PDF compilation of the official post-travel narrative report:

```mermaid
sequenceDiagram
    autonumber
    actor ASN as Traveling Civil Servant (ASN)
    participant View as BuatLaporanView / Modal (apps/web)
    participant Ctrl as SpdController (apps/api)
    participant Svc as SpdService
    participant PDFSvc as SpdPdfService
    participant DB as SQLite (via Prisma)

    ASN->>View: Select approved SPD (status: DISETUJUI, lamaHari > 0)
    activate View
    View->>View: Auto-resolve recipient (PA -> Kabag Umum, KPA -> Sekda)
    ASN->>View: Enter narrative text (Hasil Perjalanan) & click "Cetak Laporan"
    View->>Ctrl: POST /api/spd/:id/laporan-pdf { hasilPerjalanan, penandatangan }
    activate Ctrl
    Ctrl->>Svc: saveLaporan(id, dto)
    activate Svc
    Svc->>DB: prisma.laporanPerjalanan.upsert(data, spdId: id)
    activate DB
    DB-->>Svc: Persisted LaporanPerjalanan record
    deactivate DB
    Svc-->>Ctrl: Persisted entity
    deactivate Svc
    Ctrl->>PDFSvc: generateLaporanPdf(id, dto)
    activate PDFSvc
    PDFSvc->>DB: Query SPD with Pegawai & SuratTugas
    activate DB
    DB-->>PDFSvc: Populated SPD entity
    deactivate DB
    PDFSvc->>PDFSvc: Initialize Legal canvas (612 x 1008 pt)
    PDFSvc->>PDFSvc: Draw header, date, recipient, and points 1-3 (Dasar, Maksud, Lama)
    PDFSvc->>PDFSvc: Draw multi-paragraph narrative with justified wrapping & dynamic page breaks
    PDFSvc->>PDFSvc: Draw single traveler signature block (YANG MELAKUKAN PERJALANAN DINAS)
    PDFSvc->>PDFSvc: pdfDoc.save() into binary buffer
    PDFSvc-->>Ctrl: { buffer, fileName: "Laporan_SPD_001_SPD_2026.pdf" }
    deactivate PDFSvc
    Ctrl-->>View: HTTP 200 application/pdf stream
    deactivate Ctrl
    View-->>ASN: Trigger native browser print preview
    deactivate View
```

---

## 7. Participant Implementation Traceability

| Sequence Participant | Monorepo Source Implementation | Key Responsibilities |
|---|---|---|
| `LoginView` | `apps/web/src/views/LoginView.vue` | Credentials capture, form validation, and session token storage. |
| `BuatSuratTugasView` | `apps/web/src/views/BuatSuratTugasView.vue` | Multi-assignee selection, agenda drafting, and form dispatch. |
| `SuratTugasDetailPrintView` | `apps/web/src/views/SuratTugasDetailPrintView.vue` | Assignment preview, on-demand SPD generation modal, and child list rendering. |
| `SpdDetailPrintView` | `apps/web/src/views/SpdDetailPrintView.vue` | Continuous multi-page display and official PDF stream invocation. |
| `BuatLaporanView` | `apps/web/src/views/BuatLaporanView.vue` | Precondition validation, narrative report authoring, and PDF trigger. |
| `AuthController` | `apps/api/src/auth/auth.controller.ts` | Endpoint routing for `/api/auth/login` and `/api/auth/me`. |
| `SuratTugasController`| `apps/api/src/surat-tugas/surat-tugas.controller.ts` | CRUD routing, on-demand child generation, and bulk deletions. |
| `SpdController` | `apps/api/src/spd/spd.controller.ts` | SPD endpoints, report persistence, and PDF streaming. |
| `AuthService` | `apps/api/src/auth/auth.service.ts` | Alias resolution, password verification, and JWT generation. |
| `SuratTugasService` | `apps/api/src/surat-tugas/surat-tugas.service.ts` | Sequence number resolution and child SPD synchronization. |
| `SpdService` | `apps/api/src/spd/spd.service.ts` | KPA prefix enforcement, date derivation, and report upsertion. |
| `SpdPdfService` | `apps/api/src/spd/spd-pdf.service.ts` | Vector drawing algorithms, visum verification grid, and Legal report rendering. |
| `CryptoUtil` | `apps/api/src/auth/crypto.util.ts` | Salted Scrypt hashing, constant-time verification, and HMAC signing. |
| `PrismaService` | `apps/api/src/prisma/prisma.service.ts` | Database connection pooling, ORM client lifecycle, and query execution. |

---

## 8. Visual Diagram File

The native Draw.io XML diagram matching this layout is stored at:
- **File Path:** [`docs/sequence-diagram.drawio`](sequence-diagram.drawio)
- **Format:** Native Draw.io XML with dark blue participant headers, lifelines, activation blocks, and numbered message sequences importable into [app.diagrams.net](https://app.diagrams.net).
