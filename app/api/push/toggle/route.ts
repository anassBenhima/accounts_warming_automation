import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    // Update all subscriptions for this user
    await prisma.pushSubscription.updateMany({
      where: {
        userId: session.user.id,
      },
      data: {
        enabled,
      },
    });

    return NextResponse.json({
      message: `Notifications ${enabled ? 'enabled' : 'disabled'}`,
      enabled,
    });
  } catch (error) {
    console.error('Error toggling notifications:', error);
    return NextResponse.json(
      { error: 'Failed to toggle notifications' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Handle session errors gracefully
    if (!session || (session as any).error === 'RefreshTokenError') {
      return NextResponse.json({
        error: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    // Get user's subscription status
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: session.user.id,
      },
    });

    const hasSubscriptions = subscriptions.length > 0;
    const enabled = subscriptions.some((sub) => sub.enabled);

    return NextResponse.json({
      hasSubscriptions,
      enabled,
      count: subscriptions.length,
    });
  } catch (error) {
    console.error('Error getting notification status:', error);

    // More specific error handling
    if (error instanceof Error) {
      // Database connection errors
      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Database connection error. Please try again.', code: 'DB_ERROR' },
          { status: 503 }
        );
      }

      // Prisma errors
      if (error.message.includes('Prisma')) {
        return NextResponse.json(
          { error: 'Database query failed. Please try again.', code: 'QUERY_ERROR' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to get notification status', code: 'UNKNOWN_ERROR' },
      { status: 500 }
    );
  }
}
