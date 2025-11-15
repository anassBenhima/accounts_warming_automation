-- AlterTable
ALTER TABLE "GeneratedImage" ADD COLUMN     "templateId" TEXT;

-- CreateIndex
CREATE INDEX "GeneratedImage_templateId_idx" ON "GeneratedImage"("templateId");

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
