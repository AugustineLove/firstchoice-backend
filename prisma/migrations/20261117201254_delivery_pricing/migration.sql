-- CreateEnum
CREATE TYPE "PromoType" AS ENUM ('FREE_DELIVERY', 'FIXED_OFF', 'PERCENT_OFF');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "originalDeliveryFee" DOUBLE PRECISION,
ADD COLUMN     "promotionId" TEXT;

-- CreateTable
CREATE TABLE "DeliveryPricingConfig" (
    "id" TEXT NOT NULL,
    "baseFee" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "perKmRate" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "minFee" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "maxFee" DOUBLE PRECISION,
    "surgeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "fallbackFee" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPromotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "PromoType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDiscount" DOUBLE PRECISION,
    "minSubtotal" DOUBLE PRECISION,
    "vendorId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER,
    "perUserLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DeliveryPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPromotion_code_key" ON "DeliveryPromotion"("code");
