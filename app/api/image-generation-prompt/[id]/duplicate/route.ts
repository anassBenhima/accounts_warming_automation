import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';

/**
 * POST: Duplicate an image-generation-prompt for another user
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

    // Only admins can duplicate prompts for other users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can duplicate prompts' }, { status: 403 });
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

    // Fetch the original prompt
    const originalPrompt = await prisma.imageGenerationPrompt.findUnique({
      where: { id },
    });

    if (!originalPrompt) {
      return NextResponse.json({ error: 'Image-generation-prompt not found' }, { status: 404 });
    }

    // Duplicate for each target user
    const duplicatedPrompts = await Promise.all(
      targetUserIds.map(async (targetUserId: string) => {
        // Create the prompt copy
        const newPrompt = await prisma.imageGenerationPrompt.create({
          data: {
            userId: targetUserId,
            name: originalPrompt.name,
            prompt: originalPrompt.prompt,
            isActive: originalPrompt.isActive,
            isShared: true, // Mark as shared when duplicated by admin
          },
        });

        return newPrompt;
      })
    );

    await logger.success({
      module: 'PROMPT',
      action: 'duplicate',
      message: `Duplicated image-generation-prompt "${originalPrompt.name}" for ${targetUserIds.length} users`,
      resourceId: id,
      output: { targetUserIds, duplicatedIds: duplicatedPrompts.map(p => p.id) },
    });

    return NextResponse.json({
      message: `Image-generation-prompt duplicated for ${duplicatedPrompts.length} users`,
      duplicatedPrompts,
    });
  } catch (error) {
    console.error('Error duplicating image-generation-prompt:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate image-generation-prompt' },
      { status: 500 }
    );
  }
}
