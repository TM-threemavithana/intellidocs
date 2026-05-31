import { Injectable, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class PDFExtractionService {
  private readonly logger = new Logger(PDFExtractionService.name);

  /**
   * Detect if PDF is text-based or scanned (image-based)
   * Heuristic: If average characters per page < 100, likely scanned
   * 
   * @param buffer - PDF file buffer
   * @returns 'text' if text-based PDF, 'scanned' if image-based
   */
  async detectPDFType(buffer: Buffer): Promise<'text' | 'scanned'> {
    try {
      const data = await pdfParse(buffer);
      
      const totalChars = data.text.length;
      const avgCharsPerPage = data.numpages > 0 ? totalChars / data.numpages : 0;

      this.logger.log(
        `PDF analysis: ${data.numpages} pages, avg ${avgCharsPerPage.toFixed(0)} chars/page`
      );

      // If average < 100 chars per page, likely scanned
      return avgCharsPerPage < 100 ? 'scanned' : 'text';
    } catch (error) {
      this.logger.warn(`PDF type detection failed, assuming scanned:`, error);
      return 'scanned'; // Default to OCR if detection fails
    }
  }

  /**
   * Extract text from text-based PDF
   * 
   * @param buffer - PDF file buffer
   * @returns Array of pages with extracted text
   */
  async extractTextFromPDF(buffer: Buffer): Promise<{
    pages: Array<{ pageNumber: number; text: string }>;
    totalPages: number;
  }> {
    try {
      const data = await pdfParse(buffer);

      this.logger.log(`Extracted text from ${data.numpages} pages`);

      // pdf-parse returns all text concatenated
      // For now, we'll return it as a single page
      // TODO: Implement page-by-page extraction if needed
      const pages = [{
        pageNumber: 1,
        text: data.text,
      }];

      return {
        pages,
        totalPages: data.numpages,
      };
    } catch (error) {
      this.logger.error(`Text extraction failed:`, error);
      throw error;
    }
  }

  /**
   * Get PDF metadata
   * 
   * @param buffer - PDF file buffer
   * @returns PDF metadata (page count, etc.)
   */
  async getPDFMetadata(buffer: Buffer): Promise<{
    pageCount: number;
    info: any;
  }> {
    try {
      const data = await pdfParse(buffer);

      return {
        pageCount: data.numpages,
        info: data.info,
      };
    } catch (error) {
      this.logger.error(`Failed to get PDF metadata:`, error);
      throw error;
    }
  }
}
