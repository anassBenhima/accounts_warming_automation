import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import archiver from 'archiver';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch generation with images
    const generation = await prisma.generation.findUnique({
      where: { id },
      include: {
        generatedImages: true,
      },
    });

    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Create a new archiver instance
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Create a readable stream
    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        archive.on('end', () => {
          controller.close();
        });

        archive.on('error', (err) => {
          controller.error(err);
        });

        // Add files to archive
        generation.generatedImages.forEach((image, index) => {
          const pinNumber = index + 1;
          const pinFolder = `pin${pinNumber}`;

          // Add image file if exists
          if (image.finalPath) {
            const imagePath = path.join(process.cwd(), 'public', image.finalPath);
            if (fs.existsSync(imagePath)) {
              const ext = path.extname(image.finalPath);
              archive.file(imagePath, { name: `${pinFolder}/image${ext}` });
            }
          }

          // Add data.json
          const data = {
            title: image.title,
            description: image.description,
            keywords: image.keywords,
            imageUrl: image.finalPath,
            status: image.status,
            createdAt: image.createdAt,
          };
          archive.append(JSON.stringify(data, null, 2), { name: `${pinFolder}/data.json` });
        });

        // Finalize the archive
        archive.finalize();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="generation-${id}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error creating ZIP:', error);
    return NextResponse.json({ error: 'Failed to create ZIP file' }, { status: 500 });
  }
}
