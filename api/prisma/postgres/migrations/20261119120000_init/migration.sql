-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "photo" TEXT,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "example" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentations" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "content_per_unit" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "units_per_box" INTEGER NOT NULL,
    "front" INTEGER NOT NULL DEFAULT 5,
    "depth" INTEGER NOT NULL DEFAULT 2,
    "levels" INTEGER NOT NULL DEFAULT 4,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "presentations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "levels" INTEGER NOT NULL,
    "positions" INTEGER NOT NULL,

    CONSTRAINT "racks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pallets" (
    "id" SERIAL NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operador',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movements" (
    "id" SERIAL NOT NULL,
    "pallet_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "from_text" TEXT,
    "to_text" TEXT,
    "user" TEXT NOT NULL DEFAULT 'sistema',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receptions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmada',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user" TEXT NOT NULL,
    "signature" TEXT,
    "observations" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "receptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception_photos" (
    "id" SERIAL NOT NULL,
    "reception_id" INTEGER NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "reception_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception_lines" (
    "id" SERIAL NOT NULL,
    "reception_id" INTEGER NOT NULL,
    "presentation_id" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "boxes" INTEGER NOT NULL,
    "leftover_units" INTEGER NOT NULL DEFAULT 0,
    "lote" TEXT NOT NULL DEFAULT '',
    "vence" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "reception_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "racks_name_key" ON "racks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pallets_code_key" ON "pallets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "pallets_rack_id_level_pos_key" ON "pallets"("rack_id", "level", "pos");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "receptions_code_key" ON "receptions"("code");

-- AddForeignKey
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_presentation_id_fkey" FOREIGN KEY ("presentation_id") REFERENCES "presentations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_reception_id_fkey" FOREIGN KEY ("reception_id") REFERENCES "receptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_rack_id_fkey" FOREIGN KEY ("rack_id") REFERENCES "racks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_pallet_id_fkey" FOREIGN KEY ("pallet_id") REFERENCES "pallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_photos" ADD CONSTRAINT "reception_photos_reception_id_fkey" FOREIGN KEY ("reception_id") REFERENCES "receptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_lines" ADD CONSTRAINT "reception_lines_reception_id_fkey" FOREIGN KEY ("reception_id") REFERENCES "receptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_lines" ADD CONSTRAINT "reception_lines_presentation_id_fkey" FOREIGN KEY ("presentation_id") REFERENCES "presentations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

