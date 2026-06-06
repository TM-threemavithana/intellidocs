import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ChromaService } from '../embeddings/chroma.service';
import { OllamaService } from '../embeddings/ollama.service';
import { CachingService } from '../common/caching.service';

export interface SimpleSearchResult {
  documentId: string;
  documentName: string;
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
  ) {}

  /**
   * Simple search by document name
   */
  async searchByName(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<SimpleSearchResult[]> {
    const documents = await this.prisma.document.findMany({
      where: {
        userId,
        fileName: {
          contains: query,
          mode: 'insensitive',
        },
        isDeleted: false,
      },
      take: limit,
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return documents.map((doc) => ({
      documentId: doc.id,
      documentName: doc.fileName,
      score: this.calculateSimpleScore(query, doc.fileName),
      metadata: {
        fileSize: doc.fileSize,
        createdAt: doc.createdAt,
      },
    }));
  }

  /**
   * Vector search using ChromaDB
   */
  async vectorSearch(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<SimpleSearchResult[]> {
    try {
      // Generate embedding
      const embedding = await this.ollamaService.generateEmbedding(query);

      // Search in ChromaDB
      const chromaResults = await this.chromaService.search(
        embedding,
        limit,
        { userId },
      );

      const results: SimpleSearchResult[] = [];

      for (const result of chromaResults) {
        if (result.metadata?.documentId) {
          const document = await this.prisma.document.findUnique({
            where: { id: result.metadata.documentId },
            select: { id: true, fileName: true },
          });

          if (document) {
            results.push({
              documentId: document.id,
              documentName: document.fileName,
              score: result.similarity,
              metadata: result.metadata,
            });
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Vector search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Hybrid search (simple name search + vector search)
   */
  async hybridSearch(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<SimpleSearchResult[]> {
    const [nameResults, vectorResults] = await Promise.all([
      this.searchByName(query, userId, limit),
      this.vectorSearch(query, userId, limit),
    ]);

    // Combine and deduplicate results
    const resultMap = new Map<string, SimpleSearchResult>();

    // Add name search results (weight: 0.4)
    for (const result of nameResults) {
      resultMap.set(result.documentId, {
        ...result,
        score: result.score * 0.4,
      });
    }

    // Add/merge vector search results (weight: 0.6)
    for (const result of vectorResults) {
      if (resultMap.has(result.documentId)) {
        const existing = resultMap.get(result.documentId)!;
        existing.score += result.score * 0.6;
      } else {
        resultMap.set(result.documentId, {
          ...result,
          score: result.score * 0.6,
        });
      }
    }

    // Sort by score and return top results
    return Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate simple similarity score
   */
  private calculateSimpleScore(query: string, text: string): number {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    // Exact match
    if (textLower === queryLower) return 1.0;

    // Contains query
    if (textLower.includes(queryLower)) return 0.8;

    // Word-level matching
    const queryWords = queryLower.split(/\s+/);
    const textWords = textLower.split(/\s+/);
    const matches = queryWords.filter((word) =>
      textWords.some((tw) => tw.includes(word)),
    ).length;

    return matches / queryWords.length * 0.6;
  }

  /**
   * Get search statistics
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
