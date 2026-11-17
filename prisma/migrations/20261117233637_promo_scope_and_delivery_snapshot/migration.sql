-- AlterTable
ALTER TABLE "DeliveryPromotion" ADD COLUMN     "appliesTo" TEXT[] DEFAULT ARRAY['MARKETPLACE', 'PICKUP', 'ERRAND']::TEXT[];

-- AlterTable
ALTER TABLE "DeliveryRequest" ADD COLUMN     "deliveryDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "originalDeliveryFee" DOUBLE PRECISION,
ADD COLUMN     "promotionId" TEXT;
