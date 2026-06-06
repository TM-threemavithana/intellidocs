import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { MinioService } from '../../core/storage/minio.service';
import { PDFExtractionService } from './pdf-extraction.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private pdfExtraction: PDFExtractionService,
    @InjectQueue('ocr') private ocrQueue: Queue,
  ) {}

  /**
   * Upload a document and queue OCR processing
   * 
   * @param userId - User ID from JWT
   * @param fileName - Original file name
   * @param fileBuffer - File buffer
   * @param fileSize - File size in bytes
   */
  async uploadDocument(
    userId: string,
    fileName: string,
    fileBuffer: Buffer,
    fileSize: number,
  ) {
    this.logger.log(`Uploading document: ${fileName} for user: ${userId}`);

    try {
      // 1. Get PDF metadata (page count)
      const metadata = await this.pdfExtraction.getPDFMetadata(fileBuffer);
      const pageCount = metadata.pageCount;

      // 2. Upload to MinIO
      const timestamp = Date.now();
      const storagePath = `documents/${userId}/${timestamp}-${fileName}`;
      const storageUrl = await this.minio.uploadFile(storagePath, fileBuffer);

      // 3. Create document record in database
      const document = await this.prisma.document.create({
        data: {
          userId,
          fileName,
          fileSize,
          pageCount,
          storageUrl,
          ocrApplied: false,
          ocrLanguages: [],
        },
      });

      this.logger.log(`✅ Document created: ${document.id}`);

      // 4. Queue OCR job for asynchronous processing
      const job = await this.ocrQueue.add('process-document', {
        documentId: document.id,
        language: 'eng', // Default to English, can be parameterized
      }, {
        priority: 1, // Higher priority = processed first
        delay: 0, // Process immediately
      });

      this.logger.log(`✅ OCR job queued: Job ID ${job.id} for document ${document.id}`);

      return document;
    } catch (error) {
      this.logger.error(`Failed to upload document: ${fileName}`, error);
      throw error;
    }
  }

  /**
   * Get all documents for a user
   */
  async getAllDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        pageCount: true,
        ocrApplied: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get document by ID
   * 
   * @param documentId - Document ID
   */
  async getDocument(documentId: string) {
    return this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        ocrResults: true,
      },
    });
  }

  /**
   * Get all documents for a user
   * 
   * @param userId - User ID
   */
  async getUserDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get OCR results for a document
   * 
   * @param documentId - Document ID
   */
  async getOCRResults(documentId: string) {
    return this.prisma.oCRResult.findMany({
      where: { documentId },
      orderBy: {
        pageNumber: 'asc',
      },
    });
  }

  /**
   * Get OCR job status
   * 
   * @param documentId - Document ID
   */
  async getOCRJobStatus(documentId: string) {
    // Get all jobs for this document
    const jobs = await this.ocrQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
    const documentJobs = jobs.filter(job => job.data.documentId === documentId);

    if (documentJobs.length === 0) {
      return { status: 'not_found', message: 'No OCR job found for this document' };
    }

    const latestJob = documentJobs[0];
    const state = await latestJob.getState();
    const progress = latestJob.progress();

    return {
      status: state,
      progress,
      jobId: latestJob.id,
      attempts: latestJob.attemptsMade,
      timestamp: latestJob.timestamp,
    };
  }
}
