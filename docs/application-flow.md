# Application Flow and System Architecture

This document describes the runtime execution flows, authentication lifecycles, document state transitions, and business processes in the SI-SPD platform.

---

## 1. System Architecture Topology

The application is structured as a monorepo managed by Turborepo and pnpm workspaces:

```mermaid
flowchart TD
    Browser[Single Page Application Vue 3 / Vite]
    ReverseProxy[Nginx / Vite Proxy :5173]
    BackendAPI[NestJS HTTP Server :3000]
    Prisma[Prisma ORM Engine]
    Database[(SQLite Database dev.db)]
    FileStore[Filesystem Storage /uploads]

    Browser <-->|HTTP / WebSocket| ReverseProxy
    ReverseProxy <-->|Proxy Pass /api| BackendAPI
    BackendAPI <-->|SQL Queries| Prisma
    Prisma <-->|File I/O| Database
    BackendAPI <-->|File Read / Write| FileStore
```

---

## 2. Authentication and Authorization Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as User Browser
    participant WebRouter as Vue Router Guard
    participant API as NestJS AuthController
    participant Svc as AuthService
    participant Crypto as crypto.util.ts
    participant DB as SQLite Database

    Client->>API: POST /api/auth/login { username, password }
    API->>Svc: validateUser(username, password)
    Svc->>DB: Query User where username or NIP match
    DB-->>Svc: User Record
    Svc->>Crypto: verifyPassword(password, storedHash)
    Crypto-->>Svc: true (timingSafeEqual)
    Svc->>Crypto: signJwt(payload, 86400)
    Crypto-->>Svc: Token String
    Svc-->>API: { accessToken, user }
    API-->>Client: HTTP 200 { accessToken, user }
    Client->>Client: Save token to localStorage (auth_token)
    Client->>WebRouter: Navigate to Route
    WebRouter->>WebRouter: Evaluate requiresAuth & hasRequiredRole(role)
    WebRouter-->>Client: Render Route View
```

### 2.1 Request Header Injection (`apiFetch`)
All client network requests route through `apps/web/src/utils/api.ts`:
1. Injects `x-app-client: si-spd-web` application signature.
2. Injects `Authorization: Bearer <token>` from `localStorage`.
3. Intercepts HTTP 401 Unauthorized responses to purge session storage and route to `/login`.

### 2.2 Backend Guards
- `AuthGuard` (`apps/api/src/auth/auth.guard.ts`): Parses the Authorization Bearer header, validates JWT integrity via HMAC-SHA256, checks expiration, and sets `req.user`.
- `RolesGuard` (`apps/api/src/auth/roles.guard.ts`): Reads `@Roles(...)` metadata and verifies user role authorization against the defined permissions list.

---

## 3. Document Lifecycles

### 3.1 State Transition Diagram

Both Surat Tugas and SPD share the following state machine:

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Record Created (Buat Form)
    DRAFT --> DISETUJUI : PA / KPA Signs Document
    DISETUJUI --> SELESAI : Duty Completed
    DRAFT --> BATAL : Rejected / Cancelled
    DISETUJUI --> BATAL : Revoked by Admin
    SELESAI --> [*]
    BATAL --> [*]
```

### 3.2 State Definitions
- `DRAFT`: Initial editable state. Document can be altered, removed, or reviewed.
- `DISETUJUI`: Document has been formally approved and signed. In this state, the PDF engine renders the signatory's transparent digital signature image.
- `SELESAI`: Assigned travel has occurred and reporting obligations are fulfilled.
- `BATAL`: Document was cancelled or revoked.

---

## 4. End-to-End Business Processes

### 4.1 Process 1: Standalone SPD Creation

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Operator / Staff
    participant Form as BuatSpdView.vue
    participant API as SpdController
    participant Svc as SpdService
    participant DB as SQLite (via Prisma)

    Staff->>Form: Fill 9 Required Inputs
    Staff->>Form: Submit Form
    Form->>API: POST /api/spd (CreateSpdDto)
    API->>Svc: create(dto)
    Svc->>DB: Check Pegawai exists
    Svc->>Svc: Auto-generate nomorSpd (00X/SPD/SETDA/YYYY)
    Svc->>Svc: Compute tanggalKembali = tanggalBerangkat + (lamaHari - 1)
    Svc->>DB: Insert Spd record (status: DRAFT)
    DB-->>Svc: Created Spd
    Svc-->>API: Created Spd
    API-->>Form: HTTP 201 Created
    Form->>Form: Display Success Toast with Issue Number
    Form->>Form: Offer Navigation to Preview & Print View
```

### 4.2 Process 2: Surat Tugas Creation and On-Demand SPD Generation

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant STForm as BuatSuratTugasView.vue
    participant STView as SuratTugasDetailPrintView.vue
    participant Modal as Generate SPD Dialog
    participant API as SuratTugasController
    participant STSvc as SuratTugasService
    participant SPDSvc as SpdService
    participant DB as SQLite (via Prisma)

    Admin->>STForm: Enter Assignment Scope and Select Multiple ASN
    STForm->>API: POST /api/surat-tugas
    API->>STSvc: create(dto)
    STSvc->>DB: Insert SuratTugas (without creating SPDs)
    DB-->>STForm: Return Created SuratTugas
    STForm->>STView: Navigate to Preview (/surat-tugas/cetak/:id)
    Admin->>STView: Click "Terbitkan / Ubah SPD"
    STView->>Modal: Open Parameter Dialog
    Admin->>Modal: Specify Transportation, Duration, Dates
    Admin->>Modal: Confirm
    Modal->>API: POST /api/surat-tugas/:id/generate-spd (dto)
    API->>STSvc: generateSpd(id, dto)
    loop For each assigned Pegawai ID
        alt SPD already exists
            STSvc->>DB: Update existing child SPD parameters
        else SPD does not exist
            STSvc->>SPDSvc: create(SpdDto)
            SPDSvc->>DB: Insert child Spd linked to suratTugasId
        end
    end
    STSvc-->>API: Updated SuratTugas with spdList
    API-->>STView: HTTP 200 OK
    STView->>STView: Display generated child SPD cards with direct PDF download links
```

### 4.3 Process 3: Parameter Synchronization on Surat Tugas Edit
When an existing Surat Tugas is updated via `PUT /api/surat-tugas/:id`:
1. If `dalamRangka`, `tempatTujuan`, `lamaHari`, `tanggalBerangkat`, or `alatAngkut` are modified, the service updates all active child SPD records linked to that `suratTugasId`.
2. If new personnel are added to `pegawaiIds` of a Surat Tugas that has active child SPDs, the system generates SPD records for the newly added personnel.
3. If personnel are removed from `pegawaiIds`, the corresponding child SPD records are pruned.

### 4.4 Process 4: Signatory-Based Row-Level Access (`PENANDATANGAN`)
When a user logs in with role `PENANDATANGAN`:
1. `SpdService.findAll` and `SuratTugasService.findAll` inject conditional query filters matching the user's `pegawaiId`, NIP digits, full name substrings, or position strings.
2. In `findById`, `verifySignerAccess` checks if the requesting signatory matches the document's assigned signatory. Unmatched requests throw an immediate `ForbiddenException` (HTTP 403).

### 4.5 Process 5: Client-Side Tabular Data Export (CSV)
1. User clicks "Ekspor CSV" on `DaftarSpdView.vue` or `DaftarSuratTugasView.vue`.
2. The current filtered data set is collected from reactive state.
3. Fields are converted to RFC 4180-compliant comma-separated rows.
4. Output is encoded with UTF-8 BOM (`\uFEFF`) to prevent character distortion in Microsoft Excel.
5. An anchor element triggers an instant download with format `Rekap_SPD_Banggai_Laut_[YYYY-MM-DD].csv`.
