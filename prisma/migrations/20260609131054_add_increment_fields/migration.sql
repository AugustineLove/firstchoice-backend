-- AlterTable
ALTER TABLE "ProductAddonGroup" ADD COLUMN     "incrementMode" TEXT,
ADD COLUMN     "incrementable" BOOLEAN NOT NULL DEFAULT false;
