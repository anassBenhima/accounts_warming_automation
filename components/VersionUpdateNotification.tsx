'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X, RefreshCw } from 'lucide-react';

// Update this version number when deploying new versions
const CURRENT_VERSION = '1.0.1';

export default function VersionUpdateNotification() {
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Check if this is a new version
    const storedVersion = localStorage.getItem('app-version');

    if (storedVersion && storedVersion !== CURRENT_VERSION) {
      // New version detected!
      setShowNotification(true);
      // Update the stored version
      localStorage.setItem('app-version', CURRENT_VERSION);
    } else if (!storedVersion) {
      // First visit - just store the version without showing notification
      localStorage.setItem('app-version', CURRENT_VERSION);
    }
  }, []);

  const handleDismiss = () => {
    setShowNotification(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 p-6 text-white relative overflow-hidden">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Beautiful SVG Illustration */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {/* Animated circles background */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-white opacity-10 rounded-full animate-pulse"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-white opacity-20 rounded-full animate-ping"></div>
              </div>

              {/* Main icon */}
              <div className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-10 h-10 text-purple-600 animate-bounce" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">
            New Update Available!
          </h2>
          <p className="text-center text-white text-opacity-90 text-sm">
            Version {CURRENT_VERSION}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">🎉</span>
              What's New
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Enhanced bulk generation with content variations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Improved image generation quality and reliability</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Better alt text integration for accessibility</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Performance improvements and bug fixes</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Later
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            Your work is automatically saved
          </p>
        </div>
      </div>
    </div>
  );
}
