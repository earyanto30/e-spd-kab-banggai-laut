-- CreateTable
CREATE TABLE "Spd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nomorSpd" TEXT NOT NULL,
    "pemberiPerintah" TEXT NOT NULL,
    "pegawaiId" TEXT NOT NULL,
    "dalamRangka" TEXT NOT NULL,
    "alatAngkut" TEXT NOT NULL,
    "tempatBerangkat" TEXT NOT NULL,
    "tempatTujuan" TEXT NOT NULL,
    "lamaHari" INTEGER NOT NULL,
    "tanggalBerangkat" DATETIME NOT NULL,
    "tanggalKembali" DATETIME NOT NULL,
    "skpd" TEXT NOT NULL DEFAULT 'Bagian Umum Sekretariat Daerah Kab. Banggai Laut',
    "kodeRekening" TEXT,
    "tingkatBiaya" TEXT,
    "pengikut" TEXT,
    "keterangan" TEXT,
    "kopSuratId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Spd_pegawaiId_fkey" FOREIGN KEY ("pegawaiId") REFERENCES "Pegawai" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Spd_kopSuratId_fkey" FOREIGN KEY ("kopSuratId") REFERENCES "KopSurat" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Spd_nomorSpd_key" ON "Spd"("nomorSpd");
