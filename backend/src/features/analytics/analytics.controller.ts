import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CachingService } from '../../core/caching/caching.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly cachingService: CachingService,
  ) {}

  /**
   * Get usage statistics scoped to the authenticated user (SEC-03)
   * GET /analytics/usage?startDate=...&endDate=...
   */
  @Get('usage')
  async getUsageStats(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await this.analyticsService.getUsageStats(user.id, start, end);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get performance metrics scoped to the authenticated user
   * GET /analytics/performance
   */
  @Get('performance')
  async getPerformanceMetrics(@CurrentUser() user: { id: string }) {
    const metrics = await this.analyticsService.getPerformanceMetrics(user.id);

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get activity for the authenticated user
   * GET /analytics/user/activity?days=30
   */
  @Get('user/activity')
  async getUserActivity(
    @CurrentUser() user: { id: string },
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days) : 30;
    const activity = await this.analyticsService.getUserActivity(user.id, daysNum);

    return {
      success: true,
      data: activity,
    };
  }

  /**
   * Get system health metrics
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
