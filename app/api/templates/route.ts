import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logger = createUserLogger(session.user.id);
    const isAdmin = session.user.role === 'ADMIN';

    const templates = await logger.track(
      {
        module: 'TEMPLATE',
        action: 'list',
        message: 'Fetching templates for user',
      },
      async () => {
        return await prisma.template.findMany({
          where: isAdmin
            ? {} // Admin sees all
            : {
                OR: [
                  { userId: session.user.id }, // Own templates
                  { isShared: true }, // Shared templates
                ],
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
          orderBy: { createdAt: 'desc' },
        });
      }
    );

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
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
      name,
      type,
      filePath,
      positionX,
      positionY,
      width,
      height,
      opacity,
      textContent,
      fontSize,
      fontColor,
      fontFamily,
      previewPath,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const logger = createUserLogger(session.user.id);

    const template = await logger.track(
      {
        module: 'TEMPLATE',
        action: 'create',
        message: 'Creating template',
        input: { name, type },
      },
      async () => {
        return await prisma.template.create({
          data: {
            userId: session.user.id, // Link to user
            name,
            type,
            filePath,
            positionX,
            positionY,
            width,
            height,
            opacity,
            textContent,
            fontSize,
            fontColor,
            fontFamily,
            previewPath,
          },
        });
      }
    );

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
