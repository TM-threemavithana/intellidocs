import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { MinioService } from '../../core/storage/minio.service';
import { PDFExtractionService } from './pdf-extraction.service';
import { ChromaService } from '../embeddings/chroma.service';
import { CachingService } from '../../core/caching/caching.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private pdfExtraction: PDFExtractionService,
    private chromaService: ChromaService,
    private cachingService: CachingService,
    @InjectQueue('ocr') private ocrQueue: Queue,
  ) {}

  /**
   * Upload a document and queue OCR processing
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
      const pageCount = metadata.pageCount || 1;

      // 2. Upload to MinIO
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `documents/${userId}/${timestamp}-${sanitizedFileName}`;
      const storageUrl = await this.minio.uploadFile(storagePath, fileBuffer);

      // 3. Create document record in database
      const document = await this.prisma.document.create({
        data: {
          userId,
          fileName: sanitizedFileName,
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
        language: 'eng',
      }, {
        priority: 1,
        delay: 0,
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
   * Get document file buffer for viewing/download with ownership verification (UX-01)
   */
  async getDocumentFile(documentId: string, userId: string): Promise<{ fileName: string; buffer: Buffer }> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId, isDeleted: false },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const storageKey = document.storageUrl.replace(/^s3:\/\/[^/]+\//, '');
    const buffer = await this.minio.downloadFile(storageKey);

    return {
      fileName: document.fileName,
      buffer,
    };
  }

  /**
   * Delete document and all associated resources across DB, MinIO, Chroma, and Redis (PHASE 6.5)
   */
  async deleteDocument(documentId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId, isDeleted: false },
    });

    if (!document) {
      throw new NotFoundException('Document not found or access denied');
    }

    this.logger.log(`Deleting document ${documentId} for user ${userId}`);

    // 1. Delete vectors from ChromaDB
    try {
      await this.chromaService.deleteByDocumentId(documentId);
    } catch (err) {
      this.logger.warn(`Failed to delete vectors from ChromaDB: ${err.message}`);
    }

    // 2. Delete file from MinIO
    try {
      const storageKey = document.storageUrl.replace(/^s3:\/\/[^/]+\//, '');
      await this.minio.deleteFile(storageKey);
    } catch (err) {
      this.logger.warn(`Failed to delete file from MinIO: ${err.message}`);
    }

    // 3. Delete database records
    await this.prisma.embedding.deleteMany({ where: { documentId } });
    await this.prisma.oCRResult.deleteMany({ where: { documentId } });
    await this.prisma.collectionDocument.deleteMany({ where: { documentId } });

    // 4. Mark document as deleted in PostgreSQL
    await this.prisma.document.update({
      where: { id: documentId },
      data: { isDeleted: true },
    });

    // 5. Invalidate caches
    await this.cachingService.invalidateDocumentCache(documentId);
    await this.cachingService.invalidateUserCache(userId);

    this.logger.log(`✅ Document ${documentId} completely deleted`);
    return {
      success: true,
      message: `Document '${document.fileName}' was successfully deleted.`,
    };
  }

  /**
   * Get OCR results for a document
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
   */
  async getOCRJobStatus(documentId: string) {
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
