# Antigravity CLI Context Directive
# Project: SI Surat Perjalanan Dinas Sekda Kab. Banggai Laut (SI-SPD)

## Core Architecture Constraints
Do not deviate from the following technological stack. Any suggestions for alternative frameworks or libraries will be rejected as SUBOPTIMAL.

* **Monorepo Engine:** pnpm workspaces + Turborepo
* **Frontend:** Vue 3 (Composition API, Vite)
* **Frontend UI Kit:** PrimeVue (Tailwind CSS integration)
* **Backend:** NestJS (TypeScript)
* **Database:** SQLite
* **ORM:** Prisma
* **PDF Generation Engine:** Puppeteer (HTML-to-PDF via NestJS backend)
* **Shared Logic:** TypeScript interfaces and Zod validation schemas

## Operational Directives for CLI Agent
1. **Frontend:** When generating frontend components, exclusively use Vue 3 Composition API (`<script setup>`) and PrimeVue components. Do not use React or Shadcn UI.
2. **Backend:** When generating backend endpoints, exclusively use NestJS controllers, services, and modules. 
3. **Database:** Database schemas and migrations must be defined exclusively in `apps/api/prisma/schema.prisma`.
4. **Security:** Enforce Role-Based Access Control (RBAC) across both frontend routing and backend guards using shared definitions from `packages/shared-types`.
5. **PDF Generation:** All dynamic document generation (e.g., Surat Perjalanan Dinas / SPPD) must be executed exclusively on the NestJS backend using **Puppeteer** with HTML/CSS templates. Client-side PDF generation libraries are forbidden. Document previews must be implemented via inline binary streams (`Content-Disposition: inline`).

## Design Standardization & UI Constraints
You are strictly forbidden from making creative design decisions. You must adhere to the following UI constraints:

1. **No Arbitrary CSS:** You must NEVER use Tailwind's arbitrary value syntax (e.g., `w-[10px]`, `bg-[#123456]`). Only use predefined semantic classes from `tailwind.config.js`.
2. **No Inline Styles:** NEVER use the `style` attribute on HTML or Vue components.
3. **Component Consumption Only:** Do not inject Tailwind utility classes into PrimeVue components to alter their core appearance. Rely on the global PrimeVue preset.
4. **Wrapper Precedence:** If a custom wrapper component exists in `apps/web/src/components/core/` (e.g., `GovButton`, `GovTable`), you MUST use it instead of the base PrimeVue equivalent.

## Data Model & Relational Architecture Directive
* **Surat Tugas (Parent Entity) -> Surat Perjalanan Dinas (Child / Pivot Entity):**
  - Architecture represents a **one-to-many (1:N)** relationship where `SuratTugas` acts as the primary parent entity that issues multiple `Spd` (Surat Perjalanan Dinas).
  - The travel document (`Spd`) functions as a child entity in the database schema, holding foreign keys that link the overarching assignment (`suratTugasId`) to exactly one specific ASN (`pegawaiId`).

