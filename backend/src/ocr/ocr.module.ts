import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TesseractService } from './tesseract.service';
import { OCRService } from './ocr.service';
import { OcrController } from './ocr.controller';
import { OCRProcessor } from './ocr.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ocr',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
        removeOnComplete: false, // Keep completed jobs for inspection
        removeOnFail: false, // Keep failed jobs for debugging
      },
    }),
  ],
  providers: [TesseractService, OCRService, OCRProcessor],
  controllers: [OcrController],
  exports: [TesseractService, OCRService, BullModule],
})
export class OcrModule {}
