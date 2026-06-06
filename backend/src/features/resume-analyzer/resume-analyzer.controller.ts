import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumeAnalyzerService } from './resume-analyzer.service';

@Controller('resume-analyzer')
export class ResumeAnalyzerController {
  constructor(private readonly resumeAnalyzerService: ResumeAnalyzerService) {}

  /**
   * Analyzes an uploaded PDF resume against a job description.
   * POST /resume-analyzer/analyze
   */
  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyzeResume(
    @UploadedFile() file: Express.Multer.File,
    @Body('jobDescription') jobDescription: string,
  ) {
    if (!file) {
      throw new BadRequestException('Resume file (PDF) is required');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Uploaded resume must be a PDF file');
    }
    if (!jobDescription || jobDescription.trim().length === 0) {
      throw new BadRequestException('Job description text is required');
    }

    try {
      // Step 1: Parse PDF to text
      const resumeText = await this.resumeAnalyzerService.parsePdfResume(file.buffer);

      // Step 2: Analyze using local LLM
      const analysis = await this.resumeAnalyzerService.analyzeResume(
        resumeText,
        jobDescription,
      );

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      throw new BadRequestException(`Analysis failed: ${error.message}`);
    }
  }
}
