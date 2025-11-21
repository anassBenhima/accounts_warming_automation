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
    const isAdmin = session.user.role === 'ADMIN';

    const apiKeys = await logger.track(
      {
        module: 'API_KEY',
        action: 'list',
        message: 'Fetching API keys for user',
      },
      async () => {
        if (isAdmin) {
          // Admins see ALL API keys
          return await prisma.apiKey.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              type: true,
              usageType: true,
              modelName: true,
              isActive: true,
              createdAt: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              assignments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              // Don't return the actual API key for security
              apiKey: false,
            },
          });
        } else {
          // Regular users see their own keys + keys assigned to them
          const ownKeys = await prisma.apiKey.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              type: true,
              usageType: true,
              modelName: true,
              isActive: true,
              createdAt: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              assignments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              apiKey: false,
            },
          });

          const assignedKeys = await prisma.apiKey.findMany({
            where: {
              assignments: {
                some: {
                  userId: session.user.id,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              type: true,
              usageType: true,
              modelName: true,
              isActive: true,
              createdAt: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              assignments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              apiKey: false,
            },
          });

          // Merge and deduplicate
          const allKeys = [...ownKeys, ...assignedKeys];
          const uniqueKeys = Array.from(
            new Map(allKeys.map(key => [key.id, key])).values()
          );

          return uniqueKeys;
        }
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
    const { name, type, usageType, apiKey, modelName } = body;

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
        input: { name, type, usageType, modelName },
      },
      async () => {
        return await prisma.apiKey.create({
          data: {
            userId: session.user.id, // Link to user
            name,
            type,
            usageType: usageType || 'all',
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
