-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "androidLatestVersion" TEXT,
ADD COLUMN     "androidMinVersion" TEXT,
ADD COLUMN     "androidStoreUrl" TEXT,
ADD COLUMN     "iosLatestVersion" TEXT,
ADD COLUMN     "iosMinVersion" TEXT,
ADD COLUMN     "iosStoreUrl" TEXT,
ADD COLUMN     "updateMessage" TEXT;
