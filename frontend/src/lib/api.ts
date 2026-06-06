import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token (if needed)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Document API
export const documentApi = {
  /**
   * Upload a PDF document
   */
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Get document by ID
   */
  getDocument: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  },

  /**
   * Get OCR results for a document
   */
  getOCRResults: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}/ocr`);
    return response.data;
  },

  /**
   * Get OCR job status
   */
  getOCRJobStatus: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}/ocr-status`);
    return response.data;
  },
};

// Types
export interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  ocrApplied: boolean;
  createdAt: string;
}

export interface OCRPage {
  pageNumber: number;
  text: string;
  language: string;
  confidence: number;
  cerScore: number | null;
  werScore: number | null;
}

export interface OCRJobStatus {
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'not_found';
  progress?: number;
  jobId?: string;
  attempts?: number;
  timestamp?: number;
  message?: string;
}

export interface Citation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  relevanceScore: number;
  text: string;
}

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  createdAt: string;
}

export interface RAGResponse {
  answer: string;
  citations: Citation[];
  query: string;
  contextUsed: string;
  responseTime: number;
}

// Chat API
export const chatApi = {
  /**
   * Ask a question using RAG
   */
  ask: async (question: string, documentId?: string, userId?: string) => {
    const response = await api.post('/chat/ask', {
      question,
      documentId,
      userId,
    });
    return response.data;
  },

  /**
   * Get chat history
   */
  getHistory: async (userId?: string, limit: number = 50, offset: number = 0) => {
    const params = new URLSearchParams({
      ...(userId && { userId }),
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const response = await api.get(`/chat/history?${params}`);
    return response.data;
  },

  /**
   * Get chat history for a specific document
   */
  getDocumentHistory: async (documentId: string, userId?: string, limit: number = 50) => {
    const params = new URLSearchParams({
      ...(userId && { userId }),
      limit: limit.toString(),
    });
    const response = await api.get(`/chat/history/document/${documentId}?${params}`);
    return response.data;
  },

  /**
   * Delete a chat message
   */
  deleteMessage: async (chatId: string, userId?: string) => {
    const params = userId ? `?userId=${userId}` : '';
    const response = await api.delete(`/chat/${chatId}${params}`);
    return response.data;
  },

  /**
   * Clear all chat history
   */
  clearHistory: async (userId?: string) => {
    const params = userId ? `?userId=${userId}` : '';
    const response = await api.delete(`/chat/history/clear${params}`);
    return response.data;
  },

  /**
   * Get chat statistics
   */
  getStats: async (userId?: string) => {
    const params = userId ? `?userId=${userId}` : '';
    const response = await api.get(`/chat/stats${params}`);
    return response.data;
  },
};

// Embeddings API
export const embeddingsApi = {
  /**
   * Generate embeddings for a document
   */
  generate: async (documentId: string) => {
    const response = await api.post(`/embeddings/generate/${documentId}`);
    return response.data;
  },

  /**
   * Search embeddings
   */
  search: async (query: string, topK: number = 5, documentIds?: string[]) => {
    const response = await api.post('/embeddings/search', {
      query,
      topK,
      documentIds,
    });
    return response.data;
  },

  /**
   * Get embeddings statistics
   */
  getStats: async () => {
    const response = await api.get('/embeddings/stats');
    return response.data;
  },

  /**
   * Delete embeddings for a document
   */
  delete: async (documentId: string) => {
    const response = await api.delete(`/embeddings/${documentId}`);
    return response.data;
  },
};
