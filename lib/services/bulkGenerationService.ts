import { prisma } from "@/lib/prisma";
import axios from "axios";
import { createUserLogger } from "@/lib/logger";
import { sendPushNotification } from "@/lib/pushNotification";
import { fal } from "@fal-ai/client";

interface BulkGenerationRow {
  id: string;
  keywords: string;
  imageUrl: string;
  title?: string | null;
  description?: string | null;
  altText?: string | null;
  quantity: number;
}

/**
 * Process a single bulk generation batch
 */
export async function processBulkGeneration(
  bulkGenerationId: string
): Promise<void> {
  try {
    // Update status to PROCESSING
    await prisma.bulkGeneration.update({
      where: { id: bulkGenerationId },
      data: { status: "PROCESSING" },
    });

    // Fetch bulk generation with rows
    const bulkGeneration = await prisma.bulkGeneration.findUnique({
      where: { id: bulkGenerationId },
      include: {
        rows: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!bulkGeneration) {
      throw new Error("Bulk generation not found");
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
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error",
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
      data: { status: "COMPLETED" },
    });

    // Send completion notification
    await sendPushNotification(bulkGeneration.userId, {
      title: "Bulk Generation Complete",
      body: `Successfully processed ${bulkGeneration.completedRows} rows from "${bulkGeneration.name}"`,
      url: "/dashboard/bulk-history",
      tag: `bulk-generation-${bulkGenerationId}`,
    });

    await logger.success({
      module: "GENERATION",
      action: "bulk_generation_complete",
      message: `Bulk generation completed: ${bulkGeneration.name}`,
      resourceId: bulkGenerationId,
    });
  } catch (error) {
    console.error("Error processing bulk generation:", error);

    // Mark as failed
    const failedBulkGen = await prisma.bulkGeneration.update({
      where: { id: bulkGenerationId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Create logger for error logging
    try {
      const errorLogger = createUserLogger(failedBulkGen.userId);
      await errorLogger.error({
        module: "GENERATION",
        action: "bulk_generation_failed",
        message: "Bulk generation failed",
        resourceId: bulkGenerationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Error logging failure:", logError);
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
  // Initialize API responses tracker
  const apiResponses: any = {
    imageDescription: null,
    keywordGeneration: null,
    imageGeneration: null,
    altTexts: [],
  };

  // Update row status to PROCESSING
  await prisma.bulkGenerationRow.update({
    where: { id: row.id },
    data: { status: "PROCESSING" },
  });

  // Get bulk generation details for API keys
  const bulkGeneration = await prisma.bulkGeneration.findUnique({
    where: { id: bulkGenerationId },
    include: {
      user: true,
    },
  });

  if (!bulkGeneration) {
    throw new Error("Bulk generation not found");
  }

  // Fetch API keys
  const [imageGenApiKey, keywordSearchApiKey, imageDescApiKey] =
    await Promise.all([
      prisma.apiKey.findUnique({
        where: { id: bulkGeneration.imageGenApiKeyId },
      }),
      prisma.apiKey.findUnique({
        where: { id: bulkGeneration.keywordSearchApiKeyId },
      }),
      prisma.apiKey.findUnique({
        where: { id: bulkGeneration.imageDescApiKeyId },
      }),
    ]);

  if (!imageGenApiKey || !keywordSearchApiKey || !imageDescApiKey) {
    throw new Error("One or more API keys not found");
  }

  // Get model names from bulk generation config or API key defaults
  const imageDescModel =
    bulkGeneration.imageDescModel || imageDescApiKey.modelName || "gpt-4o";
  const keywordSearchModel =
    bulkGeneration.keywordSearchModel ||
    keywordSearchApiKey.modelName ||
    "gpt-4o";
  const imageGenModel =
    bulkGeneration.imageGenModel ||
    imageGenApiKey.modelName ||
    "fal-ai/flux-pro/v1.1";

  // Check if user provided all required content for variation generation
  const hasUserContent = row.title && row.description && row.altText;

  let contentData: Array<{ title: string; description: string; keywords: string[]; altText?: string }>;

  if (hasUserContent) {
    // NEW FLOW: Generate variations from user-provided content
    console.log(`Using user-provided content for row ${row.id}`);

    const variationsResult = await generateContentVariations(
      row.title!,
      row.description!,
      row.keywords,
      row.altText!,
      row.quantity,
      keywordSearchApiKey.apiKey,
      keywordSearchModel
    );

    contentData = variationsResult.variations;
    apiResponses.contentVariations = variationsResult.apiResponse;
  } else {
    // LEGACY FLOW: Generate from image description
    console.log(`Using legacy flow (no user content provided) for row ${row.id}`);

    // Step 1: Describe the image
    const describeResult = await describeImage(
      row.imageUrl,
      imageDescApiKey.apiKey,
      imageDescModel
    );
    const imageDescription = describeResult.description;
    apiResponses.imageDescription = describeResult.apiResponse;

    // Step 2: Generate keyword data using the keyword search API
    const keywordResult = await generateKeywords(
      row.keywords,
      imageDescription,
      keywordSearchApiKey.apiKey,
      keywordSearchModel
    );
    contentData = keywordResult.keywords;
    apiResponses.keywordGeneration = keywordResult.apiResponse;
  }

  // Step 3: Generate all images for this row in a batch
  try {
    // Generate all images in a single batch request
    const imageGenResult = await generateImageBatch(
      contentData[0].title,
      contentData[0].description,
      imageGenApiKey.apiKey,
      imageGenModel,
      bulkGeneration.imageWidth,
      bulkGeneration.imageHeight,
      row.quantity
    );
    const imageUrls = imageGenResult.imageUrls;
    apiResponses.imageGeneration = imageGenResult.apiResponse;

    // Save each generated image with cycled content data
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const pinData = contentData[i % contentData.length]; // Cycle through content variations
        const imageUrl = imageUrls[i];

        // Use provided alt text from variation or generate if not available
        let finalAltText: string;

        if (pinData.altText) {
          // Use alt text from variation
          finalAltText = pinData.altText;
          console.log(`Using provided alt text for pin ${i + 1}`);
        } else {
          // Generate alt text using vision API
          const altTextResult = await generateAltText(
            imageUrl,
            pinData.title,
            imageDescApiKey.apiKey,
            imageDescModel
          );
          finalAltText = altTextResult.altText;
          apiResponses.altTexts.push(altTextResult.apiResponse);
        }

        // Save generated pin
        await prisma.bulkGeneratedPin.create({
          data: {
            rowId: row.id,
            imageUrl,
            title: pinData.title,
            description: pinData.description,
            keywords: pinData.keywords,
            altText: finalAltText,
            status: "completed",
          },
        });

        // Update row completed pins count
        await prisma.bulkGenerationRow.update({
          where: { id: row.id },
          data: { completedPins: { increment: 1 } },
        });
      } catch (error) {
        console.error(`Error saving pin ${i + 1} for row ${row.id}:`, error);

        // Update failed pins count
        await prisma.bulkGenerationRow.update({
          where: { id: row.id },
          data: { failedPins: { increment: 1 } },
        });
      }
    }
  } catch (error) {
    console.error(`Error generating images for row ${row.id}:`, error);

    // Mark all pins as failed
    await prisma.bulkGenerationRow.update({
      where: { id: row.id },
      data: { failedPins: { increment: row.quantity } },
    });
  }

  // Mark row as completed and save API responses
  await prisma.bulkGenerationRow.update({
    where: { id: row.id },
    data: {
      status: "COMPLETED",
      apiResponses: apiResponses,
    },
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
): Promise<{ description: string; apiResponse: any }> {
  try {
    // Only OpenAI supports vision API, DeepSeek doesn't
    if (!model.includes("gpt-4")) {
      console.log(
        "Vision API not supported for this model, using fallback description"
      );
      return {
        description: "A delicious food image with vibrant colors and appetizing presentation.",
        apiResponse: {
          timestamp: new Date().toISOString(),
          model,
          request: { imageUrl, note: "Vision API not supported" },
          response: { fallback: true },
        },
      };
    }

    const requestData = {
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this image in detail, focusing on the main subject, colors, textures, composition, and mood. Be specific and vivid in your description.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    };

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    return {
      description: response.data.choices[0].message.content,
      apiResponse: {
        timestamp: new Date().toISOString(),
        model,
        request: { imageUrl, max_tokens: 500 },
        response: response.data,
      },
    };
  } catch (error) {
    console.error("Error describing image:", error);
    return {
      description: "A delicious food image with vibrant colors and appetizing presentation.",
      apiResponse: {
        timestamp: new Date().toISOString(),
        model,
        request: { imageUrl },
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Generate content variations from user-provided base content
 */
async function generateContentVariations(
  baseTitle: string,
  baseDescription: string,
  baseKeywords: string,
  baseAltText: string,
  quantity: number,
  apiKey: string,
  model: string
): Promise<{
  variations: Array<{ title: string; description: string; keywords: string[]; altText: string }>;
  apiResponse: any;
}> {
  try {
    const prompt = `Create ${quantity} unique variations of the following Pinterest pin content. Each variation should have the SAME MEANING but use DIFFERENT words, phrases, and structure to make them unique.

Base Content:
- Title: ${baseTitle}
- Description: ${baseDescription}
- Keywords: ${baseKeywords}
- Alt Text: ${baseAltText}

Requirements for each variation:
- Title: Same meaning as "${baseTitle}" but with different wording (30-70 characters)
- Description: Same meaning as "${baseDescription}" but rephrased with different words and structure (150-250 characters). Include a call to action.
- Keywords: Include ALL base keywords plus 2-3 NEW related keywords (8-10 total keywords)
- Alt Text: Same meaning as "${baseAltText}" but rephrased differently (max 125 characters)

IMPORTANT: Make each variation DISTINCTLY DIFFERENT in wording while preserving the core meaning.

Return ONLY a valid JSON array with this exact format:
[
  {
    "title": "Your unique title here",
    "description": "Your unique description here with call to action.",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"],
    "altText": "Your unique alt text here"
  }
]`;

    // Determine API endpoint based on model
    const endpoint = model.includes("deepseek")
      ? "https://api.deepseek.com/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const requestData = {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a creative Pinterest marketing expert skilled at creating diverse variations of content while preserving meaning. Generate unique, engaging variations that are distinctly different from each other. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.9, // High temperature for maximum variation
      max_tokens: 3000,
    };

    const response = await axios.post(endpoint, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const variations = JSON.parse(jsonMatch[0]);

    return {
      variations: variations.slice(0, quantity),
      apiResponse: {
        timestamp: new Date().toISOString(),
        model,
        endpoint,
        request: {
          baseTitle,
          baseDescription: baseDescription.substring(0, 100) + "...",
          baseKeywords,
          quantity,
        },
        response: response.data,
      },
    };
  } catch (error) {
    console.error("Error generating content variations:", error);
    throw new Error("Failed to generate content variations");
  }
}

/**
 * Generate keyword data (titles, descriptions, keywords) - Legacy function for backward compatibility
 */
async function generateKeywords(
  baseKeywords: string,
  imageDescription: string,
  apiKey: string,
  model: string
): Promise<{
  keywords: Array<{ title: string; description: string; keywords: string[] }>;
  apiResponse: any;
}> {
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

    // Determine API endpoint based on model
    const endpoint = model.includes("deepseek")
      ? "https://api.deepseek.com/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const requestData = {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a creative Pinterest marketing expert. Generate diverse, unique variations that are distinctly different from each other. Avoid repetitive phrases and ensure each variation has its own personality and appeal. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.9, // Increased for more variation
      max_tokens: 2000,
    };

    const response = await axios.post(endpoint, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const keywords = JSON.parse(jsonMatch[0]);

    return {
      keywords,
      apiResponse: {
        timestamp: new Date().toISOString(),
        model,
        endpoint,
        request: { baseKeywords, imageDescription: imageDescription.substring(0, 100) + "..." },
        response: response.data,
      },
    };
  } catch (error) {
    console.error("Error generating keywords:", error);
    throw new Error("Failed to generate keywords");
  }
}

/**
 * Generate multiple images in a batch using the image generation API
 */
async function generateImageBatch(
  title: string,
  description: string,
  apiKey: string,
  model: string,
  width: number,
  height: number,
  quantity: number
): Promise<{ imageUrls: string[]; apiResponse: any }> {
  try {
    const prompt = `Create a Pinterest-style image for: ${title}. ${description}`;

    // Use fal.ai API
    if (model.includes("fal")) {
      // Configure fal client with API key
      fal.config({
        credentials: apiKey,
      });

      const requestInput = {
        prompt,
        image_size: {
          width,
          height,
        },
        num_inference_steps: 30,
        num_images: quantity,
        seed: Math.floor(Math.random() * 100000), // Random seed for variation
      };

      const result = await fal.subscribe(model, {
        input: requestInput,
      });

      if (result.data?.images && result.data.images.length > 0) {
        return {
          imageUrls: result.data.images.map((img: any) => img.url),
          apiResponse: {
            timestamp: new Date().toISOString(),
            model,
            request: requestInput,
            response: result.data,
          },
        };
      }
      throw new Error("No images returned from fal.ai");
    }

    // Fallback for other image generation APIs
    throw new Error("Unsupported image generation model");
  } catch (error) {
    console.error("Error generating images:", error);
    throw new Error("Failed to generate images");
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
): Promise<{ altText: string; apiResponse: any }> {
  try {
    const prompt = `Generate a concise, descriptive alt text for this image for accessibility purposes.
The alt text should:
- Be maximum 125 characters
- Describe the key visual elements
- Be suitable for screen readers
- Focus on what's visible in the image

Image title: ${title}

Return ONLY the alt text, nothing else.`;

    const requestData = {
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "low", // Use low detail to minimize token usage
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    };

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    let altText = response.data.choices[0].message.content.trim();

    // Ensure it's not too long
    if (altText.length > 125) {
      altText = altText.substring(0, 122) + "...";
    }

    return {
      altText,
      apiResponse: {
        timestamp: new Date().toISOString(),
        model,
        request: { imageUrl, title },
        response: response.data,
      },
    };
  } catch (error) {
    console.error("Error generating alt text:", error);
    return {
      altText: title.substring(0, 125),
      apiResponse: {
        timestamp: new Date().toISOString(),
        model,
        request: { imageUrl, title },
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}
