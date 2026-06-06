import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { OcrModule } from './ocr/ocr.module';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { RAGModule } from './rag/rag.module';
import { CollectionsModule } from './collections/collections.module';
import { CommonModule } from './common/common.module';
import { SearchModule } from './search/search.module';

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
    CommonModule,
    DatabaseModule,
    StorageModule,
    OcrModule,
    DocumentsModule,
    EmbeddingsModule,
    RAGModule,
    CollectionsModule,
    SearchModule,
  ],
})
export class AppModule {}
