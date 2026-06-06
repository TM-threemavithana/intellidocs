import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface SearchOverview {
  totalSearches: number;
  uniqueUsers: number;
  avgResultsPerQuery: number;
  avgSearchTime: number;
  clickThroughRate: number;
  zeroResultQueries: number;
}

export interface SearchTrend {
  date: string;
  searchCount: number;
  avgResultsCount: number;
  avgTimeTaken: number;
}

export interface PopularDocument {
  documentId: string;
  documentName: string;
  clickCount: number;
  appearanceCount: number;
  clickThroughRate: number;
}

export interface ZeroResultQuery {
  query: string;
  count: number;
  lastSearched: Date;
}

@Injectable()
export class SearchAnalyticsService {
  private readonly logger = new Logger(SearchAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get search overview statistics
   */
  async getOverview(userId?: string, days: number = 30): Promise<SearchOverview> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const whereClause: any = { createdAt: { gte: since } };
    if (userId) {
      whereClause.userId = userId;
    }

    const [
      totalSearches,
      uniqueUsers,
      avgStats,
      zeroResultQueries,
      clickStats,
    ] = await Promise.all([
      this.prisma.searchHistory.count({ where: whereClause }),
      this.getUniqueUserCount(whereClause),
      this.getAverageStats(whereClause),
      this.getZeroResultCount(whereClause),
      this.getClickStats(whereClause),
    ]);

    return {
      totalSearches,
      uniqueUsers,
      avgResultsPerQuery: avgStats.avgResults,
      avgSearchTime: avgStats.avgTime,
      clickThroughRate: clickStats.ctr,
      zeroResultQueries,
    };
  }

  /**
   * Get search trends over time
   */
  async getTrends(userId?: string, days: number = 30): Promise<SearchTrend[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const whereClause: any = { createdAt: { gte: since } };
    if (userId) {
      whereClause.userId = userId;
    }

    const searches = await this.prisma.searchHistory.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        resultsCount: true,
        timeTaken: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const trendMap = new Map<string, { count: number; totalResults: number; totalTime: number }>();

    for (const search of searches) {
      const dateKey = search.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (trendMap.has(dateKey)) {
        const existing = trendMap.get(dateKey)!;
        existing.count++;
        existing.totalResults += search.resultsCount;
        existing.totalTime += search.timeTaken;
      } else {
        trendMap.set(dateKey, {
          count: 1,
          totalResults: search.resultsCount,
          totalTime: search.timeTaken,
        });
      }
    }

    // Convert to trends array
    const trends: SearchTrend[] = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        searchCount: data.count,
        avgResultsCount: Math.round(data.totalResults / data.count),
        avgTimeTaken: Math.round(data.totalTime / data.count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return trends;
  }

  /**
   * Get popular documents (most clicked from search results)
   */
  async getPopularDocuments(
    userId?: string,
    limit: number = 10,
  ): Promise<PopularDocument[]> {
    const whereClause: any = {};
    if (userId) {
      whereClause.userId = userId;
    }

    // Get all searches with clicks
    const searches = await this.prisma.searchHistory.findMany({
      where: whereClause,
      select: {
        clickedResults: true,
        resultsCount: true,
      },
    });

    // Count document appearances and clicks
    const documentStats = new Map<string, { clicks: number; appearances: number }>();

    for (const search of searches) {
      const clickedDocs = new Set(search.clickedResults);
      
      // Each search result could have included multiple documents
      // We approximate by assuming top N results were shown
      const shownDocs = Math.min(search.resultsCount, 10);
      
      for (const docId of clickedDocs) {
        if (documentStats.has(docId)) {
          const stats = documentStats.get(docId)!;
          stats.clicks++;
          stats.appearances++;
        } else {
          documentStats.set(docId, { clicks: 1, appearances: 1 });
        }
      }
    }

    // Get document names
    const documentIds = Array.from(documentStats.keys());
    const documents = await this.prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, fileName: true },
    });

    const documentMap = new Map(documents.map((d) => [d.id, d.fileName]));

    // Convert to popular documents
    const popular: PopularDocument[] = Array.from(documentStats.entries())
      .map(([docId, stats]) => ({
        documentId: docId,
        documentName: documentMap.get(docId) || 'Unknown',
        clickCount: stats.clicks,
        appearanceCount: stats.appearances,
        clickThroughRate: stats.clicks / stats.appearances,
      }))
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, limit);

    return popular;
  }

  /**
   * Get queries that returned zero results
   */
  async getZeroResultQueries(
    userId?: string,
    limit: number = 20,
  ): Promise<ZeroResultQuery[]> {
    const whereClause: any = { resultsCount: 0 };
    if (userId) {
      whereClause.userId = userId;
    }

    const searches = await this.prisma.searchHistory.findMany({
      where: whereClause,
      select: {
        query: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by query
    const queryMap = new Map<string, { count: number; lastSearched: Date }>();

    for (const search of searches) {
      const queryLower = search.query.toLowerCase();
      
      if (queryMap.has(queryLower)) {
        const existing = queryMap.get(queryLower)!;
        existing.count++;
        if (search.createdAt > existing.lastSearched) {
          existing.lastSearched = search.createdAt;
        }
      } else {
        queryMap.set(queryLower, {
          count: 1,
          lastSearched: search.createdAt,
        });
      }
    }

    // Convert to zero result queries
    const zeroResults: ZeroResultQuery[] = Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query,
        count: data.count,
        lastSearched: data.lastSearched,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return zeroResults;
  }

  /**
   * Get search performance metrics
   */
  async getPerformanceMetrics(userId?: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const whereClause: any = { createdAt: { gte: since } };
    if (userId) {
      whereClause.userId = userId;
    }

    const searches = await this.prisma.searchHistory.findMany({
      where: whereClause,
      select: {
        timeTaken: true,
        resultsCount: true,
        searchType: true,
      },
    });

    if (searches.length === 0) {
      return {
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        totalSearches: 0,
        searchTypeDistribution: [],
      };
    }

    // Calculate percentiles
    const times = searches.map((s) => s.timeTaken).sort((a, b) => a - b);
    const p50Index = Math.floor(times.length * 0.5);
    const p95Index = Math.floor(times.length * 0.95);
    const p99Index = Math.floor(times.length * 0.99);

    // Calculate average
    const avgLatency = Math.round(
      times.reduce((sum, t) => sum + t, 0) / times.length,
    );

    // Search type distribution
    const typeMap = new Map<string, number>();
    for (const search of searches) {
      const count = typeMap.get(search.searchType) || 0;
      typeMap.set(search.searchType, count + 1);
    }

    const searchTypeDistribution = Array.from(typeMap.entries()).map(
      ([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / searches.length) * 100),
      }),
    );

    return {
      avgLatency,
      p50Latency: times[p50Index],
      p95Latency: times[p95Index],
      p99Latency: times[p99Index],
      totalSearches: searches.length,
      searchTypeDistribution,
    };
  }

  /**
   * Get search quality score (0-100)
   */
  async getQualityScore(userId?: string): Promise<number> {
    const overview = await this.getOverview(userId, 30);

    // Calculate quality score based on multiple factors
    let score = 100;

    // Penalize high zero-result rate
    const zeroResultRate = overview.zeroResultQueries / Math.max(overview.totalSearches, 1);
    score -= zeroResultRate * 30; // Max -30 points

    // Penalize low click-through rate
    if (overview.clickThroughRate < 0.3) {
      score -= (0.3 - overview.clickThroughRate) * 50; // Max -15 points
    }

    // Penalize slow searches (> 5 seconds)
    if (overview.avgSearchTime > 5000) {
      score -= Math.min((overview.avgSearchTime - 5000) / 1000, 20); // Max -20 points
    }

    // Penalize low results per query
    if (overview.avgResultsPerQuery < 3) {
      score -= (3 - overview.avgResultsPerQuery) * 5; // Max -15 points
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Helper: Get unique user count
   */
  private async getUniqueUserCount(whereClause: any): Promise<number> {
    const users = await this.prisma.searchHistory.findMany({
      where: whereClause,
      select: { userId: true },
      distinct: ['userId'],
    });

    return users.length;
  }

  /**
   * Helper: Get average statistics
   */
  private async getAverageStats(whereClause: any) {
    const result = await this.prisma.searchHistory.aggregate({
      where: whereClause,
      _avg: {
        resultsCount: true,
        timeTaken: true,
      },
    });

    return {
      avgResults: Math.round(result._avg.resultsCount || 0),
      avgTime: Math.round(result._avg.timeTaken || 0),
    };
  }

  /**
   * Helper: Get zero result count
   */
  private async getZeroResultCount(whereClause: any): Promise<number> {
    return this.prisma.searchHistory.count({
      where: {
        ...whereClause,
        resultsCount: 0,
      },
    });
  }

  /**
   * Helper: Get click-through statistics
   */
  private async getClickStats(whereClause: any) {
    const searches = await this.prisma.searchHistory.findMany({
      where: whereClause,
      select: { clickedResults: true },
    });

    const totalSearches = searches.length;
    const searchesWithClicks = searches.filter((s) => s.clickedResults.length > 0).length;

    return {
      ctr: totalSearches > 0 ? searchesWithClicks / totalSearches : 0,
    };
  }
}
