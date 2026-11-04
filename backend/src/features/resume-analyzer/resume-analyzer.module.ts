import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResumeAnalyzerService } from './resume-analyzer.service';
import { ResumeAnalyzerController } from './resume-analyzer.controller';
import { OcrModule } from '../ocr/ocr.module';

@Module({
  imports: [ConfigModule, OcrModule],
  controllers: [ResumeAnalyzerController],
  providers: [ResumeAnalyzerService],
  exports: [ResumeAnalyzerService],
})
export class ResumeAnalyzerModule {}
