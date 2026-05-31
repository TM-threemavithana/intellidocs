import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PDFExtractionService } from './pdf-extraction.service';
import { OcrModule } from '../ocr/ocr.module';

@Module({
  imports: [OcrModule],
  providers: [DocumentsService, PDFExtractionService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
