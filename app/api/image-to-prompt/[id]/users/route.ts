import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET: Get available and assigned users for sharing this prompt
 * Only admins can use this endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can share prompts
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can share prompts' }, { status: 403 });
    }

    const { id } = await params;

    // Fetch the original prompt
    const originalPrompt = await prisma.imageToPrompt.findUnique({
      where: { id },
    });

    if (!originalPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Fetch all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Find users who already have a prompt with the same name
    const usersWithPrompt = await prisma.imageToPrompt.findMany({
      where: {
        name: originalPrompt.name,
        userId: {
          not: originalPrompt.userId, // Exclude the owner
        },
      },
      select: {
        userId: true,
      },
    });

    const assignedUserIds = new Set(usersWithPrompt.map(p => p.userId));

    // Split users into assigned and available
    const assignedUsers = allUsers.filter(user =>
      assignedUserIds.has(user.id) && user.id !== originalPrompt.userId
    );
    const availableUsers = allUsers.filter(user =>
      !assignedUserIds.has(user.id) && user.id !== originalPrompt.userId
    );

    return NextResponse.json({
      availableUsers,
      assignedUsers,
    });
  } catch (error) {
    console.error('Error fetching users for prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
