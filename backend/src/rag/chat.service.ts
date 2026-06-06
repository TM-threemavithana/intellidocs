import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RAGService, RAGResponse } from './rag.service';

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  citations: any[];
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  documentIds?: string[];
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RAGService,
  ) {}

  /**
   * Ask a question and store in chat history
   */
  async ask(
    userId: string,
    question: string,
    documentId?: string,
    collectionId?: string,
  ): Promise<RAGResponse> {
    this.logger.log(`User ${userId} asking: "${question.substring(0, 50)}..."`);

    // Determine document IDs to search
    let documentIds: string[] | undefined;
    if (documentId) {
      documentIds = [documentId];
    } else if (collectionId) {
      // Get documents from collection (implement if needed)
      documentIds = undefined;
    }

    // Get answer using RAG
    const ragResponse = await this.ragService.ask(question, documentIds);

    // Store in chat history
    try {
      await this.prisma.chat.create({
        data: {
          userId,
          documentId,
          collectionId,
          question,
          answer: ragResponse.answer,
          sourceCitations: ragResponse.citations as any,
          modelUsed: process.env.OLLAMA_MODEL || 'llama2',
          latencyMs: ragResponse.responseTime,
        },
      });
    } catch (error) {
      this.logger.error('Failed to store chat history:', error);
      // Don't fail the request if we can't store history
    }

    return ragResponse;
  }

  /**
   * Get chat history for a user
   */
  async getHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ChatMessage[]> {
    const chats = await this.prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return chats.map(chat => ({
      id: chat.id,
      question: chat.question,
      answer: chat.answer,
      citations: chat.sourceCitations as any,
      createdAt: chat.createdAt,
    }));
  }

  /**
   * Get chat history for a specific document
   */
  async getDocumentHistory(
    userId: string,
    documentId: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    const chats = await this.prisma.chat.findMany({
      where: {
        userId,
        documentId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return chats.map(chat => ({
      id: chat.id,
      question: chat.question,
      answer: chat.answer,
      citations: chat.sourceCitations as any,
      createdAt: chat.createdAt,
    }));
  }

  /**
   * Delete a chat message
   */
  async deleteMessage(userId: string, chatId: string): Promise<void> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat message not found');
    }

    if (chat.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.prisma.chat.delete({
      where: { id: chatId },
    });

    this.logger.log(`Deleted chat message: ${chatId}`);
  }

  /**
   * Clear all chat history for a user
   */
  async clearHistory(userId: string): Promise<number> {
    const result = await this.prisma.chat.deleteMany({
      where: { userId },
    });

    this.logger.log(`Cleared ${result.count} chat messages for user: ${userId}`);
    return result.count;
  }

  /**
   * Get chat statistics
   */
  async getStats(userId: string) {
    const totalChats = await this.prisma.chat.count({
      where: { userId },
    });

    const avgLatency = await this.prisma.chat.aggregate({
      where: { userId },
      _avg: {
        latencyMs: true,
      },
    });

    const recentChats = await this.prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        createdAt: true,
        latencyMs: true,
      },
    });

    return {
      totalChats,
      averageLatency: avgLatency._avg.latencyMs || 0,
      recentActivity: recentChats,
    };
  }
}
