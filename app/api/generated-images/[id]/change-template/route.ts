import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';
import sharp from 'sharp';
import path from 'path';
import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { exiftool } from 'exiftool-vendored';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const logger = createUserLogger(session.user.id);

    const result = await logger.track(
      {
        module: 'IMAGE_PROCESSING',
        action: 'change_template',
        message: 'Changing template for generated image',
        resourceId: id,
        input: { imageId: id, templateId },
      },
      async () => {
        // Fetch the generated image
        const generatedImage = await prisma.generatedImage.findUnique({
          where: { id },
          include: {
            generation: true,
          },
        });

        if (!generatedImage) {
          throw new Error('Generated image not found');
        }

        // Verify ownership via generation
        if (generatedImage.generation.userId !== session.user.id) {
          throw new Error('Unauthorized access to this image');
        }

        // Fetch the new template
        const template = await prisma.template.findUnique({
          where: { id: templateId },
        });

        if (!template) {
          throw new Error('Template not found');
        }

        // Verify template ownership
        if (template.userId !== session.user.id) {
          throw new Error('Unauthorized access to this template');
        }

        // Apply the new template to the original image
        const newFinalPath = await applyTemplate(generatedImage.originalPath, template);

        // Add metadata to the new image
        await addMetadataToImage(newFinalPath, {
          title: generatedImage.title,
          description: generatedImage.description,
          keywords: generatedImage.keywords,
        });

        // Delete the old final image file if it's different from original
        if (generatedImage.finalPath !== generatedImage.originalPath) {
          try {
            const oldFilePath = path.join(process.cwd(), 'public', generatedImage.finalPath);
            await unlink(oldFilePath);
          } catch (error) {
            console.error('Error deleting old final image:', error);
            // Continue even if deletion fails
          }
        }

        // Update the database record
        const updatedImage = await prisma.generatedImage.update({
          where: { id },
          data: {
            templateId: template.id,
            finalPath: newFinalPath,
          },
          include: {
            template: true,
          },
        });

        return {
          success: true,
          image: updatedImage,
        };
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error changing template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change template' },
      { status: 500 }
    );
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
      await unlink(tempPath);
      await unlink(processedPath);
    } catch (err) {
      console.error('Error deleting temp files:', err);
    }

    return `/generated/${outputFilename}`;
  } catch (error) {
    console.error('Error applying template:', error);
    throw error;
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function addMetadataToImage(
  imagePath: string,
  metadata: { title: string; description: string; keywords: string[] }
): Promise<void> {
  try {
    const fullImagePath = path.join(process.cwd(), 'public', imagePath);

    // Write EXIF and IPTC metadata to the image
    // Using 'as any' to bypass strict type checking as these are valid exiftool tags
    await exiftool.write(
      fullImagePath,
      {
        // IPTC metadata (widely supported for images)
        'IPTC:ObjectName': metadata.title,
        'IPTC:Caption-Abstract': metadata.description,
        'IPTC:Keywords': metadata.keywords,

        // XMP metadata (modern standard, good for web)
        'XMP:Title': metadata.title,
        'XMP:Description': metadata.description,
        'XMP:Subject': metadata.keywords,

        // EXIF metadata
        'EXIF:ImageDescription': metadata.description,
        'EXIF:XPTitle': metadata.title,
        'EXIF:XPKeywords': metadata.keywords.join('; '),
        'EXIF:XPComment': metadata.description,
      } as any,
      ['-overwrite_original'] // Don't create backup files
    );

    console.log(`Successfully wrote metadata to ${imagePath}`);
  } catch (error) {
    console.error('Error writing metadata to image:', error);
    // Don't throw - metadata writing is not critical, continue processing
  }
}
