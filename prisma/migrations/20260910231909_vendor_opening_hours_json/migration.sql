-- Change Vendor.openingHours from TEXT to JSONB.
-- The existing production data was preserved in openingHours_old
-- before this migration was reconciled with Prisma.

ALTER TABLE "Vendor"
RENAME COLUMN "openingHours" TO "openingHours_old";

ALTER TABLE "Vendor"
ADD COLUMN "openingHours" JSONB;