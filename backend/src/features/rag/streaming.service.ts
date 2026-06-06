import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

export interface StreamChunk {
  type: 'start' | 'chunk' | 'citation' | 'end' | 'error';
  content?: string;
  citation?: any;
  error?: string;
  metadata?: {
    chunkIndex?: number;
    totalChunks?: number;
    timestamp?: number;
  };
}

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  /**
   * Stream LLM response using Ollama's streaming API
   */
  streamLLMResponse(
    prompt: string,
    model: string = 'llama2',
  ): Observable<StreamChunk> {
    return new Observable((subscriber) => {
      const startTime = Date.now();
      
      // Send start event
      subscriber.next({
        type: 'start',
        metadata: { timestamp: startTime },
      });

      // Call Ollama streaming API
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      
      fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
          },
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }

          const decoder = new TextDecoder();
          let chunkIndex = 0;

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Send end event
              subscriber.next({
                type: 'end',
                metadata: {
                  timestamp: Date.now(),
                  chunkIndex,
                },
              });
              subscriber.complete();
              break;
            }

            // Decode and parse chunks
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter((line) => line.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                
                if (data.response) {
                  subscriber.next({
                    type: 'chunk',
                    content: data.response,
                    metadata: {
                      chunkIndex: chunkIndex++,
                      timestamp: Date.now(),
                    },
                  });
                }

                if (data.done) {
                  this.logger.log(`Streaming completed: ${chunkIndex} chunks in ${Date.now() - startTime}ms`);
                }
              } catch (error) {
                this.logger.warn(`Failed to parse chunk: ${error.message}`);
              }
            }
          }
        })
        .catch((error) => {
          this.logger.error('Streaming error:', error);
          subscriber.next({
            type: 'error',
            error: error.message,
          });
          subscriber.error(error);
        });
    });
  }

  /**
   * Stream RAG response with citations
   */
  streamRAGResponse(
    query: string,
    context: string,
    citations: any[],
  ): Observable<StreamChunk> {
    return new Observable((subscriber) => {
      const prompt = this.buildStreamingPrompt(query, context);

      // First, send citations
      citations.forEach((citation, index) => {
        subscriber.next({
          type: 'citation',
          citation,
          metadata: { chunkIndex: index },
        });
      });

      // Then stream the answer
      this.streamLLMResponse(prompt).subscribe({
        next: (chunk) => subscriber.next(chunk),
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      });
    });
  }

  /**
   * Build prompt for streaming
   */
  private buildStreamingPrompt(query: string, context: string): string {
    return `You are a helpful AI assistant that answers questions based on document content.

Context from documents:
${context}

Question: ${query}

Instructions:
- Answer based ONLY on the provided context above
- If the answer is not in the context, say "I don't have enough information to answer this question"
- Be concise and accurate
- Cite the document and page number when providing information

Answer:`;
  }

  /**
   * Format SSE message
   */
  formatSSEMessage(chunk: StreamChunk): string {
    return `data: ${JSON.stringify(chunk)}\n\n`;
  }
}
