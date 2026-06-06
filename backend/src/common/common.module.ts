import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CachingService } from './caching.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AnalyticsController],
  providers: [CachingService, AnalyticsService],
  exports: [CachingService, AnalyticsService],
})
export class CommonModule {}
