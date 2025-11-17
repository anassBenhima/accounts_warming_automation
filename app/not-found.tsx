'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Illustration */}
        <div className="mb-8 relative">
          <div className="relative inline-block">
            {/* Main 404 Text */}
            <h1 className="text-[150px] md:text-[200px] font-bold bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-none">
              404
            </h1>

            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-200 rounded-full opacity-60 animate-bounce" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-200 rounded-full opacity-60 animate-pulse" />
            <div className="absolute top-1/2 right-0 w-12 h-12 bg-pink-200 rounded-full opacity-60 animate-ping" />
          </div>
        </div>

        {/* Message */}
        <div className="mb-8 space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Oops! Page Not Found
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. Don't worry, let's get you back on track!
          </p>
        </div>

        {/* Decorative Search Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto justify-center font-semibold"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all w-full sm:w-auto justify-center font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 p-6 bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Need Help?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            If you believe this is an error, please check the URL or contact support.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
            >
              Dashboard
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/dashboard/history"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
            >
              History
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              href="/dashboard/new-generation"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
            >
              New Generation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
