import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class CachingService {
  private readonly logger = new Logger(CachingService.name);
  private redis: Redis;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.enabled = this.configService.get<string>('NODE_ENV') !== 'test';

    if (this.enabled) {
      try {
        this.redis = new Redis(redisUrl, {
          retryStrategy: (times) => {
            if (times > 3) {
              this.logger.error('Redis connection failed after 3 retries');
              return null;
            }
            return Math.min(times * 1000, 3000);
          },
        });

        this.redis.on('connect', () => {
          this.logger.log('✅ Connected to Redis');
        });

        this.redis.on('error', (error) => {
          this.logger.error(`Redis error: ${error.message}`);
        });
      } catch (error) {
        this.logger.error(`Failed to initialize Redis: ${error.message}`);
        this.enabled = false;
      }
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) return null;

    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.warn(`Cache delete error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string): Promise<number> {
    if (!this.enabled || !this.redis) return 0;

    try {
      return await this.redis.incr(key);
    } catch (error) {
      this.logger.warn(`Cache increment error for key ${key}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Cache embeddings
   */
  async cacheEmbedding(documentId: string, chunkId: string, embedding: number[]): Promise<void> {
    const key = `embedding:${documentId}:${chunkId}`;
    const ttl = 24 * 60 * 60; // 24 hours
    await this.set(key, embedding, ttl);
  }

  /**
   * Get cached embedding
   */
  async getCachedEmbedding(documentId: string, chunkId: string): Promise<number[] | null> {
    const key = `embedding:${documentId}:${chunkId}`;
    return await this.get<number[]>(key);
  }

  /**
   * Cache search results with strict tenant scoping (SEC-02)
   */
  async cacheSearchResults(userIdOrHash: string, queryHashOrResults: any, maybeResults?: any): Promise<void> {
    const ttl = 60 * 60; // 1 hour
    if (maybeResults !== undefined) {
      const userId = userIdOrHash;
      const queryHash = queryHashOrResults as string;
      const key = `search:${userId}:${queryHash}`;
      await this.set(key, maybeResults, ttl);
    } else {
      const key = `search:legacy:${userIdOrHash}`;
      await this.set(key, queryHashOrResults, ttl);
    }
  }

  /**
   * Get cached search results with strict tenant scoping (SEC-02)
   */
  async getCachedSearchResults(userIdOrHash: string, maybeQueryHash?: string): Promise<any | null> {
    if (maybeQueryHash !== undefined) {
      const key = `search:${userIdOrHash}:${maybeQueryHash}`;
      return await this.get(key);
    }
    const key = `search:legacy:${userIdOrHash}`;
    return await this.get(key);
  }

  /**
   * Cache LLM response with strict tenant scoping (SEC-02)
   */
  async cacheLLMResponse(userIdOrHash: string, questionHashOrResponse: string, maybeResponse?: string): Promise<void> {
    const ttl = 30 * 60; // 30 minutes
    if (maybeResponse !== undefined) {
      const userId = userIdOrHash;
      const questionHash = questionHashOrResponse;
      const key = `llm:${userId}:${questionHash}`;
      await this.set(key, maybeResponse, ttl);
    } else {
      const key = `llm:legacy:${userIdOrHash}`;
      await this.set(key, questionHashOrResponse, ttl);
    }
  }

  /**
   * Get cached LLM response with strict tenant scoping (SEC-02)
   */
  async getCachedLLMResponse(userIdOrHash: string, maybeQuestionHash?: string): Promise<string | null> {
    if (maybeQuestionHash !== undefined) {
      const key = `llm:${userIdOrHash}:${maybeQuestionHash}`;
      return await this.get<string>(key);
    }
    const key = `llm:legacy:${userIdOrHash}`;
    return await this.get<string>(key);
  }

  /**
   * Invalidate all cached queries and LLM responses for a specific tenant (SEC-02)
   */
  async invalidateUserCache(userId: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const searchKeys = await this.redis.keys(`search:${userId}:*`);
      const llmKeys = await this.redis.keys(`llm:${userId}:*`);
      const keysToDelete = [...searchKeys, ...llmKeys];

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        this.logger.log(`Invalidated ${keysToDelete.length} cached entries for user ${userId}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to invalidate user cache for ${userId}: ${error.message}`);
    }
  }

  /**
   * Invalidate embeddings cache for a specific document
   */
  async invalidateDocumentCache(documentId: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const keys = await this.redis.keys(`embedding:${documentId}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cached embeddings for document ${documentId}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to invalidate document cache for ${documentId}: ${error.message}`);
    }
  }

  /**
   * Cryptographically secure SHA-256 hash for caching keys
   */
  generateHash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.enabled || !this.redis) {
      return { enabled: false };
    }

    try {
      const info = await this.redis.info();
      const keys = await this.redis.dbsize();

      return {
        enabled: true,
        connected: this.redis.status === 'ready',
        totalKeys: keys,
        info: this.parseRedisInfo(info),
      };
    } catch (error) {
      return { enabled: false, error: error.message };
    }
  }

  /**
   * Parse Redis INFO string
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const result: Record<string, string> = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }

    return result;
  }
}
