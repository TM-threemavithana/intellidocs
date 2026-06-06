'use client';

import { useState, useRef, useEffect } from 'react';
import { chatApi } from '@/lib/api';

interface Citation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  relevanceScore: number;
  text: string;
}

interface Message {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatProps {
  documentId?: string;
  userId?: string;
}

export default function Chat({ documentId, userId = 'default-user' }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    if (documentId) {
      fetchHistory();
    }
  }, [documentId]);

  const fetchHistory = async () => {
    try {
      const result = documentId
        ? await chatApi.getDocumentHistory(documentId, userId, 20)
        : await chatApi.getHistory(userId, 20, 0);
      
      if (result.success && result.data) {
        const history = result.data.map((msg: any) => ({
          id: msg.id,
          question: msg.question,
          answer: msg.answer,
          citations: msg.citations || [],
          timestamp: new Date(msg.createdAt),
        }));
        setMessages(history.reverse());
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message with loading indicator
    const tempId = Date.now().toString();
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        question,
        answer: '',
        citations: [],
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    try {
      const result = await chatApi.ask(question, documentId, userId);

      if (result.success && result.data) {
        // Update message with actual response
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempId
              ? {
                  id: tempId,
                  question,
                  answer: result.data.answer,
                  citations: result.data.citations || [],
                  timestamp: new Date(),
                  isLoading: false,
                }
              : msg
          )
        );
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      // Update with error message
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? {
                ...msg,
                answer: 'Sorry, I encountered an error. Please try again.',
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history?')) return;

    try {
      const result = await chatApi.clearHistory(userId);
      if (result.success) {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">Chat with your documents</h2>
          <p className="text-sm text-gray-500">
            {documentId ? 'Chatting with specific document' : 'Ask questions about all documents'}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm mt-2">Ask a question to get started!</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            {/* User Question */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-2">
                <p className="text-sm">{message.question}</p>
              </div>
            </div>

            {/* AI Answer */}
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-gray-100 rounded-lg px-4 py-3">
                {message.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.answer}</p>
                    
                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Sources:</p>
                        <div className="space-y-1">
                          {message.citations.map((citation, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-gray-600 bg-white rounded px-2 py-1"
                            >
                              <span className="font-medium">
                                {citation.documentName || 'Document'}
                              </span>
                              {' - '}
                              <span>Page {citation.pageNumber}</span>
                              {' '}
                              <span className="text-gray-400">
                                (Relevance: {(citation.relevanceScore * 100).toFixed(0)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Ask specific questions about the content in your documents
        </p>
      </div>
    </div>
  );
}
