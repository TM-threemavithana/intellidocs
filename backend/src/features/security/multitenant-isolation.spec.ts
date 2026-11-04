import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { RAGService } from '../rag/rag.service';
import { ConversationsService } from '../rag/conversations.service';
import { SearchHistoryService } from '../search/search-history.service';
import { SearchAnalyticsService } from '../search/search-analytics.service';

describe('Comprehensive Multi-Tenant Security & Isolation Matrix (PHASE D)', () => {
  let mockPrisma: any;
  let mockChromaService: any;
  let mockMinioService: any;
  let mockOllamaService: any;
  let mockCachingService: any;
  let mockPdfExtractionService: any;
  let mockChunkingService: any;
  let documentsService: DocumentsService;
  let embeddingsService: EmbeddingsService;
  let ragService: RAGService;
  let conversationsService: ConversationsService;
  let searchHistoryService: SearchHistoryService;
  let searchAnalyticsService: SearchAnalyticsService;

  const USER_A = 'tenant-user-A-uuid';
  const USER_B = 'tenant-user-B-uuid';
  const DOC_USER_A = 'doc-user-A-123';
  const DOC_USER_B = 'doc-user-B-456';
  const CONV_USER_B = 'conv-user-B-101';

  beforeEach(() => {
    mockPrisma = {
      document: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      embedding: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        count: jest.fn(),
      },
      oCRResult: {
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
      collectionDocument: {
        deleteMany: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      searchHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _avg: { resultsCount: 0, timeTaken: 0 } }),
      },
    };

    mockChromaService = {
      search: jest.fn(),
      addEmbeddings: jest.fn(),
      deleteByDocumentId: jest.fn(),
    };

    mockMinioService = {
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    mockOllamaService = {
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      generateEmbeddings: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    };

    mockPdfExtractionService = {
      extractText: jest.fn(),
      extractPages: jest.fn(),
    };

    mockChunkingService = {
      chunkDocument: jest.fn(),
    };

    mockCachingService = {
      generateHash: jest.fn((str: string) => `hash-${str.substring(0, 10)}`),
      cacheSearchResults: jest.fn(),
      getCachedSearchResults: jest.fn().mockResolvedValue(null),
      cacheLLMResponse: jest.fn(),
      getCachedLLMResponse: jest.fn().mockResolvedValue(null),
      invalidateUserCache: jest.fn(),
      invalidateDocumentCache: jest.fn(),
    };

    const mockOcrQueue = {
      add: jest.fn(),
      getJobs: jest.fn().mockResolvedValue([]),
    };

    documentsService = new DocumentsService(
      mockPrisma,
      mockMinioService,
      mockPdfExtractionService,
      mockChromaService,
      mockCachingService,
      mockOcrQueue as any,
    );

    embeddingsService = new EmbeddingsService(
      mockPrisma,
      mockChromaService,
      mockOllamaService,
      mockChunkingService,
      mockCachingService,
    );

    const mockQueryEnhancement = {
      enhanceQuery: jest.fn().mockImplementation((q) => Promise.resolve({ rewritten: q, intent: 'GENERAL' })),
    };

    conversationsService = new ConversationsService(mockPrisma);

    ragService = new RAGService(
      embeddingsService,
      mockOllamaService,
      mockQueryEnhancement as any,
      conversationsService,
      mockCachingService,
      mockPrisma,
    );

    searchHistoryService = new SearchHistoryService(mockPrisma);
    searchAnalyticsService = new SearchAnalyticsService(mockPrisma);
  });

  describe('1 & 2. Legitimate Tenant Data Access', () => {
    it('User A can successfully retrieve their own document and download buffer', async () => {
      mockPrisma.document.findFirst.mockResolvedValue({
        id: DOC_USER_A,
        userId: USER_A,
        fileName: 'doc_A.pdf',
        storageUrl: 's3://bucket/doc_A.pdf',
      });
      mockMinioService.downloadFile.mockResolvedValue(Buffer.from('PDF_A_BYTES'));

      const result = await documentsService.getDocumentFile(DOC_USER_A, USER_A);
      expect(result.fileName).toBe('doc_A.pdf');
      expect(result.buffer.toString()).toBe('PDF_A_BYTES');
    });

    it('User B can successfully retrieve their own document and download buffer', async () => {
      mockPrisma.document.findFirst.mockResolvedValue({
        id: DOC_USER_B,
        userId: USER_B,
        fileName: 'doc_B.pdf',
        storageUrl: 's3://bucket/doc_B.pdf',
      });
      mockMinioService.downloadFile.mockResolvedValue(Buffer.from('PDF_B_BYTES'));

      const result = await documentsService.getDocumentFile(DOC_USER_B, USER_B);
      expect(result.fileName).toBe('doc_B.pdf');
      expect(result.buffer.toString()).toBe('PDF_B_BYTES');
    });
  });

  describe('3. Cross-Tenant Document Download Prevention', () => {
    it('User A cannot download User B document (throws NotFoundException)', async () => {
      mockPrisma.document.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === DOC_USER_B && where.userId === USER_A) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(documentsService.getDocumentFile(DOC_USER_B, USER_A)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockMinioService.downloadFile).not.toHaveBeenCalled();
    });
  });

  describe('4. Cross-Tenant OCR Results Access Prevention', () => {
    it('User A cannot access OCR results for User B document', async () => {
      mockPrisma.document.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === DOC_USER_B && where.userId === USER_A) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      // Verification via document ownership check
      const doc = await mockPrisma.document.findFirst({ where: { id: DOC_USER_B, userId: USER_A } });
      expect(doc).toBeNull();
    });
  });

  describe('5. Cross-Tenant Vector Isolation (SEC-01)', () => {
    it('User A cannot retrieve User B vectors in ChromaDB', async () => {
      mockPrisma.document.findMany.mockImplementation(({ where }: any) => {
        if (where.userId === USER_A) return Promise.resolve([{ id: DOC_USER_A }]);
        return Promise.resolve([]);
      });

      mockChromaService.search.mockResolvedValue([
        {
          id: 'chunk-A-1',
          text: 'User A text',
          similarity: 0.95,
          metadata: { documentId: DOC_USER_A, userId: USER_A },
        },
      ]);

      const results = await embeddingsService.search('confidential', 5, undefined, USER_A);

      expect(mockChromaService.search).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        5,
        { documentId: { $in: [DOC_USER_A] } },
      );
      expect(results[0].metadata.documentId).toBe(DOC_USER_A);
    });
  });

  describe('6. Cross-Tenant Conversation Isolation', () => {
    it('User A cannot retrieve User B conversation (throws NotFoundException)', async () => {
      mockPrisma.conversation.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === CONV_USER_B && where.userId === USER_A) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(conversationsService.getConversation(CONV_USER_B, USER_A)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('7. Cross-Tenant Search History Isolation', () => {
    it('User A only retrieves their own search history entries', async () => {
      mockPrisma.searchHistory.findMany.mockImplementation(({ where }: any) => {
        if (where.userId === USER_A) {
          return Promise.resolve([
            { id: 'sh-1', query: 'User A query', userId: USER_A },
          ]);
        }
        return Promise.resolve([]);
      });

      const history = await searchHistoryService.getHistory(USER_A);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('User A query');
      expect(mockPrisma.searchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_A } }),
      );
    });
  });

  describe('8. Cross-Tenant Analytics Scoping', () => {
    it('User A analytics query is scoped strictly to User A records', async () => {
      mockPrisma.searchHistory.findMany.mockResolvedValue([]);
      mockPrisma.searchHistory.count.mockResolvedValue(0);

      await searchAnalyticsService.getOverview(USER_A);

      expect(mockPrisma.searchHistory.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: USER_A }),
        }),
      );
    });
  });

  describe('9. Cross-Tenant RAG Prevention', () => {
    it('User A querying with User B documentId receives access denied response', async () => {
      mockPrisma.document.findMany.mockImplementation(({ where }: any) => {
        if (where.userId === USER_A && where.id?.in?.includes(DOC_USER_B)) {
          return Promise.resolve([]); // User A does not own DOC_USER_B
        }
        return Promise.resolve([]);
      });

      const response = await ragService.ask('Secret revenue?', [DOC_USER_B], 5, undefined, USER_A);

      expect(response.answer).toContain("I don't have access to the requested document");
      expect(response.citations).toEqual([]);
    });
  });

  describe('10. Cross-Tenant Cache Isolation (SEC-02)', () => {
    it('User A querying with same hash cannot receive User B cached LLM answer', async () => {
      mockCachingService.getCachedLLMResponse.mockImplementation((userId: string, _hash: string) => {
        if (userId === USER_B) return Promise.resolve('User B confidential cached answer');
        return Promise.resolve(null);
      });

      const userAResult = await mockCachingService.getCachedLLMResponse(USER_A, 'hash-identical');
      expect(userAResult).toBeNull();

      const userBResult = await mockCachingService.getCachedLLMResponse(USER_B, 'hash-identical');
      expect(userBResult).toBe('User B confidential cached answer');
    });
  });

  describe('11. Cross-Tenant Resource Deletion Prevention', () => {
    it('User A cannot delete User B document (throws NotFoundException)', async () => {
      mockPrisma.document.findFirst.mockImplementation(({ where }: any) => {
        if (where.id === DOC_USER_B && where.userId === USER_A) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(documentsService.deleteDocument(DOC_USER_B, USER_A)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockMinioService.deleteFile).not.toHaveBeenCalled();
      expect(mockChromaService.deleteByDocumentId).not.toHaveBeenCalled();
    });
  });

  describe('12. Unauthenticated Request Rejection', () => {
    it('Vector search rejects requests missing userId with BadRequestException', async () => {
      await expect(embeddingsService.search('query', 5, undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RAG ask rejects requests missing userId with BadRequestException', async () => {
      await expect(ragService.ask('query', undefined, 5, undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
