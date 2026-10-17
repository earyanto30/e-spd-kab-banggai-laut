login implemented dynamic database authentication with Pegawai link and scrypt hashing
kop surat implemented upload to filesystem add metadata to database table KopSurat
data asn implemented save data to table Pegawai can be used as login linked to user login table
pengaturan sistem sub-menu pengguna sistem implemented to manage login users, RBAC roles, ASN linking, password reset, and account activation
api security implemented dynamic JWT Bearer token authentication, RBAC roles guard, App-Client signature verification, and CORS restrictions
database seeder implemented official Prisma seeder (prisma/seed.js), removed credentials and seed data from runtime TypeScript services, integrated with docker entrypoint and package scripts
security and navigation hardened default closed submenus, full redirect to /login for unauthenticated traffic, enforced strict production JWT_SECRET without hardcoded fallback (P0), and eliminated query string token leakage via in-memory blob streaming (P3)
uat-1 phase 1 removed tandaTangan digital signature, opened login to Non-ASN employees, made Spd.lamaHari nullable
uat-1 phase 2 implemented dynamic DasarHukum CRUD master table and integrated selection into Surat Tugas workflow
uat-1 phase 3 centered official bottom signatures, standardized two-line Surat Tugas title, and strictly enforced PA vs KPA signatory rules
uat-1 phase 4 implemented Page 2 SPD Back Page Visum Perjalanan Dinas with Permendagri standards and non-collate batch printing sequencer
