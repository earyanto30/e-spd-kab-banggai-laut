# Application Flow and System Architecture

This document describes the runtime execution flows, authentication lifecycles, document state transitions, and business processes in the SI-SPD platform.

---

## 1. System Architecture Topology

The application is structured as a monorepo managed by Turborepo and pnpm workspaces:

```mermaid
flowchart TD
    Browser["Single Page Application Vue 3 / Vite"]
    ReverseProxy["Nginx / Vite Proxy :5173"]
    BackendAPI["NestJS HTTP Server :3000"]
    Prisma["Prisma ORM Engine"]
    Database[("SQLite Database dev.db")]
    FileStore["Filesystem Storage /uploads"]

    Browser <-->|"HTTP / WebSocket"| ReverseProxy
    ReverseProxy <-->|"Proxy Pass /api"| BackendAPI
    BackendAPI <-->|"SQL Queries"| Prisma
    Prisma <-->|"File I/O"| Database
    BackendAPI <-->|"File Read / Write"| FileStore
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

### 2.2 Backend Guards and Role Hierarchy
- `AuthGuard` (`apps/api/src/auth/auth.guard.ts`): Parses the Authorization Bearer header, validates JWT integrity via HMAC-SHA256, sets `req.user`, and verifies role permissions against `@Roles(...)` metadata.
- **RBAC Roles:**
  1. `SUPER_ADMIN` (Weight: 4): Full administrative and system management privileges.
  2. `ADMIN` (Weight: 3): User management, master data, and document operations.
  3. `STAFF` (Weight: 2): Operational data entry, drafting, and document updates.
  4. `USER` (Weight: 1): Standard read-only access for assigned personnel.

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
- `DISETUJUI`: Document has been formally approved and issued. In this state, official signatory titles render according to institutional governance rules.
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
    participant DB as "SQLite (via Prisma)"

    Staff->>Form: Fill Form Inputs (Lama Hari and Tanggal Optional)
    Staff->>Form: Submit Form
    Form->>API: POST /api/spd (CreateSpdDto)
    API->>Svc: create(dto)
    Svc->>DB: Verify Pegawai exists
    Svc->>Svc: Determine Prefix (KPA for Kuasa Pengguna Anggaran)
    Svc->>Svc: Auto-generate nomorSpd ([Prefix][Seq]/SPD/YYYY)
    opt tanggalBerangkat and lamaHari are provided
        Svc->>Svc: Compute tanggalKembali = tanggalBerangkat + (lamaHari - 1)
    end
    Svc->>DB: Insert Spd record (status: DRAFT)
    DB-->>Svc: Created Spd
    Svc-->>API: Created Spd
    API-->>Form: HTTP 201 Created
    Form->>Form: Display Success Toast with Issued Number
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
    participant DB as "SQLite (via Prisma)"

    Admin->>STForm: Enter Purpose, Optional Maksud Header & Select Multiple ASN
    STForm->>API: POST /api/surat-tugas
    API->>STSvc: create(dto)
    STSvc->>DB: Insert SuratTugas (without creating child SPDs)
    DB-->>STForm: Return Created SuratTugas
    STForm->>STView: Navigate to Preview (/surat-tugas/cetak/:id)
    Admin->>STView: Click "Terbitkan / Ubah SPD"
    STView->>Modal: Open Parameter Dialog
    Admin->>Modal: Configure Mode, Unit Prefix, Duration, Dates (Optional)
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
1. If `dalamRangka`, `tempatDikeluarkan`, `kopSuratId`, or signatory information are modified, the service updates all active child SPD records linked to that `suratTugasId`.
2. If new personnel are added to `pegawaiIds` of a Surat Tugas that has active child SPDs, the system generates SPD records for the newly added personnel.
3. If personnel are removed from `pegawaiIds`, the corresponding child SPD records are pruned.

### 4.4 Process 4: Dashboard Analytics & Statistics (`DashboardModule`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated User
    participant Home as HomeView.vue
    participant Ctrl as DashboardController
    participant Svc as DashboardService
    participant DB as Prisma / SQLite

    User->>Home: Navigate to Beranda / Dashboard
    Home->>Ctrl: GET /api/dashboard/stats
    Ctrl->>Svc: getStats()
    par Query Metrics
        Svc->>DB: Count total and active SPDs
        Svc->>DB: Count Surat Tugas & registered ASN
        Svc->>DB: Aggregate month-over-month differences
        Svc->>DB: Aggregate 6-month destination trends (Dalam vs Luar Daerah)
        Svc->>DB: Aggregate transportation mode counts
        Svc->>DB: Query Top 5 Destinations & Recent 5 SPDs
    end
    Svc-->>Ctrl: Formatted DashboardStats payload
    Ctrl-->>Home: HTTP 200 JSON
    Home->>Home: Render KPI Cards and Chart.js Visualizations
```

- **KPI Cards:** Total SPD, Active SPD, Pelaksana ASN, and Total Surat Tugas. Budget metrics are excluded.
- **Geographic Classification:** Travel destinations containing local terms (*Banggai, Banggai Laut, Bokan, Labobo, Bangkurung*) are grouped as *Dalam Wilayah*; all others are grouped as *Luar Daerah*.
- **Transportation Breakdown:** Aggregates records into Pesawat Udara, Kapal Laut / Feri, Speedboat Pemda, and Kendaraan Darat.

### 4.5 Process 5: Non-Collate Batch Printing Pipeline
1. In `DaftarSpdView.vue`, the user selects multiple documents using row checkboxes.
2. The user selects **Cetak Terpilih (Batch Non-Collate)**.
3. The frontend requests `POST /api/spd/bulk/pdf` with payload `{ ids: string[], sequence: 'non-collate' }`.
4. `SpdPdfService.generateBulkPdf`:
   - Loads all target documents into memory.
   - Appends all Front Sheets (Page 1 of Document 1..N) sequentially.
   - Appends all Back Sheets (Page 2 of Document 1..N) sequentially.
5. The unified PDF stream returns to the browser for duplex printing.

### 4.6 Process 6: Client-Side Tabular Data Export (CSV)
1. User clicks "Ekspor CSV" on `DaftarSpdView.vue` or `DaftarSuratTugasView.vue`.
2. Filtered data set is collected from reactive table state.
3. Fields are converted to RFC 4180-compliant comma-separated rows.
4. Output is encoded with UTF-8 BOM (`\uFEFF`) to prevent character distortion in spreadsheet software.
5. Automated anchor element triggers download as `Rekap_SPD_Banggai_Laut_[YYYY-MM-DD].csv`.
