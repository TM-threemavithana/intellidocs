import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';

@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  /**
   * Generate embeddings for a document
   * POST /embeddings/generate/:documentId
   */
  @Post('generate/:documentId')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateEmbeddings(@Param('documentId') documentId: string) {
    await this.embeddingsService.generateEmbeddingsForDocument(documentId);
    return {
      message: 'Embeddings generated successfully',
      documentId,
    };
  }

  /**
   * Search for similar chunks
   * POST /embeddings/search
   */
  @Post('search')
  async search(
    @Body() body: { query: string; topK?: number; documentIds?: string[] },
  ) {
    const { query, topK = 5, documentIds } = body;
    const results = await this.embeddingsService.search(query, topK, documentIds);
    
    return {
      query,
      results: results.map(r => ({
        text: r.text,
        similarity: r.similarity,
        metadata: r.metadata,
      })),
    };
  }

  /**
   * Get embeddings statistics
   * GET /embeddings/stats
   */
  @Get('stats')
  async getStats() {
    return this.embeddingsService.getStats();
  }

  /**
   * Delete embeddings for a document
   * DELETE /embeddings/:documentId
   */
  @Delete(':documentId')
  async deleteEmbeddings(@Param('documentId') documentId: string) {
    await this.embeddingsService.deleteEmbeddings(documentId);
    return {
      message: 'Embeddings deleted successfully',
      documentId,
    };
  }
}
