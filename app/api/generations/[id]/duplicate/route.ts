import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';

/**
 * POST: Duplicate a generation for another user
 * Only admins can use this endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can duplicate generations for other users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can duplicate generations' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { targetUserIds } = body; // Array of user IDs to duplicate for

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'Target user IDs are required' },
        { status: 400 }
      );
    }

    const logger = createUserLogger(session.user.id);

    // Fetch the original generation
    const originalGeneration = await prisma.generatedImage.findUnique({
      where: { id },
      include: {
        template: true,
      },
    });

    if (!originalGeneration) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Duplicate for each target user
    const duplicatedGenerations = await Promise.all(
      targetUserIds.map(async (targetUserId: string) => {
        return await prisma.generatedImage.create({
          data: {
            userId: targetUserId,
            prompt: originalGeneration.prompt,
            negativePrompt: originalGeneration.negativePrompt,
            imageUrl: originalGeneration.imageUrl,
            generatedImagePath: originalGeneration.generatedImagePath,
            templateId: originalGeneration.templateId,
            width: originalGeneration.width,
            height: originalGeneration.height,
            apiKeyId: originalGeneration.apiKeyId,
            model: originalGeneration.model,
            generatedTitle: originalGeneration.generatedTitle,
            generatedDescription: originalGeneration.generatedDescription,
            generatedAltText: originalGeneration.generatedAltText,
            generatedKeywords: originalGeneration.generatedKeywords,
            status: 'completed',
          },
        });
      })
    );

    await logger.success({
      module: 'GENERATION',
      action: 'duplicate',
      message: `Duplicated generation ${id} for ${targetUserIds.length} users`,
      resourceId: id,
      output: { targetUserIds, duplicatedIds: duplicatedGenerations.map(g => g.id) },
    });

    return NextResponse.json({
      message: `Generation duplicated for ${duplicatedGenerations.length} users`,
      duplicatedGenerations,
    });
  } catch (error) {
    console.error('Error duplicating generation:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate generation' },
      { status: 500 }
    );
  }
}
