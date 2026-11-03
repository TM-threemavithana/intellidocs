import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { StreamingService } from './streaming.service';
import { CitationsService } from './citations.service';
import { Observable, interval, map } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class AskQuestionDto {
  question: string;
  documentId?: string;
  collectionId?: string;
  conversationId?: string; // For multi-turn conversations
}

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly streamingService: StreamingService,
    private readonly citationsService: CitationsService,
  ) {}

  /**
   * Ask a question using RAG (with conversation support)
   */
  @Post('ask')
  @HttpCode(HttpStatus.OK)
  async ask(@Body() dto: AskQuestionDto, @CurrentUser() user: { id: string }) {
    const userId = user.id;

    const response = await this.chatService.ask(
      userId,
      dto.question,
      dto.documentId,
      dto.collectionId,
      dto.conversationId, // Pass conversation ID
    );

    return {
      success: true,
      data: response,
    };
  }

  /**
   * Get chat history for current user
   */
  @Get('history')
  async getHistory(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = user.id;
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;

    const history = await this.chatService.getHistory(userId, limitNum, offsetNum);

    return {
      success: true,
      data: history,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: history.length,
      },
    };
  }

  /**
   * Get chat history for a specific document
   */
  @Get('history/document/:documentId')
  async getDocumentHistory(
    @Param('documentId') documentId: string,
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    const userId = user.id;
    const limitNum = limit ? parseInt(limit) : 50;

    const history = await this.chatService.getDocumentHistory(
      userId,
      documentId,
      limitNum,
    );

    return {
      success: true,
      data: history,
    };
  }

  /**
   * Delete a chat message
   */
  @Delete(':chatId')
  async deleteMessage(
    @Param('chatId') chatId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.chatService.deleteMessage(user.id, chatId);

    return {
      success: true,
      message: 'Chat message deleted',
    };
  }

  /**
   * Clear all chat history
   */
  @Delete('history/clear')
  async clearHistory(@CurrentUser() user: { id: string }) {
    const count = await this.chatService.clearHistory(user.id);

    return {
      success: true,
      message: `Cleared ${count} chat messages`,
      deletedCount: count,
    };
  }

  /**
   * Get chat statistics
   */
  @Get('stats')
  async getStats(@CurrentUser() user: { id: string }) {
    const stats = await this.chatService.getStats(user.id);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Stream chat response (Server-Sent Events)
   * GET /chat/stream?question=...&documentId=...&userId=...
   */
  @Get('stream')
  @Sse()
  streamResponse(
    @CurrentUser() user: { id: string },
    @Query('question') question: string,
    @Query('documentId') documentId?: string,
  ): Observable<MessageEvent> {

    // This is a simplified streaming endpoint
    // In production, you'd want to:
    // 1. Retrieve context from embeddings
    // 2. Stream the LLM response
    // 3. Send citations as separate events

    return new Observable((subscriber) => {
      const prompt = `Question: ${question}\n\nProvide a concise answer.`;
      
      this.streamingService.streamLLMResponse(prompt).subscribe({
        next: (chunk) => {
          subscriber.next({
            data: chunk,
          } as MessageEvent);
        },
        error: (error) => {
          subscriber.next({
            data: { type: 'error', error: error.message },
          } as MessageEvent);
          subscriber.complete();
        },
        complete: () => subscriber.complete(),
      });
    });
  }

  /**
   * Get citation statistics
   * GET /chat/citations/stats?documentId=...&userId=...
   */
  @Get('citations/stats')
  async getCitationStats(
    @CurrentUser() user: { id: string },
    @Query('documentId') documentId?: string,
  ) {
    const stats = await this.citationsService.getCitationStatistics(
      documentId,
      user.id,
    );

    return {
      success: true,
      data: stats,
    };
  }
}
