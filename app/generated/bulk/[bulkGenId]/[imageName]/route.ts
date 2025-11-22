import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bulkGenId: string; imageName: string }> }
) {
  try {
    const { bulkGenId, imageName } = await params;

    // Security: prevent directory traversal
    if (
      bulkGenId.includes('..') ||
      bulkGenId.includes('/') ||
      bulkGenId.includes('\\') ||
      imageName.includes('..') ||
      imageName.includes('/') ||
      imageName.includes('\\')
    ) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const filePath = join(process.cwd(), 'public', 'generated', 'bulk', bulkGenId, imageName);
    const fileBuffer = await readFile(filePath);

    // Determine content type based on file extension
    const ext = imageName.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
    };

    const contentType = contentTypes[ext || ''] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving bulk image:', error);
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}
