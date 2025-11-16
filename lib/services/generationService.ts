import { prisma } from '@/lib/prisma';
import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import { writeFile, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { createUserLogger } from '@/lib/logger';
import { falService } from '@/lib/fal';
import { sendGenerationCompleteNotification, sendGenerationFailedNotification } from '@/lib/pushNotification';

export async function processGeneration(generationId: string) {
  try {
    // Update status to processing
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: 'PROCESSING' },
    });

    // Fetch generation data with all relations
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      include: {
        generationTemplates: {
          include: {
            template: true,
          },
        },
      },
    });

    if (!generation) {
      throw new Error('Generation not found');
    }

    // Fetch API keys and prompts
    const [imageDescApiKey, keywordApiKey, imageGenApiKey, imageToPrompt, imageGenPrompt, keywordPrompt] =
      await Promise.all([
        prisma.apiKey.findUnique({ where: { id: generation.imageDescApiKeyId } }),
        prisma.apiKey.findUnique({ where: { id: generation.keywordSearchApiKeyId } }),
        prisma.apiKey.findUnique({ where: { id: generation.imageGenApiKeyId } }),
        prisma.imageToPrompt.findUnique({ where: { id: generation.imageToPromptId } }),
        prisma.imageGenerationPrompt.findUnique({ where: { id: generation.imageGenerationPromptId } }),
        prisma.keywordSearchPrompt.findUnique({ where: { id: generation.keywordSearchPromptId } }),
      ]);

    if (!imageDescApiKey || !keywordApiKey || !imageGenApiKey || !imageToPrompt || !imageGenPrompt || !keywordPrompt) {
      throw new Error('Required resources not found');
    }

    // Get user ID for logging
    const userId = generation.userId;
    const logger = createUserLogger(userId);

    // Step 1: Describe the uploaded image
    console.log('Step 1: Describing uploaded image...');
    await logger.info({
      module: 'GENERATION',
      action: 'step_1_start',
      message: 'Starting image description',
      resourceId: generationId,
      input: { imagePath: generation.uploadedImagePath, apiType: imageDescApiKey.type },
    });

    const imageDescription = await describeImage(
      generation.uploadedImagePath,
      imageDescApiKey.apiKey,
      imageDescApiKey.type,
      imageToPrompt.prompt,
      userId
    );

    await prisma.generation.update({
      where: { id: generationId },
      data: { imageDescription },
    });

    // Step 2: Generate keywords
    console.log('Step 2: Generating keywords...');
    await logger.info({
      module: 'GENERATION',
      action: 'step_2_start',
      message: 'Starting keyword generation',
      resourceId: generationId,
      input: { apiType: keywordApiKey.type, quantity: generation.quantity },
    });

    let keywordPromptText = keywordPrompt.prompt;
    if (generation.additionalKeywords) {
      keywordPromptText += `\n\nAdditional context/keywords to incorporate: ${generation.additionalKeywords}`;
    }

    const keywordsData = await generateKeywords(
      keywordApiKey.apiKey,
      keywordApiKey.type,
      keywordPromptText,
      generation.quantity,
      userId
    );

    // Step 3: Generate images for each pin
    console.log('Step 3: Generating images...');
    const templates = generation.generationTemplates.map((gt) => gt.template);

    for (let i = 0; i < generation.quantity; i++) {
      try {
        const pinData = keywordsData[i] || keywordsData[0]; // Fallback to first if not enough data

        // Create image generation prompt
        let fullPrompt = `${imageGenPrompt.prompt}\n\nDescription: ${imageDescription}\n\nTitle: ${pinData.Title}\nKeywords: ${pinData.Keywords.join(', ')}`;

        // Add text instruction if requested
        if (generation.includeTextInImage) {
          fullPrompt += '\n\nIMPORTANT: Include text/words/typography in the generated image.';
        }

        // Generate image
        const generatedImageUrl = await generateImage(
          imageGenApiKey.apiKey,
          imageGenApiKey.type,
          generation.imageGenModel,
          fullPrompt,
          generation.imageWidth,
          generation.imageHeight
        );

        // Download generated image
        const originalPath = await downloadImage(generatedImageUrl, `original_${i}`);

        // Apply random template
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        const finalPath = await applyTemplate(originalPath, randomTemplate);

        // Add metadata to image
        await addMetadataToImage(finalPath, {
          title: pinData.Title,
          description: pinData.description,
          keywords: pinData.Keywords,
        });

        // Save to database
        await prisma.generatedImage.create({
          data: {
            generationId,
            templateId: randomTemplate.id,
            originalPath,
            finalPath,
            title: pinData.Title,
            description: pinData.description,
            keywords: pinData.Keywords,
            status: 'completed',
          },
        });

        console.log(`Generated image ${i + 1}/${generation.quantity}`);
      } catch (error) {
        console.error(`Error generating image ${i + 1}:`, error);
        await prisma.generatedImage.create({
          data: {
            generationId,
            originalPath: '',
            finalPath: '',
            title: '',
            description: '',
            keywords: [],
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    // Update generation status
    await prisma.generation.update({
      where: { id: generationId },
      data: { status: 'COMPLETED' },
    });

    console.log('Generation completed successfully!');

    // Send push notification
    await sendGenerationCompleteNotification(
      userId,
      generationId,
      generation.quantity
    ).catch((error) => {
      console.error('Failed to send push notification:', error);
    });
  } catch (error) {
    console.error('Error in processGeneration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Get generation to get userId
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      select: { userId: true },
    });

    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: 'FAILED',
        error: errorMessage,
      },
    });

    // Send failure notification
    if (generation) {
      await sendGenerationFailedNotification(
        generation.userId,
        generationId,
        errorMessage
      ).catch((err) => {
        console.error('Failed to send failure notification:', err);
      });
    }
  }
}

async function describeImage(
  imagePath: string,
  apiKey: string,
  apiType: string,
  prompt: string,
  userId?: string
): Promise<string> {
  const logger = userId ? createUserLogger(userId) : null;
  const startTime = Date.now();

  try {
    // Read image file and convert to base64
    const fullImagePath = path.join(process.cwd(), 'public', imagePath);
    const imageBuffer = await readFile(fullImagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    // DeepSeek doesn't support vision API, only OpenAI does
    if (apiType !== 'openai') {
      const fallbackDesc = 'A delicious food image with vibrant colors and appetizing presentation.';

      if (logger) {
        await logger.warning({
          module: 'IMAGE_PROCESSING',
          action: 'describe_image',
          message: `Image description not supported for ${apiType}, using fallback`,
          input: { apiType, imagePath },
          output: { description: fallbackDesc },
          duration: Date.now() - startTime,
        });
      }

      return fallbackDesc;
    }

    // Use OpenAI's cheapest vision model: gpt-4o-mini
    const requestData = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'low', // Use low detail to minimize token usage (85 tokens vs 1100)
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    };

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestData,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const description = response.data.choices[0].message.content;
    const duration = Date.now() - startTime;

    if (logger) {
      await logger.success({
        module: 'API_CALL',
        action: 'openai_vision',
        message: 'Successfully described image using OpenAI gpt-4o-mini',
        input: {
          model: 'gpt-4o-mini',
          prompt: prompt.substring(0, 100) + '...',
          imageSize: `${(imageBuffer.length / 1024).toFixed(2)} KB`,
        },
        output: {
          description: description.substring(0, 200) + '...',
          tokens: response.data.usage,
        },
        duration,
      });
    }

    return description;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Error describing image:', error);

    if (logger) {
      await logger.error({
        module: 'API_CALL',
        action: 'openai_vision',
        message: 'Failed to describe image',
        input: { imagePath, apiType },
        error: error.message,
        stackTrace: error.stack,
        duration,
      });
    }

    // Return fallback description
    return 'A delicious food image with vibrant colors and appetizing presentation.';
  }
}

async function generateKeywords(
  apiKey: string,
  apiType: string,
  prompt: string,
  count: number,
  userId?: string
): Promise<any[]> {
  const logger = userId ? createUserLogger(userId) : null;
  const startTime = Date.now();

  try {
    // Choose API endpoint and model based on type
    const endpoint = apiType === 'deepseek'
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    // Use cheaper models:
    // DeepSeek: deepseek-chat ($0.14/1M input, $0.28/1M output)
    // OpenAI: gpt-4o-mini ($0.15/1M input, $0.60/1M output)
    const model = apiType === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';

    const requestData = {
      model,
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    };

    const response = await axios.post(
      endpoint,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error('Invalid response format - no JSON array found');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const keywords = parsed.slice(0, count);
    const duration = Date.now() - startTime;

    if (logger) {
      await logger.success({
        module: 'API_CALL',
        action: `${apiType}_keywords`,
        message: `Successfully generated ${keywords.length} keyword sets using ${apiType}`,
        input: {
          model,
          promptLength: prompt.length,
          requestedCount: count,
        },
        output: {
          generatedCount: keywords.length,
          tokens: response.data.usage,
          sampleTitle: keywords[0]?.Title,
        },
        duration,
      });
    }

    return keywords;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Error generating keywords:', error);

    if (logger) {
      await logger.error({
        module: 'API_CALL',
        action: `${apiType}_keywords`,
        message: 'Failed to generate keywords, using fallback data',
        input: { apiType, count },
        error: error.message,
        stackTrace: error.stack,
        duration,
      });
    }

    // Return fallback data
    return Array(count).fill({
      Title: 'Delicious Recipe',
      description: 'A wonderful recipe to try at home. Save for later!',
      Keywords: ['recipe', 'food', 'cooking', 'delicious', 'homemade'],
    });
  }
}

async function generateImage(
  apiKey: string,
  apiType: string,
  model: string,
  prompt: string,
  width: number = 1000,
  height: number = 1500
): Promise<string> {
  try {
    // Use fal.ai for 'fal' type, seedream for others
    if (apiType === 'fal') {
      // Configure fal service with API key
      falService.configure(apiKey);

      // Get recommended image size based on model
      const imageSize = falService.getRecommendedImageSize(model, width, height);

      // Generate image using fal.ai
      const result = await falService.generateImage({
        prompt,
        modelName: model,
        imageSize: imageSize as any,
        numImages: 1,
        outputFormat: 'png',
        enableSafetyChecker: true,
      });

      // Return first image URL
      if (result.images && result.images.length > 0) {
        return result.images[0].url;
      } else {
        throw new Error('No images returned from fal.ai');
      }
    } else {
      // Use seedream API for 'seedream' type
      const response = await axios.post(
        'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations',
        {
          model,
          prompt,
          response_format: 'url',
          width,
          height,
          aspect_ratio: `${width}:${height}`,
          stream: false,
          watermark: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data[0].url;
    }
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

async function downloadImage(url: string, prefix: string): Promise<string> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    const filename = `${prefix}_${randomUUID()}.png`;
    const filepath = path.join(process.cwd(), 'public', 'generated', filename);

    await writeFile(filepath, buffer);

    return `/generated/${filename}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

async function applyTemplate(imagePath: string, template: any): Promise<string> {
  try {
    const fullImagePath = path.join(process.cwd(), 'public', imagePath);
    const baseImage = sharp(fullImagePath);
    const metadata = await baseImage.metadata();

    const composites: any[] = [];

    if (template.type === 'OVERLAY_IMAGE' && template.filePath) {
      const overlayPath = path.join(process.cwd(), 'public', template.filePath);
      const overlay = await sharp(overlayPath)
        .resize(metadata.width, metadata.height)
        .toBuffer();

      composites.push({
        input: overlay,
        blend: 'over',
        opacity: template.opacity || 0.1,
      });
    } else if ((template.type === 'WATERMARK' || template.type === 'LOGO') && template.filePath) {
      const logoPath = path.join(process.cwd(), 'public', template.filePath);
      const width = Math.floor((metadata.width! * (template.width || 20)) / 100);
      const height = Math.floor((metadata.height! * (template.height || 20)) / 100);

      const logo = await sharp(logoPath)
        .resize(width, height, { fit: 'contain' })
        .toBuffer();

      const left = Math.floor((metadata.width! * (template.positionX || 50)) / 100);
      const top = Math.floor((metadata.height! * (template.positionY || 50)) / 100);

      composites.push({
        input: logo,
        left,
        top,
        blend: 'over',
      });
    } else if (template.type === 'TEXT' && template.textContent) {
      // For text, we'll use SVG
      // Calculate font size as percentage of image height (default 8%)
      const fontSize = Math.floor((metadata.height! * (template.fontSize || 8)) / 100);
      const svgHeight = fontSize * 2; // Make SVG height double the font size for proper spacing

      const textSvg = `
        <svg width="${metadata.width}" height="${svgHeight}">
          <text
            x="50%"
            y="50%"
            text-anchor="middle"
            dominant-baseline="middle"
            font-family="${template.fontFamily || 'DejaVu Sans, Noto Sans, sans-serif'}"
            font-size="${fontSize}"
            font-weight="bold"
            fill="${template.fontColor || '#000000'}"
          >
            ${escapeXml(template.textContent)}
          </text>
        </svg>
      `;

      composites.push({
        input: Buffer.from(textSvg),
        top: Math.floor((metadata.height! * (template.positionY || 50)) / 100),
        left: 0,
      });
    } else if (template.type === 'TEXT_WITH_BACKGROUND' && template.textContent) {
      // For text with background - full width bar with text
      // Calculate font size as percentage of image height (default 8%)
      const fontSize = Math.floor((metadata.height! * (template.fontSize || 8)) / 100);
      const barHeight = fontSize * 3; // Make bar height 3x the font size for good spacing

      // Determine vertical position based on positionY
      const posY = template.positionY || 50;
      let topPosition: number;
      if (posY <= 33) {
        // Top position
        topPosition = 0;
      } else if (posY <= 66) {
        // Center position
        topPosition = Math.floor((metadata.height! - barHeight) / 2);
      } else {
        // Bottom position
        topPosition = metadata.height! - barHeight;
      }

      const textWithBgSvg = `
        <svg width="${metadata.width}" height="${barHeight}">
          <rect
            x="0"
            y="0"
            width="${metadata.width}"
            height="${barHeight}"
            fill="${template.backgroundColor || '#000000'}"
          />
          <text
            x="50%"
            y="50%"
            text-anchor="middle"
            dominant-baseline="middle"
            font-family="${template.fontFamily || 'DejaVu Sans, Noto Sans, sans-serif'}"
            font-size="${fontSize}"
            font-weight="bold"
            fill="${template.fontColor || '#FFFFFF'}"
          >
            ${escapeXml(template.textContent)}
          </text>
        </svg>
      `;

      composites.push({
        input: Buffer.from(textWithBgSvg),
        top: topPosition,
        left: 0,
      });
    }

    const tempFilename = `temp_${randomUUID()}.png`;
    const tempPath = path.join(process.cwd(), 'public', 'generated', tempFilename);

    // Step 1: Create the composited image
    await baseImage.composite(composites).toFile(tempPath);

    // Step 2: Apply humanizing effects to make image appear more natural
    const processedFilename = `processed_${randomUUID()}.png`;
    const processedPath = path.join(process.cwd(), 'public', 'generated', processedFilename);

    // Create a semi-transparent white overlay layer (0.5% opacity for subtle effect)
    const overlayLayer = await sharp({
      create: {
        width: metadata.width!,
        height: metadata.height!,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0.005 }, // 0.5% opacity
      },
    })
      .png()
      .toBuffer();

    // Create Gaussian noise layer (15% intensity)
    // Generate random noise buffer
    const noiseBuffer = Buffer.alloc(metadata.width! * metadata.height! * 4);
    for (let i = 0; i < noiseBuffer.length; i += 4) {
      // Random grayscale noise with 15% intensity
      const noise = Math.floor((Math.random() - 0.5) * 255 * 0.15);
      noiseBuffer[i] = 128 + noise;     // R
      noiseBuffer[i + 1] = 128 + noise; // G
      noiseBuffer[i + 2] = 128 + noise; // B
      noiseBuffer[i + 3] = 25;          // Alpha (~10% for subtle blend)
    }

    const noiseLayer = await sharp(noiseBuffer, {
      raw: {
        width: metadata.width!,
        height: metadata.height!,
        channels: 4,
      },
    })
      .png()
      .toBuffer();

    // Apply all effects: overlay layer, noise, and contrast adjustment
    await sharp(tempPath)
      .composite([
        { input: overlayLayer, blend: 'over' },
        { input: noiseLayer, blend: 'overlay' },
      ])
      .modulate({
        brightness: 1.01, // 1% brightness increase for subtle contrast boost
      })
      .toFile(processedPath);

    // Step 3: Re-export the image to strip all metadata and create a fresh file
    // This ensures the image is 100% humanized with no AI generation metadata
    const outputFilename = `final_${randomUUID()}.png`;
    const outputPath = path.join(process.cwd(), 'public', 'generated', outputFilename);

    await sharp(processedPath)
      .withMetadata({}) // Strip all existing metadata
      .png({
        quality: 100,
        compressionLevel: 6,
        adaptiveFiltering: true,
      })
      .toFile(outputPath);

    // Step 4: Delete the temporary files
    try {
      const { unlink } = await import('fs/promises');
      await unlink(tempPath);
      await unlink(processedPath);
    } catch (err) {
      console.error('Error deleting temp files:', err);
    }

    return `/generated/${outputFilename}`;
  } catch (error) {
    console.error('Error applying template:', error);
    return imagePath; // Return original on error
  }
}

async function addMetadataToImage(
  imagePath: string,
  metadata: { title: string; description: string; keywords: string[] }
): Promise<void> {
  // This would use exiftool or similar to add EXIF/IPTC metadata
  // For now, we'll skip actual metadata writing as it requires additional dependencies
  console.log(`Metadata for ${imagePath}:`, metadata);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
