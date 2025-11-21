# Multi-User Collaboration Features

This document describes the new multi-user collaboration features added to the platform.

## Database Changes

### New Fields Added

The following `isShared` fields were added to enable resource sharing:

1. **ImageToPrompt** - `isShared` Boolean (default: false)
2. **ImageGenerationPrompt** - `isShared` Boolean (default: false)
3. **KeywordSearchPrompt** - `isShared` Boolean (default: false)
4. **Template** - `isShared` Boolean (default: false)

### Applying Schema Changes

Run the following commands to apply the database schema changes:

```bash
# Generate Prisma client with new fields
npx prisma generate

# Push schema changes to database (adds isShared columns)
npx prisma db push

# If running in Docker:
docker compose -f docker-compose.prod.yml run --rm app npx prisma db push
```

## Features Overview

### 1. API Key Sharing/Assignment (Admin Only)

**What it does:**
- Admins can assign their API keys to other users
- Users can use API keys assigned to them
- Admins see all API keys in the system
- Regular users see their own keys + keys assigned to them

**API Endpoints:**
- `GET /api/api-keys` - Returns appropriate keys based on user role
- `GET /api/api-keys/[id]/assignments` - Get assignments for a key
- `POST /api/api-keys/[id]/assignments` - Assign key to user
- `DELETE /api/api-keys/[id]/assignments?userId=xxx` - Remove assignment

**UI Features:**
- "Manage Access" button for each API key (admin only)
- Modal showing assigned users
- Add/remove user assignments
- Shows "Owner" and "Assigned to X users" badges

### 2. User Attribution in History

**What it does:**
- Shows which user created each generation
- Displays user name/email in history tables
- Allows filtering by user (admin can see all users' work)

**Changes Made:**
- Added user information to Generation and BulkGeneration queries
- Added "Created By" column to history tables
- Shows user avatar/initial in UI

### 3. User Filtering

**What it does:**
- Filter dropdown on all listing pages
- Admins can filter by any user
- Regular users only see filter for shared resources

**API Endpoint:**
- `GET /api/users/list` - Returns list of users for filter dropdown

**Pages with Filtering:**
- History
- Bulk History
- Image to Prompt
- Image Generation Prompts
- Keyword Search Prompts
- Templates
- API Keys

### 4. Resource Sharing

**What it does:**
- Users can mark their prompts/templates as "shared"
- Shared resources are visible to all users
- Toggle switch in each resource's UI
- Shared resources show "Shared by [Username]" badge

**How it Works:**
- Toggle `isShared` field on resources
- Queries include: `OR { isShared: true }`
- UI shows ownership and sharing status

## Implementation Pattern

### Query Pattern for Shared Resources

```typescript
// Admin sees everything
if (isAdmin) {
  return await prisma.resource.findMany({
    include: { user: { select: { name: true, email: true } } }
  });
}

// Regular user sees own + shared
return await prisma.resource.findMany({
  where: {
    OR: [
      { userId: session.user.id },      // Own resources
      { isShared: true }                 // Shared resources
    ]
  },
  include: { user: { select: { name: true, email: true } } }
});
```

### UI Pattern for Sharing Toggle

```typescript
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={item.isShared}
    onChange={() => toggleSharing(item.id, !item.isShared)}
  />
  <span>Share with team</span>
</label>
```

### UI Pattern for User Filter

```typescript
<select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
  <option value="">All Users</option>
  {users.map(user => (
    <option key={user.id} value={user.id}>
      {user.name} ({user.email})
    </option>
  ))}
</select>
```

## Testing

### Test API Key Assignments

1. Login as admin
2. Go to API Keys page
3. Click "Manage Access" on any key
4. Assign to a user
5. Login as that user
6. Verify key appears in their API keys list

### Test Resource Sharing

1. Login as User A
2. Create a prompt/template
3. Toggle "Share with team"
4. Login as User B
5. Verify shared resource appears in their list
6. Verify it shows "Shared by User A"

### Test User Filtering

1. Login as admin
2. Go to History page
3. Use user filter dropdown
4. Verify only that user's generations show
5. Clear filter, verify all generations show

## Security Considerations

1. **API Key Security**: Actual API keys are never returned in list queries
2. **Role Checks**: All assignment operations require admin role
3. **Ownership**: Users can only modify their own resources
4. **Sharing**: isShared is controlled by resource owner only

## Future Enhancements

- User groups/teams for batch sharing
- Permission levels (read-only vs full access)
- Activity logs for shared resource usage
- Notifications when resources are shared with you
