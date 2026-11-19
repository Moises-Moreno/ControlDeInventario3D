-- CreateTable
CREATE TABLE "presentations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "content_per_unit" REAL NOT NULL DEFAULT 1,
    "units_per_box" INTEGER NOT NULL,
    "front" INTEGER NOT NULL DEFAULT 5,
    "depth" INTEGER NOT NULL DEFAULT 2,
    "levels" INTEGER NOT NULL DEFAULT 4,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "presentations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Traslado de datos: cada producto existente recibe una presentación con sus
-- "unidades por caja" actuales (estándar editable: 5 × 2 × 4 = 40 cajas por pallet).
INSERT INTO "presentations" ("product_id", "name", "content_per_unit", "units_per_box", "front", "depth", "levels", "active")
SELECT "id", 'Presentación estándar', 1, "units_per_box", 5, 2, 4, true FROM "products";

-- CreateTable
CREATE TABLE "receptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmada',
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user" TEXT NOT NULL,
    "signature" TEXT,
    "observations" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "reception_photos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reception_id" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "reception_photos_reception_id_fkey" FOREIGN KEY ("reception_id") REFERENCES "receptions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reception_lines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reception_id" INTEGER NOT NULL,
    "presentation_id" INTEGER NOT NULL,
    "quantity" REAL NOT NULL,
    "boxes" INTEGER NOT NULL,
    "leftover_units" INTEGER NOT NULL DEFAULT 0,
    "lote" TEXT NOT NULL DEFAULT '',
    "vence" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "reception_lines_reception_id_fkey" FOREIGN KEY ("reception_id") REFERENCES "receptions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reception_lines_presentation_id_fkey" FOREIGN KEY ("presentation_id") REFERENCES "presentations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pallets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "product_id" INTEGER NOT NULL,
    "presentation_id" INTEGER,
    "reception_id" INTEGER,
    "front" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL,
    "rows" INTEGER NOT NULL,
    "loose" INTEGER NOT NULL,
    "lote" TEXT NOT NULL DEFAULT '',
    "vence" TEXT NOT NULL DEFAULT '',
    "rack_id" INTEGER,
    "level" INTEGER,
    "pos" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pallets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pallets_presentation_id_fkey" FOREIGN KEY ("presentation_id") REFERENCES "presentations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pallets_reception_id_fkey" FOREIGN KEY ("reception_id") REFERENCES "receptions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pallets_rack_id_fkey" FOREIGN KEY ("rack_id") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pallets" ("code", "created_at", "depth", "front", "id", "level", "loose", "lote", "pos", "product_id", "rack_id", "rows", "status", "updated_at", "vence") SELECT "code", "created_at", "depth", "front", "id", "level", "loose", "lote", "pos", "product_id", "rack_id", "rows", "status", "updated_at", "vence" FROM "pallets";
DROP TABLE "pallets";
ALTER TABLE "new_pallets" RENAME TO "pallets";
CREATE UNIQUE INDEX "pallets_code_key" ON "pallets"("code");
CREATE UNIQUE INDEX "pallets_rack_id_level_pos_key" ON "pallets"("rack_id", "level", "pos");
CREATE TABLE "new_products" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "photo" TEXT,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "example" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_products" ("code", "color", "created_at", "example", "id", "name") SELECT "code", "color", "created_at", "example", "id", "name" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
UPDATE "pallets" SET "presentation_id" = (SELECT "id" FROM "presentations" WHERE "presentations"."product_id" = "pallets"."product_id" LIMIT 1);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "receptions_code_key" ON "receptions"("code");

