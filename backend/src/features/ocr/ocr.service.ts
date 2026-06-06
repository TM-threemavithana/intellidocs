import { Injectable, Logger } from '@nestjs/common';
import { TesseractService } from './tesseract.service';

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);

  constructor(private tesseract: TesseractService) {}

  /**
   * Process OCR for a document
   * @param documentId - Document ID from database
   */
  async processDocument(documentId: string): Promise<void> {
    this.logger.log(`Starting OCR processing for document: ${documentId}`);
    // Implementation will be added when we integrate with Prisma and MinIO
  }

  /**
   * Calculate CER (Character Error Rate)
   * CER = (Substitutions + Deletions + Insertions) / Total Characters
   * 
   * @param reference - Ground truth text
   * @param hypothesis - OCR extracted text
   * @returns CER score (0-1, where 0 is perfect)
   */
  calculateCER(reference: string, hypothesis: string): number {
    const distance = this.levenshteinDistance(reference, hypothesis);
    const total = reference.length;
    return total === 0 ? 0 : distance / total;
  }

  /**
   * Calculate WER (Word Error Rate)
   * WER = (Substitutions + Deletions + Insertions) / Total Words
   * 
   * @param reference - Ground truth text
   * @param hypothesis - OCR extracted text
   * @returns WER score (0-1, where 0 is perfect)
   */
  calculateWER(reference: string, hypothesis: string): number {
    const refWords = reference.split(/\s+/).filter(w => w.length > 0);
    const hypWords = hypothesis.split(/\s+/).filter(w => w.length > 0);
    
    const distance = this.levenshteinDistanceWords(refWords, hypWords);
    const total = refWords.length;
    return total === 0 ? 0 : distance / total;
  }

  /**
   * Calculate Levenshtein distance (edit distance) between two strings
   * Uses Wagner-Fischer algorithm with dynamic programming
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Minimum number of edits (insertions, deletions, substitutions)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create 2D array for dynamic programming
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize first column (deletions)
    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i;
    }

    // Initialize first row (insertions)
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Calculate Levenshtein distance for word arrays
   * 
   * @param words1 - First word array
   * @param words2 - Second word array
   * @returns Minimum number of word-level edits
   */
  private levenshteinDistanceWords(words1: string[], words2: string[]): number {
    const len1 = words1.length;
    const len2 = words2.length;

    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i;
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = words1[i - 1] === words2[j - 1] ? 0 : 1;
        
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Supported languages for OCR
   * Tesseract language codes:
   * - eng: English
   * - sin: Sinhala
   * - tam: Tamil
   * - chi_sim: Chinese (Simplified)
   * - jpn: Japanese
   */
  getSupportedLanguages(): string[] {
    return ['eng', 'sin', 'tam', 'chi_sim', 'jpn'];
  }

  /**
   * Check if a language is supported
   * @param lang - Language code
   */
  isLanguageSupported(lang: string): boolean {
    return this.getSupportedLanguages().includes(lang);
  }
}
