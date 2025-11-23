import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ModuleName, PermissionAction } from '@prisma/client';

// GET: Fetch all available modules and actions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view available modules
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const modules = Object.values(ModuleName).map((module) => ({
      value: module,
      label: module.split('_').map(word =>
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' '),
    }));

    const actions = Object.values(PermissionAction).map((action) => ({
      value: action,
      label: action.charAt(0) + action.slice(1).toLowerCase(),
    }));

    return NextResponse.json({
      modules,
      actions,
    });
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}
