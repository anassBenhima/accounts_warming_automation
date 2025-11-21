import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;

    // If updating isShared, verify ownership
    if (body.isShared !== undefined) {
      const template = await prisma.template.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const isAdmin = session.user.role === 'ADMIN';
      const isOwner = template.userId === session.user.id;

      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { error: 'Only the owner or admin can change sharing status' },
          { status: 403 }
        );
      }
    }

    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.type && { type: body.type }),
        ...(body.filePath !== undefined && { filePath: body.filePath }),
        ...(body.positionX !== undefined && { positionX: body.positionX }),
        ...(body.positionY !== undefined && { positionY: body.positionY }),
        ...(body.width !== undefined && { width: body.width }),
        ...(body.height !== undefined && { height: body.height }),
        ...(body.opacity !== undefined && { opacity: body.opacity }),
        ...(body.textContent !== undefined && { textContent: body.textContent }),
        ...(body.fontSize !== undefined && { fontSize: body.fontSize }),
        ...(body.fontColor !== undefined && { fontColor: body.fontColor }),
        ...(body.fontFamily !== undefined && { fontFamily: body.fontFamily }),
        ...(body.previewPath !== undefined && { previewPath: body.previewPath }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isShared !== undefined && { isShared: body.isShared }),
      },
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.template.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
