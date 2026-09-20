-- CreateEnum
CREATE TYPE "ManualJobStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ManualJob" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedRiderId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "pickupLatitude" DOUBLE PRECISION,
    "pickupLongitude" DOUBLE PRECISION,
    "destinationAddress" TEXT NOT NULL,
    "destinationLatitude" DOUBLE PRECISION,
    "destinationLongitude" DOUBLE PRECISION,
    "itemDescription" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "ManualJobStatus" NOT NULL DEFAULT 'PENDING',
    "rawNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualJob_status_idx" ON "ManualJob"("status");

-- AddForeignKey
ALTER TABLE "ManualJob" ADD CONSTRAINT "ManualJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualJob" ADD CONSTRAINT "ManualJob_assignedRiderId_fkey" FOREIGN KEY ("assignedRiderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
