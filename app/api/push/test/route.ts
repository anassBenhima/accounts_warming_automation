import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendPushNotifications } from '@/lib/push-notifications';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Handle session errors gracefully
    if (!session || (session as any).error === 'RefreshTokenError') {
      return NextResponse.json({
        error: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    const body = await request.json();
    const { delaySeconds } = body;

    // Validate delay
    if (typeof delaySeconds !== 'number' || delaySeconds < 0 || delaySeconds > 300) {
      return NextResponse.json(
        { error: 'Delay must be a number between 0 and 300 seconds' },
        { status: 400 }
      );
    }

    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

    // Send test notification
    const result = await sendPushNotifications(
      session.user.id,
      {
        title: 'Test Notification',
        body: `This is a test notification sent after ${delaySeconds} second${delaySeconds !== 1 ? 's' : ''}. Your notifications are working! 🔥`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          url: '/dashboard',
          type: 'test',
        },
      }
    );

    return NextResponse.json({
      message: 'Test notification sent successfully',
      delaySeconds,
      sentTo: result.successCount,
      failed: result.failureCount,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);

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
      { error: 'Failed to send test notification', code: 'UNKNOWN_ERROR' },
      { status: 500 }
    );
  }
}
