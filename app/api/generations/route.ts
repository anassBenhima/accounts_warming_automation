import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processGeneration } from '@/lib/services/generationService';
import { createUserLogger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logger = createUserLogger(session.user.id);

    const generations = await logger.track(
      {
        module: 'GENERATION',
        action: 'list',
        message: 'Fetching generations for user',
      },
      async () => {
        return await prisma.generation.findMany({
          where: { userId: session.user.id }, // Filter by user
          orderBy: { createdAt: 'desc' },
          include: {
            generatedImages: true,
            generationTemplates: {
              include: {
                template: true,
              },
            },
          },
        });
      }
    );

    return NextResponse.json(generations);
  } catch (error) {
    console.error('Error fetching generations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      imageGenApiKeyId,
      imageGenModel,
      keywordSearchApiKeyId,
      imageDescApiKeyId,
      imageDescModel,
      quantity,
      uploadedImagePath,
      additionalKeywords,
      imageToPromptId,
      imageGenerationPromptId,
      keywordSearchPromptId,
      templateIds,
    } = body;

    // Validate required fields
    if (
      !imageGenApiKeyId ||
      !imageGenModel ||
      !keywordSearchApiKeyId ||
      !imageDescApiKeyId ||
      !imageDescModel ||
      !quantity ||
      !uploadedImagePath ||
      !imageToPromptId ||
      !imageGenerationPromptId ||
      !keywordSearchPromptId ||
      !templateIds ||
      templateIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const logger = createUserLogger(session.user.id);

    // Create generation record
    const generation = await logger.track(
      {
        module: 'GENERATION',
        action: 'create',
        message: 'Creating new generation',
        input: {
          imageGenModel,
          keywordSearchApiKeyId,
          imageDescModel,
          quantity,
          templateIds,
        },
      },
      async () => {
        return await prisma.generation.create({
          data: {
            userId: session.user.id, // Link to user
            imageGenApiKeyId,
            imageGenModel,
            keywordSearchApiKeyId,
            imageDescApiKeyId,
            imageDescModel,
            quantity,
            uploadedImagePath,
            additionalKeywords,
            imageToPromptId,
            imageGenerationPromptId,
            keywordSearchPromptId,
            status: 'PENDING',
            generationTemplates: {
              create: templateIds.map((templateId: string) => ({
                templateId,
              })),
            },
          },
          include: {
            generationTemplates: {
              include: {
                template: true,
              },
            },
          },
        });
      }
    );

    // Start processing asynchronously (don't await)
    processGeneration(generation.id).catch((error) => {
      console.error('Error processing generation:', error);
    });

    return NextResponse.json(generation);
  } catch (error) {
    console.error('Error creating generation:', error);
    return NextResponse.json(
      { error: 'Failed to create generation' },
      { status: 500 }
    );
  }
}
