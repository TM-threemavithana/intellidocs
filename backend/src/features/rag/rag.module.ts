import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { StreamingService } from './streaming.service';
import { CitationsService } from './citations.service';
import { DatabaseModule } from '../../core/database/database.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { CachingModule } from '../../core/caching/caching.module';
import { RagEvalService } from './rag-eval.service';
import { RagEvalController } from './rag-eval.controller';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    EmbeddingsModule,
    CachingModule,
  ],
  controllers: [ChatController, ConversationsController, RagEvalController],
  providers: [
    RAGService,
    ChatService,
    ConversationsService,
    StreamingService,
    CitationsService,
    RagEvalService,
  ],
  exports: [
    RAGService,
    ChatService,
    ConversationsService,
    StreamingService,
    CitationsService,
    RagEvalService,
  ],
})
export class RAGModule {}
