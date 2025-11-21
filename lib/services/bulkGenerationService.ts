import { prisma } from "@/lib/prisma";
import axios from "axios";
import { createUserLogger } from "@/lib/logger";
import { sendPushNotification } from "@/lib/pushNotification";
import { fal } from "@fal-ai/client";
import { downloadAndSaveImage } from "@/lib/utils/imageDownloader";

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

  let contentData: Array<{
    title: string;
    description: string;
    keywords: string[];
    altText?: string;
  }>;

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
    console.log(
      `Using legacy flow (no user content provided) for row ${row.id}`
    );

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
            pinData.description,
            imageDescApiKey.apiKey,
            imageDescModel
          );
          finalAltText = altTextResult.altText;
          apiResponses.altTexts.push(altTextResult.apiResponse);
        }

        // Download and save the image locally
        let localImagePath: string | null = null;
        try {
          localImagePath = await downloadAndSaveImage(imageUrl, `generated/bulk/${bulkGenerationId}`);
          console.log(`Image downloaded and saved locally: ${localImagePath}`);
        } catch (downloadError) {
          console.error(`Failed to download image for pin ${i + 1}:`, downloadError);
          // Continue anyway - we still have the API URL
        }

        // Save generated pin with both API URL and local path
        await prisma.bulkGeneratedPin.create({
          data: {
            rowId: row.id,
            imageUrl,
            localImagePath,
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
        description:
          "A delicious food image with vibrant colors and appetizing presentation.",
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
      description:
        "A delicious food image with vibrant colors and appetizing presentation.",
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
  variations: Array<{
    title: string;
    description: string;
    keywords: string[];
    altText: string;
  }>;
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
    const prompt = `Based on the following image description and keywords, generate 15-20 Pinterest pin variations.

      Image Description: ${imageDescription}
      Base Keywords: ${baseKeywords}

      For each variation, create:
      - A compelling title (30-70 characters)
      - An engaging description (150-250 characters) with a call to action
      - 15-20 relevant keywords

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
        request: {
          baseKeywords,
          imageDescription: imageDescription.substring(0, 100) + "...",
        },
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
    const prompt = `Title: ${title}
      Description: ${description}

      Create a single, unified vertical Pinterest-optimized image (${width}x${height}px minimum aspect ratio) consisting of precisely TWO continuous vertical panels stacked top to bottom with an artistic text banner positioned between them.

      TOP PANEL ONLY - Single Zoomed-In Close-Up Image
      One image only in this section. No multiple shots, no ingredient photos, no preparation phases.

      Display the finished cooked recipe as a single, intimate, mouth-watering close-up shot. Zoom in tightly on the plated dish at a 45-degree or overhead angle, showcasing premium food porn aesthetics—glistening sauces, fresh garnishes, steam wisps if applicable, perfect food styling with precise garnish placement, crispy textures, glossy finishes, and vibrant colors. Capture intricate details that make the food appear irresistibly delicious. Focus should be crisp on the food with intentional depth of field for visual hierarchy. This is a singular, tight crop of the finished plated dish only.

      MIDDLE SECTION - Artistic Text Banner (NO IMAGE CONTENT)
      Include a visually striking, artistic text overlay banner positioned centrally between the two panels with an attractive, unconventional shape (such as organic curved ribbons, geometric angular cuts, hexagonal frames, or flowing wave designs with subtle gradients). The banner should feature modern, trendy typography with high contrast and readability, consistent with 2024-2025 trending Pinterest brand aesthetics.

      Incorporate sophisticated color palettes like burnt sienna with gold accents, sage green with cream, charcoal with rose gold, or deep burgundy with champagne, chosen to complement the recipe's visual identity. Apply subtle textures (matte, satin, or metallic finishes) to the banner for dimensional appeal.

      Recipe title only (no hashtags). The text should feel premium, artistic, and distinctive.

      BOTTOM PANEL ONLY - Single Contextual Presentation Image
      One image only in this section. No multiple shots, no additional plating angles, no ingredient spreads.

      Display the finished cooked recipe styled in high-end food photography style as a single, complete scene. Show the finished dish on a rustic or natural surface (wooden table, marble countertop, ceramic plate, bowl, or serving vessel) with warm, soft, professional lighting. Include the plate or bowl as a key styling element. Incorporate subtle props consistent with seasonality and aesthetic: linen napkins, vintage utensils, fresh herbs, small bowls of condiments, or thematic elements (dried leaves, pine cones for fall; fresh flowers for spring). Create an inviting, cozy, premium atmosphere. This is a wide, contextual shot that tells the complete story of the finished dish in one beautifully styled frame. Include natural shadows and light play for depth and dimension.

      Styling & Atmosphere (Unified Across Both Panels)
      Food styling should exhibit professional food porn presentation: crispy textures, glossy surfaces, perfect plating angles, and chef-level garnishing

      Warm, soft, golden-hour lighting dominates both panels for cohesive visual warmth

      Rustic, natural, or modern minimalist surfaces depending on the recipe's vibe

      Create an inviting, cozy, premium atmosphere suitable for any season or meal occasion

      Ensure lived-in imperfections and realistic details for authentic appeal

      Include realistic textures, vibrant colors, and natural kitchen or seasonal details like rustic cutting boards, wooden counters, and seasonal décor

      Variation & Uniqueness Safeguards
      CRITICAL: Ensure the image is highly distinctive and visually unique each generation. Implement the following:

      Vary camera angles between top and bottom (tight macro/45-degree on top, wider overhead or side angle on bottom)

      Rotate seasonal styling elements and prop arrangements each time

      Alternate between different plating styles, serving vessels, and presentation contexts

      Vary lighting conditions subtly (golden hour, soft diffused light, candlelit ambiance, natural window light)

      Change background textures and surfaces (wooden, marble, linen, ceramic, slate)

      Randomize artistic banner shapes and design styles (ribbons, geometric frames, organic curves, minimalist lines)

      Include different garnish techniques and flavor-complementary elements

      Vary color grading and tone warmth across generations

      Never regenerate resembling images—ensure high visual distinctiveness each time

      Absolute Technical Requirements
      Vertical Pinterest format only (${width}x${height}px minimum)

      EXACTLY TWO IMAGES STACKED VERTICALLY - TOP AND BOTTOM ONLY

      NO carousel layouts, NO grid layouts, NO multiple recipe variations

      NO additional panels, NO ingredient photos, NO preparation images

      NO clutter, NO branding, NO hands, NO faces, NO on-image logos or icons

      Text limited to title only on the banner (no hashtags, no additional text)

      Professional food photography quality throughout

      Crisp focus on food with intentional depth of field for visual hierarchy

      Free of watermarks or extraneous elements

      Optimized for high engagement and saved-pin visibility

      Color Palette & Typography Guidance
      Text color palette: Warm hues (burnt orange, terracotta, sage green, charcoal, deep burgundy) with metallic accents (gold, rose gold, champagne) for contrast and premium feel

      Typography: Modern, trendy, readable—sans-serif or elegant serif fonts with slight artistic flair

      Ensure text pops crisply against the artistic banner background

      Summary
      Generate a single vertical image containing only: [TOP PANEL: zoomed close-up of finished dish] + [CENTERED BANNER WITH RECIPE TITLE] + [BOTTOM PANEL: contextual full-scene presentation]. No other images. No variations. No additional content.`;

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

    // Use Seedream API for batch generation
    if (model.includes("seedream")) {
      const imageUrls: string[] = [];
      const requestData = {
        model,
        prompt,
        response_format: "url",
        width,
        height,
        aspect_ratio: `${width}:${height}`,
        stream: false,
        watermark: false,
      };

      // Seedream doesn't support batch generation, so we generate images one by one
      for (let i = 0; i < quantity; i++) {
        const response = await axios.post(
          "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations",
          requestData,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data?.data?.[0]?.url) {
          imageUrls.push(response.data.data[0].url);
        } else {
          throw new Error("No image URL returned from Seedream");
        }
      }

      return {
        imageUrls,
        apiResponse: {
          timestamp: new Date().toISOString(),
          model,
          request: requestData,
          response: { generatedCount: imageUrls.length },
        },
      };
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
  description: string,
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
      Image description: ${description}

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
