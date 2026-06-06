import { Injectable, Logger } from '@nestjs/common';
import { encoding_for_model } from 'tiktoken';

export enum ChunkingStrategy {
  TOKEN_BASED = 'token-based',
  SEMANTIC = 'semantic',
  SENTENCE_BASED = 'sentence-based',
  PARAGRAPH_BASED = 'paragraph-based',
  SLIDING_WINDOW = 'sliding-window',
  ADAPTIVE = 'adaptive',
}

export interface ChunkMetadata {
  sectionHeader?: string;
  documentStructure?: string; // chapter, section, subsection
  contentType?: string; // text, list, table
  importanceScore?: number; // 0-1
  keywords?: string[];
}

export interface TextChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  tokenCount: number;
  metadata?: ChunkMetadata;
  strategy?: ChunkingStrategy;
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
   * Chunk text into segments with specified strategy
   */
  chunkText(
    text: string,
    pageNumber: number,
    strategy: ChunkingStrategy = ChunkingStrategy.TOKEN_BASED,
  ): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    let chunks: TextChunk[] = [];
    
    switch (strategy) {
      case ChunkingStrategy.TOKEN_BASED:
        chunks = this.tokenizer
          ? this.chunkByTokens(text, pageNumber)
          : this.chunkByCharacters(text, pageNumber);
        break;
      case ChunkingStrategy.SEMANTIC:
        chunks = this.chunkBySemantic(text, pageNumber);
        break;
      case ChunkingStrategy.SENTENCE_BASED:
        chunks = this.chunkBySentences(text, pageNumber);
        break;
      case ChunkingStrategy.PARAGRAPH_BASED:
        chunks = this.chunkByParagraphs(text, pageNumber);
        break;
      case ChunkingStrategy.SLIDING_WINDOW:
        chunks = this.chunkBySlidingWindow(text, pageNumber);
        break;
      case ChunkingStrategy.ADAPTIVE:
        chunks = this.chunkAdaptive(text, pageNumber);
        break;
      default:
        chunks = this.tokenizer
          ? this.chunkByTokens(text, pageNumber)
          : this.chunkByCharacters(text, pageNumber);
    }

    // Add strategy metadata
    chunks.forEach((chunk) => {
      chunk.strategy = strategy;
    });

    // Enrich chunks with metadata
    return this.enrichChunksWithMetadata(chunks, text);
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
  chunkPages(
    pages: Array<{ pageNumber: number; text: string }>,
    strategy: ChunkingStrategy = ChunkingStrategy.TOKEN_BASED,
  ): TextChunk[] {
    const allChunks: TextChunk[] = [];
    
    for (const page of pages) {
      // Ensure text is a string
      const text = String(page.text || '');
      if (!text.trim()) {
        this.logger.warn(`Page ${page.pageNumber} has no text, skipping`);
        continue;
      }
      
      const pageChunks = this.chunkText(text, page.pageNumber, strategy);
      allChunks.push(...pageChunks);
    }

    this.logger.log(`Chunked ${pages.length} pages into ${allChunks.length} chunks using ${strategy}`);
    return allChunks;
  }

  /**
   * Semantic chunking - by meaning/topics
   */
  private chunkBySemantic(text: string, pageNumber: number): TextChunk[] {
    // Split by logical breaks: double newlines, section headers
    const paragraphs = text.split(/\n\n+/);
    const chunks: TextChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    let startChar = 0;

    for (const paragraph of paragraphs) {
      const paraTokens = this.countTokens(paragraph);
      
      if (currentTokens + paraTokens > this.chunkSize && currentChunk.length > 0) {
        // Create chunk
        const chunkText = currentChunk.join('\n\n');
        chunks.push({
          text: chunkText.trim(),
          pageNumber,
          chunkIndex,
          startChar,
          endChar: startChar + chunkText.length,
          tokenCount: currentTokens,
        });
        
        chunkIndex++;
        startChar += chunkText.length;
        currentChunk = [paragraph];
        currentTokens = paraTokens;
      } else {
        currentChunk.push(paragraph);
        currentTokens += paraTokens;
      }
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('\n\n');
      chunks.push({
        text: chunkText.trim(),
        pageNumber,
        chunkIndex,
        startChar,
        endChar: startChar + chunkText.length,
        tokenCount: currentTokens,
      });
    }

    return chunks;
  }

  /**
   * Sentence-based chunking - complete sentences only
   */
  private chunkBySentences(text: string, pageNumber: number): TextChunk[] {
    // Split into sentences
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences = text.match(sentenceRegex) || [text];
    
    const chunks: TextChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    let startChar = 0;

    for (const sentence of sentences) {
      const sentTokens = this.countTokens(sentence);
      
      if (currentTokens + sentTokens > this.chunkSize && currentChunk.length > 0) {
        const chunkText = currentChunk.join(' ');
        chunks.push({
          text: chunkText.trim(),
          pageNumber,
          chunkIndex,
          startChar,
          endChar: startChar + chunkText.length,
          tokenCount: currentTokens,
        });
        
        chunkIndex++;
        startChar += chunkText.length;
        currentChunk = [sentence];
        currentTokens = sentTokens;
      } else {
        currentChunk.push(sentence);
        currentTokens += sentTokens;
      }
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      chunks.push({
        text: chunkText.trim(),
        pageNumber,
        chunkIndex,
        startChar,
        endChar: startChar + chunkText.length,
        tokenCount: currentTokens,
      });
    }

    return chunks;
  }

  /**
   * Paragraph-based chunking - full paragraphs
   */
  private chunkByParagraphs(text: string, pageNumber: number): TextChunk[] {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const chunks: TextChunk[] = [];
    let startChar = 0;

    paragraphs.forEach((paragraph, index) => {
      const tokenCount = this.countTokens(paragraph);
      chunks.push({
        text: paragraph.trim(),
        pageNumber,
        chunkIndex: index,
        startChar,
        endChar: startChar + paragraph.length,
        tokenCount,
      });
      startChar += paragraph.length + 2; // +2 for \n\n
    });

    return chunks;
  }

  /**
   * Sliding window chunking - overlapping windows
   */
  private chunkBySlidingWindow(text: string, pageNumber: number): TextChunk[] {
    // Similar to token-based but with smaller overlap
    const smallOverlap = 50; // tokens
    const chunks: TextChunk[] = [];
    
    if (this.tokenizer) {
      const tokens = this.tokenizer.encode(text);
      let chunkIndex = 0;
      let startToken = 0;

      while (startToken < tokens.length) {
        const endToken = Math.min(startToken + this.chunkSize, tokens.length);
        const chunkTokens = tokens.slice(startToken, endToken);
        const decodedText = this.tokenizer.decode(chunkTokens);
        const chunkText = typeof decodedText === 'string' ? decodedText : String(decodedText);
        
        const startChar = this.findCharPosition(text, chunkText, startToken);
        
        chunks.push({
          text: chunkText.trim(),
          pageNumber,
          chunkIndex,
          startChar,
          endChar: startChar + chunkText.length,
          tokenCount: chunkTokens.length,
        });

        chunkIndex++;
        startToken = endToken - smallOverlap;
        
        if (startToken >= tokens.length - smallOverlap) {
          break;
        }
      }
    } else {
      // Fallback to character-based sliding window
      return this.chunkByCharacters(text, pageNumber);
    }

    return chunks;
  }

  /**
   * Adaptive chunking - dynamic sizing based on content
   */
  private chunkAdaptive(text: string, pageNumber: number): TextChunk[] {
    // Analyze content density and adjust chunk size
    const paragraphs = text.split(/\n\n+/);
    const chunks: TextChunk[] = [];
    let chunkIndex = 0;
    let startChar = 0;

    for (const paragraph of paragraphs) {
      const paraTokens = this.countTokens(paragraph);
      
      // Adaptive sizing: smaller chunks for dense content, larger for sparse
      let adaptiveSize = this.chunkSize;
      if (paraTokens < 100) {
        // Short paragraph - use larger chunks
        adaptiveSize = this.chunkSize * 1.5;
      } else if (paraTokens > 800) {
        // Long paragraph - use smaller chunks
        adaptiveSize = this.chunkSize * 0.7;
      }

      if (paraTokens > adaptiveSize) {
        // Split large paragraph
        const subChunks = this.chunkByTokens(paragraph, pageNumber);
        subChunks.forEach((chunk) => {
          chunks.push({
            ...chunk,
            chunkIndex,
            startChar: startChar + chunk.startChar,
            endChar: startChar + chunk.endChar,
          });
          chunkIndex++;
        });
      } else {
        // Use full paragraph
        chunks.push({
          text: paragraph.trim(),
          pageNumber,
          chunkIndex,
          startChar,
          endChar: startChar + paragraph.length,
          tokenCount: paraTokens,
        });
        chunkIndex++;
      }
      
      startChar += paragraph.length + 2;
    }

    return chunks;
  }

  /**
   * Enrich chunks with metadata
   */
  private enrichChunksWithMetadata(chunks: TextChunk[], fullText: string): TextChunk[] {
    return chunks.map((chunk) => {
      const metadata: ChunkMetadata = {};

      // Detect section headers (lines ending with : or all caps)
      const lines = chunk.text.split('\n');
      const firstLine = lines[0];
      if (firstLine.endsWith(':') || firstLine === firstLine.toUpperCase()) {
        metadata.sectionHeader = firstLine;
      }

      // Detect content type
      if (chunk.text.includes('|') && chunk.text.includes('---')) {
        metadata.contentType = 'table';
      } else if (chunk.text.match(/^\d+\.|^-|^\*/m)) {
        metadata.contentType = 'list';
      } else {
        metadata.contentType = 'text';
      }

      // Calculate importance score based on position and length
      const positionScore = 1 - chunk.chunkIndex / chunks.length;
      const lengthScore = Math.min(chunk.tokenCount / this.chunkSize, 1);
      metadata.importanceScore = (positionScore + lengthScore) / 2;

      // Extract keywords (simple: words appearing multiple times)
      const words = chunk.text.toLowerCase().match(/\b\w{4,}\b/g) || [];
      const wordFreq = new Map<string, number>();
      words.forEach((word) => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
      metadata.keywords = Array.from(wordFreq.entries())
        .filter(([, freq]) => freq > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

      chunk.metadata = metadata;
      return chunk;
    });
  }
}
