-- CreateEnum
CREATE TYPE "DeliveryKind" AS ENUM ('PICKUP', 'ERRAND');

-- CreateEnum
CREATE TYPE "ErrandPricingMode" AS ENUM ('FIXED', 'PER_ITEM');

-- AlterTable
ALTER TABLE "DeliveryRequest" ADD COLUMN     "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "errandFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "errandItems" JSONB,
ADD COLUMN     "type" "DeliveryKind" NOT NULL DEFAULT 'PICKUP';

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "errandPricingMode" "ErrandPricingMode" NOT NULL DEFAULT 'FIXED',
    "errandFixedPrice" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "errandPerItemPrice" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "errandPickupLocationId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_errandPickupLocationId_fkey" FOREIGN KEY ("errandPickupLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
