import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { StreamingService } from './streaming.service';
import { CitationsService } from './citations.service';
import { DatabaseModule } from '../database/database.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    EmbeddingsModule,
  ],
  controllers: [ChatController, ConversationsController],
  providers: [
    RAGService,
    ChatService,
    ConversationsService,
    StreamingService,
    CitationsService,
  ],
  exports: [
    RAGService,
    ChatService,
    ConversationsService,
    StreamingService,
    CitationsService,
  ],
})
export class RAGModule {}
