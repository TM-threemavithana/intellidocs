import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChromaClient, Collection, IEmbeddingFunction } from 'chromadb';

export interface EmbeddingMetadata {
  documentId: string;
  pageNumber: number;
  chunkIndex: number;
  chunkText: string;
  fileName?: string;
}

// Simple embedding function that accepts pre-computed embeddings
class CustomEmbeddingFunction implements IEmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    // This won't be called since we provide embeddings directly
    // But we need to implement it for the interface
    return texts.map(() => new Array(384).fill(0));
  }
}

export interface SearchResult {
  id: string;
  text: string;
  metadata: EmbeddingMetadata;
  distance: number;
  similarity: number;
}

@Injectable()
export class ChromaService implements OnModuleInit {
  private readonly logger = new Logger(ChromaService.name);
  private client: ChromaClient;
  private collection: Collection;
  private readonly collectionName = process.env.CHROMADB_COLLECTION || 'intellidocs_embeddings';

  async onModuleInit() {
    try {
      const chromaUrl = process.env.CHROMADB_URL || 'http://localhost:8000';
      this.logger.log(`Connecting to ChromaDB at ${chromaUrl}`);
      
      this.client = new ChromaClient({
        path: chromaUrl,
      });

      const embeddingFunction = new CustomEmbeddingFunction();

      // Get or create collection
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
          embeddingFunction,
        });
        this.logger.log(`✅ Connected to existing ChromaDB collection: ${this.collectionName}`);
      } catch (error) {
        this.logger.log(`Creating new ChromaDB collection: ${this.collectionName}`);
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          embeddingFunction,
          metadata: { description: 'IntelliDocs document embeddings' },
        });
        this.logger.log(`✅ Created ChromaDB collection: ${this.collectionName}`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to connect to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Add embeddings to ChromaDB
   */
  async addEmbeddings(
    ids: string[],
    embeddings: number[][],
    metadatas: EmbeddingMetadata[],
    documents: string[],
  ): Promise<void> {
    try {
      // Convert metadata to Record<string, any> format
      const chromaMetadatas = metadatas.map(meta => ({
        documentId: meta.documentId,
        pageNumber: meta.pageNumber,
        chunkIndex: meta.chunkIndex,
        chunkText: meta.chunkText,
        fileName: meta.fileName || '',
      }));

      await this.collection.add({
        ids,
        embeddings,
        metadatas: chromaMetadatas,
        documents,
      });
      this.logger.log(`Added ${ids.length} embeddings to ChromaDB`);
    } catch (error) {
      this.logger.error('Failed to add embeddings:', error);
      throw error;
    }
  }

  /**
   * Search for similar embeddings
   */
  async search(
    queryEmbedding: number[],
    topK: number = 5,
    filter?: Record<string, any>,
  ): Promise<SearchResult[]> {
    try {
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: filter,
      });

      // Transform results
      const searchResults: SearchResult[] = [];
      
      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances?.[0]?.[i] || 0;
          const similarity = 1 - distance; // Convert distance to similarity

          const metadata = results.metadatas?.[0]?.[i];
          
          // Handle text - ChromaDB might return string, array, or Buffer
          const rawText: any = results.documents?.[0]?.[i];
          let text: string;
          
          if (typeof rawText === 'string') {
            text = rawText;
          } else if (Array.isArray(rawText)) {
            // Convert number array to string
            text = String.fromCharCode(...(rawText as number[]));
          } else if (rawText && typeof rawText === 'object' && 'toString' in rawText) {
            text = rawText.toString('utf-8');
          } else {
            text = String(rawText || '');
          }
          
          searchResults.push({
            id: results.ids[0][i],
            text,
            metadata: {
              documentId: String(metadata?.documentId || ''),
              pageNumber: Number(metadata?.pageNumber || 0),
              chunkIndex: Number(metadata?.chunkIndex || 0),
              chunkText: String(metadata?.chunkText || ''),
              fileName: String(metadata?.fileName || ''),
            },
            distance,
            similarity,
          });
        }
      }

      return searchResults;
    } catch (error) {
      this.logger.error('Failed to search embeddings:', error);
      throw error;
    }
  }

  /**
   * Delete embeddings by document ID
   */
  async deleteByDocumentId(documentId: string): Promise<void> {
    try {
      await this.collection.delete({
        where: { documentId },
      });
      this.logger.log(`Deleted embeddings for document: ${documentId}`);
    } catch (error) {
      this.logger.error('Failed to delete embeddings:', error);
      throw error;
    }
  }

  /**
   * Get collection stats
   */
  async getStats(): Promise<{ count: number; name: string }> {
    try {
      const count = await this.collection.count();
      return {
        count,
        name: this.collectionName,
      };
    } catch (error) {
      this.logger.error('Failed to get collection stats:', error);
      throw error;
    }
  }

  /**
   * Check if embeddings exist for a document
   */
  async hasEmbeddings(documentId: string): Promise<boolean> {
    try {
      const results = await this.collection.get({
        where: { documentId },
        limit: 1,
      });
      return results.ids.length > 0;
    } catch (error) {
      this.logger.error('Failed to check embeddings:', error);
      return false;
    }
  }
}
