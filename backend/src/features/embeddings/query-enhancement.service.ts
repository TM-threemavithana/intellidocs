import { Injectable, Logger } from '@nestjs/common';

export interface EnhancedQuery {
  original: string;
  corrected: string;
  expanded: string[];
  intent: string;
  rewritten: string;
}

@Injectable()
export class QueryEnhancementService {
  private readonly logger = new Logger(QueryEnhancementService.name);

  // Common synonyms for RAG/document queries
  private readonly synonyms = new Map<string, string[]>([
    ['find', ['search', 'locate', 'discover', 'identify']],
    ['explain', ['describe', 'clarify', 'elaborate', 'define']],
    ['what', ['which', 'that']],
    ['how', ['method', 'way', 'process']],
    ['document', ['file', 'paper', 'text', 'content']],
    ['information', ['data', 'details', 'facts', 'knowledge']],
    ['machine learning', ['ml', 'artificial intelligence', 'ai', 'deep learning']],
    ['neural network', ['nn', 'deep network', 'artificial neural network']],
    ['algorithm', ['method', 'procedure', 'technique', 'approach']],
    ['model', ['system', 'framework', 'architecture']],
    ['training', ['learning', 'optimization', 'fitting']],
    ['prediction', ['inference', 'forecast', 'estimation']],
  ]);

  // Common spelling mistakes
  private readonly commonMistakes = new Map<string, string>([
    ['machien', 'machine'],
    ['leanring', 'learning'],
    ['algoritm', 'algorithm'],
    ['nueral', 'neural'],
    ['netowrk', 'network'],
    ['documnet', 'document'],
    ['inforamtion', 'information'],
    ['explaination', 'explanation'],
    ['defintion', 'definition'],
  ]);

  /**
   * Enhance a user query through multiple steps
   */
  async enhanceQuery(query: string): Promise<EnhancedQuery> {
    this.logger.log(`Enhancing query: "${query}"`);

    // Step 1: Spell correction
    const corrected = this.correctSpelling(query);

    // Step 2: Query expansion (add synonyms)
    const expanded = this.expandQuery(corrected);

    // Step 3: Intent recognition
    const intent = this.recognizeIntent(corrected);

    // Step 4: Query rewriting
    const rewritten = this.rewriteQuery(corrected, intent);

    const result: EnhancedQuery = {
      original: query,
      corrected,
      expanded,
      intent,
      rewritten,
    };

    this.logger.log(
      `Enhanced query: corrected="${corrected}", intent="${intent}", expanded=${expanded.length} terms`,
    );

    return result;
  }

  /**
   * Correct spelling mistakes
   */
  private correctSpelling(query: string): string {
    let corrected = query;

    // Check for common mistakes
    this.commonMistakes.forEach((correct, mistake) => {
      const regex = new RegExp(`\\b${mistake}\\b`, 'gi');
      corrected = corrected.replace(regex, correct);
    });

    // Basic Levenshtein-like correction for known terms
    const words = corrected.split(' ');
    const correctedWords = words.map((word) => {
      const lowerWord = word.toLowerCase();
      
      // Check if word is close to any synonym key
      for (const [key] of this.synonyms) {
        if (this.isCloseMatch(lowerWord, key)) {
          return key;
        }
      }
      
      return word;
    });

    return correctedWords.join(' ');
  }

  /**
   * Expand query with synonyms
   */
  private expandQuery(query: string): string[] {
    const expanded = new Set<string>([query]);
    const lowerQuery = query.toLowerCase();

    // Add synonyms for matched terms
    this.synonyms.forEach((synonymList, term) => {
      if (lowerQuery.includes(term.toLowerCase())) {
        synonymList.forEach((synonym) => {
          expanded.add(query.replace(new RegExp(term, 'gi'), synonym));
        });
      }
    });

    // Add partial expansions (individual word synonyms)
    const words = query.split(' ');
    words.forEach((word) => {
      const lowerWord = word.toLowerCase();
      this.synonyms.forEach((synonymList, term) => {
        if (lowerWord === term.toLowerCase()) {
          synonymList.forEach((synonym) => {
            const expandedQuery = query.replace(new RegExp(`\\b${word}\\b`, 'gi'), synonym);
            expanded.add(expandedQuery);
          });
        }
      });
    });

    return Array.from(expanded).slice(0, 5); // Limit to 5 variations
  }

  /**
   * Recognize query intent
   */
  private recognizeIntent(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Definition/explanation intents
    if (
      lowerQuery.match(/^what (is|are)|define|definition|meaning of|explain/)
    ) {
      return 'definition';
    }

    // How-to intents
    if (lowerQuery.match(/^how (to|do|does|can)|steps|process|procedure/)) {
      return 'how-to';
    }

    // Comparison intents
    if (
      lowerQuery.match(/difference between|compare|versus|vs|better than/)
    ) {
      return 'comparison';
    }

    // List/enumeration intents
    if (lowerQuery.match(/list|types of|kinds of|examples of|what are/)) {
      return 'list';
    }

    // Factual intents
    if (lowerQuery.match(/^(who|when|where|which)/)) {
      return 'factual';
    }

    // Calculation/analysis intents
    if (lowerQuery.match(/calculate|compute|analyze|measure/)) {
      return 'calculation';
    }

    // Default: general search
    return 'search';
  }

  /**
   * Rewrite query for clarity
   */
  private rewriteQuery(query: string, intent: string): string {
    let rewritten = query;

    switch (intent) {
      case 'definition':
        // Ensure query asks for definition clearly
        if (!query.toLowerCase().includes('what is')) {
          rewritten = `What is ${query.replace(/^(define|explain)\s+/i, '')}`;
        }
        break;

      case 'how-to':
        // Ensure query starts with "how"
        if (!query.toLowerCase().startsWith('how')) {
          rewritten = `How to ${query.replace(/^(steps|process|procedure)\s+(to|for)\s+/i, '')}`;
        }
        break;

      case 'comparison':
        // Ensure comparison is clear
        if (!query.toLowerCase().includes('difference')) {
          rewritten = query.replace(
            /compare|versus|vs/i,
            'What is the difference between',
          );
        }
        break;

      case 'list':
        // Ensure list intent is clear
        if (!query.toLowerCase().includes('list')) {
          rewritten = `List the ${query.replace(/^(what are|types of|kinds of)\s+/i, '')}`;
        }
        break;

      default:
        rewritten = query;
    }

    return rewritten;
  }

  /**
   * Check if two strings are close matches (simple Levenshtein-like)
   */
  private isCloseMatch(word1: string, word2: string): boolean {
    if (word1 === word2) return true;
    
    // Allow 1-2 character differences for words > 5 chars
    if (word1.length < 5 || word2.length < 5) return false;
    
    const maxDistance = word1.length > 7 ? 2 : 1;
    const distance = this.levenshteinDistance(word1, word2);
    
    return distance <= maxDistance;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1,     // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get query preprocessing pipeline info
   */
  getEnhancementPipeline(): string[] {
    return [
      'Spell Correction (fix typos)',
      'Query Expansion (add synonyms)',
      'Intent Recognition (understand goal)',
      'Query Rewriting (clarify ambiguity)',
      'Embedding Generation',
      'Enhanced Search',
    ];
  }
}
