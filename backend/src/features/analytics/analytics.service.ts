import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface AnalyticsEvent {
  userId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  query?: string;
  error?: string;
}

export interface UsageStats {
  totalRequests: number;
  uniqueUsers: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  requestsByDay: Array<{ date: string; count: number }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an analytics event
   */
  async logEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // In a real implementation, you might want to:
      // 1. Batch events for performance
      // 2. Use a time-series database
      // 3. Send to external analytics service
      
      // For now, we'll just log to console in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Analytics: ${event.method} ${event.endpoint} - ${event.statusCode} (${event.responseTime}ms)`);
      }

      // Could store in database for basic analytics
      // await this.prisma.analytics.create({ data: event });
    } catch (error) {
      this.logger.warn(`Failed to log analytics event: ${error.message}`);
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UsageStats> {
    try {
      // Get chat statistics as a proxy for usage
      const chats = await this.prisma.chat.findMany({
        where: {
          ...(userId && { userId }),
          ...(startDate && endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        },
        select: {
          userId: true,
          latencyMs: true,
          createdAt: true,
        },
      });

      // Calculate statistics
      const uniqueUsers = new Set(chats.map((c) => c.userId)).size;
      const totalRequests = chats.length;
      const averageResponseTime = 
        chats.reduce((sum, c) => sum + c.latencyMs, 0) / (totalRequests || 1);

      // Group by day
      const requestsByDay = this.groupByDay(chats);

      return {
        totalRequests,
        uniqueUsers,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: 0, // Would need error tracking
        topEndpoints: [
          { endpoint: '/chat/ask', count: totalRequests },
        ],
        requestsByDay,
      };
    } catch (error) {
      this.logger.error(`Failed to get usage stats: ${error.message}`);
      return {
        totalRequests: 0,
        uniqueUsers: 0,
        averageResponseTime: 0,
        errorRate: 0,
        topEndpoints: [],
        requestsByDay: [],
      };
    }
  }

  /**
   * Group requests by day
   */
  private groupByDay(chats: any[]): Array<{ date: string; count: number }> {
    const grouped = new Map<string, number>();

    chats.forEach((chat) => {
      const date = chat.createdAt.toISOString().split('T')[0];
      grouped.set(date, (grouped.get(date) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(userId?: string): Promise<any> {
    try {
      const chats = await this.prisma.chat.findMany({
        where: userId ? { userId } : {},
        select: {
          latencyMs: true,
          modelUsed: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Last 1000 requests
      });

      if (chats.length === 0) {
        return {
          averageLatency: 0,
          p50Latency: 0,
          p95Latency: 0,
          p99Latency: 0,
          totalRequests: 0,
        };
      }

      // Calculate percentiles
      const latencies = chats.map((c) => c.latencyMs).sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];
      const average = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

      return {
        averageLatency: Math.round(average),
        p50Latency: p50,
        p95Latency: p95,
        p99Latency: p99,
        totalRequests: chats.length,
        byModel: this.groupByModel(chats),
      };
    } catch (error) {
      this.logger.error(`Failed to get performance metrics: ${error.message}`);
      return {
        averageLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        totalRequests: 0,
      };
    }
  }

  /**
   * Group metrics by model
   */
  private groupByModel(chats: any[]): any {
    const grouped = new Map<string, number[]>();

    chats.forEach((chat) => {
      const model = chat.modelUsed || 'unknown';
      if (!grouped.has(model)) {
        grouped.set(model, []);
      }
      grouped.get(model)!.push(chat.latencyMs);
    });

    const result: any = {};
    grouped.forEach((latencies, model) => {
      const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      result[model] = {
        count: latencies.length,
        averageLatency: Math.round(avg),
      };
    });

    return result;
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const [chats, documents, conversations] = await Promise.all([
        this.prisma.chat.count({
          where: {
            userId,
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.document.count({
          where: {
            userId,
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.conversation.count({
          where: {
            userId,
            createdAt: { gte: startDate },
          },
        }),
      ]);

      return {
        userId,
        period: `Last ${days} days`,
        totalChats: chats,
        totalDocuments: documents,
        totalConversations: conversations,
        averageChatsPerDay: Math.round((chats / days) * 10) / 10,
      };
    } catch (error) {
      this.logger.error(`Failed to get user activity: ${error.message}`);
      return {
        userId,
        period: `Last ${days} days`,
        totalChats: 0,
        totalDocuments: 0,
        totalConversations: 0,
        averageChatsPerDay: 0,
      };
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<any> {
    try {
      const [totalUsers, totalDocuments, totalChats, totalConversations] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.document.count(),
        this.prisma.chat.count(),
        this.prisma.conversation.count(),
      ]);

      // Get recent activity (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentChats = await this.prisma.chat.count({
        where: { createdAt: { gte: oneHourAgo } },
      });

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: {
          totalUsers,
          totalDocuments,
          totalChats,
          totalConversations,
          recentActivity: {
            chatsLastHour: recentChats,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get system health: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
