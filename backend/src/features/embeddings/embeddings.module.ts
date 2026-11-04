import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingsService } from './embeddings.service';
import { EmbeddingsController } from './embeddings.controller';
import { ChromaService } from './chroma.service';
import { ChunkingService } from './chunking.service';
import { OllamaService } from './ollama.service';
import { QueryEnhancementService } from './query-enhancement.service';
import { DatabaseModule } from '../../core/database/database.module';
import { CachingModule } from '../../core/caching/caching.module';

@Module({
  imports: [DatabaseModule, ConfigModule, CachingModule],
  controllers: [EmbeddingsController],
  providers: [
    EmbeddingsService,
    ChromaService,
    ChunkingService,
    OllamaService,
    QueryEnhancementService,
  ],
  exports: [
    EmbeddingsService,
    ChromaService,
    OllamaService,
    QueryEnhancementService,
    ChunkingService,
  ],
})
export class EmbeddingsModule {}
