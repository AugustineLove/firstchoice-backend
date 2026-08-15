-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "operatingHours" JSONB,
ADD COLUMN     "overrideActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overrideExpiresAt" TIMESTAMP(3);
