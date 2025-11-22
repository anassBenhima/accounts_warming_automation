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

    const isAdmin = session.user.role === 'ADMIN';

    // Get pagination parameters from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Calculate skip
    const skip = (page - 1) * limit;

    // Define where clause
    const where = isAdmin ? {} : { userId: session.user.id }; // Admins see all, users see own

    // Get total count
    const totalCount = await prisma.bulkGeneration.count({ where });

    // Get paginated data
    const bulkGenerations = await prisma.bulkGeneration.findMany({
      where,
      include: {
        rows: {
          include: {
            _count: {
              select: { generatedPins: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Return paginated response
    return NextResponse.json({
      data: bulkGenerations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
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
      imageGenModel,
      keywordSearchModel,
      imageDescModel,
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
        imageGenModel: imageGenModel || null,
        keywordSearchModel: keywordSearchModel || null,
        imageDescModel: imageDescModel || null,
        imageWidth,
        imageHeight,
        totalRows: rows.length,
        status: 'PENDING',
        rows: {
          create: rows.map((row: any) => ({
            keywords: row.keywords,
            imageUrl: row.imageUrl,
            title: row.title || null,
            description: row.description || null,
            altText: row.altText || null,
            quantity: row.quantity,
            publishDate: row.publishDate || null,
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
