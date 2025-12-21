-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "discountType" TEXT NOT NULL DEFAULT 'amount';
