import { Module } from '@nestjs/common';
import { SimpleSearchController } from './simple-search.controller';
import { SimpleSearchService } from './simple-search.service';
import { SearchHistoryService } from './search-history.service';
import { SearchAnalyticsService } from './search-analytics.service';
import { DatabaseModule } from '../database/database.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [DatabaseModule, EmbeddingsModule, CommonModule],
  controllers: [SimpleSearchController],
  providers: [
    SimpleSearchService,
    SearchHistoryService,
    SearchAnalyticsService,
  ],
  exports: [
    SimpleSearchService,
    SearchHistoryService,
    SearchAnalyticsService,
  ],
})
export class SearchModule {}
