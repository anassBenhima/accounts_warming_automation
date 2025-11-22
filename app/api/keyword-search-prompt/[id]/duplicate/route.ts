import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';

/**
 * POST: Duplicate a keyword-search-prompt for another user
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
    const originalPrompt = await prisma.keywordSearchPrompt.findUnique({
      where: { id },
    });

    if (!originalPrompt) {
      return NextResponse.json({ error: 'Keyword-search-prompt not found' }, { status: 404 });
    }

    // Duplicate for each target user
    const duplicatedPrompts = await Promise.all(
      targetUserIds.map(async (targetUserId: string) => {
        // Check if user already has a prompt with this name
        let finalName = originalPrompt.name;
        let counter = 1;

        while (await prisma.keywordSearchPrompt.findFirst({
          where: {
            userId: targetUserId,
            name: finalName,
          },
        })) {
          finalName = `${originalPrompt.name} (Copy ${counter})`;
          counter++;
        }

        // Create the prompt copy
        const newPrompt = await prisma.keywordSearchPrompt.create({
          data: {
            userId: targetUserId,
            name: finalName,
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
      message: `Duplicated keyword-search-prompt "${originalPrompt.name}" for ${targetUserIds.length} users`,
      resourceId: id,
      output: { targetUserIds, duplicatedIds: duplicatedPrompts.map(p => p.id) },
    });

    return NextResponse.json({
      message: `Keyword-search-prompt duplicated for ${duplicatedPrompts.length} users`,
      duplicatedPrompts,
    });
  } catch (error) {
    console.error('Error duplicating keyword-search-prompt:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate keyword-search-prompt' },
      { status: 500 }
    );
  }
}
