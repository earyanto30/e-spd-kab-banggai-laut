-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pegawai" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nip" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "pangkat" TEXT NOT NULL,
    "golongan" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "unitKerja" TEXT NOT NULL DEFAULT 'Sekretariat Daerah',
    "isASN" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Pegawai" ("createdAt", "golongan", "id", "jabatan", "nama", "nip", "pangkat", "unitKerja", "updatedAt") SELECT "createdAt", "golongan", "id", "jabatan", "nama", "nip", "pangkat", "unitKerja", "updatedAt" FROM "Pegawai";
DROP TABLE "Pegawai";
ALTER TABLE "new_Pegawai" RENAME TO "Pegawai";
CREATE UNIQUE INDEX "Pegawai_nip_key" ON "Pegawai"("nip");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
