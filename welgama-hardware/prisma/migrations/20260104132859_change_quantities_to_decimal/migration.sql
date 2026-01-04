/*
  Warnings:

  - You are about to alter the column `quantityChange` on the `InventoryLog` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `quantityBefore` on the `InventoryLog` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `quantityAfter` on the `InventoryLog` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `quantity` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `quantity` on the `SaleItem` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "InventoryLog" ALTER COLUMN "quantityChange" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "quantityBefore" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "quantityAfter" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,2);
