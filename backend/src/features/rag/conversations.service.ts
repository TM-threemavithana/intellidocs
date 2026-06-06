import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

interface ConversationContext {
  lastMessages: Array<{ role: string; content: string }>;
  documentIds: string[];
  topics: string[];
  summary?: string;
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly maxContextMessages = 10; // Keep last 10 messages
  private readonly maxContextLength = 4000; // Max tokens for context

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title?: string) {
    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
        title: title || 'New Conversation',
        context: {
          lastMessages: [],
          documentIds: [],
          topics: [],
        },
        messageCount: 0,
      },
    });

    this.logger.log(`Created conversation ${conversation.id} for user ${userId}`);
    return conversation;
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50, // Limit to last 50 messages
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string, limit: number = 20) {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
    });

    return conversations;
  }

  /**
   * Add message to conversation and update context
   */
  async addMessageToConversation(
    conversationId: string,
    userId: string,
    message: {
      question: string;
      answer: string;
      documentId?: string;
      collectionId?: string;
      sourceCitations: any;
      modelUsed: string;
      latencyMs: number;
    },
  ) {
    // Verify conversation ownership
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Create chat message
    const chat = await this.prisma.chat.create({
      data: {
        userId,
        conversationId,
        documentId: message.documentId,
        collectionId: message.collectionId,
        question: message.question,
        answer: message.answer,
        sourceCitations: message.sourceCitations,
        modelUsed: message.modelUsed,
        latencyMs: message.latencyMs,
      },
    });

    // Update conversation context
    await this.updateConversationContext(
      conversationId,
      message.question,
      message.answer,
      message.documentId,
    );

    // Auto-generate title from first message
    if (conversation.messageCount === 0) {
      const title = this.generateConversationTitle(message.question);
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }

    return chat;
  }

  /**
   * Update conversation context with new message
   */
  private async updateConversationContext(
    conversationId: string,
    question: string,
    answer: string,
    documentId?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return;

    const context = conversation.context as unknown as ConversationContext;

    // Add new messages to context
    context.lastMessages.push({ role: 'user', content: question });
    context.lastMessages.push({ role: 'assistant', content: answer });

    // Keep only last N messages
    if (context.lastMessages.length > this.maxContextMessages * 2) {
      context.lastMessages = context.lastMessages.slice(-this.maxContextMessages * 2);
    }

    // Track document IDs
    if (documentId && !context.documentIds.includes(documentId)) {
      context.documentIds.push(documentId);
    }

    // Extract topics from question
    const topics = this.extractTopics(question);
    topics.forEach((topic) => {
      if (!context.topics.includes(topic)) {
        context.topics.push(topic);
      }
    });

    // Summarize if context is too long
    if (this.estimateTokenCount(context) > this.maxContextLength) {
      context.summary = this.summarizeContext(context);
      context.lastMessages = context.lastMessages.slice(-6); // Keep only last 3 exchanges
    }

    // Update conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        context: context as any,
        messageCount: { increment: 1 },
        lastMessageAt: new Date(),
      },
    });
  }

  /**
   * Get conversation context for RAG
   */
  async getConversationContext(conversationId: string, userId: string): Promise<string> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return '';
    }

    const context = conversation.context as unknown as ConversationContext;
    let contextText = '';

    // Add summary if available
    if (context.summary) {
      contextText += `Previous conversation summary: ${context.summary}\n\n`;
    }

    // Add recent messages
    if (context.lastMessages && context.lastMessages.length > 0) {
      contextText += 'Recent conversation:\n';
      context.lastMessages.forEach((msg) => {
        contextText += `${msg.role}: ${msg.content}\n`;
      });
    }

    // Add topics
    if (context.topics && context.topics.length > 0) {
      contextText += `\nTopics discussed: ${context.topics.join(', ')}\n`;
    }

    return contextText;
  }

  /**
   * Clear conversation context
   */
  async clearConversationContext(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        context: {
          lastMessages: [],
          documentIds: [],
          topics: [],
        },
      },
    });

    return { message: 'Conversation context cleared' };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return { message: 'Conversation deleted' };
  }

  /**
   * Generate conversation title from first question
   */
  private generateConversationTitle(question: string): string {
    // Take first 50 characters of question
    let title = question.substring(0, 50);
    
    if (question.length > 50) {
      title += '...';
    }

    return title;
  }

  /**
   * Extract topics from question
   */
  private extractTopics(question: string): string[] {
    const topics: string[] = [];
    const lowerQuestion = question.toLowerCase();

    // Common ML/AI topics
    const topicKeywords = [
      'machine learning',
      'deep learning',
      'neural network',
      'ai',
      'algorithm',
      'model',
      'training',
      'prediction',
      'classification',
      'regression',
      'clustering',
      'nlp',
      'computer vision',
      'reinforcement learning',
    ];

    topicKeywords.forEach((keyword) => {
      if (lowerQuestion.includes(keyword)) {
        topics.push(keyword);
      }
    });

    return topics;
  }

  /**
   * Summarize conversation context
   */
  private summarizeContext(context: ConversationContext): string {
    const topics = context.topics.join(', ');
    const messageCount = context.lastMessages.length / 2;
    
    let summary = `Discussed ${messageCount} topics`;
    
    if (topics) {
      summary += ` including: ${topics}`;
    }

    // Add first and last message hints
    if (context.lastMessages.length > 0) {
      const firstMsg = context.lastMessages[0].content.substring(0, 50);
      const lastMsg = context.lastMessages[context.lastMessages.length - 1].content.substring(0, 50);
      summary += `. Started with "${firstMsg}...", most recently "${lastMsg}..."`;
    }

    return summary;
  }

  /**
   * Estimate token count for context
   */
  private estimateTokenCount(context: ConversationContext): number {
    let text = JSON.stringify(context);
    // Rough estimate: 4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          select: {
            latencyMs: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const context = conversation.context as unknown as ConversationContext;
    const avgLatency =
      conversation.messages.reduce((sum, msg) => sum + msg.latencyMs, 0) /
      conversation.messages.length;

    return {
      conversationId,
      title: conversation.title,
      messageCount: conversation._count.messages,
      topicsDiscussed: context.topics.length,
      documentsUsed: context.documentIds.length,
      averageLatencyMs: Math.round(avgLatency) || 0,
      createdAt: conversation.createdAt,
      lastMessageAt: conversation.lastMessageAt,
    };
  }
}
