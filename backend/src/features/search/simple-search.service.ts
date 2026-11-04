import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ChromaService } from '../embeddings/chroma.service';
import { OllamaService } from '../embeddings/ollama.service';
import { CachingService } from '../../core/caching/caching.service';

export interface SimpleSearchResult {
  documentId: string;
  documentName: string;
  chunkText?: string;
  pageNumber?: number;
  score: number;
  metadata?: any;
}

@Injectable()
export class SimpleSearchService {
  private readonly logger = new Logger(SimpleSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chromaService: ChromaService,
    private readonly ollamaService: OllamaService,
    private readonly cachingService: CachingService,
  ) { }

  /**
   * Keyword search covering document filenames and content chunks (SEC-01, BUG-02)
   */
  async searchByName(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<SimpleSearchResult[]> {
    if (!userId || !query?.trim()) return [];

    const [matchingDocs, matchingChunks] = await Promise.all([
      // 1. Search document filenames
      this.prisma.document.findMany({
        where: {
          userId,
          fileName: { contains: query, mode: 'insensitive' },
          isDeleted: false,
        },
        take: limit,
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          createdAt: true,
        },
      }),
      // 2. Search actual extracted text chunks in PostgreSQL
      this.prisma.embedding.findMany({
        where: {
          document: { userId, isDeleted: false },
          chunkText: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        select: {
          documentId: true,
          chunkText: true,
          pageNumber: true,
          chunkIndex: true,
          document: { select: { fileName: true, fileSize: true, createdAt: true } },
        },
      }),
    ]);

    const results: SimpleSearchResult[] = [];
    const seenKeys = new Set<string>();

    // Add filename matches
    for (const doc of matchingDocs) {
      const key = `${doc.id}_doc`;
      seenKeys.add(key);
      results.push({
        documentId: doc.id,
        documentName: doc.fileName,
        chunkText: `Document filename match: ${doc.fileName}`,
        pageNumber: 1,
        score: this.calculateSimpleScore(query, doc.fileName),
        metadata: { fileSize: doc.fileSize, createdAt: doc.createdAt },
      });
    }

    // Add chunk content matches
    for (const chunk of matchingChunks) {
      const key = `${chunk.documentId}_p${chunk.pageNumber}_c${chunk.chunkIndex}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push({
          documentId: chunk.documentId,
          documentName: chunk.document.fileName,
          chunkText: chunk.chunkText,
          pageNumber: chunk.pageNumber,
          score: Math.min(0.95, this.calculateSimpleScore(query, chunk.chunkText)),
          metadata: { fileSize: chunk.document.fileSize, createdAt: chunk.document.createdAt },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Vector search using ChromaDB strictly scoped to user documents (SEC-01, BUG-02)
   */
  async vectorSearch(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<SimpleSearchResult[]> {
    if (!userId || !query?.trim()) return [];

    try {
      // 1. Get all permitted documents for this user
      const permittedDocs = await this.prisma.document.findMany({
        where: { userId, isDeleted: false },
        select: { id: true, fileName: true, fileSize: true, createdAt: true },
      });

      if (permittedDocs.length === 0) {
        return [];
      }

      const docMap = new Map(permittedDocs.map((d) => [d.id, d]));
      const docIds = Array.from(docMap.keys());

      // 2. Generate query embedding
      const embedding = await this.ollamaService.generateEmbedding(query);

      // 3. Search in ChromaDB with document ID filter strictly scoped to user's documents
      const chromaResults = await this.chromaService.search(
        embedding,
        limit,
        { documentId: { $in: docIds } },
      );

      const results: SimpleSearchResult[] = [];

      for (const result of chromaResults) {
        const docId = result.metadata?.documentId;
        if (docId && docMap.has(docId)) {
          const doc = docMap.get(docId)!;
          results.push({
            documentId: doc.id,
            documentName: doc.fileName,
            chunkText: result.text || result.metadata?.chunkText || '',
            pageNumber: result.metadata?.pageNumber || 1,
            score: Math.round(result.similarity * 100) / 100,
            metadata: {
              ...result.metadata,
              fileSize: doc.fileSize,
              createdAt: doc.createdAt,
            },
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Vector search failed for user ${userId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Hybrid search combining keyword and semantic vector search with normalized fusion
   */
  async hybridSearch(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<SimpleSearchResult[]> {
    if (!userId || !query?.trim()) return [];

    const [keywordResults, vectorResults] = await Promise.all([
      this.searchByName(query, userId, limit),
      this.vectorSearch(query, userId, limit),
    ]);

    const resultMap = new Map<string, SimpleSearchResult>();

    // Add keyword results (weight: 0.4)
    for (const result of keywordResults) {
      const key = `${result.documentId}_p${result.pageNumber || 1}`;
      resultMap.set(key, {
        ...result,
        score: result.score * 0.4,
      });
    }

    // Merge vector search results (weight: 0.6)
    for (const result of vectorResults) {
      const key = `${result.documentId}_p${result.pageNumber || 1}`;
      if (resultMap.has(key)) {
        const existing = resultMap.get(key)!;
        existing.score = Math.min(1.0, existing.score + result.score * 0.6);
        if (!existing.chunkText && result.chunkText) {
          existing.chunkText = result.chunkText;
        }
      } else {
        resultMap.set(key, {
          ...result,
          score: result.score * 0.6,
        });
      }
    }

    return Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate simple similarity score based on term matching
   */
  private calculateSimpleScore(query: string, text: string): number {
    const queryLower = query.toLowerCase().trim();
    const textLower = text.toLowerCase().trim();

    if (textLower === queryLower) return 1.0;
    if (textLower.includes(queryLower)) return 0.85;

    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return 0.5;

    const matches = queryWords.filter((word) => textLower.includes(word)).length;
    return Math.min(0.8, (matches / queryWords.length) * 0.7);
  }

  /**
   * Get search statistics strictly scoped to user
   */
  async getSearchStats(userId: string) {
    const [totalDocuments, recentSearches] = await Promise.all([
      this.prisma.document.count({
        where: { userId, isDeleted: false },
      }),
      this.prisma.searchHistory.count({
        where: { userId },
      }),
    ]);

    return {
      totalDocuments,
      recentSearches,
    };
  }
}
