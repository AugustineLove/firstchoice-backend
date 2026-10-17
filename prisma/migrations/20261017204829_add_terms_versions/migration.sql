-- CreateTable
CREATE TABLE "TermsVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "summary" TEXT,
    "termsContent" TEXT NOT NULL,
    "privacyContent" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermsVersion_version_key" ON "TermsVersion"("version");
