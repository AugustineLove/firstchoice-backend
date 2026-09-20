-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('ORDER_STATUS_CHANGE', 'ORDER_RIDER_ASSIGN', 'DELIVERY_STATUS_CHANGE', 'DELIVERY_RIDER_ASSIGN', 'VENDOR_STATUS_CHANGE', 'VENDOR_CREATED', 'VENDOR_PROFILE_UPDATED', 'USER_STATUS_CHANGE', 'PRODUCT_CREATED', 'PRODUCT_DELETED', 'BROADCAST_SENT');

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "AdminActionType" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminActionLog_adminId_idx" ON "AdminActionLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetType_targetId_idx" ON "AdminActionLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
