import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as pdfParse from 'pdf-parse';
import { PrismaService } from '../../core/database/prisma.service';
import { MinioService } from '../../core/storage/minio.service';
import { TesseractService } from './tesseract.service';
import { OCRService } from './ocr.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';

interface OCRJobData {
  documentId: string;
  language?: string;
}

@Processor('ocr')
export class OCRProcessor {
  private readonly logger = new Logger(OCRProcessor.name);

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private tesseract: TesseractService,
    private ocrService: OCRService,
    private embeddingsService: EmbeddingsService,
  ) {}

  @Process('process-document')
  async handleOCRJob(job: Job<OCRJobData>) {
    const { documentId, language = 'eng' } = job.data;

    this.logger.log(`[Job ${job.id}] Starting full-pipeline processing for document: ${documentId}`);

    try {
      // 1. Get document from database
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      this.logger.log(`[Job ${job.id}] Found document: ${document.fileName} (user: ${document.userId})`);

      // 2. Download file from MinIO
      const storageKey = document.storageUrl.replace(/^s3:\/\/[^/]+\//, '');
      const fileBuffer = await this.minio.downloadFile(storageKey);

      this.logger.log(`[Job ${job.id}] Downloaded file from MinIO (${fileBuffer.length} bytes)`);
      await job.progress(20);

      // 3. Extract text page-by-page
      let extractedPages: Array<{ pageNumber: number; text: string }> = [];
      let totalPages = document.pageCount || 1;

      try {
        let currentPage = 1;
        const renderPage = (pageData: any) => {
          return pageData.getTextContent().then((textContent: any) => {
            let pageText = '';
            for (const item of textContent.items) {
              pageText += item.str + ' ';
            }
            extractedPages.push({
              pageNumber: currentPage++,
              text: pageText.trim(),
            });
            return pageText;
          });
        };

        const data = await pdfParse(fileBuffer, { pagerender: renderPage });
        if (data.numpages) totalPages = data.numpages;
      } catch (parseError) {
        this.logger.warn(`pdf-parse text extraction failed, falling back to OCR: ${parseError.message}`);
      }

      await job.progress(50);

      // Check if extracted text is minimal (<50 chars total), indicating a scanned PDF
      const totalChars = extractedPages.reduce((sum, p) => sum + p.text.length, 0);
      if (extractedPages.length === 0 || totalChars < 50) {
        this.logger.log(`[Job ${job.id}] Minimal digital text found (${totalChars} chars). Running Tesseract OCR.`);
        const ocrResult = await this.tesseract.recognize(fileBuffer, language);

        extractedPages = [
          {
            pageNumber: 1,
            text: ocrResult.text || '',
          },
        ];
      }

      await job.progress(70);

      // 4. Store OCR results in database (clearing any previous results)
      await this.prisma.oCRResult.deleteMany({ where: { documentId: document.id } });

      for (const page of extractedPages) {
        await this.prisma.oCRResult.create({
          data: {
            documentId: document.id,
            pageNumber: page.pageNumber,
            rawText: page.text || '',
            language: language,
            tesseractConfidence: 95.0,
            cerScore: null,
            werScore: null,
          },
        });
      }

      // 5. Update document to mark OCR as applied
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          ocrApplied: true,
          ocrLanguages: [language],
          pageCount: totalPages,
        },
      });

      await job.progress(85);
      this.logger.log(`[Job ${job.id}] ✅ Extracted text from ${extractedPages.length} pages`);

      // 6. Automatic Embedding Generation (BUG-01: closes the pipeline loop)
      this.logger.log(`[Job ${job.id}] Automatically triggering vector embedding generation for document ${document.id}`);
      await this.embeddingsService.generateEmbeddingsForDocument(document.id, document.userId);

      await job.progress(100);
      this.logger.log(`[Job ${job.id}] ✅ Ingestion complete: OCR + Vector Embeddings active for document ${document.id}`);

      return {
        success: true,
        documentId,
        pagesCount: extractedPages.length,
        totalChars,
        embeddingsIndexed: true,
      };
    } catch (error) {
      this.logger.error(`[Job ${job.id}] ❌ Ingestion pipeline failed for document ${documentId}:`, error);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`[Job ${job.id}] Processing started for document: ${job.data.documentId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`[Job ${job.id}] Completed successfully for document: ${result?.documentId}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`[Job ${job.id}] Failed: ${error.message}`, error.stack);
  }
}
