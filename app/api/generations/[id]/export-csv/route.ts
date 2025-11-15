import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get the base URL from the request
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3333';

    // Create CSV header (Pinterest bulk upload format)
    const csvRows = [
      ['Title', 'Description', 'Media URL', 'Pinterest board', 'Thumbnail'].join(','),
    ];

    // Add data rows
    generation.generatedImages.forEach((image) => {
      if (image.finalPath) {
        // Create publicly accessible URL
        const mediaUrl = `${baseUrl}${image.finalPath}`;

        // Escape CSV values (handle commas and quotes)
        const escapeCSV = (value: string) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };

        const row = [
          escapeCSV(image.title || ''),
          escapeCSV(image.description || ''),
          escapeCSV(mediaUrl),
          '', // Pinterest board - empty for user to fill later
          '', // Thumbnail - blank for image pins
        ].join(',');

        csvRows.push(row);
      }
    });

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pinterest-bulk-upload-${id}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error creating CSV:', error);
    return NextResponse.json({ error: 'Failed to create CSV file' }, { status: 500 });
  }
}
