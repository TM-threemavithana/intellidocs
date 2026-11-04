import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SimpleSearchService } from './simple-search.service';
import { SearchHistoryService } from './search-history.service';
import { SearchAnalyticsService } from './search-analytics.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('search')
export class SimpleSearchController {
  private readonly logger = new Logger(SimpleSearchController.name);

  constructor(
    private readonly searchService: SimpleSearchService,
    private readonly historyService: SearchHistoryService,
    private readonly analyticsService: SearchAnalyticsService,
  ) { }

  // ==================== SEARCH ENDPOINTS ====================

  /**
   * POST /search/hybrid - Hybrid search with verified user context (SEC-03)
   */
  @Post('hybrid')
  async hybridSearch(
    @Body() body: { query: string; limit?: number },
    @CurrentUser() user: { id: string },
  ) {
    try {
      const { query, limit = 10 } = body;
      const userId = user.id;

      if (!query || query.trim().length === 0) {
        throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
      }

      const startTime = Date.now();
      const results = await this.searchService.hybridSearch(query.trim(), userId, limit);
      const timeTaken = Date.now() - startTime;

      // Record in history
      await this.historyService.recordSearch(userId, query.trim(), results.length, 'hybrid', timeTaken);

      return {
        success: true,
        data: {
          query: query.trim(),
          searchType: 'hybrid',
          resultsCount: results.length,
          timeTaken,
          results,
        },
      };
    } catch (error) {
      this.logger.error(`Hybrid search failed: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /search/vector - Vector search with verified user context (SEC-03)
   */
  @Post('vector')
  async vectorSearch(
    @Body() body: { query: string; limit?: number },
    @CurrentUser() user: { id: string },
  ) {
    try {
      const { query, limit = 10 } = body;
      const userId = user.id;

      if (!query || query.trim().length === 0) {
        throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
      }

      const startTime = Date.now();
      const results = await this.searchService.vectorSearch(query.trim(), userId, limit);
      const timeTaken = Date.now() - startTime;

      // Record in history
      await this.historyService.recordSearch(userId, query.trim(), results.length, 'vector', timeTaken);

      return {
        success: true,
        data: {
          query: query.trim(),
          searchType: 'vector',
          resultsCount: results.length,
          timeTaken,
          results,
        },
      };
    } catch (error) {
      this.logger.error(`Vector search failed: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /search/keyword - Keyword search with verified user context (SEC-03)
   */
  @Post('keyword')
  async keywordSearch(
    @Body() body: { query: string; limit?: number },
    @CurrentUser() user: { id: string },
  ) {
    try {
      const { query, limit = 10 } = body;
      const userId = user.id;

      if (!query || query.trim().length === 0) {
        throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
      }

      const startTime = Date.now();
      const results = await this.searchService.searchByName(query.trim(), userId, limit);
      const timeTaken = Date.now() - startTime;

      // Record in history
      await this.historyService.recordSearch(userId, query.trim(), results.length, 'keyword', timeTaken);

      return {
        success: true,
        data: {
          query: query.trim(),
          searchType: 'keyword',
          resultsCount: results.length,
          timeTaken,
          results,
        },
      };
    } catch (error) {
      this.logger.error(`Keyword search failed: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== HISTORY ENDPOINTS ====================

  /**
   * GET /search/history - Get search history strictly for authenticated user (SEC-03)
   */
  @Get('history')
  async getHistory(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    try {
      const history = await this.historyService.getHistory(
        user.id,
        limit ? parseInt(limit) : 50,
      );

      return { success: true, data: { count: history.length, history } };
    } catch (error) {
      this.logger.error(`Failed to get search history: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/suggestions - Get search suggestions for authenticated user
   */
  @Get('suggestions')
  async getSuggestions(
    @CurrentUser() user: { id: string },
    @Query('query') partialQuery?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const suggestions = await this.historyService.getSuggestions(
        user.id,
        partialQuery,
        limit ? parseInt(limit) : 10,
      );

      return { success: true, data: { count: suggestions.length, suggestions } };
    } catch (error) {
      this.logger.error(`Failed to get suggestions: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /search/suggestions/autocomplete - Autocomplete query
   */
  @Post('suggestions/autocomplete')
  async autocomplete(
    @Body() body: { partialQuery: string; limit?: number },
    @CurrentUser() user: { id: string },
  ) {
    try {
      const { partialQuery, limit = 5 } = body;

      if (!partialQuery) {
        throw new HttpException('partialQuery is required', HttpStatus.BAD_REQUEST);
      }

      const suggestions = await this.historyService.getAutocomplete(user.id, partialQuery, limit);

      return {
        success: true,
        data: { partialQuery, count: suggestions.length, suggestions },
      };
    } catch (error) {
      this.logger.error(`Autocomplete failed: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * DELETE /search/history/:id - Delete search entry with ownership check
   */
  @Delete('history/:id')
  async deleteSearch(
    @Param('id') searchId: string,
    @CurrentUser() user: { id: string },
  ) {
    try {
      const deleted = await this.historyService.deleteSearch(user.id, searchId);

      return { success: deleted, message: deleted ? 'Search deleted' : 'Search not found' };
    } catch (error) {
      this.logger.error(`Failed to delete search: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * DELETE /search/history/clear - Clear all search history for authenticated user
   */
  @Delete('history/clear')
  async clearHistory(@CurrentUser() user: { id: string }) {
    try {
      const count = await this.historyService.clearHistory(user.id);

      return { success: true, message: `Cleared ${count} search entries`, data: { count } };
    } catch (error) {
      this.logger.error(`Failed to clear history: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/popular - Get popular searches scoped to authenticated user
   */
  @Get('popular')
  async getPopularSearches(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    try {
      const popular = await this.historyService.getPopularSearches(
        user.id,
        limit ? parseInt(limit) : 10,
      );

      return { success: true, data: { count: popular.length, popular } };
    } catch (error) {
      this.logger.error(`Failed to get popular searches: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== ANALYTICS ENDPOINTS ====================

  /**
   * GET /search/analytics/overview - Search overview stats
   */
  @Get('analytics/overview')
  async getSearchOverview(
    @CurrentUser() user: { id: string },
    @Query('days') days?: string,
  ) {
    try {
      const overview = await this.analyticsService.getOverview(
        user.id,
        days ? parseInt(days) : 30,
      );

      return { success: true, data: overview };
    } catch (error) {
      this.logger.error(`Failed to get search overview: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/analytics/trends - Search trends over time
   */
  @Get('analytics/trends')
  async getSearchTrends(
    @CurrentUser() user: { id: string },
    @Query('days') days?: string,
  ) {
    try {
      const trends = await this.analyticsService.getTrends(
        user.id,
        days ? parseInt(days) : 30,
      );

      return { success: true, data: { count: trends.length, trends } };
    } catch (error) {
      this.logger.error(`Failed to get search trends: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/analytics/popular-documents - Most clicked documents
   */
  @Get('analytics/popular-documents')
  async getPopularDocuments(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    try {
      const documents = await this.analyticsService.getPopularDocuments(
        user.id,
        limit ? parseInt(limit) : 10,
      );

      return { success: true, data: { count: documents.length, documents } };
    } catch (error) {
      this.logger.error(`Failed to get popular documents: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/analytics/zero-results - Queries with no results
   */
  @Get('analytics/zero-results')
  async getZeroResultQueries(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    try {
      const queries = await this.analyticsService.getZeroResultQueries(
        user.id,
        limit ? parseInt(limit) : 20,
      );

      return { success: true, data: { count: queries.length, queries } };
    } catch (error) {
      this.logger.error(`Failed to get zero-result queries: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/analytics/performance - Search performance metrics
   */
  @Get('analytics/performance')
  async getSearchPerformance(
    @CurrentUser() user: { id: string },
    @Query('days') days?: string,
  ) {
    try {
      const metrics = await this.analyticsService.getPerformanceMetrics(
        user.id,
        days ? parseInt(days) : 30,
      );

      return { success: true, data: metrics };
    } catch (error) {
      this.logger.error(`Failed to get search performance: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/analytics/quality - Search quality score
   */
  @Get('analytics/quality')
  async getSearchQuality(@CurrentUser() user: { id: string }) {
    try {
      const score = await this.analyticsService.getQualityScore(user.id);

      return { success: true, data: { score, rating: this.getRating(score) } };
    } catch (error) {
      this.logger.error(`Failed to get search quality: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/stats - Get search statistics
   */
  @Get('stats')
  async getSearchStats(@CurrentUser() user: { id: string }) {
    try {
      const stats = await this.searchService.getSearchStats(user.id);

      return { success: true, data: stats };
    } catch (error) {
      this.logger.error(`Failed to get search stats: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Helper: Get quality rating from score
   */
  private getRating(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }
}
