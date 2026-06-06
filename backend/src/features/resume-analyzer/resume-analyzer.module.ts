import { Module } from '@nestjs/common';
import { ResumeAnalyzerService } from './resume-analyzer.service';
import { ResumeAnalyzerController } from './resume-analyzer.controller';

@Module({
  controllers: [ResumeAnalyzerController],
  providers: [ResumeAnalyzerService],
  exports: [ResumeAnalyzerService],
})
export class ResumeAnalyzerModule {}
