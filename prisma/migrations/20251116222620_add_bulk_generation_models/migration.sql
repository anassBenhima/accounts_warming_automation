-- CreateEnum
CREATE TYPE "BulkGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BulkGenerationRowStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "BulkGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageGenApiKeyId" TEXT NOT NULL,
    "keywordSearchApiKeyId" TEXT NOT NULL,
    "imageDescApiKeyId" TEXT NOT NULL,
    "imageWidth" INTEGER NOT NULL DEFAULT 1000,
    "imageHeight" INTEGER NOT NULL DEFAULT 1500,
    "status" "BulkGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "completedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkGenerationRow" (
    "id" TEXT NOT NULL,
    "bulkGenerationId" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "BulkGenerationRowStatus" NOT NULL DEFAULT 'PENDING',
    "completedPins" INTEGER NOT NULL DEFAULT 0,
    "failedPins" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkGenerationRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkGeneratedPin" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkGeneratedPin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkGeneration_userId_idx" ON "BulkGeneration"("userId");

-- CreateIndex
CREATE INDEX "BulkGeneration_status_idx" ON "BulkGeneration"("status");

-- CreateIndex
CREATE INDEX "BulkGenerationRow_bulkGenerationId_idx" ON "BulkGenerationRow"("bulkGenerationId");

-- CreateIndex
CREATE INDEX "BulkGenerationRow_status_idx" ON "BulkGenerationRow"("status");

-- CreateIndex
CREATE INDEX "BulkGeneratedPin_rowId_idx" ON "BulkGeneratedPin"("rowId");

-- AddForeignKey
ALTER TABLE "BulkGeneration" ADD CONSTRAINT "BulkGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkGenerationRow" ADD CONSTRAINT "BulkGenerationRow_bulkGenerationId_fkey" FOREIGN KEY ("bulkGenerationId") REFERENCES "BulkGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkGeneratedPin" ADD CONSTRAINT "BulkGeneratedPin_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "BulkGenerationRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
