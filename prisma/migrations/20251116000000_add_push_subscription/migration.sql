-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "PushSubscription_enabled_idx" ON "PushSubscription"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddUniqueIndexes (fixing missing unique constraints from earlier migrations)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ImageGenerationPrompt_userId_name_key'
  ) THEN
    CREATE UNIQUE INDEX "ImageGenerationPrompt_userId_name_key" ON "ImageGenerationPrompt"("userId", "name");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ImageToPrompt_userId_name_key'
  ) THEN
    CREATE UNIQUE INDEX "ImageToPrompt_userId_name_key" ON "ImageToPrompt"("userId", "name");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'KeywordSearchPrompt_userId_name_key'
  ) THEN
    CREATE UNIQUE INDEX "KeywordSearchPrompt_userId_name_key" ON "KeywordSearchPrompt"("userId", "name");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'Template_userId_name_key'
  ) THEN
    CREATE UNIQUE INDEX "Template_userId_name_key" ON "Template"("userId", "name");
  END IF;
END $$;
