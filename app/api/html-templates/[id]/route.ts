import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';

/**
 * PUT: Update an HTML template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logger = createUserLogger(session.user.id);
    const { id } = await params;
    const body = await request.json();
    const { name, description, htmlContent, dynamicAreas } = body;

    // Check if template exists
    const existingTemplate = await prisma.htmlTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check ownership (or admin)
    if (existingTemplate.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (!htmlContent || !htmlContent.trim()) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    if (!Array.isArray(dynamicAreas)) {
      return NextResponse.json({ error: 'Dynamic areas must be an array' }, { status: 400 });
    }

    // Update the template
    const updatedTemplate = await prisma.htmlTemplate.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        htmlContent: htmlContent.trim(),
        dynamicAreas,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await logger.success({
      module: 'HTML_TEMPLATE',
      action: 'update',
      message: `Updated HTML template "${name}"`,
      resourceId: id,
      output: { templateId: id, name },
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating HTML template:', error);
    return NextResponse.json(
      { error: 'Failed to update HTML template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete an HTML template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logger = createUserLogger(session.user.id);
    const { id } = await params;

    // Check if template exists
    const existingTemplate = await prisma.htmlTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check ownership (or admin)
    if (existingTemplate.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the template
    await prisma.htmlTemplate.delete({
      where: { id },
    });

    await logger.success({
      module: 'HTML_TEMPLATE',
      action: 'delete',
      message: `Deleted HTML template "${existingTemplate.name}"`,
      resourceId: id,
      output: { templateId: id, name: existingTemplate.name },
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting HTML template:', error);
    return NextResponse.json(
      { error: 'Failed to delete HTML template' },
      { status: 500 }
    );
  }
}
