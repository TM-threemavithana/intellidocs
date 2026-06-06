import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface EnhancedCitation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  relevanceScore: number;
  confidenceScore: number;
  text: string;
  context: string;
  highlightedText?: string;
  pagePreview?: string;
}

export interface CitationStatistics {
  totalCitations: number;
  documentsReferenced: number;
  averageRelevance: number;
  averageConfidence: number;
  citationsByDocument: Array<{
    documentId: string;
    documentName: string;
    count: number;
  }>;
}

@Injectable()
export class CitationsService {
  private readonly logger = new Logger(CitationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Enhance citations with additional metadata
   */
  async enhanceCitations(citations: any[]): Promise<EnhancedCitation[]> {
    const enhanced: EnhancedCitation[] = [];

    for (const citation of citations) {
      try {
        // Calculate confidence score based on relevance
        const confidenceScore = this.calculateConfidence(citation.relevanceScore);

        // Get context (surrounding text)
        const context = await this.getChunkContext(
          citation.documentId,
          citation.pageNumber,
          citation.chunkIndex,
        );

        // Highlight relevant parts
        const highlightedText = this.highlightRelevantText(
          citation.text,
          context.query,
        );

        enhanced.push({
          ...citation,
          confidenceScore,
          context: context.text,
          highlightedText,
        });
      } catch (error) {
        this.logger.warn(`Failed to enhance citation: ${error.message}`);
        // Include original citation even if enhancement fails
        enhanced.push({
          ...citation,
          confidenceScore: citation.relevanceScore,
          context: '',
        });
      }
    }

    return enhanced;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(relevanceScore: number): number {
    // Convert relevance score (0-1) to confidence level
    // Apply sigmoid-like transformation for better distribution
    if (relevanceScore >= 0.9) return 0.95; // Very high confidence
    if (relevanceScore >= 0.7) return 0.85; // High confidence
    if (relevanceScore >= 0.5) return 0.70; // Medium confidence
    if (relevanceScore >= 0.3) return 0.55; // Low confidence
    return 0.40; // Very low confidence
  }

  /**
   * Get surrounding context for a chunk
   */
  private async getChunkContext(
    documentId: string,
    pageNumber: number,
    chunkIndex: number,
  ): Promise<{ text: string; query?: string }> {
    try {
      // Get chunks before and after for context
      const chunks = await this.prisma.embedding.findMany({
        where: {
          documentId,
          pageNumber,
          chunkIndex: {
            gte: Math.max(0, chunkIndex - 1),
            lte: chunkIndex + 1,
          },
        },
        orderBy: { chunkIndex: 'asc' },
      });

      if (chunks.length === 0) {
        return { text: '' };
      }

      // Combine chunks for context
      const contextText = chunks.map((c) => c.chunkText).join(' ... ');
      
      return {
        text: contextText.substring(0, 500), // Limit context length
      };
    } catch (error) {
      this.logger.error(`Failed to get chunk context: ${error.message}`);
      return { text: '' };
    }
  }

  /**
   * Highlight relevant text (simplified - no actual highlighting, just markers)
   */
  private highlightRelevantText(text: string, query?: string): string {
    if (!query) return text;

    // Simple keyword highlighting
    const keywords = query.toLowerCase().split(' ').filter((w) => w.length > 3);
    let highlighted = text;

    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, (match) => `**${match}**`);
    });

    return highlighted;
  }

  /**
   * Get citation statistics for a chat/document
   */
  async getCitationStatistics(
    documentId?: string,
    userId?: string,
  ): Promise<CitationStatistics> {
    try {
      // Get all chats with citations
      const chats = await this.prisma.chat.findMany({
        where: {
          ...(documentId && { documentId }),
          ...(userId && { userId }),
        },
        select: {
          sourceCitations: true,
          document: {
            select: {
              id: true,
              fileName: true,
            },
          },
        },
      });

      // Aggregate citation statistics
      const allCitations: any[] = [];
      const documentCounts = new Map<string, { name: string; count: number }>();

      chats.forEach((chat) => {
        const citations = chat.sourceCitations as any[];
        if (Array.isArray(citations)) {
          citations.forEach((citation) => {
            allCitations.push(citation);

            const docId = citation.documentId;
            const docName = citation.documentName || 'Unknown';
            
            if (!documentCounts.has(docId)) {
              documentCounts.set(docId, { name: docName, count: 0 });
            }
            documentCounts.get(docId)!.count++;
          });
        }
      });

      // Calculate averages
      const totalRelevance = allCitations.reduce(
        (sum, c) => sum + (c.relevanceScore || 0),
        0,
      );
      const avgRelevance = allCitations.length > 0 
        ? totalRelevance / allCitations.length 
        : 0;

      const avgConfidence = allCitations.reduce(
        (sum, c) => sum + this.calculateConfidence(c.relevanceScore || 0),
        0,
      ) / (allCitations.length || 1);

      return {
        totalCitations: allCitations.length,
        documentsReferenced: documentCounts.size,
        averageRelevance: Math.round(avgRelevance * 100) / 100,
        averageConfidence: Math.round(avgConfidence * 100) / 100,
        citationsByDocument: Array.from(documentCounts.entries()).map(
          ([documentId, data]) => ({
            documentId,
            documentName: data.name,
            count: data.count,
          }),
        ),
      };
    } catch (error) {
      this.logger.error(`Failed to get citation statistics: ${error.message}`);
      return {
        totalCitations: 0,
        documentsReferenced: 0,
        averageRelevance: 0,
        averageConfidence: 0,
        citationsByDocument: [],
      };
    }
  }

  /**
   * Group citations by document
   */
  groupCitationsByDocument(citations: EnhancedCitation[]): Map<string, EnhancedCitation[]> {
    const grouped = new Map<string, EnhancedCitation[]>();

    citations.forEach((citation) => {
      const docId = citation.documentId;
      if (!grouped.has(docId)) {
        grouped.set(docId, []);
      }
      grouped.get(docId)!.push(citation);
    });

    return grouped;
  }

  /**
   * Get top citations by confidence
   */
  getTopCitations(citations: EnhancedCitation[], limit: number = 3): EnhancedCitation[] {
    return citations
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, limit);
  }
}
