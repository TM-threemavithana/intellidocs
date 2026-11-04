import { CachingService } from './caching.service';
import { ConfigService } from '@nestjs/config';

describe('CachingService (SEC-02 Tenant Isolation & Hash Security)', () => {
  let cachingService: CachingService;
  let mockRedis: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockRedis = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('localhost'),
    };

    cachingService = new CachingService(mockConfigService as ConfigService);
    // Inject mock Redis
    (cachingService as any).redis = mockRedis;
  });

  describe('generateHash', () => {
    it('should generate deterministic 32-character SHA-256 hex string', () => {
      const hash1 = cachingService.generateHash('What is document chunking?');
      const hash2 = cachingService.generateHash('What is document chunking?');
      const hash3 = cachingService.generateHash('Different query');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toHaveLength(32);
      expect(hash1).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('Tenant-Scoped LLM & Search Caching', () => {
    it('should scope search cache keys by userId', async () => {
      const userId = 'user-123';
      const hash = cachingService.generateHash('query text');
      const results = [{ text: 'sample', score: 0.95 }];

      await cachingService.cacheSearchResults(userId, hash, results);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `search:${userId}:${hash}`,
        3600,
        JSON.stringify(results),
      );
    });

    it('should scope LLM response cache keys by userId with 1800s TTL', async () => {
      const userId = 'user-456';
      const hash = cachingService.generateHash('what is AI?');
      const response = 'Artificial Intelligence';

      await cachingService.cacheLLMResponse(userId, hash, response);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `llm:${userId}:${hash}`,
        1800,
        JSON.stringify(response),
      );
    });

    it('should return null if user does not own cached item', async () => {
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key === 'llm:user-A:some-hash') {
          return JSON.stringify({ answer: 'User A confidential data' });
        }
        return null;
      });

      // User B querying with same hash gets null because of tenant scoping
      const userBResponse = await cachingService.getCachedLLMResponse('user-B', 'some-hash');
      expect(userBResponse).toBeNull();

      // User A querying gets their own response
      const userAResponse = await cachingService.getCachedLLMResponse('user-A', 'some-hash');
      expect(userAResponse).toEqual({ answer: 'User A confidential data' });
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all search and llm keys for a specific user upon logout/update', async () => {
      mockRedis.keys.mockImplementation((pattern: string) => {
        if (pattern === 'search:user-123:*') return Promise.resolve(['search:user-123:abc']);
        if (pattern === 'llm:user-123:*') return Promise.resolve(['llm:user-123:def']);
        return Promise.resolve([]);
      });

      await cachingService.invalidateUserCache('user-123');

      expect(mockRedis.keys).toHaveBeenCalledWith('search:user-123:*');
      expect(mockRedis.keys).toHaveBeenCalledWith('llm:user-123:*');
      expect(mockRedis.del).toHaveBeenCalledWith('search:user-123:abc', 'llm:user-123:def');
    });

    it('should invalidate document-specific cache keys when document is deleted', async () => {
      mockRedis.keys.mockResolvedValue(['embedding:doc-999:chunk-1']);

      await cachingService.invalidateDocumentCache('doc-999');

      expect(mockRedis.keys).toHaveBeenCalledWith('embedding:doc-999:*');
      expect(mockRedis.del).toHaveBeenCalledWith('embedding:doc-999:chunk-1');
    });
  });
});
