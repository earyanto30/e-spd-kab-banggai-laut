-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KopSurat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "keterangan" TEXT,
    "fileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "fileSize" TEXT NOT NULL,
    "paperSize" TEXT NOT NULL DEFAULT 'A4',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_KopSurat" ("createdAt", "fileName", "fileSize", "id", "isDefault", "keterangan", "nama", "storedFileName", "updatedAt") SELECT "createdAt", "fileName", "fileSize", "id", "isDefault", "keterangan", "nama", "storedFileName", "updatedAt" FROM "KopSurat";
DROP TABLE "KopSurat";
ALTER TABLE "new_KopSurat" RENAME TO "KopSurat";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
