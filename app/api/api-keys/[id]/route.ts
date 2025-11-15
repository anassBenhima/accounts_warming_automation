import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';

// PUT update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, type, apiKey, modelName, isActive } = body;
    const logger = createUserLogger(session.user.id);

    // Verify ownership before update
    const existing = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: session.user.id, // Ensure user owns this resource
      },
    });

    if (!existing) {
      await logger.warning({
        module: 'API_KEY',
        action: 'update',
        message: 'Unauthorized update attempt',
        resourceId: id,
      });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updatedApiKey = await logger.track(
      {
        module: 'API_KEY',
        action: 'update',
        message: 'Updating API key',
        resourceId: id,
        input: { name, type, modelName, isActive },
      },
      async () => {
        return await prisma.apiKey.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(type && { type }),
            ...(apiKey && { apiKey }),
            ...(modelName !== undefined && { modelName }),
            ...(isActive !== undefined && { isActive }),
          },
        });
      }
    );

    return NextResponse.json(updatedApiKey);
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

// DELETE API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const logger = createUserLogger(session.user.id);

    // Verify ownership before delete
    const existing = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: session.user.id, // Ensure user owns this resource
      },
    });

    if (!existing) {
      await logger.warning({
        module: 'API_KEY',
        action: 'delete',
        message: 'Unauthorized delete attempt',
        resourceId: id,
      });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await logger.track(
      {
        module: 'API_KEY',
        action: 'delete',
        message: 'Deleting API key',
        resourceId: id,
      },
      async () => {
        await prisma.apiKey.delete({
          where: { id },
        });
        return { id };
      }
    );

    return NextResponse.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
