import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

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
   * Cache search results
   */
  async cacheSearchResults(queryHash: string, results: any): Promise<void> {
    const key = `search:${queryHash}`;
    const ttl = 60 * 60; // 1 hour
    await this.set(key, results, ttl);
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(queryHash: string): Promise<any | null> {
    const key = `search:${queryHash}`;
    return await this.get(key);
  }

  /**
   * Cache LLM response
   */
  async cacheLLMResponse(questionHash: string, response: string): Promise<void> {
    const key = `llm:${questionHash}`;
    const ttl = 30 * 60; // 30 minutes
    await this.set(key, response, ttl);
  }

  /**
   * Get cached LLM response
   */
  async getCachedLLMResponse(questionHash: string): Promise<string | null> {
    const key = `llm:${questionHash}`;
    return await this.get<string>(key);
  }

  /**
   * Generate hash for caching key
   */
  generateHash(input: string): string {
    // Simple hash function (in production, use crypto)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
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
      return { enabled: true, error: error.message };
    }
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const stats: any = {};
    
    lines.forEach((line) => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }
    });

    return {
      usedMemory: stats.used_memory_human,
      connectedClients: stats.connected_clients,
      totalCommandsProcessed: stats.total_commands_processed,
    };
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<boolean> {
    if (!this.enabled || !this.redis) return false;

    try {
      await this.redis.flushdb();
      this.logger.log('Cache cleared');
      return true;
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Invalidate cache keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.redis) return 0;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      await this.redis.del(...keys);
      this.logger.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern ${pattern}: ${error.message}`);
      return 0;
    }
  }
}
