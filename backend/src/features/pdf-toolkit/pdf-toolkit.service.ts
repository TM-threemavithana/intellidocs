import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as JSZip from 'jszip';

@Injectable()
export class PdfToolkitService {
  private readonly logger = new Logger(PdfToolkitService.name);
  private readonly MAX_MERGE_FILES = 20;
  private readonly MAX_TOTAL_PAGES = 500;
  private readonly MAX_SPLIT_RANGES = 50;
  private readonly MAX_CONVERT_IMAGES = 50;

  /**
   * Merges multiple PDF buffers into a single PDF buffer with resource guards (SEC-05)
   */
  async mergePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
    if (!pdfBuffers || pdfBuffers.length < 2) {
      throw new BadRequestException('At least 2 PDF files are required to merge');
    }
    if (pdfBuffers.length > this.MAX_MERGE_FILES) {
      throw new BadRequestException(`Cannot merge more than ${this.MAX_MERGE_FILES} PDFs in a single request`);
    }

    this.logger.log(`Merging ${pdfBuffers.length} PDFs`);
    try {
      const mergedPdf = await PDFDocument.create();
      let totalPages = 0;

      for (const buffer of pdfBuffers) {
        const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageIndices = pdf.getPageIndices();
        totalPages += pageIndices.length;

        if (totalPages > this.MAX_TOTAL_PAGES) {
          throw new BadRequestException(
            `Total page count exceeds the maximum safety limit of ${this.MAX_TOTAL_PAGES} pages`,
          );
        }

        const pages = await mergedPdf.copyPages(pdf, pageIndices);
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      return Buffer.from(mergedPdfBytes);
    } catch (error) {
      this.logger.error(`Failed to merge PDFs: ${error.message}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to merge PDFs: ${error.message}`);
    }
  }

  /**
   * Splits a PDF buffer into multiple PDF buffers based on given page ranges (1-indexed).
   */
  async splitPdf(
    pdfBuffer: Buffer,
    ranges: { start: number; end: number }[],
  ): Promise<{ filename: string; buffer: Buffer }[]> {
    if (!ranges || ranges.length === 0) {
      throw new BadRequestException('At least one page range is required');
    }
    if (ranges.length > this.MAX_SPLIT_RANGES) {
      throw new BadRequestException(`Cannot split into more than ${this.MAX_SPLIT_RANGES} ranges at once`);
    }

    this.logger.log(`Splitting PDF into ${ranges.length} ranges`);
    try {
      const srcPdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const totalPages = srcPdf.getPageCount();
      const results: { filename: string; buffer: Buffer }[] = [];

      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];

        if (range.start < 1 || range.end > totalPages || range.start > range.end) {
          throw new BadRequestException(
            `Invalid page range: ${range.start}-${range.end}. Total pages in document: ${totalPages}`,
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
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to split PDF: ${error.message}`);
    }
  }

  /**
   * Converts PNG or JPEG images into a single PDF document.
   */
  async convertImagesToPdf(
    images: { buffer: Buffer; mimetype: string }[],
  ): Promise<Buffer> {
    if (!images || images.length === 0) {
      throw new BadRequestException('At least one image is required for conversion');
    }
    if (images.length > this.MAX_CONVERT_IMAGES) {
      throw new BadRequestException(`Cannot convert more than ${this.MAX_CONVERT_IMAGES} images at once`);
    }

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
          throw new BadRequestException(`Unsupported image format: ${img.mimetype}. Only PNG and JPEG are supported.`);
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
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Image to PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Bundles split PDF documents into a ZIP archive.
   */
  async createZipArchive(
    documents: { filename: string; buffer: Buffer }[],
  ): Promise<Buffer> {
    const zip = new JSZip();

    for (const doc of documents) {
      zip.file(doc.filename, doc.buffer);
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return zipBuffer;
  }
}
