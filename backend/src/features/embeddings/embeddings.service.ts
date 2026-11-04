import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ChromaService, EmbeddingMetadata } from './chroma.service';
import { OllamaService } from './ollama.service';
import { ChunkingService } from './chunking.service';
import { CachingService } from '../../core/caching/caching.service';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    private prisma: PrismaService,
    private chromaService: ChromaService,
    private ollamaService: OllamaService,
    private chunkingService: ChunkingService,
    private cachingService: CachingService,
  ) {}

  /**
   * Generate and store embeddings for a document with tenant scoping (SEC-01, BUG-01)
   */
  async generateEmbeddingsForDocument(documentId: string, userId: string): Promise<void> {
    this.logger.log(`Generating embeddings for document: ${documentId} (user: ${userId})`);

    // Get document ensuring ownership
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId, isDeleted: false },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    // Get OCR results
    const ocrResults = await this.prisma.oCRResult.findMany({
      where: { documentId },
      orderBy: { pageNumber: 'asc' },
    });

    if (ocrResults.length === 0) {
      throw new NotFoundException(`No OCR results found for document: ${documentId}`);
    }

    // Check if embeddings already exist
    const hasEmbeddings = await this.chromaService.hasEmbeddings(documentId);
    if (hasEmbeddings) {
      this.logger.log(`Embeddings already exist for document: ${documentId}, deleting old ones`);
      await this.chromaService.deleteByDocumentId(documentId);
      await this.prisma.embedding.deleteMany({ where: { documentId } });
    }

    // Chunk all pages
    const pages = ocrResults.map(ocr => ({
      pageNumber: ocr.pageNumber,
      text: ocr.rawText,
    }));

    const chunks = this.chunkingService.chunkPages(pages);
    this.logger.log(`Created ${chunks.length} chunks from ${pages.length} pages`);

    // Generate embeddings for each chunk
    const ids: string[] = [];
    const embeddings: number[][] = [];
    const metadatas: EmbeddingMetadata[] = [];
    const documents: string[] = [];
    const embeddingRecords: any[] = [];

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk.text);

      const vectorId = `${documentId}_p${chunk.pageNumber}_c${chunk.chunkIndex}`;

      ids.push(vectorId);
      embeddings.push(embedding);
      documents.push(chunk.text);

      const metadata: EmbeddingMetadata = {
        documentId,
        userId, // SEC-01: Explicit tenant metadata in vector store
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.text.substring(0, 200), // Preview
        fileName: document.fileName,
      };
      metadatas.push(metadata);

      // Prepare database record
      embeddingRecords.push({
        documentId,
        chunkText: chunk.text,
        vectorId,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        chunkSize: chunk.tokenCount,
      });
    }

    // Store in ChromaDB
    await this.chromaService.addEmbeddings(ids, embeddings, metadatas, documents);

    // Store metadata in PostgreSQL
    await this.prisma.embedding.createMany({
      data: embeddingRecords,
    });

    // Invalidate user and document caches
    await this.cachingService.invalidateDocumentCache(documentId);
    await this.cachingService.invalidateUserCache(userId);

    this.logger.log(`✅ Generated and indexed ${chunks.length} embeddings for document: ${documentId}`);
  }

  /**
   * Generate embedding for text using Ollama
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.ollamaService.generateEmbedding(text);
      this.logger.debug(`Generated embedding of dimension ${embedding.length}`);
      return embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for similar chunks with strict tenant enforcement (SEC-01)
   */
  async search(
    query: string,
    topK: number = 5,
    documentIds?: string[],
    userId?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Authenticated user context is required for vector search');
    }

    this.logger.log(`Searching for: "${query.substring(0, 50)}..." (user: ${userId})`);

    // Verify permitted documents belonging to this user
    const permittedDocuments = await this.prisma.document.findMany({
      where: {
        userId,
        isDeleted: false,
        ...(documentIds && documentIds.length > 0 ? { id: { in: documentIds } } : {}),
      },
      select: { id: true },
    });

    if (permittedDocuments.length === 0) {
      this.logger.log(`No permitted documents found for user: ${userId}`);
      return [];
    }

    const permittedIds = permittedDocuments.map((doc) => doc.id);
    const queryEmbedding = await this.generateEmbedding(query);

    // Filter ChromaDB strictly to documents owned by this user
    const filter = { documentId: { $in: permittedIds } };

    const results = await this.chromaService.search(queryEmbedding, topK, filter);

    this.logger.log(`Found ${results.length} similar chunks for user ${userId}`);
    return results;
  }

  /**
   * Get embeddings stats scoped to user
   */
  async getStats(userId: string) {
    const chromaStats = await this.chromaService.getStats();
    const dbCount = await this.prisma.embedding.count({
      where: { document: { userId, isDeleted: false } },
    });

    return {
      chromadb: chromaStats,
      database: { count: dbCount },
    };
  }

  /**
   * Delete embeddings for a document with ownership verification
   */
  async deleteEmbeddings(documentId: string, userId: string): Promise<void> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId, isDeleted: false },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.chromaService.deleteByDocumentId(documentId);
    await this.prisma.embedding.deleteMany({ where: { documentId } });
    await this.cachingService.invalidateDocumentCache(documentId);
    await this.cachingService.invalidateUserCache(userId);

    this.logger.log(`Deleted embeddings for document: ${documentId}`);
  }
}
