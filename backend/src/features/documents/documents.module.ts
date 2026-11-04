import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PDFExtractionService } from './pdf-extraction.service';
import { OcrModule } from '../ocr/ocr.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { CachingModule } from '../../core/caching/caching.module';

@Module({
  imports: [OcrModule, EmbeddingsModule, CachingModule],
  providers: [DocumentsService, PDFExtractionService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
