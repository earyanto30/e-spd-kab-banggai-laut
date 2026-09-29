-- CreateTable
CREATE TABLE "Pegawai" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nip" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "pangkat" TEXT NOT NULL,
    "golongan" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "unitKerja" TEXT NOT NULL DEFAULT 'Sekretariat Daerah',
    "status" TEXT NOT NULL DEFAULT 'PNS',
    "email" TEXT,
    "noHp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Pegawai_nip_key" ON "Pegawai"("nip");
