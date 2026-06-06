import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as JSZip from 'jszip';

@Injectable()
export class PdfToolkitService {
  private readonly logger = new Logger(PdfToolkitService.name);

  /**
   * Merges multiple PDF buffers into a single PDF buffer.
   */
  async mergePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
    this.logger.log(`Merging ${pdfBuffers.length} PDFs`);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const buffer of pdfBuffers) {
        const pdf = await PDFDocument.load(buffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      return Buffer.from(mergedPdfBytes);
    } catch (error) {
      this.logger.error(`Failed to merge PDFs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Splits a PDF buffer into multiple PDF buffers based on the given page ranges (1-indexed).
   */
  async splitPdf(
    pdfBuffer: Buffer,
    ranges: { start: number; end: number }[],
  ): Promise<{ filename: string; buffer: Buffer }[]> {
    this.logger.log(`Splitting PDF into ${ranges.length} ranges`);
    try {
      const srcPdf = await PDFDocument.load(pdfBuffer);
      const totalPages = srcPdf.getPageCount();
      const results: { filename: string; buffer: Buffer }[] = [];

      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        
        // Validate ranges
        if (range.start < 1 || range.end > totalPages || range.start > range.end) {
          throw new Error(
            `Invalid page range: ${range.start}-${range.end}. Total pages: ${totalPages}`,
          );
        }

        const newPdf = await PDFDocument.create();
        const indices = Array.from(
          { length: range.end - range.start + 1 },
          (_, idx) => range.start - 1 + idx,
        );

        const pages = await newPdf.copyPages(srcPdf, indices);
        pages.forEach((page) => newPdf.addPage(page));

        const bytes = await newPdf.save();
        const filename = `split_pages_${range.start}_to_${range.end}.pdf`;
        
        results.push({
          filename,
          buffer: Buffer.from(bytes),
        });
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to split PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Converts PNG or JPEG images into a single PDF document.
   */
  async convertImagesToPdf(
    images: { buffer: Buffer; mimetype: string }[],
  ): Promise<Buffer> {
    this.logger.log(`Converting ${images.length} images to PDF`);
    try {
      const pdfDoc = await PDFDocument.create();

      for (const img of images) {
        let embeddedImage;

        if (img.mimetype === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(img.buffer);
        } else if (img.mimetype === 'image/jpeg' || img.mimetype === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(img.buffer);
        } else {
          throw new Error(`Unsupported image format: ${img.mimetype}`);
        }

        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: embeddedImage.width,
          height: embeddedImage.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error(`Failed to convert images to PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compiles files into a single ZIP buffer.
   */
  async createZipArchive(
    files: { filename: string; buffer: Buffer }[],
  ): Promise<Buffer> {
    const zip = new JSZip();
    files.forEach((file) => {
      zip.file(file.filename, file.buffer);
    });
    return await zip.generateAsync({ type: 'nodebuffer' });
  }
}
