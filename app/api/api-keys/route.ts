import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';

// GET all API keys
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logger = createUserLogger(session.user.id);

    const apiKeys = await logger.track(
      {
        module: 'API_KEY',
        action: 'list',
        message: 'Fetching API keys for user',
      },
      async () => {
        return await prisma.apiKey.findMany({
          where: { userId: session.user.id }, // Filter by user
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            type: true,
            modelName: true,
            isActive: true,
            createdAt: true,
            // Don't return the actual API key for security
            apiKey: false,
          },
        });
      }
    );

    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST create new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, apiKey, modelName } = body;

    if (!name || !type || !apiKey) {
      return NextResponse.json(
        { error: 'Name, type, and API key are required' },
        { status: 400 }
      );
    }

    const logger = createUserLogger(session.user.id);

    const newApiKey = await logger.track(
      {
        module: 'API_KEY',
        action: 'create',
        message: 'Creating new API key',
        input: { name, type, modelName },
      },
      async () => {
        return await prisma.apiKey.create({
          data: {
            userId: session.user.id, // Link to user
            name,
            type,
            apiKey,
            modelName,
          },
        });
      }
    );

    return NextResponse.json(newApiKey);
  } catch (error: any) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
