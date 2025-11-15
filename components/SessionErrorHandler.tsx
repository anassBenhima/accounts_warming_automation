'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * SessionErrorHandler - Monitors the session for refresh token errors
 * and automatically signs out the user if token refresh fails.
 *
 * This component should be included in layouts where authentication is required.
 */
export default function SessionErrorHandler() {
  const { data: session, status } = useSession();
  const hasShownError = useRef(false);

  useEffect(() => {
    // Check if there's a refresh token error in the session
    if (
      status === 'authenticated' &&
      session?.error === 'RefreshTokenError' &&
      !hasShownError.current
    ) {
      hasShownError.current = true;

      // Show error message to user
      toast.error('Your session has expired. Please login again.', {
        duration: 4000,
      });

      // Sign out after a short delay to allow the toast to be seen
      setTimeout(() => {
        signOut({ callbackUrl: '/login' });
      }, 1500);
    }
  }, [session, status]);

  // This component doesn't render anything
  return null;
}
