-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "referenceImageId" TEXT;

-- CreateTable
CREATE TABLE "ReferenceImage" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferenceImage_consumed_createdAt_idx" ON "ReferenceImage"("consumed", "createdAt");
