import { Module } from '@nestjs/common';
import { TesseractService } from './tesseract.service';
import { OcrController } from './ocr.controller';

@Module({
  providers: [TesseractService],
  controllers: [OcrController],
  exports: [TesseractService],
})
export class OcrModule {}
