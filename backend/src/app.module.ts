import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from './core/database/database.module';
import { StorageModule } from './core/storage/storage.module';
import { CachingModule } from './core/caching/caching.module';
import { OcrModule } from './features/ocr/ocr.module';
import { DocumentsModule } from './features/documents/documents.module';
import { EmbeddingsModule } from './features/embeddings/embeddings.module';
import { RAGModule } from './features/rag/rag.module';
import { CollectionsModule } from './features/collections/collections.module';
import { SearchModule } from './features/search/search.module';
import { AnalyticsModule } from './features/analytics/analytics.module';
import { AuthModule } from './features/auth/auth.module';
import { UsersModule } from './features/users/users.module';
import { PdfToolkitModule } from './features/pdf-toolkit/pdf-toolkit.module';
import { ResumeAnalyzerModule } from './features/resume-analyzer/resume-analyzer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    DatabaseModule,
    StorageModule,
    CachingModule,
    OcrModule,
    DocumentsModule,
    EmbeddingsModule,
    RAGModule,
    CollectionsModule,
    SearchModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    PdfToolkitModule,
    ResumeAnalyzerModule,
  ],
})
export class AppModule {}
