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
    @Body() body: { userId: string; name: string; description?: string },
  ) {
    const collection = await this.collectionsService.createCollection(
      body.userId,
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
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.collectionsService.getUserCollections(
      userId,
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
  async getCollection(@Param('id') id: string, @Query('userId') userId: string) {
    const collection = await this.collectionsService.getCollectionById(id, userId);

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
    @Body() body: { userId: string; name?: string; description?: string },
  ) {
    const collection = await this.collectionsService.updateCollection(
      id,
      body.userId,
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
  async deleteCollection(@Param('id') id: string, @Query('userId') userId: string) {
    const result = await this.collectionsService.deleteCollection(id, userId);

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
    @Body() body: { userId: string; documentIds: string[] },
  ) {
    const result = await this.collectionsService.addDocumentsToCollection(
      id,
      body.userId,
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
    @Query('userId') userId: string,
  ) {
    const result = await this.collectionsService.removeDocumentFromCollection(
      id,
      documentId,
      userId,
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
    @Query('userId') userId: string,
  ) {
    const documents = await this.collectionsService.getCollectionDocuments(id, userId);

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
  async getCollectionStats(@Param('id') id: string, @Query('userId') userId: string) {
    const stats = await this.collectionsService.getCollectionStats(id, userId);

    return {
      success: true,
      data: stats,
    };
  }
}
