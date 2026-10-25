# Sistem Informasi Surat Perjalanan Dinas (SI-SPD)

Sistem Informasi Surat Perjalanan Dinas (SI-SPD) serves the Regional Secretariat of Banggai Laut Regency (Sulawesi Tengah). It automates the preparation, verification, issuance, and PDF rendering of official travel documents (Surat Perjalanan Dinas) and assignment orders (Surat Tugas).

---

## 1. System Architecture and Stack

- **Monorepo Manager:** Turborepo + pnpm workspaces
- **Backend Service (`apps/api`):** NestJS, Prisma ORM, SQLite, pdf-lib
- **Frontend Client (`apps/web`):** Vue 3 (Composition API), Vite, PrimeVue 4, Tailwind CSS 3
- **Shared Types Package (`packages/shared-types`):** TypeScript interfaces, DTOs, Enums, Zod validation schemas
- **Storage Subsystem:** Local filesystem storage for official letterhead templates (`uploads/kop-surat`)

---

## 2. Directory Layout

```text
.
├── .env                 # Primary centralized environment configuration
├── .env.example         # Template environment configuration
├── apps/
│   ├── api/             # NestJS REST API and PDF generation engine
│   └── web/             # Vue 3 Single Page Application
├── docs/                # Technical developer documentation
│   ├── README.md        # Technical project guide
│   ├── DEVELOPER_DOCUMENTATION.md # Comprehensive developer guide
│   ├── table-structure.md         # Database schema and ERD
│   ├── ui-ux-standards.md         # Design system tokens and print layout
│   ├── pdf-generation.md          # Vector drawing algorithms and coordinates
│   └── application-flow.md        # Workflows, auth lifecycle, and state machine
├── packages/
│   └── shared-types/    # Shared DTOs, Zod schemas, and RBAC roles
└── package.json         # Workspace root definitions and scripts
```

---

## 3. Environment Prerequisites

- **Node.js:** `>= 20.12.0` (LTS 22 or 24 recommended)
- **Package Manager:** `pnpm >= 9.0.0`
- **Version Control:** Git

---

## 4. Installation and Setup Procedure

### 4.1 Clone Repository
```bash
git clone <REPOSITORY_URL>
cd e-spd
```

### 4.2 Install Monorepo Dependencies
```bash
pnpm install
```

### 4.3 Configure Environment Variables
Copy the template configuration to the workspace root:
```bash
cp .env.example .env
```

Ensure `.env` contains valid values:
```env
DATABASE_URL="file:./dev.db"
PORT=3000
JWT_SECRET="si-spd-banggai-laut-local-development-secret-key-32chars"
```
*(In production environments, generate a 32+ character secret using `openssl rand -hex 32`)*.

### 4.4 Initialize Database and Master Data

Run Prisma Client generation, database schema migration, and initial database seeding:
```bash
# 1. Generate Prisma Client
pnpm --filter @si-setda/api prisma:generate

# 2. Apply SQLite database migrations
pnpm --filter @si-setda/api prisma:migrate

# 3. Seed default ASN, Administrative Accounts, and Letterhead templates
pnpm --filter @si-setda/api prisma:seed
```

---

## 5. Default Credentials

The database seeder provisions initial user accounts:

| Role | Username / NIP | Password | Associated Employee |
|---|---|---|---|
| **SUPER_ADMIN** | `admin` | `admin123` | Fadli A. Arsad (Sekda Kab. Banggai Laut) |
| **ADMIN** | `operator` | `admin123` | Operational Staff |

---

## 6. Execution Commands

### 6.1 Development Mode
Run both backend and frontend applications concurrently via Turborepo:
```bash
pnpm dev
```
- **Frontend SPA:** `http://localhost:5173`
- **Backend API:** `http://localhost:3000/api`

*(Vite reverse-proxies `/api` requests to port 3000 automatically).*

### 6.2 Production Compilation and Execution
```bash
# Compile shared-types, backend, and frontend
pnpm build

# Start backend service
pnpm --filter @si-setda/api start:prod

# Preview production frontend build
pnpm --filter @si-setda/web preview
```

### 6.3 Maintenance Commands
| Command | Action |
|---|---|
| `pnpm dev` | Run all workspace applications concurrently |
| `pnpm build` | Compile all monorepo packages |
| `pnpm --filter @si-setda/api prisma:seed` | Re-seed master records |
| `npx prisma studio --schema apps/api/prisma/schema.prisma` | Open Prisma Studio database browser |

---

## 7. Developer Documentation Index

For comprehensive technical documentation, refer to the documents in `docs/`:
- **[Comprehensive Developer Documentation](DEVELOPER_DOCUMENTATION.md):** Consolidated technical specification.
- **[Database Schema & Table Structure](table-structure.md):** Entity specifications, column constraints, and Mermaid ERD.
- **[UI/UX Standards & Design System](ui-ux-standards.md):** Design tokens, theme presets, component standards, and print CSS.
- **[PDF Generation Mechanics](pdf-generation.md):** Coordinate math, text justification, hanging indent, and vector drawing pipeline.
- **[Application Workflow & System Architecture](application-flow.md):** Authentication lifecycles, on-demand SPD generation, and state transitions.
