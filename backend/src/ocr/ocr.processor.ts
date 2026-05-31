import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../database/prisma.service';
import { MinioService } from '../storage/minio.service';
import { TesseractService } from './tesseract.service';
import { OCRService } from './ocr.service';

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
  ) {}

  @Process('process-document')
  async handleOCRJob(job: Job<OCRJobData>) {
    const { documentId, language = 'eng' } = job.data;
    
    this.logger.log(`[Job ${job.id}] Starting OCR for document: ${documentId}`);

    try {
      // 1. Get document from database
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      this.logger.log(`[Job ${job.id}] Found document: ${document.fileName}`);

      // 2. Download file from MinIO
      const storageKey = document.storageUrl.replace('s3://intellidocs-documents/', '');
      const fileBuffer = await this.minio.downloadFile(storageKey);

      this.logger.log(`[Job ${job.id}] Downloaded file from MinIO (${fileBuffer.length} bytes)`);

      // 3. Perform OCR on the document
      // For simplicity, we'll process the entire document as one page
      // In production, you'd convert PDF pages to images and process each page
      
      await job.progress(30); // Update progress

      const ocrResult = await this.tesseract.recognize(fileBuffer, language);

      await job.progress(70); // Update progress

      this.logger.log(
        `[Job ${job.id}] OCR completed. Confidence: ${ocrResult.confidence.toFixed(2)}%`
      );

      // 4. Store OCR results in database
      await this.prisma.oCRResult.create({
        data: {
          documentId: document.id,
          pageNumber: 1, // For now, treating entire document as page 1
          rawText: ocrResult.text,
          language: language,
          tesseractConfidence: ocrResult.confidence,
          // CER and WER scores will be null unless we have ground truth
          cerScore: null,
          werScore: null,
        },
      });

      // 5. Update document to mark OCR as applied
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          ocrApplied: true,
          ocrLanguages: [language],
        },
      });

      await job.progress(100); // Complete

      this.logger.log(`[Job ${job.id}] ✅ OCR results stored successfully`);

      return {
        success: true,
        documentId,
        textLength: ocrResult.text.length,
        confidence: ocrResult.confidence,
      };
    } catch (error) {
      this.logger.error(`[Job ${job.id}] ❌ OCR processing failed:`, error);
      throw error; // Bull will retry based on configuration
    }
  }

  @OnQueueActive()
  onActive(job: Job<OCRJobData>) {
    this.logger.log(
      `[Job ${job.id}] Processing started for document: ${job.data.documentId}`
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<OCRJobData>, result: any) {
    this.logger.log(
      `[Job ${job.id}] ✅ Completed successfully for document: ${job.data.documentId}`
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<OCRJobData>, error: Error) {
    this.logger.error(
      `[Job ${job.id}] ❌ Failed for document: ${job.data.documentId}`,
      error.stack
    );
  }
}
