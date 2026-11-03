import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(private documentsService: DocumentsService) {}

  /**
   * Upload a PDF document
   * POST /documents/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 52428800) } }))
  async uploadDocument(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { id: string }) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const userId = user.id;

    try {
      const document = await this.documentsService.uploadDocument(
        userId,
        file.originalname,
        file.buffer,
        file.size,
      );

      return {
        success: true,
        message: 'Document uploaded successfully. OCR processing queued.',
        document: {
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          pageCount: document.pageCount,
          createdAt: document.createdAt,
        },
      };
    } catch (error) {
      this.logger.error('Upload failed:', error);
      throw new BadRequestException('Failed to upload document');
    }
  }

  /**
   * Get all documents for current user
   * GET /documents
   */
  @Get()
  async getAllDocuments(@CurrentUser() user: { id: string }) {
    const userId = user.id;

    try {
      const documents = await this.documentsService.getAllDocuments(userId);
      return documents;
    } catch (error) {
      this.logger.error('Failed to get documents:', error);
      return [];
    }
  }

  /**
   * Get document by ID
   * GET /documents/:id
   */
  @Get(':id')
  async getDocument(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const document = await this.documentsService.getDocument(id);
    if (!document || document.userId !== user.id) {
      throw new BadRequestException('Document not found');
    }

    return {
      success: true,
      document,
    };
  }

  /**
   * Get OCR results for a document
   * GET /documents/:id/ocr
   */
  @Get(':id/ocr')
  async getOCRResults(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const document = await this.documentsService.getDocument(id);
    
    if (!document || document.userId !== user.id) {
      throw new BadRequestException('Document not found');
    }

    const ocrResults = await this.documentsService.getOCRResults(id);

    return {
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        pageCount: document.pageCount,
        ocrApplied: document.ocrApplied,
      },
      pages: ocrResults.map(result => ({
        pageNumber: result.pageNumber,
        text: result.rawText,
        language: result.language,
        confidence: result.tesseractConfidence,
        cerScore: result.cerScore,
        werScore: result.werScore,
      })),
    };
  }

  /**
   * Get OCR job status for a document
   * GET /documents/:id/ocr-status
   */
  @Get(':id/ocr-status')
  async getOCRJobStatus(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const document = await this.documentsService.getDocument(id);
    
    if (!document || document.userId !== user.id) {
      throw new BadRequestException('Document not found');
    }

    const jobStatus = await this.documentsService.getOCRJobStatus(id);

    return {
      success: true,
      documentId: id,
      ocrApplied: document.ocrApplied,
      jobStatus,
    };
  }
}
