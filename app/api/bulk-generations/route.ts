import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processBulkGeneration } from '@/lib/services/bulkGenerationService';

// GET: Fetch all bulk generations for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bulkGenerations = await prisma.bulkGeneration.findMany({
      where: { userId: session.user.id },
      include: {
        rows: {
          include: {
            _count: {
              select: { generatedPins: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(bulkGenerations);
  } catch (error) {
    console.error('Error fetching bulk generations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulk generations' },
      { status: 500 }
    );
  }
}

// POST: Create a new bulk generation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      imageGenApiKeyId,
      keywordSearchApiKeyId,
      imageDescApiKeyId,
      imageWidth = 1000,
      imageHeight = 1500,
      rows,
    } = body;

    // Validate required fields
    if (!name || !imageGenApiKeyId || !keywordSearchApiKeyId || !imageDescApiKeyId || !rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create bulk generation with rows
    const bulkGeneration = await prisma.bulkGeneration.create({
      data: {
        userId: session.user.id,
        name,
        imageGenApiKeyId,
        keywordSearchApiKeyId,
        imageDescApiKeyId,
        imageWidth,
        imageHeight,
        totalRows: rows.length,
        status: 'PENDING',
        rows: {
          create: rows.map((row: any) => ({
            keywords: row.keywords,
            imageUrl: row.imageUrl,
            quantity: row.quantity,
            status: 'PENDING',
          })),
        },
      },
      include: {
        rows: true,
      },
    });

    // Start processing in the background (non-blocking)
    processBulkGeneration(bulkGeneration.id).catch((error) => {
      console.error('Background processing error:', error);
    });

    return NextResponse.json(bulkGeneration);
  } catch (error) {
    console.error('Error creating bulk generation:', error);
    return NextResponse.json(
      { error: 'Failed to create bulk generation' },
      { status: 500 }
    );
  }
}
