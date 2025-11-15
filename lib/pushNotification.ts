import webpush from 'web-push';
import { prisma } from './prisma';

// Configure web-push with VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@warming.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  generationId?: string;
  tag?: string;
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    // Get all enabled subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        enabled: true,
      },
    });

    if (subscriptions.length === 0) {
      console.log(`No active push subscriptions for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/dashboard/history',
      generationId: payload.generationId,
      tag: payload.tag || 'warming-notification',
    });

    let sent = 0;
    let failed = 0;

    // Send notification to all user's devices
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, notificationPayload);
          sent++;
          console.log(`Push notification sent to device ${subscription.id}`);
        } catch (error: any) {
          failed++;
          console.error(`Failed to send push notification to device ${subscription.id}:`, error);

          // If subscription is no longer valid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Removing invalid subscription ${subscription.id}`);
            await prisma.pushSubscription.delete({
              where: { id: subscription.id },
            }).catch((err) => console.error('Error removing subscription:', err));
          }
        }
      })
    );

    console.log(`Push notifications sent: ${sent}, failed: ${failed}`);
    return { sent, failed };
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return { sent: 0, failed: 0 };
  }
}

export async function sendGenerationCompleteNotification(
  userId: string,
  generationId: string,
  quantity: number
): Promise<void> {
  await sendPushNotification(userId, {
    title: 'Generation Complete! 🔥',
    body: `Your ${quantity} Pinterest pins are ready to view!`,
    url: '/dashboard/history',
    generationId,
    tag: `generation-${generationId}`,
  });
}

export async function sendGenerationFailedNotification(
  userId: string,
  generationId: string,
  error: string
): Promise<void> {
  await sendPushNotification(userId, {
    title: 'Generation Failed',
    body: `Your generation encountered an error: ${error.substring(0, 100)}`,
    url: '/dashboard/history',
    generationId,
    tag: `generation-${generationId}`,
  });
}
