import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { DatabaseModule } from '../database/database.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    EmbeddingsModule,
  ],
  controllers: [ChatController],
  providers: [RAGService, ChatService],
  exports: [RAGService, ChatService],
})
export class RAGModule {}
