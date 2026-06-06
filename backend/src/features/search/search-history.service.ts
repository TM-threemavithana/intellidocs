import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface SearchSuggestion {
  query: string;
  count: number;
  avgResultsCount: number;
  lastUsed: Date;
}

@Injectable()
export class SearchHistoryService {
  private readonly logger = new Logger(SearchHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a search query
   */
  async recordSearch(
    userId: string,
    query: string,
    resultsCount: number,
    searchType: string,
    timeTaken: number,
    filters?: any,
  ): Promise<void> {
    try {
      await this.prisma.searchHistory.create({
        data: {
          userId,
          query,
          resultsCount,
          searchType,
          timeTaken,
          filters: filters || {},
        },
      });

      this.logger.log(`Recorded search: "${query}" (${resultsCount} results, ${timeTaken}ms)`);
    } catch (error) {
      this.logger.error(`Failed to record search: ${error.message}`);
    }
  }

  /**
   * Record clicked result
   */
  async recordClick(searchId: string, documentId: string): Promise<void> {
    try {
      const search = await this.prisma.searchHistory.findUnique({
        where: { id: searchId },
      });

      if (search) {
        const clickedResults = [...search.clickedResults, documentId];
        
        await this.prisma.searchHistory.update({
          where: { id: searchId },
          data: { clickedResults },
        });

        this.logger.log(`Recorded click for search ${searchId} -> document ${documentId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to record click: ${error.message}`);
    }
  }

  /**
   * Get user's search history
   */
  async getHistory(userId: string, limit: number = 50) {
    const history = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        query: true,
        resultsCount: true,
        searchType: true,
        timeTaken: true,
        filters: true,
        clickedResults: true,
        createdAt: true,
      },
    });

    return history;
  }

  /**
   * Get search suggestions based on user's history
   */
  async getSuggestions(
    userId: string,
    partialQuery?: string,
    limit: number = 10,
  ): Promise<SearchSuggestion[]> {
    // Get user's search history
    const whereClause: any = { userId };
    
    if (partialQuery && partialQuery.length > 0) {
      whereClause.query = {
        contains: partialQuery,
        mode: 'insensitive',
      };
    }

    const searches = await this.prisma.searchHistory.findMany({
      where: whereClause,
      select: {
        query: true,
        resultsCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Get more for grouping
    });

    // Group by query and aggregate
    const queryMap = new Map<string, { count: number; totalResults: number; lastUsed: Date }>();

    for (const search of searches) {
      const queryLower = search.query.toLowerCase();
      
      if (queryMap.has(queryLower)) {
        const existing = queryMap.get(queryLower)!;
        existing.count++;
        existing.totalResults += search.resultsCount;
        if (search.createdAt > existing.lastUsed) {
          existing.lastUsed = search.createdAt;
        }
      } else {
        queryMap.set(queryLower, {
          count: 1,
          totalResults: search.resultsCount,
          lastUsed: search.createdAt,
        });
      }
    }

    // Convert to suggestions and sort by frequency + recency
    const suggestions: SearchSuggestion[] = Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query,
        count: data.count,
        avgResultsCount: Math.round(data.totalResults / data.count),
        lastUsed: data.lastUsed,
      }))
      .sort((a, b) => {
        // Sort by count first, then by recency
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.lastUsed.getTime() - a.lastUsed.getTime();
      })
      .slice(0, limit);

    return suggestions;
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocomplete(
    userId: string,
    partialQuery: string,
    limit: number = 5,
  ): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    // Get matching queries from history
    const searches = await this.prisma.searchHistory.findMany({
      where: {
        userId,
        query: {
          startsWith: partialQuery,
          mode: 'insensitive',
        },
      },
      select: { query: true },
      distinct: ['query'],
      take: limit * 2, // Get more for filtering
    });

    // Deduplicate and limit
    const unique = Array.from(new Set(searches.map((s) => s.query)))
      .slice(0, limit);

    return unique;
  }

  /**
   * Get popular searches (global or user-specific)
   */
  async getPopularSearches(
    userId?: string,
    limit: number = 10,
  ): Promise<SearchSuggestion[]> {
    const whereClause: any = {};
    if (userId) {
      whereClause.userId = userId;
    }

    // Get all searches
    const searches = await this.prisma.searchHistory.findMany({
      where: whereClause,
      select: {
        query: true,
        resultsCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // Get more for grouping
    });

    // Group by query
    const queryMap = new Map<string, { count: number; totalResults: number; lastUsed: Date }>();

    for (const search of searches) {
      const queryLower = search.query.toLowerCase();
      
      if (queryMap.has(queryLower)) {
        const existing = queryMap.get(queryLower)!;
        existing.count++;
        existing.totalResults += search.resultsCount;
        if (search.createdAt > existing.lastUsed) {
          existing.lastUsed = search.createdAt;
        }
      } else {
        queryMap.set(queryLower, {
          count: 1,
          totalResults: search.resultsCount,
          lastUsed: search.createdAt,
        });
      }
    }

    // Convert to suggestions and sort by popularity
    const popular: SearchSuggestion[] = Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query,
        count: data.count,
        avgResultsCount: Math.round(data.totalResults / data.count),
        lastUsed: data.lastUsed,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return popular;
  }

  /**
   * Delete a specific search history entry
   */
  async deleteSearch(userId: string, searchId: string): Promise<boolean> {
    try {
      await this.prisma.searchHistory.delete({
        where: {
          id: searchId,
          userId, // Ensure user owns this search
        },
      });

      this.logger.log(`Deleted search history: ${searchId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete search: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all search history for a user
   */
  async clearHistory(userId: string): Promise<number> {
    try {
      const result = await this.prisma.searchHistory.deleteMany({
        where: { userId },
      });

      this.logger.log(`Cleared ${result.count} search history entries for user ${userId}`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to clear history: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get search statistics for a user
   */
  async getStatistics(userId: string) {
    const [
      totalSearches,
      uniqueQueries,
      avgResultsCount,
      avgTimeTaken,
      searchTypes,
    ] = await Promise.all([
      this.prisma.searchHistory.count({ where: { userId } }),
      this.getUniqueQueryCount(userId),
      this.getAvgResultsCount(userId),
      this.getAvgTimeTaken(userId),
      this.getSearchTypeDistribution(userId),
    ]);

    return {
      totalSearches,
      uniqueQueries,
      avgResultsCount,
      avgTimeTaken,
      searchTypes,
    };
  }

  /**
   * Get unique query count
   */
  private async getUniqueQueryCount(userId: string): Promise<number> {
    const searches = await this.prisma.searchHistory.findMany({
      where: { userId },
      select: { query: true },
      distinct: ['query'],
    });

    return searches.length;
  }

  /**
   * Get average results count
   */
  private async getAvgResultsCount(userId: string): Promise<number> {
    const result = await this.prisma.searchHistory.aggregate({
      where: { userId },
      _avg: { resultsCount: true },
    });

    return Math.round(result._avg.resultsCount || 0);
  }

  /**
   * Get average time taken
   */
  private async getAvgTimeTaken(userId: string): Promise<number> {
    const result = await this.prisma.searchHistory.aggregate({
      where: { userId },
      _avg: { timeTaken: true },
    });

    return Math.round(result._avg.timeTaken || 0);
  }

  /**
   * Get search type distribution
   */
  private async getSearchTypeDistribution(userId: string) {
    const searches = await this.prisma.searchHistory.groupBy({
      by: ['searchType'],
      where: { userId },
      _count: true,
    });

    return searches.map((s) => ({
      type: s.searchType,
      count: s._count,
    }));
  }
}
