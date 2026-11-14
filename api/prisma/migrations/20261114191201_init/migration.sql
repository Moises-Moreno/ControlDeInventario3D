-- CreateTable
CREATE TABLE "products" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "units_per_box" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "example" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "racks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "levels" INTEGER NOT NULL,
    "positions" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "pallets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "product_id" INTEGER NOT NULL,
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
    CONSTRAINT "pallets_rack_id_fkey" FOREIGN KEY ("rack_id") REFERENCES "racks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pallet_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "from_text" TEXT,
    "to_text" TEXT,
    "user" TEXT NOT NULL DEFAULT 'sistema',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movements_pallet_id_fkey" FOREIGN KEY ("pallet_id") REFERENCES "pallets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "racks_name_key" ON "racks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pallets_code_key" ON "pallets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "pallets_rack_id_level_pos_key" ON "pallets"("rack_id", "level", "pos");
