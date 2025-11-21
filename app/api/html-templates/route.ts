import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';

/**
 * GET: List all HTML templates (filtered by user role)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logger = createUserLogger(session.user.id);

    // Admins see all templates, users only see their own
    const where = session.user.role === 'ADMIN' ? {} : { userId: session.user.id };

    const htmlTemplates = await prisma.htmlTemplate.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    await logger.info({
      module: 'HTML_TEMPLATE',
      action: 'list',
      message: `Retrieved ${htmlTemplates.length} HTML templates`,
    });

    return NextResponse.json(htmlTemplates);
  } catch (error) {
    console.error('Error fetching HTML templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HTML templates' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new HTML template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logger = createUserLogger(session.user.id);

    const body = await request.json();
    const { name, description, htmlContent, dynamicAreas } = body;

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

    // Create the template
    const htmlTemplate = await prisma.htmlTemplate.create({
      data: {
        userId: session.user.id,
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
      action: 'create',
      message: `Created HTML template "${name}"`,
      resourceId: htmlTemplate.id,
      output: { templateId: htmlTemplate.id, name },
    });

    return NextResponse.json(htmlTemplate);
  } catch (error) {
    console.error('Error creating HTML template:', error);
    return NextResponse.json(
      { error: 'Failed to create HTML template' },
      { status: 500 }
    );
  }
}
