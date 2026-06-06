import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
  }

  /**
   * Generate embeddings using Ollama API
   * @param text Text to embed
   * @param model Embedding model to use (default: llama2)
   * @returns Embedding vector
   */
  async generateEmbedding(text: string, model: string = 'llama2'): Promise<number[]> {
    try {
      // Try to use Ollama's embedding endpoint
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.embedding && Array.isArray(data.embedding)) {
        this.logger.debug(`Generated embedding of dimension ${data.embedding.length}`);
        return data.embedding;
      }

      throw new Error('Invalid response from Ollama API');
    } catch (error) {
      this.logger.error(`Failed to generate embedding with Ollama: ${error.message}`);
      // Fallback to simple embedding
      return this.generateSimpleEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts Array of texts to embed
   * @param model Embedding model to use
   * @returns Array of embedding vectors
   */
  async generateEmbeddings(texts: string[], model: string = 'llama2'): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text, model);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  /**
   * Fallback: Generate simple embedding using TF-IDF-like approach
   * This is a temporary solution until proper embedding model is available
   */
  private generateSimpleEmbedding(text: string): number[] {
    const dimension = 384; // Standard dimension for sentence transformers
    const embedding = new Array(dimension).fill(0);
    
    // Normalize text
    const normalizedText = text.toLowerCase().trim();
    
    // Create a simple hash-based embedding with better distribution
    const words = normalizedText.split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Use multiple hash functions for better distribution
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        
        // Hash 1: Position-based
        const index1 = (charCode * (i + 1) * (j + 1)) % dimension;
        embedding[index1] += 1.0 / (i + 1);
        
        // Hash 2: Character-based
        const index2 = (charCode * 31 + j) % dimension;
        embedding[index2] += 0.5 / (j + 1);
        
        // Hash 3: Word-based
        const index3 = (word.length * charCode + i) % dimension;
        embedding[index3] += 0.3;
      }
    }
    
    // Add text length feature
    const lengthIndex = text.length % dimension;
    embedding[lengthIndex] += Math.log(text.length + 1) / 10;
    
    // Add word count feature
    const wordCountIndex = (words.length * 7) % dimension;
    embedding[wordCountIndex] += Math.log(words.length + 1) / 10;
    
    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      this.logger.warn('Ollama is not available');
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      this.logger.error(`Failed to list Ollama models: ${error.message}`);
      return [];
    }
  }
}
