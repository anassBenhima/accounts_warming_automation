import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch a specific bulk generation with all details
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

    const bulkGeneration = await prisma.bulkGeneration.findUnique({
      where: { id },
      include: {
        rows: {
          include: {
            generatedPins: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!bulkGeneration) {
      return NextResponse.json({ error: 'Bulk generation not found' }, { status: 404 });
    }

    // Verify ownership
    if (bulkGeneration.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(bulkGeneration);
  } catch (error) {
    console.error('Error fetching bulk generation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulk generation' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel/delete a bulk generation
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

    // Fetch bulk generation to verify ownership
    const bulkGeneration = await prisma.bulkGeneration.findUnique({
      where: { id },
    });

    if (!bulkGeneration) {
      return NextResponse.json({ error: 'Bulk generation not found' }, { status: 404 });
    }

    if (bulkGeneration.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If still processing, mark as cancelled instead of deleting
    if (bulkGeneration.status === 'PROCESSING' || bulkGeneration.status === 'PENDING') {
      await prisma.bulkGeneration.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      return NextResponse.json({ message: 'Bulk generation cancelled' });
    }

    // Delete the bulk generation (cascade will delete rows and pins)
    await prisma.bulkGeneration.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Bulk generation deleted' });
  } catch (error) {
    console.error('Error deleting bulk generation:', error);
    return NextResponse.json(
      { error: 'Failed to delete bulk generation' },
      { status: 500 }
    );
  }
}
