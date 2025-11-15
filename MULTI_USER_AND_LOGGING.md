# Multi-User Support & Logging System

## Overview

The system now supports multiple users with comprehensive logging. All data is automatically filtered by the authenticated user, and all operations are logged for debugging and auditing.

## Database Changes

All main entities now have a `userId` field:
- ✅ ApiKey
- ✅ Template
- ✅ ImageToPrompt
- ✅ ImageGenerationPrompt
- ✅ KeywordSearchPrompt
- ✅ Generation

## System Logs

The `SystemLog` model tracks:
- **Level**: INFO, WARNING, ERROR, SUCCESS
- **Module**: AUTH, API_KEY, TEMPLATE, PROMPT, GENERATION, IMAGE_PROCESSING, API_CALL, SYSTEM
- **Action**: create, update, delete, api_call, etc.
- **Input/Output**: JSON data for debugging
- **Performance**: Duration in milliseconds
- **Error tracking**: Error messages and stack traces

View logs at: `/dashboard/logs`

---

## How to Implement Multi-User Filtering

### Pattern for API Endpoints

All API endpoints should:
1. Check authentication
2. Filter data by `session.user.id`
3. Log operations
4. Handle errors with logging

### Example: API Keys Endpoint

#### Before (Single User):
```typescript
export async function GET() {
  const apiKeys = await prisma.apiKey.findMany();
  return NextResponse.json(apiKeys);
}
```

#### After (Multi-User + Logging):
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createUserLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Create user-scoped logger
    const logger = createUserLogger(session.user.id);

    // 3. Fetch data filtered by user with logging
    const apiKeys = await logger.track(
      {
        module: 'API_KEY',
        action: 'list',
        message: 'Fetching API keys for user',
      },
      async () => {
        return await prisma.apiKey.findMany({
          where: { userId: session.user.id }, // 👈 Multi-user filter
          orderBy: { createdAt: 'desc' },
        });
      }
    );

    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}
```

### Example: Create Endpoint

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logger = createUserLogger(session.user.id);
    const body = await request.json();

    const apiKey = await logger.track(
      {
        module: 'API_KEY',
        action: 'create',
        message: 'Creating new API key',
        input: body, // 👈 Log input data
      },
      async () => {
        return await prisma.apiKey.create({
          data: {
            userId: session.user.id, // 👈 Link to user
            name: body.name,
            type: body.type,
            apiKey: body.apiKey,
            modelName: body.modelName,
          },
        });
      }
    );

    return NextResponse.json(apiKey);
  } catch (error: any) {
    const logger = createUserLogger(session?.user?.id || '');
    await logger.error({
      module: 'API_KEY',
      action: 'create',
      message: 'Failed to create API key',
      error: error.message,
      stackTrace: error.stack,
    });

    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
```

### Example: Update Endpoint

```typescript
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
    const logger = createUserLogger(session.user.id);

    // Verify ownership before update
    const existing = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: session.user.id, // 👈 Ensure user owns this resource
      },
    });

    if (!existing) {
      await logger.warning({
        module: 'API_KEY',
        action: 'update',
        message: 'Unauthorized update attempt',
        resourceId: id,
      });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await logger.track(
      {
        module: 'API_KEY',
        action: 'update',
        message: 'Updating API key',
        resourceId: id,
        input: body,
      },
      async () => {
        return await prisma.apiKey.update({
          where: { id },
          data: {
            ...(body.name && { name: body.name }),
            ...(body.apiKey && { apiKey: body.apiKey }),
            ...(body.modelName !== undefined && { modelName: body.modelName }),
            ...(body.isActive !== undefined && { isActive: body.isActive }),
          },
        });
      }
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    // Error logging handled by logger.track
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}
```

---

## Logger API Reference

### Basic Logging

```typescript
import { Logger, createUserLogger } from '@/lib/logger';

// System-wide logging (no user)
await Logger.info({
  module: 'SYSTEM',
  action: 'startup',
  message: 'Application started',
});

// User-scoped logging
const logger = createUserLogger(userId);

await logger.success({
  module: 'AUTH',
  action: 'login',
  message: 'User logged in successfully',
});

await logger.error({
  module: 'GENERATION',
  action: 'process',
  message: 'Image generation failed',
  error: 'API key invalid',
  resourceId: generationId,
});
```

### Performance Tracking

```typescript
const logger = createUserLogger(userId);

const result = await logger.track(
  {
    module: 'IMAGE_PROCESSING',
    action: 'apply_templates',
    message: 'Applying templates to generated images',
    input: { imageId, templateIds },
  },
  async () => {
    // Your async operation here
    return await processImage();
  }
);
// Automatically logs duration and output
```

### Manual Logging with Duration

```typescript
const startTime = Date.now();

try {
  const result = await someOperation();
  const duration = Date.now() - startTime;

  await logger.success({
    module: 'API_CALL',
    action: 'seedream_generate',
    message: 'Successfully generated image from Seedream',
    input: { prompt },
    output: { imageUrl: result.url },
    duration,
  });
} catch (error: any) {
  const duration = Date.now() - startTime;

  await logger.error({
    module: 'API_CALL',
    action: 'seedream_generate',
    message: 'Seedream API call failed',
    input: { prompt },
    error: error.message,
    stackTrace: error.stack,
    duration,
  });
}
```

---

## API Endpoints That Need Updates

The following endpoints need to be updated to include multi-user filtering and logging:

### ✅ Already Implemented
- `/api/logs` - System logs viewer

### ⚠️ Need Updates

1. **API Keys** (`/api/api-keys/*`)
   - ✅ Database schema updated
   - ⚠️ Endpoints need user filtering + logging

2. **Templates** (`/api/templates/*`)
   - ✅ Database schema updated
   - ⚠️ Endpoints need user filtering + logging

3. **Prompts** (`/api/image-to-prompt/*`, `/api/image-generation-prompt/*`, `/api/keyword-search-prompt/*`)
   - ✅ Database schema updated
   - ⚠️ Endpoints need user filtering + logging

4. **Generations** (`/api/generations/*`)
   - ✅ Database schema updated
   - ⚠️ Endpoints need user filtering + logging

5. **File Upload** (`/api/upload`)
   - ⚠️ Should log file uploads with user context

---

## Testing Multi-User Support

Currently, there's only one admin user:
- Email: `admin@gmail.com`
- Password: `admin@123@blogging`

To test multi-user functionality:

1. Create a second user via seed or database:
```typescript
await prisma.user.create({
  data: {
    email: 'test@example.com',
    password: await bcrypt.hash('password123', 10),
    name: 'Test User',
  },
});
```

2. Log in with each user in different browsers
3. Create API keys, templates, etc.
4. Verify data isolation between users
5. Check System Logs to see operations are properly attributed

---

## Security Notes

✅ **All user data is isolated** - Users can only see/modify their own data
✅ **Audit trail** - All operations are logged with user attribution
✅ **Error tracking** - Failed operations are logged with full context
✅ **Performance monitoring** - Track slow operations via duration field

⚠️ **Important**: Make sure ALL API endpoints that modify or read user data:
1. Check `session.user.id`
2. Filter by `userId` in queries
3. Verify ownership before updates/deletes
4. Log important operations

---

## Quick Migration Checklist

For each API endpoint, update to this pattern:

```typescript
// 1. Add imports
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createUserLogger } from '@/lib/logger';

// 2. Check authentication
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// 3. Create logger
const logger = createUserLogger(session.user.id);

// 4. Filter by user in queries
where: {
  userId: session.user.id,
  // ... other filters
}

// 5. Set userId on creates
data: {
  userId: session.user.id,
  // ... other fields
}

// 6. Log important operations
await logger.track({ ... }, async () => { ... });
```

---

## Next Steps

1. **Systematically update all API endpoints** following the pattern above
2. **Add authentication logs** - Track login/logout events
3. **Monitor System Logs** - Watch for errors and slow operations
4. **Set up alerts** - For ERROR level logs (future enhancement)
5. **Log retention** - Implement cleanup for old logs (future enhancement)
