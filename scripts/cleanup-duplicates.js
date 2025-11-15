const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('Starting duplicate cleanup...');

  // Clean ImageToPrompt duplicates
  const imageToPrompts = await prisma.imageToPrompt.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenImageToPrompt = new Map();
  const toDeleteImageToPrompt = [];

  for (const item of imageToPrompts) {
    const key = `${item.userId}-${item.name}`;
    if (seenImageToPrompt.has(key)) {
      toDeleteImageToPrompt.push(item.id);
    } else {
      seenImageToPrompt.set(key, item.id);
    }
  }

  if (toDeleteImageToPrompt.length > 0) {
    await prisma.imageToPrompt.deleteMany({
      where: { id: { in: toDeleteImageToPrompt } },
    });
    console.log(`Deleted ${toDeleteImageToPrompt.length} duplicate ImageToPrompt records`);
  }

  // Clean ImageGenerationPrompt duplicates
  const imageGenPrompts = await prisma.imageGenerationPrompt.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenImageGenPrompt = new Map();
  const toDeleteImageGenPrompt = [];

  for (const item of imageGenPrompts) {
    const key = `${item.userId}-${item.name}`;
    if (seenImageGenPrompt.has(key)) {
      toDeleteImageGenPrompt.push(item.id);
    } else {
      seenImageGenPrompt.set(key, item.id);
    }
  }

  if (toDeleteImageGenPrompt.length > 0) {
    await prisma.imageGenerationPrompt.deleteMany({
      where: { id: { in: toDeleteImageGenPrompt } },
    });
    console.log(`Deleted ${toDeleteImageGenPrompt.length} duplicate ImageGenerationPrompt records`);
  }

  // Clean KeywordSearchPrompt duplicates
  const keywordPrompts = await prisma.keywordSearchPrompt.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenKeywordPrompt = new Map();
  const toDeleteKeywordPrompt = [];

  for (const item of keywordPrompts) {
    const key = `${item.userId}-${item.name}`;
    if (seenKeywordPrompt.has(key)) {
      toDeleteKeywordPrompt.push(item.id);
    } else {
      seenKeywordPrompt.set(key, item.id);
    }
  }

  if (toDeleteKeywordPrompt.length > 0) {
    await prisma.keywordSearchPrompt.deleteMany({
      where: { id: { in: toDeleteKeywordPrompt } },
    });
    console.log(`Deleted ${toDeleteKeywordPrompt.length} duplicate KeywordSearchPrompt records`);
  }

  // Clean Template duplicates
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenTemplate = new Map();
  const toDeleteTemplate = [];

  for (const item of templates) {
    const key = `${item.userId}-${item.name}`;
    if (seenTemplate.has(key)) {
      toDeleteTemplate.push(item.id);
    } else {
      seenTemplate.set(key, item.id);
    }
  }

  if (toDeleteTemplate.length > 0) {
    await prisma.template.deleteMany({
      where: { id: { in: toDeleteTemplate } },
    });
    console.log(`Deleted ${toDeleteTemplate.length} duplicate Template records`);
  }

  console.log('Duplicate cleanup completed!');
}

cleanupDuplicates()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
