import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { OllamaService } from '../embeddings/ollama.service';
import { QueryEnhancementService } from '../embeddings/query-enhancement.service';
import { ConversationsService } from './conversations.service';
import { CachingService } from '../common/caching.service';

export interface Citation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  relevanceScore: number;
  text: string;
}

export interface RAGResponse {
  answer: string;
  citations: Citation[];
  query: string;
  contextUsed: string;
  tokensUsed?: number;
  responseTime: number;
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly ollamaService: OllamaService,
    private readonly queryEnhancementService: QueryEnhancementService,
    private readonly conversationsService: ConversationsService,
    private readonly cachingService: CachingService,
  ) {}

  /**
   * Ask a question using RAG (Retrieval-Augmented Generation)
   */
  async ask(
    query: string,
    documentIds?: string[],
    topK: number = 5,
    conversationId?: string,
    userId?: string,
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    this.logger.log(`RAG Query: "${query.substring(0, 50)}..."`);

    try {
      // Check cache first
      const questionHash = this.cachingService.generateHash(query + (documentIds?.join(',') || ''));
      const cachedResponse = await this.cachingService.getCachedLLMResponse(questionHash);
      
      if (cachedResponse) {
        this.logger.log('✓ Cache hit for query');
        return JSON.parse(cachedResponse);
      }

      // Step 1: Enhance query
      this.logger.debug('Step 1: Enhancing query');
      const enhancedQuery = await this.queryEnhancementService.enhanceQuery(query);
      this.logger.debug(`Enhanced query - Intent: ${enhancedQuery.intent}, Rewritten: "${enhancedQuery.rewritten}"`);

      // Step 2: Get conversation context if available
      let conversationContext = '';
      if (conversationId && userId) {
        conversationContext = await this.conversationsService.getConversationContext(
          conversationId,
          userId,
        );
        this.logger.debug(`Using conversation context: ${conversationContext.substring(0, 100)}...`);
      }

      // Step 3: Check search cache
      const searchHash = this.cachingService.generateHash(enhancedQuery.rewritten);
      let searchResults = await this.cachingService.getCachedSearchResults(searchHash);
      
      if (!searchResults) {
        // Retrieve relevant chunks (use enhanced query)
        this.logger.debug('Step 3: Retrieving relevant chunks');
        searchResults = await this.embeddingsService.search(
          enhancedQuery.rewritten, // Use enhanced query
          topK,
          documentIds,
        );
        
        // Cache search results
        await this.cachingService.cacheSearchResults(searchHash, searchResults);
      } else {
        this.logger.log('✓ Cache hit for search results');
      }

      if (searchResults.length === 0) {
        return {
          answer: "I don't have enough information to answer this question.",
          citations: [],
          query,
          contextUsed: '',
          responseTime: Date.now() - startTime,
        };
      }

      // Step 4: Build context from retrieved chunks
      this.logger.debug('Step 4: Building context');
      const documentContext = this.buildContext(searchResults);
      
      // Step 5: Build citations
      const citations: Citation[] = searchResults.map(result => ({
        documentId: result.metadata.documentId,
        documentName: result.metadata.fileName || 'Unknown',
        pageNumber: result.metadata.pageNumber,
        chunkIndex: result.metadata.chunkIndex,
        relevanceScore: result.similarity,
        text: result.text.substring(0, 200), // Preview
      }));

      // Step 6: Generate answer using LLM (with conversation context)
      this.logger.debug('Step 6: Generating answer');
      const prompt = this.buildPrompt(query, documentContext, conversationContext);
      const answer = await this.generateAnswer(prompt);

      const responseTime = Date.now() - startTime;
      this.logger.log(`✅ RAG completed in ${responseTime}ms`);

      const response: RAGResponse = {
        answer,
        citations,
        query,
        contextUsed: documentContext,
        responseTime,
      };

      // Cache the response
      await this.cachingService.cacheLLMResponse(questionHash, JSON.stringify(response));

      return response;
    } catch (error) {
      this.logger.error('RAG error:', error);
      throw error;
    }
  }

  /**
   * Build context from search results
   */
  private buildContext(searchResults: any[]): string {
    const contextParts: string[] = [];
    
    for (const result of searchResults) {
      const metadata = result.metadata;
      const header = `[Document: ${metadata.fileName}, Page: ${metadata.pageNumber}]`;
      
      // Decode text if it's a byte array
      let text = result.text;
      if (Array.isArray(text)) {
        text = String.fromCharCode(...text);
      }
      
      contextParts.push(`${header}\n${text}\n`);
    }
    
    return contextParts.join('\n---\n\n');
  }

  /**
   * Build prompt for LLM (with optional conversation context)
   */
  private buildPrompt(query: string, documentContext: string, conversationContext?: string): string {
    let prompt = `You are a helpful AI assistant that answers questions based on document content.\n\n`;

    // Add conversation context if available
    if (conversationContext && conversationContext.trim().length > 0) {
      prompt += `Previous conversation context:\n${conversationContext}\n\n`;
    }

    prompt += `Context from documents:
${documentContext}

Question: ${query}

Instructions:
- Answer based ONLY on the provided context above
- If using previous conversation context, maintain consistency with earlier answers
- If the answer is not in the context, say "I don't have enough information to answer this question"
- Be concise and accurate
- Cite the document and page number when providing information
- If multiple documents mention the same information, cite all of them

Answer:`;

    return prompt;
  }

  /**
   * Generate answer using Ollama LLM
   */
  private async generateAnswer(prompt: string): Promise<string> {
    try {
      // Use Ollama's generate endpoint
      const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama2',
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || "I couldn't generate an answer.";
    } catch (error) {
      this.logger.error('Failed to generate answer:', error);
      return "I encountered an error while generating the answer. Please try again.";
    }
  }

  /**
   * Ask with streaming response (for future implementation)
   */
  async askStreaming(
    query: string,
    documentIds?: string[],
    topK: number = 5,
  ): Promise<ReadableStream> {
    // Retrieve context
    const searchResults = await this.embeddingsService.search(
      query,
      topK,
      documentIds,
    );

    const context = this.buildContext(searchResults);
    const prompt = this.buildPrompt(query, context);

    // Create streaming response (placeholder for future implementation)
    throw new Error('Streaming not yet implemented');
  }
}
