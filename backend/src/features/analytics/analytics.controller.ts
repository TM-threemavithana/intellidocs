import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CachingService } from '../../core/caching/caching.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly cachingService: CachingService,
  ) {}

  /**
   * Get usage statistics
   * GET /analytics/usage?userId=...&startDate=...&endDate=...
   */
  @Get('usage')
  async getUsageStats(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await this.analyticsService.getUsageStats(userId, start, end);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get performance metrics
   * GET /analytics/performance?userId=...
   */
  @Get('performance')
  async getPerformanceMetrics(@Query('userId') userId?: string) {
    const metrics = await this.analyticsService.getPerformanceMetrics(userId);

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get user activity
   * GET /analytics/user/:userId?days=30
   */
  @Get('user/:userId')
  async getUserActivity(
    @Query('userId') userId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days) : 30;
    const activity = await this.analyticsService.getUserActivity(userId, daysNum);

    return {
      success: true,
      data: activity,
    };
  }

  /**
   * Get system health
   * GET /analytics/health
   */
  @Get('health')
  async getSystemHealth() {
    const health = await this.analyticsService.getSystemHealth();

    return {
      success: true,
      data: health,
    };
  }

  /**
   * Get cache statistics
   * GET /analytics/cache
   */
  @Get('cache')
  async getCacheStats() {
    const stats = await this.cachingService.getStats();

    return {
      success: true,
      data: stats,
    };
  }
}
