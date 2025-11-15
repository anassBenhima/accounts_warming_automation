-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SUCCESS');

-- CreateEnum
CREATE TYPE "LogModule" AS ENUM ('AUTH', 'API_KEY', 'TEMPLATE', 'PROMPT', 'GENERATION', 'IMAGE_PROCESSING', 'API_CALL', 'SYSTEM');

-- Step 1: Add userId columns as nullable first
ALTER TABLE "ApiKey" ADD COLUMN "userId" TEXT;
ALTER TABLE "Generation" ADD COLUMN "userId" TEXT;
ALTER TABLE "ImageGenerationPrompt" ADD COLUMN "userId" TEXT;
ALTER TABLE "ImageToPrompt" ADD COLUMN "userId" TEXT;
ALTER TABLE "KeywordSearchPrompt" ADD COLUMN "userId" TEXT;
ALTER TABLE "Template" ADD COLUMN "userId" TEXT;

-- Step 2: Get the admin user ID and update all existing records
DO $$
DECLARE
    admin_user_id TEXT;
BEGIN
    -- Get the first/admin user ID
    SELECT id INTO admin_user_id FROM "User" LIMIT 1;

    -- Update all existing records with the admin user ID
    IF admin_user_id IS NOT NULL THEN
        UPDATE "ApiKey" SET "userId" = admin_user_id WHERE "userId" IS NULL;
        UPDATE "Generation" SET "userId" = admin_user_id WHERE "userId" IS NULL;
        UPDATE "ImageGenerationPrompt" SET "userId" = admin_user_id WHERE "userId" IS NULL;
        UPDATE "ImageToPrompt" SET "userId" = admin_user_id WHERE "userId" IS NULL;
        UPDATE "KeywordSearchPrompt" SET "userId" = admin_user_id WHERE "userId" IS NULL;
        UPDATE "Template" SET "userId" = admin_user_id WHERE "userId" IS NULL;
    END IF;
END $$;

-- Step 3: Make userId columns NOT NULL
ALTER TABLE "ApiKey" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Generation" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ImageGenerationPrompt" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ImageToPrompt" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "KeywordSearchPrompt" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Template" ALTER COLUMN "userId" SET NOT NULL;

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "level" "LogLevel" NOT NULL,
    "module" "LogModule" NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "input" TEXT,
    "output" TEXT,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "error" TEXT,
    "stackTrace" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemLog_userId_idx" ON "SystemLog"("userId");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_module_idx" ON "SystemLog"("module");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "Generation_userId_idx" ON "Generation"("userId");

-- CreateIndex
CREATE INDEX "ImageGenerationPrompt_userId_idx" ON "ImageGenerationPrompt"("userId");

-- CreateIndex
CREATE INDEX "ImageToPrompt_userId_idx" ON "ImageToPrompt"("userId");

-- CreateIndex
CREATE INDEX "KeywordSearchPrompt_userId_idx" ON "KeywordSearchPrompt"("userId");

-- CreateIndex
CREATE INDEX "Template_userId_idx" ON "Template"("userId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageToPrompt" ADD CONSTRAINT "ImageToPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageGenerationPrompt" ADD CONSTRAINT "ImageGenerationPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordSearchPrompt" ADD CONSTRAINT "KeywordSearchPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
