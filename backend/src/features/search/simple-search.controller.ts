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

@Controller('search')
export class SimpleSearchController {
  private readonly logger = new Logger(SimpleSearchController.name);

  constructor(
    private readonly searchService: SimpleSearchService,
    private readonly historyService: SearchHistoryService,
    private readonly analyticsService: SearchAnalyticsService,
  ) {}

  // ==================== SEARCH ENDPOINTS ====================

  /**
   * POST /search/hybrid - Hybrid search
   */
  @Post('hybrid')
  async hybridSearch(
    @Body() body: {
      query: string;
      userId: string;
      limit?: number;
    },
  ) {
    try {
      const { query, userId, limit = 10 } = body;

      if (!query || !userId) {
        throw new HttpException(
          'Query and userId are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const startTime = Date.now();
      const results = await this.searchService.hybridSearch(query, userId, limit);
      const timeTaken = Date.now() - startTime;

      // Record in history
      await this.historyService.recordSearch(
        userId,
        query,
        results.length,
        'hybrid',
        timeTaken,
      );

      return {
        success: true,
        data: {
          query,
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
   * POST /search/vector - Vector search
   */
  @Post('vector')
  async vectorSearch(
    @Body() body: {
      query: string;
      userId: string;
      limit?: number;
    },
  ) {
    try {
      const { query, userId, limit = 10 } = body;

      if (!query || !userId) {
        throw new HttpException(
          'Query and userId are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const startTime = Date.now();
      const results = await this.searchService.vectorSearch(query, userId, limit);
      const timeTaken = Date.now() - startTime;

      // Record in history
      await this.historyService.recordSearch(
        userId,
        query,
        results.length,
        'vector',
        timeTaken,
      );

      return {
        success: true,
        data: {
          query,
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
   * POST /search/keyword - Keyword search (by name)
   */
  @Post('keyword')
  async keywordSearch(
    @Body() body: {
      query: string;
      userId: string;
      limit?: number;
    },
  ) {
    try {
      const { query, userId, limit = 10 } = body;

      if (!query || !userId) {
        throw new HttpException(
          'Query and userId are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const startTime = Date.now();
      const results = await this.searchService.searchByName(query, userId, limit);
      const timeTaken = Date.now() - startTime;

      // Record in history
      await this.historyService.recordSearch(
        userId,
        query,
        results.length,
        'keyword',
        timeTaken,
      );

      return {
        success: true,
        data: {
          query,
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
   * GET /search/history - Get search history
   */
  @Get('history')
  async getHistory(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }

      const history = await this.historyService.getHistory(
        userId,
        limit ? parseInt(limit) : 50,
      );

      return {
        success: true,
        data: {
          count: history.length,
          history,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get search history: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/suggestions - Get search suggestions
   */
  @Get('suggestions')
  async getSuggestions(
    @Query('userId') userId: string,
    @Query('query') partialQuery?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }

      const suggestions = await this.historyService.getSuggestions(
        userId,
        partialQuery,
        limit ? parseInt(limit) : 10,
      );

      return {
        success: true,
        data: {
          count: suggestions.length,
          suggestions,
        },
      };
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
    @Body() body: {
      userId: string;
      partialQuery: string;
      limit?: number;
    },
  ) {
    try {
      const { userId, partialQuery, limit = 5 } = body;

      if (!userId || !partialQuery) {
        throw new HttpException(
          'userId and partialQuery are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const suggestions = await this.historyService.getAutocomplete(
        userId,
        partialQuery,
        limit,
      );

      return {
        success: true,
        data: {
          partialQuery,
          count: suggestions.length,
          suggestions,
        },
      };
    } catch (error) {
      this.logger.error(`Autocomplete failed: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * DELETE /search/history/:id - Delete search entry
   */
  @Delete('history/:id')
  async deleteSearch(
    @Param('id') searchId: string,
    @Query('userId') userId: string,
  ) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }

      const deleted = await this.historyService.deleteSearch(userId, searchId);

      return {
        success: deleted,
        message: deleted ? 'Search deleted' : 'Search not found',
      };
    } catch (error) {
      this.logger.error(`Failed to delete search: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * DELETE /search/history/clear - Clear all search history
   */
  @Delete('history/clear')
  async clearHistory(@Query('userId') userId: string) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }

      const count = await this.historyService.clearHistory(userId);

      return {
        success: true,
        message: `Cleared ${count} search entries`,
        data: { count },
      };
    } catch (error) {
      this.logger.error(`Failed to clear history: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/popular - Get popular searches
   */
  @Get('popular')
  async getPopularSearches(
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const popular = await this.historyService.getPopularSearches(
        userId,
        limit ? parseInt(limit) : 10,
      );

      return {
        success: true,
        data: {
          count: popular.length,
          popular,
        },
      };
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
    @Query('userId') userId?: string,
    @Query('days') days?: string,
  ) {
    try {
      const overview = await this.analyticsService.getOverview(
        userId,
        days ? parseInt(days) : 30,
      );

      return {
        success: true,
        data: overview,
      };
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
    @Query('userId') userId?: string,
    @Query('days') days?: string,
  ) {
    try {
      const trends = await this.analyticsService.getTrends(
        userId,
        days ? parseInt(days) : 30,
      );

      return {
        success: true,
        data: {
          count: trends.length,
          trends,
        },
      };
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
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const documents = await this.analyticsService.getPopularDocuments(
        userId,
        limit ? parseInt(limit) : 10,
      );

      return {
        success: true,
        data: {
          count: documents.length,
          documents,
        },
      };
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
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const queries = await this.analyticsService.getZeroResultQueries(
        userId,
        limit ? parseInt(limit) : 20,
      );

      return {
        success: true,
        data: {
          count: queries.length,
          queries,
        },
      };
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
    @Query('userId') userId?: string,
    @Query('days') days?: string,
  ) {
    try {
      const metrics = await this.analyticsService.getPerformanceMetrics(
        userId,
        days ? parseInt(days) : 30,
      );

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      this.logger.error(`Failed to get search performance: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/analytics/quality - Search quality score
   */
  @Get('analytics/quality')
  async getSearchQuality(@Query('userId') userId?: string) {
    try {
      const score = await this.analyticsService.getQualityScore(userId);

      return {
        success: true,
        data: {
          score,
          rating: this.getRating(score),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get search quality: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /search/stats - Get search statistics
   */
  @Get('stats')
  async getSearchStats(@Query('userId') userId: string) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }

      const stats = await this.searchService.getSearchStats(userId);

      return {
        success: true,
        data: stats,
      };
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
