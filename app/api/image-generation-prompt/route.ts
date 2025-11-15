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

    const prompts = await logger.track(
      {
        module: 'PROMPT',
        action: 'list',
        message: 'Fetching image generation prompts',
      },
      async () => {
        return await prisma.imageGenerationPrompt.findMany({
          where: { userId: session.user.id }, // Filter by user
          orderBy: { createdAt: 'desc' },
        });
      }
    );

    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, prompt } = body;

    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      );
    }

    const logger = createUserLogger(session.user.id);

    const newPrompt = await logger.track(
      {
        module: 'PROMPT',
        action: 'create',
        message: 'Creating image generation prompt',
        input: { name },
      },
      async () => {
        return await prisma.imageGenerationPrompt.create({
          data: {
            userId: session.user.id, // Link to user
            name,
            prompt,
          },
        });
      }
    );

    return NextResponse.json(newPrompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
  }
}
