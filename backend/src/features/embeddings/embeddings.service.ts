import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ChromaService, EmbeddingMetadata } from './chroma.service';
import { ChunkingService, TextChunk } from './chunking.service';
import { OllamaService } from './ollama.service';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chromaService: ChromaService,
    private readonly chunkingService: ChunkingService,
    private readonly ollamaService: OllamaService,
  ) {}

  /**
   * Generate embeddings for a document
   */
  async generateEmbeddingsForDocument(documentId: string): Promise<void> {
    this.logger.log(`Generating embeddings for document: ${documentId}`);

    // Get document
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
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
      // Generate embedding using simple method (we'll improve this later)
      const embedding = await this.generateEmbedding(chunk.text);
      
      // Create unique ID
      const vectorId = `${documentId}_p${chunk.pageNumber}_c${chunk.chunkIndex}`;
      
      ids.push(vectorId);
      embeddings.push(embedding);
      documents.push(chunk.text);
      
      const metadata: EmbeddingMetadata = {
        documentId,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.text.substring(0, 200), // Store preview
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

    this.logger.log(`✅ Generated ${chunks.length} embeddings for document: ${documentId}`);
  }

  /**
   * Generate embedding for text using Ollama
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use OllamaService to generate embeddings
      const embedding = await this.ollamaService.generateEmbedding(text);
      this.logger.debug(`Generated embedding of dimension ${embedding.length}`);
      return embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for similar chunks
   */
  async search(
    query: string,
    topK: number = 5,
    documentIds?: string[],
  ) {
    this.logger.log(`Searching for: "${query.substring(0, 50)}..."`);

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Build filter
    const filter = documentIds && documentIds.length > 0
      ? { documentId: { $in: documentIds } }
      : undefined;

    // Search ChromaDB
    const results = await this.chromaService.search(queryEmbedding, topK, filter);

    this.logger.log(`Found ${results.length} similar chunks`);
    return results;
  }

  /**
   * Get embeddings stats
   */
  async getStats() {
    const chromaStats = await this.chromaService.getStats();
    const dbCount = await this.prisma.embedding.count();

    return {
      chromadb: chromaStats,
      database: { count: dbCount },
    };
  }

  /**
   * Delete embeddings for a document
   */
  async deleteEmbeddings(documentId: string): Promise<void> {
    await this.chromaService.deleteByDocumentId(documentId);
    await this.prisma.embedding.deleteMany({ where: { documentId } });
    this.logger.log(`Deleted embeddings for document: ${documentId}`);
  }
}
