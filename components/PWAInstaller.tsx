'use client';

import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000); // Check every hour
          })
          .catch((error) => {
            console.error('[PWA] Service Worker registration failed:', error);
          });
      });
    }

    // Check if already installed
    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // For iOS, show manual install instructions after a delay
    if (iOS && !standalone) {
      // Check if dismissed recently
      const dismissedTime = localStorage.getItem('pwa-install-dismissed');
      if (dismissedTime) {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - parseInt(dismissedTime) < sevenDays) {
          return;
        }
      }

      // Show iOS install prompt after 3 seconds
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
      return;
    }

    // Listen for the beforeinstallprompt event (non-iOS)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show our custom install prompt
      setShowInstallPrompt(true);
      console.log('[PWA] Install prompt ready');
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`[PWA] User response: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    } else {
      console.log('[PWA] User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Show again in 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || isStandalone || !showInstallPrompt) {
    return null;
  }

  // iOS install instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl shadow-2xl p-4 border border-red-500">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <span className="text-3xl">🔥</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg mb-1">Install Warming App</h3>
              <p className="text-sm text-red-50 mb-3">
                Install for instant notifications and offline access!
              </p>
              <div className="bg-red-700 bg-opacity-50 rounded-lg p-3 mb-3 text-sm">
                <div className="flex items-start gap-2 mb-2">
                  <span className="flex-shrink-0 mt-0.5">1.</span>
                  <span>Tap the <Share className="w-4 h-4 inline mx-1" /> Share button below</span>
                </div>
                <div className="flex items-start gap-2 mb-2">
                  <span className="flex-shrink-0 mt-0.5">2.</span>
                  <span>Scroll and tap "Add to Home Screen"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">3.</span>
                  <span>Tap "Add" in the top right</span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-all"
              >
                Got it!
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-white hover:text-red-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Android install prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl shadow-2xl p-4 border border-red-500">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <span className="text-3xl">🔥</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1">Install Warming App</h3>
            <p className="text-sm text-red-50 mb-3">
              Get instant notifications when your Pinterest pins are ready. Works offline!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 bg-red-700 hover:bg-red-800 rounded-lg transition-all"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white hover:text-red-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
