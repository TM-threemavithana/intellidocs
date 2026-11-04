import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AiDetectorService } from './ai-detector.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('ai-detector')
export class AiDetectorController {
  constructor(private readonly aiDetectorService: AiDetectorService) {}

  /**
   * Analyzes text for AI content indicators with optional user persistence.
   * POST /ai-detector/analyze
   */
  @Post('analyze')
  async analyzeText(
    @Body('text') text: string,
    @CurrentUser() user?: { id: string },
  ) {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Text body is required');
    }
    if (text.trim().length < 100) {
      throw new BadRequestException('Text must be at least 100 characters long');
    }

    try {
      const result = await this.aiDetectorService.analyzeText(text.trim(), user?.id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Analysis failed: ${error.message}`);
    }
  }
}
