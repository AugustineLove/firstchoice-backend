-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "closedMessage" TEXT,
ADD COLUMN     "isClosed" BOOLEAN NOT NULL DEFAULT false;
