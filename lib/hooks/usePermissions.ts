'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Permission {
  module: string;
  actions: string[];
  enabled: boolean;
}

interface PermissionsData {
  isAdmin: boolean;
  permissions: Permission[];
  loading: boolean;
}

export function usePermissions(): PermissionsData {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (status === 'loading' || !session) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/permissions');
        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }

        const data = await response.json();
        setPermissions(data.permissions || []);
        setIsAdmin(data.isAdmin || false);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [session, status]);

  return { isAdmin, permissions, loading };
}

/**
 * Check if user has permission for a specific module and action
 */
export function useHasPermission(module: string, action?: string): boolean {
  const { isAdmin, permissions } = usePermissions();

  // Admins have all permissions
  if (isAdmin) {
    return true;
  }

  const modulePerms = permissions.find((p) => p.module === module);

  if (!modulePerms || !modulePerms.enabled) {
    return false;
  }

  // If no action specified, check if module is enabled
  if (!action) {
    return modulePerms.actions.length > 0;
  }

  return modulePerms.actions.includes(action);
}

/**
 * Get list of modules user has access to
 */
export function useAccessibleModules(): string[] {
  const { isAdmin, permissions } = usePermissions();

  // Admins have access to all modules
  if (isAdmin) {
    return [
      'QUICK_GENERATION',
      'NEW_GENERATION',
      'BULK_GENERATION',
      'HISTORY',
      'BULK_HISTORY',
      'IMAGE_TO_PROMPT',
      'IMAGE_GENERATION',
      'KEYWORD_SEARCH',
      'API_KEYS',
      'TEMPLATES',
      'HTML_TEMPLATES',
      'SYSTEM_LOGS',
      'USERS',
    ];
  }

  return permissions
    .filter((p) => p.enabled && p.actions.length > 0)
    .map((p) => p.module);
}
