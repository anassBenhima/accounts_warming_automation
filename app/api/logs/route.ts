import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LogLevel, LogModule } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as LogLevel | null;
    const logModule = searchParams.get('module') as LogModule | null;
    const resourceId = searchParams.get('resourceId');

    const logs = await prisma.systemLog.findMany({
      where: {
        userId: session.user.id, // Filter logs by current user
        ...(level && { level }),
        ...(logModule && { module: logModule }),
        ...(resourceId && { resourceId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to last 100 logs
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
