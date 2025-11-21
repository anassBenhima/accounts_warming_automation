import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// PUT: Update user (admin or self)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if user is admin OR updating their own profile
    const isAdmin = session.user.role === 'ADMIN';
    const isSelf = id === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden: Cannot update other users' }, { status: 403 });
    }

    // Prevent admin from deactivating themselves
    if (id === session.user.id && body.isActive === false) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Build update data object
    const updateData: any = {};

    // Only admins can update isActive and role
    if (isAdmin) {
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.role !== undefined) updateData.role = body.role;
    }

    // Both admin and self can update name and email
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;

    // Handle password update
    if (body.password) {
      // If user is updating their own password, verify current password
      if (isSelf && !isAdmin) {
        if (!body.currentPassword) {
          return NextResponse.json(
            { error: 'Current password is required to change password' },
            { status: 400 }
          );
        }

        // Verify current password
        const currentUser = await prisma.user.findUnique({
          where: { id },
          select: { password: true },
        });

        if (!currentUser) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isValidPassword = await bcrypt.compare(body.currentPassword, currentUser.password);
        if (!isValidPassword) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          );
        }
      }

      // Hash and update new password
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
