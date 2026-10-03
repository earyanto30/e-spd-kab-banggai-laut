# SI-SPD Sekda Kab. Banggai Laut

Sistem Informasi Surat Perjalanan Dinas (SPD) di lingkungan Sekretariat Daerah Kabupaten Banggai Laut, Sulawesi Tengah.

---

## 🛠️ Tech Stack & Arsitektur

- **Monorepo Manager:** [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/)
- **Backend (`apps/api`):** [NestJS](https://nestjs.com/), [Prisma ORM](https://www.prisma.io/), SQLite (default dev)
- **Frontend (`apps/web`):** [Vue 3](https://vuejs.org/) (Composition API), [Vite](https://vite.dev/), [PrimeVue 4](https://primevue.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Shared Package (`packages/shared-types`):** TypeScript Interfaces, Enums & Zod Schemas

---

## 📁 Struktur Direktori

```text
.
├── .env                 # File environment utama (root)
├── .env.example         # Template konfigurasi environment
├── apps/
│   ├── api/             # Backend API (NestJS + Prisma)
│   └── web/             # Frontend Single Page App (Vue 3 + Vite)
├── packages/
│   └── shared-types/    # DTO, Role RBAC & Skema Zod bersama
└── package.json         # Workspace root scripts & dev dependencies
```

---

## 📋 Prasyarat Sistem

Pastikan environment Anda telah terinstal:
- **Node.js:** Versi `>= 20.12.0` (Direkomendasikan Node.js 22 LTS atau 24)
- **pnpm:** Versi `>= 9.0.0` (Direkomendasikan pnpm 10+)
- **Git**

---

## 🚀 Panduan Instalasi (How to Install)

Ikuti langkah-langkah berikut secara berurutan untuk memasang dan menjalankan aplikasi di komputer lokal:

### 1. Clone Repositori
```bash
git clone <URL_REPOSITORI>
cd e-spd
```

### 2. Pasang Dependensi Monorepo
Gunakan `pnpm` untuk mengunduh seluruh dependensi monorepo:
```bash
pnpm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file template `.env.example` ke `.env` di root direktori:
```bash
cp .env.example .env
```

Pastikan variabel di dalam `.env` telah disesuaikan:
```env
# URL Database SQLite (default tersimpan di apps/api/prisma/dev.db)
DATABASE_URL="file:./dev.db"

# Port Server Backend API
PORT=3000

# Kunci Rahasia JWT (Wajib minimal 32 karakter untuk keamanan tanda tangan token)
# Untuk production, generate dengan: openssl rand -hex 32
JWT_SECRET="si-spd-banggai-laut-local-development-secret-key-32chars"
```

> **Catatan:** Seluruh aplikasi (`apps/api` dan `apps/web`) membaca konfigurasi terpusat dari file `.env` di root direktori `./`.

### 4. Setup Database & Inisialisasi Data (Seeding)

Jalankan perintah berikut untuk meng-generate client Prisma, menerapkan skema database, dan mengisi data awal (Master ASN, Akun Admin, dan Kop Surat):

```bash
# 1. Generate Prisma Client
pnpm --filter @si-setda/api prisma:generate

# 2. Terapkan migrasi skema database SQLite
pnpm --filter @si-setda/api prisma:migrate

# 3. Jalankan Seeder data awal
pnpm --filter @si-setda/api prisma:seed
```

---

## 🔑 Akun Bawaan (Default Credentials)

Setelah proses `prisma:seed` selesai, Anda dapat login menggunakan akun **Super Admin** berikut:

| Kredensial | Nilai Default |
|---|---|
| **Username / NIP / Email** | `admin` *(atau NIP: `198801152010011002`)* |
| **Password** | `admin123` |
| **Role** | `SUPER_ADMIN` |
| **Nama** | Fadli A. Arsad (Sekda Kab. Banggai Laut) |

---

## 💻 Menjalankan Aplikasi

### Mode Pengembangan (Development)
Jalankan frontend dan backend secara bersamaan menggunakan Turborepo:
```bash
pnpm dev
```

Aplikasi dapat diakses melalui browser:
- **Frontend Web:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3000/api](http://localhost:3000/api)

> *Vite di `apps/web` telah dikonfigurasi dengan proxy reverse otomatis mengarah ke backend port 3000.*

---

## 🏗️ Build & Production

Untuk membangun seluruh package ke versi produksi:
```bash
# Kompilasi shared-types, backend, dan frontend
pnpm build
```

Menjalankan backend mode produksi:
```bash
pnpm --filter @si-setda/api start:prod
```

Preview frontend hasil build:
```bash
pnpm --filter @si-setda/web preview
```

---

## 📌 Perintah Penting Lainnya

| Perintah | Deskripsi |
|---|---|
| `pnpm dev` | Menjalankan seluruh aplikasi di workspace secara paralel |
| `pnpm build` | Membangun seluruh package monorepo |
| `pnpm --filter @si-setda/api prisma:seed` | Mengisi ulang data awal database |
| `npx prisma studio --schema apps/api/prisma/schema.prisma` | Membuka GUI Prisma Studio untuk melihat database SQLite |
