const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin@123@blogging', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      email: 'admin@gmail.com',
      password: hashedPassword,
      name: 'Admin',
    },
  });

  console.log('Admin user created:', admin);

  // Create production API keys from environment variables (if provided)
  const prodKeys = [];

  if (process.env.PROD_SEEDREAM_API_KEY) {
    const prodSeedreamKey = await prisma.apiKey.upsert({
      where: { id: 'prod-seedream-key' },
      update: {},
      create: {
        id: 'prod-seedream-key',
        userId: admin.id,
        name: 'Production Seedream',
        type: 'seedream',
        apiKey: process.env.PROD_SEEDREAM_API_KEY,
        modelName: process.env.PROD_SEEDREAM_MODEL || 'seedream-4-0-250828',
        isActive: true,
      },
    });
    prodKeys.push({ type: 'Seedream', name: prodSeedreamKey.name });
  }

  if (process.env.PROD_DEEPSEEK_API_KEY) {
    const prodDeepseekKey = await prisma.apiKey.upsert({
      where: { id: 'prod-deepseek-key' },
      update: {},
      create: {
        id: 'prod-deepseek-key',
        userId: admin.id,
        name: 'Production Deepseek',
        type: 'deepseek',
        apiKey: process.env.PROD_DEEPSEEK_API_KEY,
        modelName: process.env.PROD_DEEPSEEK_MODEL || 'deepseek-chat',
        isActive: true,
      },
    });
    prodKeys.push({ type: 'Deepseek', name: prodDeepseekKey.name });
  }

  if (process.env.PROD_OPENAI_SEARCH_API_KEY) {
    const prodOpenAISearchKey = await prisma.apiKey.upsert({
      where: { id: 'prod-openai-search-key' },
      update: {},
      create: {
        id: 'prod-openai-search-key',
        userId: admin.id,
        name: 'OpenAI search',
        type: 'openai',
        apiKey: process.env.PROD_OPENAI_SEARCH_API_KEY,
        modelName: process.env.PROD_OPENAI_SEARCH_MODEL || 'gpt-4.1-2025-04-14',
        isActive: true,
      },
    });
    prodKeys.push({ type: 'OpenAI Search', name: prodOpenAISearchKey.name });
  }

  if (process.env.PROD_OPENAI_DESC_API_KEY) {
    const prodOpenAIImageDescKey = await prisma.apiKey.upsert({
      where: { id: 'prod-openai-desc-key' },
      update: {},
      create: {
        id: 'prod-openai-desc-key',
        userId: admin.id,
        name: 'OpenAI image describer',
        type: 'openai',
        apiKey: process.env.PROD_OPENAI_DESC_API_KEY,
        modelName: process.env.PROD_OPENAI_DESC_MODEL || 'gpt-4-vision-preview',
        isActive: true,
      },
    });
    prodKeys.push({ type: 'OpenAI Describer', name: prodOpenAIImageDescKey.name });
  }

  if (prodKeys.length > 0) {
    console.log('Production API keys created:', prodKeys);
  } else {
    console.log('No production API keys configured (set PROD_*_API_KEY environment variables to add them)');
  }

  // Create default Image to Prompt template (upsert to avoid duplicates)
  const defaultImageToPrompt = await prisma.imageToPrompt.upsert({
    where: {
      userId_name: {
        userId: admin.id,
        name: 'Default Image Description',
      },
    },
    update: {},
    create: {
      userId: admin.id,
      name: 'Default Image Description',
      llmType: 'openai',
      prompt: 'Describe this image in detail, focusing on the main subject, colors, textures, composition, and mood. Be specific and vivid in your description.',
    },
  });

  console.log('Default Image to Prompt created:', defaultImageToPrompt);

  // Create default Image Generation Prompt (upsert to avoid duplicates)
  const defaultImageGenPrompt = await prisma.imageGenerationPrompt.upsert({
    where: {
      userId_name: {
        userId: admin.id,
        name: 'Pinterest Food Pin',
      },
    },
    update: {},
    create: {
      userId: admin.id,
      name: 'Pinterest Food Pin',
      prompt: 'Create a highly detailed and vivid image of a Pinterest-style food pin featuring the given recipe. The image should prominently display the prepared dish with authentic textures, vibrant colors, and natural shapes. Show the food arranged attractively on a rustic wooden table or elegant serving dish, bathed in warm, soft natural light that evokes a cozy, inviting atmosphere typical of seasonal cooking. Include contextual props such as subtle kitchenware, fresh ingredients related to the recipe, and seasonal elements like autumn leaves or simple cloth napkins that complement but do not distract from the dish. Avoid any brands, logos, text, or icons. The composition should be balanced and visually appealing, suitable to inspire Pinterest users looking for easy, delicious recipes. Use realistic lighting and shadows to enhance depth and mouthwatering appeal. The scene should capture warmth, comfort, and a home-cooked feel. Aim for an original image that clearly represents the recipe trend with an inviting and appetizing mood.',
    },
  });

  console.log('Default Image Generation Prompt created:', defaultImageGenPrompt);

  // Create default Keyword Search Prompt (upsert to avoid duplicates)
  const defaultKeywordPrompt = await prisma.keywordSearchPrompt.upsert({
    where: {
      userId_name: {
        userId: admin.id,
        name: 'Trending Recipes',
      },
    },
    update: {},
    create: {
      userId: admin.id,
      name: 'Trending Recipes',
      prompt: `Act as a senior culinary trend analyst. Using the latest data from Google Trends, Pinterest trending topics, and other credible sources, identify the top 10 trending recipes right now. For each recipe, produce a JSON object in the exact format below, integrating the best keyword, its cluster, and the common "intent phrase" patterns found in high-performing Pinterest pin descriptions (e.g., "how to make…", "easy…", "quick…", "best…", seasonal/occasion phrases). Write titles and descriptions in a natural, non-spammy style, front-load the primary keyword, and keep descriptions concise and skimmable. Avoid brands, logos, emojis, and hashtags. No extra commentary—return only a valid JSON array with 10 objects.

Required JSON fields and rules:
- Title: 30–70 characters, front-load the best keyword, optionally include an intent phrase and seasonal/diet modifier if natural.
- description: 150–250 characters, natural language that mirrors Pinterest's top-performing style, include 2–3 semantically related long-tail variants and 1 clear call to action (e.g., "Save for later" or "Get the full recipe").
- Keywords: an array of 5–8 items where the first entry is the best_keyword (exact match), followed by related long-tail variants.

Use the keywords clustering & intent in the description and title if they are used on trending pins and fit naturally.

Output format (example schema only—do not include comments):
[
  {
    "Title": "",
    "description": "",
    "Keywords": [
      "best_keyword",
      "related_variant_1",
      "related_variant_2",
      "related_variant_3",
      "related_variant_4",
      "related_variant_5"
    ]
  }
]

Guidelines to follow:
- Keyword cluster options to consider: "seasonal/occasion", "diet-specific", "time-saving", "ingredient-led", "comfort food", "meal-prep", "holiday", "weeknight dinner", "baking/desserts".
- Common Pinterest recipe intents to mirror naturally: "how to make…", "easy…", "quick…", "best…", "30-minute…", "one-pot…", "no-bake…", "fall/holiday/summer…".
- Ensure each Title and description are unique, human-sounding, and aligned with current trend language.
- Do not include any source listings or URLs in the JSON.`,
    },
  });

  console.log('Default Keyword Search Prompt created:', defaultKeywordPrompt);

  // Create example text templates (upsert to avoid duplicates)
  const template1 = await prisma.template.upsert({
    where: {
      userId_name: {
        userId: admin.id,
        name: 'Simple Top Text',
      },
    },
    update: {},
    create: {
      userId: admin.id,
      name: 'Simple Top Text',
      type: 'TEXT',
      textContent: 'Your Recipe Title Here',
      fontSize: 8,
      fontColor: '#FFFFFF',
      fontFamily: 'DejaVu Sans',
      positionY: 10,
      isActive: true,
    },
  });

  const template2 = await prisma.template.upsert({
    where: {
      userId_name: {
        userId: admin.id,
        name: 'Center Text Overlay',
      },
    },
    update: {},
    create: {
      userId: admin.id,
      name: 'Center Text Overlay',
      type: 'TEXT',
      textContent: 'Delicious Recipe',
      fontSize: 10,
      fontColor: '#FFD700',
      fontFamily: 'DejaVu Sans',
      positionY: 50,
      isActive: true,
    },
  });

  const template3 = await prisma.template.upsert({
    where: {
      userId_name: {
        userId: admin.id,
        name: 'Bottom Banner Black',
      },
    },
    update: {},
    create: {
      userId: admin.id,
      name: 'Bottom Banner Black',
      type: 'TEXT_WITH_BACKGROUND',
      textContent: 'Easy Recipe - Save for Later',
      fontSize: 8,
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      fontFamily: 'DejaVu Sans',
      positionY: 90,
      isActive: true,
    },
  });

  const template4 = await prisma.template.upsert({
    where: {
      userId_name: {
        userId: admin.id,
        name: 'Top Banner Red',
      },
    },
    update: {},
    create: {
      userId: admin.id,
      name: 'Top Banner Red',
      type: 'TEXT_WITH_BACKGROUND',
      textContent: 'Trending Recipe',
      fontSize: 7,
      fontColor: '#FFFFFF',
      backgroundColor: '#DC2626',
      fontFamily: 'DejaVu Sans',
      positionY: 5,
      isActive: true,
    },
  });

  console.log('Example templates created:', {
    text1: template1.name,
    text2: template2.name,
    textBg1: template3.name,
    textBg2: template4.name,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
