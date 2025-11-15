import Redis from 'ioredis';

class RedisService {
  private static instance: RedisService;
  private client: Redis | null = null;
  private isConnected: boolean = false;

  private constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    // Skip Redis initialization during build time
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('⚠ Skipping Redis initialization during build');
      this.client = null;
      this.isConnected = false;
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            // Reconnect on read-only errors
            return true;
          }
          return false;
        },
        lazyConnect: true, // Don't connect immediately
      });

      this.client.on('connect', () => {
        console.log('✓ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        console.error('✗ Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('⚠ Redis connection closed');
        this.isConnected = false;
      });

      // Attempt to connect, but don't throw on failure
      this.client.connect().catch((error) => {
        console.error('Failed to connect to Redis:', error);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.client = null;
      this.isConnected = false;
    }
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public getClient(): Redis | null {
    return this.client;
  }

  public isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  // Generic cache operations
  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) return null;

    try {
      const data = await this.client!.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isReady()) return false;

    try {
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, serialized);
      } else {
        await this.client!.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isReady()) return false;

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) return false;

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isReady()) return 0;

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client!.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Error invalidating pattern ${pattern}:`, error);
      return 0;
    }
  }

  // API Keys caching
  async cacheApiKeys(userId: string, apiKeys: any[]): Promise<boolean> {
    const key = `api-keys:user:${userId}`;
    return this.set(key, apiKeys, 300); // 5 minutes TTL
  }

  async getCachedApiKeys(userId: string): Promise<any[] | null> {
    const key = `api-keys:user:${userId}`;
    return this.get<any[]>(key);
  }

  async invalidateApiKeys(userId: string): Promise<boolean> {
    const key = `api-keys:user:${userId}`;
    return this.del(key);
  }

  // Templates caching
  async cacheTemplates(userId: string, templates: any[]): Promise<boolean> {
    const key = `templates:user:${userId}`;
    return this.set(key, templates, 300); // 5 minutes TTL
  }

  async getCachedTemplates(userId: string): Promise<any[] | null> {
    const key = `templates:user:${userId}`;
    return this.get<any[]>(key);
  }

  async invalidateTemplates(userId: string): Promise<boolean> {
    const key = `templates:user:${userId}`;
    return this.del(key);
  }

  // Prompts caching (ImageToPrompt, ImageGenerationPrompt, KeywordSearchPrompt)
  async cachePrompts(userId: string, type: string, prompts: any[]): Promise<boolean> {
    const key = `prompts:${type}:user:${userId}`;
    return this.set(key, prompts, 300); // 5 minutes TTL
  }

  async getCachedPrompts(userId: string, type: string): Promise<any[] | null> {
    const key = `prompts:${type}:user:${userId}`;
    return this.get<any[]>(key);
  }

  async invalidatePrompts(userId: string, type?: string): Promise<number> {
    if (type) {
      const key = `prompts:${type}:user:${userId}`;
      await this.del(key);
      return 1;
    } else {
      // Invalidate all prompt types for this user
      const pattern = `prompts:*:user:${userId}`;
      return this.invalidatePattern(pattern);
    }
  }

  // Refresh tokens
  async storeRefreshToken(userId: string, token: string, ttlSeconds: number): Promise<boolean> {
    const key = `refresh-token:${userId}`;
    return this.set(key, token, ttlSeconds);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh-token:${userId}`;
    return this.get<string>(key);
  }

  async deleteRefreshToken(userId: string): Promise<boolean> {
    const key = `refresh-token:${userId}`;
    return this.del(key);
  }

  async isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
    const storedToken = await this.getRefreshToken(userId);
    return storedToken === token;
  }

  // Session management
  async storeSession(sessionToken: string, session: any, ttlSeconds: number): Promise<boolean> {
    const key = `session:${sessionToken}`;
    return this.set(key, session, ttlSeconds);
  }

  async getSession(sessionToken: string): Promise<any | null> {
    const key = `session:${sessionToken}`;
    return this.get<any>(key);
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    const key = `session:${sessionToken}`;
    return this.del(key);
  }

  // Rate limiting
  async checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.isReady()) {
      return { allowed: true, remaining: limit };
    }

    try {
      const key = `rate-limit:${identifier}`;
      const current = await this.client!.incr(key);

      if (current === 1) {
        await this.client!.expire(key, windowSeconds);
      }

      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);

      return { allowed, remaining };
    } catch (error) {
      console.error(`Error checking rate limit for ${identifier}:`, error);
      return { allowed: true, remaining: limit };
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const redis = RedisService.getInstance();
export default redis;
