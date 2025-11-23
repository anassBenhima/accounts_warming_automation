import { ModuleName, PermissionAction } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface UserPermissions {
  isAdmin: boolean;
  permissions: {
    module: ModuleName;
    actions: PermissionAction[];
    enabled: boolean;
  }[];
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      modulePermissions: {
        where: { enabled: true },
        select: {
          module: true,
          actions: true,
          enabled: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Admins have full access to everything
  if (user.role === 'ADMIN') {
    const allModules = Object.values(ModuleName);
    const allActions = Object.values(PermissionAction);

    return {
      isAdmin: true,
      permissions: allModules.map((module) => ({
        module,
        actions: allActions,
        enabled: true,
      })),
    };
  }

  return {
    isAdmin: false,
    permissions: user.modulePermissions,
  };
}

/**
 * Check if user has permission to perform action on module
 */
export async function checkPermission(
  userId: string,
  module: ModuleName,
  action: PermissionAction
): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);

  // Admins have all permissions
  if (userPerms.isAdmin) {
    return true;
  }

  const modulePerms = userPerms.permissions.find((p) => p.module === module);

  if (!modulePerms || !modulePerms.enabled) {
    return false;
  }

  return modulePerms.actions.includes(action);
}

/**
 * Check if user has access to a module (any action)
 */
export async function hasModuleAccess(
  userId: string,
  module: ModuleName
): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);

  // Admins have all access
  if (userPerms.isAdmin) {
    return true;
  }

  const modulePerms = userPerms.permissions.find((p) => p.module === module);

  return modulePerms ? modulePerms.enabled && modulePerms.actions.length > 0 : false;
}

/**
 * Filter modules based on user permissions
 */
export async function getAccessibleModules(userId: string): Promise<ModuleName[]> {
  const userPerms = await getUserPermissions(userId);

  // Admins can access all modules
  if (userPerms.isAdmin) {
    return Object.values(ModuleName);
  }

  return userPerms.permissions
    .filter((p) => p.enabled && p.actions.length > 0)
    .map((p) => p.module);
}

/**
 * Server-side permission check middleware
 * Throws error if user doesn't have permission
 */
export async function requirePermission(
  userId: string,
  module: ModuleName,
  action: PermissionAction
): Promise<void> {
  const hasPermission = await checkPermission(userId, module, action);

  if (!hasPermission) {
    throw new Error(`Access denied: You don't have permission to ${action} on ${module}`);
  }
}
