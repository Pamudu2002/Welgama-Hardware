/*
  Warnings:

  - Added the required column `costPriceSnapshot` to the `SaleItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add column with default value first
ALTER TABLE "SaleItem" ADD COLUMN "costPriceSnapshot" DECIMAL(10,2);

-- Update existing rows to use the current product cost price
UPDATE "SaleItem" 
SET "costPriceSnapshot" = "Product"."costPrice"
FROM "Product"
WHERE "SaleItem"."productId" = "Product"."id";

-- Make the column NOT NULL after data is populated
ALTER TABLE "SaleItem" ALTER COLUMN "costPriceSnapshot" SET NOT NULL;
