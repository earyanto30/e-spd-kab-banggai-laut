-- CreateTable
CREATE TABLE "KopSurat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "keterangan" TEXT,
    "fileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "fileSize" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
