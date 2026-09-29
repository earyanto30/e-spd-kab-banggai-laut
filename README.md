# SI-SETDA (Sistem Informasi Sekretariat Daerah)

Government Administrative Application monorepo built with pnpm workspaces and Turborepo.

## Project Structure

```
.
├── apps/
│   ├── api/             # NestJS Backend (Prisma ORM + SQLite)
│   └── web/             # Vue 3 Frontend (Vite + PrimeVue + Tailwind CSS)
└── packages/
    └── shared-types/    # Shared DTOs, Zod schemas, and RBAC definitions
```

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Generate Prisma Client
```bash
pnpm --filter @si-setda/api prisma:generate
```

### 3. Run Development Servers
```bash
pnpm dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api
