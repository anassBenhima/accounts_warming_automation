import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ModuleName, PermissionAction } from '@prisma/client';

// GET: Fetch permissions for the current user or specific user (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // If userId is provided, check if user is admin
    if (userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUserId = userId || session.user.id;

    // Fetch user's permissions
    const permissions = await prisma.userModulePermission.findMany({
      where: {
        userId: targetUserId,
        enabled: true,
      },
      select: {
        id: true,
        module: true,
        actions: true,
        enabled: true,
      },
    });

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Admins have full access to all modules
    if (user?.role === 'ADMIN') {
      const allModules = Object.values(ModuleName);
      const allActions = Object.values(PermissionAction);

      return NextResponse.json({
        user,
        permissions: allModules.map((module) => ({
          module,
          actions: allActions,
          enabled: true,
        })),
        isAdmin: true,
      });
    }

    return NextResponse.json({
      user,
      permissions,
      isAdmin: false,
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

// PUT: Update permissions for a user (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and permissions array' },
        { status: 400 }
      );
    }

    // Validate target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't allow modifying admin permissions
    if (targetUser.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot modify permissions for admin users' },
        { status: 400 }
      );
    }

    // Delete existing permissions for the user
    await prisma.userModulePermission.deleteMany({
      where: { userId },
    });

    // Create new permissions
    const createdPermissions = await prisma.userModulePermission.createMany({
      data: permissions.map((perm: any) => ({
        userId,
        module: perm.module,
        actions: perm.actions,
        enabled: perm.enabled !== false, // Default to true
      })),
    });

    // Fetch the updated permissions
    const updatedPermissions = await prisma.userModulePermission.findMany({
      where: { userId },
    });

    return NextResponse.json({
      message: 'Permissions updated successfully',
      count: createdPermissions.count,
      permissions: updatedPermissions,
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}
