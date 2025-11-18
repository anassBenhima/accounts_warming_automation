import { prisma } from '@/lib/prisma';
import axios from 'axios';
import { createUserLogger } from '@/lib/logger';
import { sendPushNotification } from '@/lib/pushNotification';

interface BulkGenerationRow {
  id: string;
  keywords: string;
  imageUrl: string;
  quantity: number;
}

/**
 * Process a single bulk generation batch
 */
export async function processBulkGeneration(bulkGenerationId: string): Promise<void> {
  try {
    // Update status to PROCESSING
    await prisma.bulkGeneration.update({
      where: { id: bulkGenerationId },
      data: { status: 'PROCESSING' },
    });

    // Fetch bulk generation with rows
    const bulkGeneration = await prisma.bulkGeneration.findUnique({
      where: { id: bulkGenerationId },
      include: {
        rows: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!bulkGeneration) {
      throw new Error('Bulk generation not found');
    }

    // Create logger with actual user ID
    const logger = createUserLogger(bulkGeneration.userId);

    // Process each row sequentially
    for (const row of bulkGeneration.rows) {
      try {
        await processRow(bulkGenerationId, row, bulkGeneration.userId);
      } catch (error) {
        console.error(`Error processing row ${row.id}:`, error);
        // Continue with next row even if one fails
        await prisma.bulkGenerationRow.update({
          where: { id: row.id },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        // Update bulk generation failed count
        await prisma.bulkGeneration.update({
          where: { id: bulkGenerationId },
          data: {
            failedRows: { increment: 1 },
          },
        });
      }
    }

    // Mark bulk generation as completed
    await prisma.bulkGeneration.update({
      where: { id: bulkGenerationId },
      data: { status: 'COMPLETED' },
    });

    // Send completion notification
    await sendPushNotification(bulkGeneration.userId, {
      title: 'Bulk Generation Complete',
      body: `Successfully processed ${bulkGeneration.completedRows} rows from "${bulkGeneration.name}"`,
      url: '/dashboard/bulk-history',
      tag: `bulk-generation-${bulkGenerationId}`,
    });

    await logger.success({
      module: 'GENERATION',
      action: 'bulk_generation_complete',
      message: `Bulk generation completed: ${bulkGeneration.name}`,
      resourceId: bulkGenerationId,
    });
  } catch (error) {
    console.error('Error processing bulk generation:', error);

    // Mark as failed
    const failedBulkGen = await prisma.bulkGeneration.update({
      where: { id: bulkGenerationId },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    // Create logger for error logging
    try {
      const errorLogger = createUserLogger(failedBulkGen.userId);
      await errorLogger.error({
        module: 'GENERATION',
        action: 'bulk_generation_failed',
        message: 'Bulk generation failed',
        resourceId: bulkGenerationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Error logging failure:', logError);
    }
  }
}

/**
 * Process a single row in a bulk generation
 */
async function processRow(
  bulkGenerationId: string,
  row: BulkGenerationRow,
  userId: string
): Promise<void> {
  // Update row status to PROCESSING
  await prisma.bulkGenerationRow.update({
    where: { id: row.id },
    data: { status: 'PROCESSING' },
  });

  // Get bulk generation details for API keys
  const bulkGeneration = await prisma.bulkGeneration.findUnique({
    where: { id: bulkGenerationId },
    include: {
      user: true,
    },
  });

  if (!bulkGeneration) {
    throw new Error('Bulk generation not found');
  }

  // Fetch API keys
  const [imageGenApiKey, keywordSearchApiKey, imageDescApiKey] = await Promise.all([
    prisma.apiKey.findUnique({ where: { id: bulkGeneration.imageGenApiKeyId } }),
    prisma.apiKey.findUnique({ where: { id: bulkGeneration.keywordSearchApiKeyId } }),
    prisma.apiKey.findUnique({ where: { id: bulkGeneration.imageDescApiKeyId } }),
  ]);

  if (!imageGenApiKey || !keywordSearchApiKey || !imageDescApiKey) {
    throw new Error('One or more API keys not found');
  }

  // Get model names from bulk generation config or API key defaults
  const imageDescModel = bulkGeneration.imageDescModel || imageDescApiKey.modelName || 'gpt-4o';
  const keywordSearchModel = bulkGeneration.keywordSearchModel || keywordSearchApiKey.modelName || 'gpt-4o';
  const imageGenModel = bulkGeneration.imageGenModel || imageGenApiKey.modelName || 'fal-ai/flux-pro/v1.1';

  // Step 1: Describe the image
  const imageDescription = await describeImage(
    row.imageUrl,
    imageDescApiKey.apiKey,
    imageDescModel
  );

  // Step 2: Generate keyword data using the keyword search API
  const keywordData = await generateKeywords(
    row.keywords,
    imageDescription,
    keywordSearchApiKey.apiKey,
    keywordSearchModel
  );

  // Step 3: Generate images for each quantity
  for (let i = 0; i < row.quantity; i++) {
    try {
      const pinData = keywordData[i % keywordData.length]; // Cycle through keyword data if quantity > data length

      // Generate image
      const imageUrl = await generateImage(
        pinData.title,
        pinData.description,
        imageGenApiKey.apiKey,
        imageGenModel,
        bulkGeneration.imageWidth,
        bulkGeneration.imageHeight
      );

      // Generate alt text for accessibility
      const altText = await generateAltText(
        imageUrl,
        pinData.title,
        imageDescApiKey.apiKey,
        imageDescModel
      );

      // Save generated pin
      await prisma.bulkGeneratedPin.create({
        data: {
          rowId: row.id,
          imageUrl,
          title: pinData.title,
          description: pinData.description,
          keywords: pinData.keywords,
          altText,
          status: 'completed',
        },
      });

      // Update row completed pins count
      await prisma.bulkGenerationRow.update({
        where: { id: row.id },
        data: { completedPins: { increment: 1 } },
      });
    } catch (error) {
      console.error(`Error generating pin ${i + 1} for row ${row.id}:`, error);

      // Update failed pins count
      await prisma.bulkGenerationRow.update({
        where: { id: row.id },
        data: { failedPins: { increment: 1 } },
      });
    }
  }

  // Mark row as completed
  await prisma.bulkGenerationRow.update({
    where: { id: row.id },
    data: { status: 'COMPLETED' },
  });

  // Update bulk generation completed count
  await prisma.bulkGeneration.update({
    where: { id: bulkGenerationId },
    data: { completedRows: { increment: 1 } },
  });
}

/**
 * Describe an image using vision API
 */
async function describeImage(
  imageUrl: string,
  apiKey: string,
  model: string
): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image in detail, focusing on the main subject, colors, textures, composition, and mood. Be specific and vivid in your description.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error describing image:', error);
    throw new Error('Failed to describe image');
  }
}

/**
 * Generate keyword data (titles, descriptions, keywords)
 */
async function generateKeywords(
  baseKeywords: string,
  imageDescription: string,
  apiKey: string,
  model: string
): Promise<Array<{ title: string; description: string; keywords: string[] }>> {
  try {
    const prompt = `Based on the following image description and keywords, generate 5 Pinterest pin variations.

Image Description: ${imageDescription}
Base Keywords: ${baseKeywords}

For each variation, create:
- A compelling title (30-70 characters)
- An engaging description (150-250 characters) with a call to action
- 5-8 relevant keywords

Return ONLY a valid JSON array with this exact format:
[
  {
    "title": "Your Title Here",
    "description": "Your description here with call to action.",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }
]`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a Pinterest marketing expert. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating keywords:', error);
    throw new Error('Failed to generate keywords');
  }
}

/**
 * Generate an image using the image generation API
 */
async function generateImage(
  title: string,
  description: string,
  apiKey: string,
  model: string,
  width: number,
  height: number
): Promise<string> {
  try {
    const prompt = `Create a Pinterest-style image for: ${title}. ${description}`;

    // Use fal.ai API
    if (model.includes('fal')) {
      const response = await axios.post(
        `https://queue.fal.run/${model}`,
        {
          prompt,
          width,
          height,
          num_inference_steps: 30,
          num_images: 1,
        },
        {
          headers: {
            Authorization: `key ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.images && response.data.images.length > 0) {
        return response.data.images[0].url;
      }
      throw new Error('No images returned from fal.ai');
    }

    // Fallback for other image generation APIs
    throw new Error('Unsupported image generation model');
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image');
  }
}

/**
 * Generate alt text for an image using vision API
 */
async function generateAltText(
  imageUrl: string,
  title: string,
  apiKey: string,
  model: string
): Promise<string> {
  try {
    const prompt = `Generate a concise, descriptive alt text for this image for accessibility purposes.
The alt text should:
- Be maximum 125 characters
- Describe the key visual elements
- Be suitable for screen readers
- Focus on what's visible in the image

Image title: ${title}

Return ONLY the alt text, nothing else.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'low', // Use low detail to minimize token usage
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    let altText = response.data.choices[0].message.content.trim();

    // Ensure it's not too long
    if (altText.length > 125) {
      altText = altText.substring(0, 122) + '...';
    }

    return altText;
  } catch (error) {
    console.error('Error generating alt text:', error);
    // Return title as fallback
    return title.substring(0, 125);
  }
}
