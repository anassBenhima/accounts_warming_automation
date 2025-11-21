# Multi-User Features - Implementation Guide

This guide provides step-by-step instructions and code examples for implementing the three requested features.

## Prerequisites

1. Run database migration:
```bash
npx prisma generate
npx prisma db push
```

## Feature 1: API Key Sharing (Admin Access)

### Backend (Already Implemented)
- ✅ `/api/api-keys` - Returns all keys for admin, own+assigned for users
- ✅ `/api/api-keys/[id]/assignments` - Manage assignments (GET/POST/DELETE)
- ✅ `/api/users/list` - Get list of users for dropdowns

### Frontend Implementation

Add to `app/(dashboard)/dashboard/api-keys/page.tsx`:

```typescript
// Add to interface
interface ApiKey {
  // ... existing fields
  user?: { id: string; name: string; email: string };
  assignments?: Array<{
    id: string;
    user: { id: string; name: string; email: string };
  }>;
}

// Add state
const [managingKey, setManagingKey] = useState<ApiKey | null>(null);
const [allUsers, setAllUsers] = useState<any[]>([]);
const { data: session } = useSession();
const isAdmin = session?.user?.role === 'ADMIN';

// Fetch users
useEffect(() => {
  if (isAdmin) {
    fetch('/api/users/list')
      .then(res => res.json())
      .then(setAllUsers);
  }
}, [isAdmin]);

// Assignment functions
const assignKeyToUser = async (keyId: string, userId: string) => {
  await fetch(`/api/api-keys/${keyId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  fetchApiKeys(); // Refresh
};

const removeAssignment = async (keyId: string, userId: string) => {
  await fetch(`/api/api-keys/${keyId}/assignments?userId=${userId}`, {
    method: 'DELETE',
  });
  fetchApiKeys(); // Refresh
};
```

**UI Changes:**

```tsx
// In table, add column
{isAdmin && (
  <td className="px-6 py-4">
    {key.user?.name} ({key.user?.email})
    {key.assignments && key.assignments.length > 0 && (
      <div className="text-xs text-gray-500 mt-1">
        Assigned to {key.assignments.length} user(s)
      </div>
    )}
  </td>
)}

// Add "Manage Access" button
{isAdmin && (
  <button
    onClick={() => setManagingKey(key)}
    className="text-blue-600 hover:text-blue-900"
  >
    Manage Access
  </button>
)}

// Assignment Modal
{managingKey && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 className="text-lg font-bold mb-4">
        Manage Access: {managingKey.name}
      </h3>

      {/* Current Assignments */}
      <div className="mb-4">
        <h4 className="font-medium mb-2">Assigned To:</h4>
        {managingKey.assignments?.map(assignment => (
          <div key={assignment.id} className="flex justify-between items-center py-2">
            <span>{assignment.user.name}</span>
            <button
              onClick={() => removeAssignment(managingKey.id, assignment.user.id)}
              className="text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Add User */}
      <div>
        <label className="block mb-2">Assign to User:</label>
        <select
          onChange={(e) => e.target.value && assignKeyToUser(managingKey.id, e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Select User...</option>
          {allUsers.filter(u =>
            u.id !== managingKey.userId &&
            !managingKey.assignments?.some(a => a.user.id === u.id)
          ).map(user => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => setManagingKey(null)}
        className="mt-4 w-full bg-gray-200 py-2 rounded"
      >
        Close
      </button>
    </div>
  </div>
)}
```

## Feature 2: User Attribution in History

### Backend Implementation

Update `/app/api/generations/[id]/route.ts` (or create if needed):

```typescript
// In GET endpoint, include user info
const generation = await prisma.generation.findUnique({
  where: { id },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    // ... other includes
  },
});
```

Update `/app/api/bulk-generations/route.ts`:

```typescript
// GET endpoint
const bulkGenerations = await prisma.bulkGeneration.findMany({
  where: isAdmin ? {} : { userId: session.user.id },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

### Frontend Implementation

In `app/(dashboard)/dashboard/history/page.tsx`:

```tsx
// Add column in table
<th className="px-6 py-3">Created By</th>

// In row
<td className="px-6 py-4">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
      {generation.user?.name?.charAt(0) || 'U'}
    </div>
    <div>
      <div className="text-sm font-medium">{generation.user?.name}</div>
      <div className="text-xs text-gray-500">{generation.user?.email}</div>
    </div>
  </div>
</td>
```

## Feature 3: User Filtering

### Add Filter Component

Create `components/UserFilter.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserFilterProps {
  onFilterChange: (userId: string | null) => void;
}

export default function UserFilter({ onFilterChange }: UserFilterProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetch('/api/users/list')
        .then(res => res.json())
        .then(setUsers);
    }
  }, [session]);

  const handleChange = (value: string) => {
    setSelectedUserId(value);
    onFilterChange(value || null);
  };

  if (session?.user?.role !== 'ADMIN') return null;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Filter by User:
      </label>
      <select
        value={selectedUserId}
        onChange={(e) => handleChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Users</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.email})
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Use in Pages

```typescript
// In any listing page
import UserFilter from '@/components/UserFilter';

export default function Page() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);

  const handleFilterChange = (userId: string | null) => {
    if (!userId) {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter(item => item.userId === userId));
    }
  };

  return (
    <div>
      <UserFilter onFilterChange={handleFilterChange} />
      {/* Display filteredItems */}
    </div>
  );
}
```

## Resource Sharing (Prompts & Templates)

### Backend Pattern

Update all prompt/template endpoints:

```typescript
// GET endpoint
const prompts = await prisma.imageToPrompt.findMany({
  where: isAdmin
    ? {} // Admin sees all
    : {
        OR: [
          { userId: session.user.id },  // Own resources
          { isShared: true },            // Shared resources
        ],
      },
  include: {
    user: {
      select: { id: true, name: true, email: true },
    },
  },
  orderBy: { createdAt: 'desc' },
});

// PUT endpoint - toggle sharing
if (body.isShared !== undefined) {
  // Only owner can change sharing status
  const resource = await prisma.imageToPrompt.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (resource.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  updateData.isShared = body.isShared;
}
```

### Frontend Pattern

```tsx
// Add toggle in each resource card/row
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={resource.isShared}
    onChange={() => toggleSharing(resource.id, !resource.isShared)}
    disabled={resource.userId !== session?.user?.id}
  />
  <span className="text-sm">Share with team</span>
</label>

// Show ownership
{resource.userId !== session?.user?.id && (
  <div className="text-xs text-gray-500">
    Shared by {resource.user?.name}
  </div>
)}

// Toggle function
const toggleSharing = async (id: string, isShared: boolean) => {
  await fetch(`/api/image-to-prompt/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isShared }),
  });
  fetchResources(); // Refresh
};
```

## Testing Checklist

### API Key Sharing
- [ ] Admin can see all API keys
- [ ] Admin can assign keys to users
- [ ] Users can see assigned keys
- [ ] Users can use assigned keys in generation
- [ ] Assignment removal works

### User Attribution
- [ ] History shows user who created each generation
- [ ] Bulk history shows user info
- [ ] User avatars display correctly

### User Filtering
- [ ] Admin sees user filter dropdown
- [ ] Filter works on history pages
- [ ] Filter works on prompts/templates pages
- [ ] Regular users don't see admin-only filters

### Resource Sharing
- [ ] Users can toggle sharing on own resources
- [ ] Shared resources appear for all users
- [ ] Shared resources show original owner
- [ ] Users can't modify others' shared resources

## Next Steps

1. Apply these patterns to all modules:
   - Image to Prompt
   - Image Generation Prompts
   - Keyword Search Prompts
   - Templates

2. Add batch operations:
   - Share multiple resources at once
   - Assign key to multiple users

3. Add notifications:
   - Notify users when resources are shared
   - Notify when API keys are assigned

4. Add audit logs:
   - Track who uses shared resources
   - Track API key usage by assigned users
