import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('collections')
export class CollectionsController {
  constructor(private collectionsService: CollectionsService) {}

  /**
   * Create a new collection
   * POST /collections
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCollection(
    @Body() body: { name: string; description?: string }, @CurrentUser() user: { id: string },
  ) {
    const collection = await this.collectionsService.createCollection(
      user.id,
      body.name,
      body.description,
    );

    return {
      success: true,
      data: collection,
      message: 'Collection created successfully',
    };
  }

  /**
   * Get all collections for a user
   * GET /collections?userId=xxx&limit=50&offset=0
   */
  @Get()
  async getUserCollections(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.collectionsService.getUserCollections(
      user.id,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );

    return {
      success: true,
      data: result.collections,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    };
  }

  /**
   * Get a specific collection
   * GET /collections/:id?userId=xxx
   */
  @Get(':id')
  async getCollection(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const collection = await this.collectionsService.getCollectionById(id, user.id);

    return {
      success: true,
      data: collection,
    };
  }

  /**
   * Update a collection
   * PUT /collections/:id
   */
  @Put(':id')
  async updateCollection(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string }, @CurrentUser() user: { id: string },
  ) {
    const collection = await this.collectionsService.updateCollection(
      id,
      user.id,
      body.name,
      body.description,
    );

    return {
      success: true,
      data: collection,
      message: 'Collection updated successfully',
    };
  }

  /**
   * Delete a collection
   * DELETE /collections/:id?userId=xxx
   */
  @Delete(':id')
  async deleteCollection(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const result = await this.collectionsService.deleteCollection(id, user.id);

    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Add documents to a collection
   * POST /collections/:id/documents
   */
  @Post(':id/documents')
  async addDocuments(
    @Param('id') id: string,
    @Body() body: { documentIds: string[] }, @CurrentUser() user: { id: string },
  ) {
    const result = await this.collectionsService.addDocumentsToCollection(
      id,
      user.id,
      body.documentIds,
    );

    return {
      success: true,
      message: result.message,
      data: {
        addedCount: result.addedCount,
        skippedCount: result.skippedCount,
      },
    };
  }

  /**
   * Remove a document from a collection
   * DELETE /collections/:id/documents/:documentId?userId=xxx
   */
  @Delete(':id/documents/:documentId')
  async removeDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.collectionsService.removeDocumentFromCollection(
      id,
      documentId,
      user.id,
    );

    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Get all documents in a collection
   * GET /collections/:id/documents?userId=xxx
   */
  @Get(':id/documents')
  async getCollectionDocuments(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const documents = await this.collectionsService.getCollectionDocuments(id, user.id);

    return {
      success: true,
      data: documents,
      count: documents.length,
    };
  }

  /**
   * Get collection statistics
   * GET /collections/:id/stats?userId=xxx
   */
  @Get(':id/stats')
  async getCollectionStats(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const stats = await this.collectionsService.getCollectionStats(id, user.id);

    return {
      success: true,
      data: stats,
    };
  }
}
