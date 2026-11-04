import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class SearchEmbeddingsDto {
  query: string;
  topK?: number;
  documentIds?: string[];
}

@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) { }

  /**
   * Generate embeddings for a document
   */
  @Post('generate/:documentId')
  @HttpCode(HttpStatus.OK)
  async generateEmbeddings(
    @Param('documentId') documentId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.embeddingsService.generateEmbeddingsForDocument(documentId, user.id);

    return {
      success: true,
      message: 'Embeddings generated successfully',
      documentId,
    };
  }

  /**
   * Search embeddings
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Body() dto: SearchEmbeddingsDto,
    @CurrentUser() user: { id: string },
  ) {
    const results = await this.embeddingsService.search(
      dto.query,
      dto.topK || 5,
      dto.documentIds,
      user.id,
    );

    return {
      success: true,
      results,
    };
  }

  /**
   * Get embeddings statistics
   */
  @Get('stats')
  async getStats(@CurrentUser() user: { id: string }) {
    const stats = await this.embeddingsService.getStats(user.id);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Delete embeddings for a document with tenant scoping (SEC-01)
   */
  @Delete(':documentId')
  async deleteEmbeddings(
    @Param('documentId') documentId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.embeddingsService.deleteEmbeddings(documentId, user.id);

    return {
      success: true,
      message: 'Embeddings deleted successfully',
      documentId,
    };
  }
}
