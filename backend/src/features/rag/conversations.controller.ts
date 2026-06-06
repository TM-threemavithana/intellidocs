import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  /**
   * Create a new conversation
   * POST /conversations
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createConversation(@Body() body: { userId: string; title?: string }) {
    const conversation = await this.conversationsService.createConversation(
      body.userId,
      body.title,
    );

    return {
      success: true,
      data: conversation,
      message: 'Conversation created successfully',
    };
  }

  /**
   * Get all conversations for a user
   * GET /conversations?userId=xxx&limit=20
   */
  @Get()
  async getUserConversations(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const conversations = await this.conversationsService.getUserConversations(
      userId,
      limit ? parseInt(limit) : 20,
    );

    return {
      success: true,
      data: conversations,
      count: conversations.length,
    };
  }

  /**
   * Get a specific conversation with messages
   * GET /conversations/:id?userId=xxx
   */
  @Get(':id')
  async getConversation(@Param('id') id: string, @Query('userId') userId: string) {
    const conversation = await this.conversationsService.getConversation(id, userId);

    return {
      success: true,
      data: conversation,
    };
  }

  /**
   * Get conversation context for RAG
   * GET /conversations/:id/context?userId=xxx
   */
  @Get(':id/context')
  async getConversationContext(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    const context = await this.conversationsService.getConversationContext(id, userId);

    return {
      success: true,
      data: { context },
    };
  }

  /**
   * Clear conversation context
   * POST /conversations/:id/clear?userId=xxx
   */
  @Post(':id/clear')
  async clearConversationContext(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    const result = await this.conversationsService.clearConversationContext(id, userId);

    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Delete a conversation
   * DELETE /conversations/:id?userId=xxx
   */
  @Delete(':id')
  async deleteConversation(@Param('id') id: string, @Query('userId') userId: string) {
    const result = await this.conversationsService.deleteConversation(id, userId);

    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Get conversation statistics
   * GET /conversations/:id/stats?userId=xxx
   */
  @Get(':id/stats')
  async getConversationStats(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    const stats = await this.conversationsService.getConversationStats(id, userId);

    return {
      success: true,
      data: stats,
    };
  }
}
