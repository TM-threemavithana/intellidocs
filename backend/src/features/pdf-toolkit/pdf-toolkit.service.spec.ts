import { BadRequestException } from '@nestjs/common';
import { PdfToolkitService } from './pdf-toolkit.service';
import { PDFDocument } from 'pdf-lib';

describe('PdfToolkitService Unit Tests (SEC-05 Resource Hardening)', () => {
  let service: PdfToolkitService;

  beforeEach(() => {
    service = new PdfToolkitService();
  });

  async function createSamplePdfBuffer(pageCount: number = 1): Promise<Buffer> {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) {
      doc.addPage([200, 200]);
    }
    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  describe('mergePdfs', () => {
    it('should throw BadRequestException if fewer than 2 files provided', async () => {
      const buffer = await createSamplePdfBuffer(1);
      await expect(service.mergePdfs([buffer])).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if more than 20 files are merged (DoS protection)', async () => {
      const buffer = await createSamplePdfBuffer(1);
      const buffers = Array(21).fill(buffer);
      await expect(service.mergePdfs(buffers)).rejects.toThrow(
        /Cannot merge more than 20 PDFs/,
      );
    });

    it('should successfully merge 2 valid PDFs', async () => {
      const buf1 = await createSamplePdfBuffer(2);
      const buf2 = await createSamplePdfBuffer(3);

      const merged = await service.mergePdfs([buf1, buf2]);
      expect(merged).toBeInstanceOf(Buffer);

      const parsedMerged = await PDFDocument.load(merged);
      expect(parsedMerged.getPageCount()).toBe(5);
    });
  });

  describe('splitPdf', () => {
    it('should throw BadRequestException if no ranges provided', async () => {
      const buf = await createSamplePdfBuffer(3);
      await expect(service.splitPdf(buf, [])).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if more than 50 ranges are requested (DoS protection)', async () => {
      const buf = await createSamplePdfBuffer(10);
      const ranges = Array(51).fill({ start: 1, end: 1 });
      await expect(service.splitPdf(buf, ranges)).rejects.toThrow(
        /Cannot split into more than 50 ranges/,
      );
    });

    it('should successfully split a PDF into requested range segments', async () => {
      const buf = await createSamplePdfBuffer(5);
      const parts = await service.splitPdf(buf, [
        { start: 1, end: 2 },
        { start: 3, end: 5 },
      ]);

      expect(parts).toHaveLength(2);
      expect(parts[0].filename).toBe('split_pages_1_to_2.pdf');
      expect(parts[1].filename).toBe('split_pages_3_to_5.pdf');

      const parsedPart1 = await PDFDocument.load(parts[0].buffer);
      expect(parsedPart1.getPageCount()).toBe(2);

      const parsedPart2 = await PDFDocument.load(parts[1].buffer);
      expect(parsedPart2.getPageCount()).toBe(3);
    });
  });
});
