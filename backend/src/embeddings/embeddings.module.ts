import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingsService } from './embeddings.service';
import { EmbeddingsController } from './embeddings.controller';
import { ChromaService } from './chroma.service';
import { ChunkingService } from './chunking.service';
import { OllamaService } from './ollama.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService, ChromaService, ChunkingService, OllamaService],
  exports: [EmbeddingsService, ChromaService, OllamaService],
})
export class EmbeddingsModule {}
