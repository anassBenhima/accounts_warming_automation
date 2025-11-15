import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys, userAgent, deviceId } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: 'Missing required subscription data' },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.pushSubscription.findFirst({
      where: {
        userId: session.user.id,
        endpoint,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      const updated = await prisma.pushSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
          deviceId,
          enabled: true,
        },
      });

      return NextResponse.json({
        message: 'Subscription updated',
        subscription: updated,
      });
    }

    // Create new subscription
    const subscription = await prisma.pushSubscription.create({
      data: {
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        deviceId,
        enabled: true,
      },
    });

    return NextResponse.json({
      message: 'Subscription created',
      subscription,
    });
  } catch (error) {
    console.error('Error creating push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
