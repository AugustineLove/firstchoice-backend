/*
  Warnings:

  - The `incrementable` column on the `ProductAddon` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ProductAddon" DROP COLUMN "incrementable",
ADD COLUMN     "incrementable" BOOLEAN NOT NULL DEFAULT false;
