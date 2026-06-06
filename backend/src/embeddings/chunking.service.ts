import { Injectable, Logger } from '@nestjs/common';
import { encoding_for_model } from 'tiktoken';

export interface TextChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  tokenCount: number;
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly chunkSize = 500; // tokens
  private readonly chunkOverlap = 100; // tokens
  private tokenizer: any;

  constructor() {
    try {
      // Use GPT-3.5 tokenizer (cl100k_base)
      this.tokenizer = encoding_for_model('gpt-3.5-turbo');
    } catch (error) {
      this.logger.warn('Failed to load tiktoken, using character-based chunking');
    }
  }

  /**
   * Chunk text into overlapping segments
   */
  chunkText(text: string, pageNumber: number): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const chunks: TextChunk[] = [];
    
    if (this.tokenizer) {
      // Token-based chunking
      chunks.push(...this.chunkByTokens(text, pageNumber));
    } else {
      // Fallback to character-based chunking
      chunks.push(...this.chunkByCharacters(text, pageNumber));
    }

    return chunks;
  }

  /**
   * Token-based chunking using tiktoken
   */
  private chunkByTokens(text: string, pageNumber: number): TextChunk[] {
    const chunks: TextChunk[] = [];
    const tokens = this.tokenizer.encode(text);
    
    let chunkIndex = 0;
    let startToken = 0;

    while (startToken < tokens.length) {
      const endToken = Math.min(startToken + this.chunkSize, tokens.length);
      const chunkTokens = tokens.slice(startToken, endToken);
      
      // Decode tokens back to text
      const decodedText = this.tokenizer.decode(chunkTokens);
      const chunkText = typeof decodedText === 'string' ? decodedText : String(decodedText);
      
      // Find character positions (approximate)
      const startChar = this.findCharPosition(text, chunkText, startToken);
      const endChar = startChar + chunkText.length;

      chunks.push({
        text: chunkText.trim(),
        pageNumber,
        chunkIndex,
        startChar,
        endChar,
        tokenCount: chunkTokens.length,
      });

      chunkIndex++;
      
      // Move start position with overlap
      startToken = endToken - this.chunkOverlap;
      
      // Prevent infinite loop
      if (startToken >= tokens.length - this.chunkOverlap) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Character-based chunking (fallback)
   */
  private chunkByCharacters(text: string, pageNumber: number): TextChunk[] {
    const chunks: TextChunk[] = [];
    const avgCharsPerToken = 4; // Approximate
    const chunkSizeChars = this.chunkSize * avgCharsPerToken;
    const overlapChars = this.chunkOverlap * avgCharsPerToken;
    
    let chunkIndex = 0;
    let startChar = 0;

    while (startChar < text.length) {
      let endChar = Math.min(startChar + chunkSizeChars, text.length);
      
      // Try to break at sentence boundary
      if (endChar < text.length) {
        const sentenceEnd = this.findSentenceEnd(text, endChar);
        if (sentenceEnd > startChar && sentenceEnd < endChar + 100) {
          endChar = sentenceEnd;
        }
      }

      const chunkText = text.substring(startChar, endChar).trim();
      
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          pageNumber,
          chunkIndex,
          startChar,
          endChar,
          tokenCount: Math.ceil(chunkText.length / avgCharsPerToken),
        });
        chunkIndex++;
      }

      // Move start position with overlap
      startChar = endChar - overlapChars;
      
      // Prevent infinite loop
      if (startChar >= text.length - overlapChars) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Find the nearest sentence end
   */
  private findSentenceEnd(text: string, position: number): number {
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    let nearestEnd = position;
    let minDistance = Infinity;

    for (const ender of sentenceEnders) {
      const index = text.indexOf(ender, position);
      if (index !== -1) {
        const distance = index - position;
        if (distance < minDistance) {
          minDistance = distance;
          nearestEnd = index + ender.length;
        }
      }
    }

    return nearestEnd;
  }

  /**
   * Find approximate character position for token position
   */
  private findCharPosition(text: string, chunkText: string, tokenPosition: number): number {
    // Simple approximation: find the chunk text in the original text
    const index = text.indexOf(chunkText);
    return index !== -1 ? index : tokenPosition * 4; // Fallback to approximate
  }

  /**
   * Count tokens in text
   */
  countTokens(text: string): number {
    if (this.tokenizer) {
      return this.tokenizer.encode(text).length;
    }
    // Fallback: approximate
    return Math.ceil(text.length / 4);
  }

  /**
   * Chunk multiple pages
   */
  chunkPages(pages: Array<{ pageNumber: number; text: string }>): TextChunk[] {
    const allChunks: TextChunk[] = [];
    
    for (const page of pages) {
      // Ensure text is a string
      const text = String(page.text || '');
      if (!text.trim()) {
        this.logger.warn(`Page ${page.pageNumber} has no text, skipping`);
        continue;
      }
      
      const pageChunks = this.chunkText(text, page.pageNumber);
      allChunks.push(...pageChunks);
    }

    this.logger.log(`Chunked ${pages.length} pages into ${allChunks.length} chunks`);
    return allChunks;
  }
}
