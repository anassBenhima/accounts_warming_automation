-- AlterEnum
ALTER TYPE "TemplateType" ADD VALUE 'TEXT_WITH_BACKGROUND';

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "backgroundColor" TEXT;
