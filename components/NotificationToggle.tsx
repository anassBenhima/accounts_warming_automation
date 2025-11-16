'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [testDelaySeconds, setTestDelaySeconds] = useState(5);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Check notification status on mount
  useEffect(() => {
    checkNotificationStatus();

    // Update permission state
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const response = await fetch('/api/push/toggle');

      if (response.status === 401) {
        const data = await response.json();
        if (data.code === 'SESSION_EXPIRED') {
          console.warn('Session expired - user needs to login again');
          // Don't show error toast on component mount, just log it
          setEnabled(false);
          setHasSubscription(false);
          setIsLoading(false);
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        setEnabled(data.enabled);
        setHasSubscription(data.hasSubscriptions);
      }
    } catch (error) {
      console.error('Failed to check notification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToNotifications = async () => {
    try {
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        toast.error('Service workers are not supported in this browser');
        return false;
      }

      // Check if push notifications are supported
      if (!('PushManager' in window)) {
        toast.error('Push notifications are not supported in this browser');
        return false;
      }

      // Get VAPID public key
      const keyResponse = await fetch('/api/push/vapid-public-key');
      if (!keyResponse.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      const { publicKey } = await keyResponse.json();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(
              String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))
            ),
            auth: btoa(
              String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))
            ),
          },
          userAgent: navigator.userAgent,
          deviceId: `${navigator.platform}-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setHasSubscription(true);
      return true;
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  };

  const handleToggle = async () => {
    setIsLoading(true);

    try {
      // Check if we need to request permission
      if (permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === 'denied') {
          toast.error('Notification permission denied. Please enable it in your browser settings.');
          setIsLoading(false);
          return;
        }
      }

      if (permission === 'denied') {
        toast.error('Notifications are blocked. Please enable them in your browser settings.');
        setIsLoading(false);
        return;
      }

      // If enabling and no subscription exists, subscribe first
      if (!enabled && !hasSubscription) {
        const subscribed = await subscribeToNotifications();
        if (!subscribed) {
          setIsLoading(false);
          return;
        }
      }

      // Toggle notification status
      const response = await fetch('/api/push/toggle', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: !enabled,
        }),
      });

      if (response.status === 401) {
        const data = await response.json();
        if (data.code === 'SESSION_EXPIRED') {
          toast.error('Your session has expired. Please logout and login again.');
          setIsLoading(false);
          return;
        }
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to toggle notifications');
      }

      const data = await response.json();
      setEnabled(data.enabled);

      toast.success(
        data.enabled
          ? 'Notifications enabled! You\'ll receive updates when generations complete.'
          : 'Notifications disabled.'
      );
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update notification settings';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!enabled) {
      toast.error('Please enable notifications first');
      return;
    }

    if (testDelaySeconds < 0 || testDelaySeconds > 300) {
      toast.error('Delay must be between 0 and 300 seconds');
      return;
    }

    setIsSendingTest(true);

    try {
      toast.loading(`Sending test notification in ${testDelaySeconds} second${testDelaySeconds !== 1 ? 's' : ''}...`);

      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delaySeconds: testDelaySeconds,
        }),
      });

      if (response.status === 401) {
        const data = await response.json();
        if (data.code === 'SESSION_EXPIRED') {
          toast.error('Your session has expired. Please logout and login again.');
          return;
        }
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send test notification');
      }

      const data = await response.json();
      toast.dismiss();
      toast.success(`Test notification sent successfully to ${data.sentTo} device${data.sentTo !== 1 ? 's' : ''}!`);
    } catch (error) {
      toast.dismiss();
      console.error('Failed to send test notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send test notification';
      toast.error(errorMessage);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="p-3 md:p-4 border-t border-gray-200">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`flex items-center justify-between w-full px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-sm md:text-base ${
          enabled
            ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
            : 'text-gray-700 hover:bg-gray-100'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-3">
          {enabled ? (
            <Bell className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          ) : (
            <BellOff className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          )}
          <span className="font-medium">Notifications</span>
        </div>

        {/* Toggle switch */}
        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-white' : 'bg-gray-300'
        }`}>
          <span
            className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
              enabled ? 'translate-x-6 bg-red-600' : 'translate-x-1 bg-white'
            }`}
          />
        </div>
      </button>

      {permission === 'denied' && (
        <p className="text-xs text-red-600 mt-2 px-3 md:px-4">
          Notifications are blocked. Enable them in browser settings.
        </p>
      )}

      {/* Test Notification Section */}
      {enabled && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-700">Test Notification</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Send a test notification to verify notifications are working
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="delay-seconds" className="block text-xs text-gray-600 mb-1">
                Delay (seconds)
              </label>
              <input
                id="delay-seconds"
                type="number"
                min="0"
                max="300"
                value={testDelaySeconds}
                onChange={(e) => setTestDelaySeconds(Number(e.target.value))}
                disabled={isSendingTest}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="5"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleTestNotification}
                disabled={isSendingTest}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  isSendingTest
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:shadow-lg'
                }`}
              >
                <Send className="w-4 h-4" />
                {isSendingTest ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
