import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token
api.interceptors.request.use((config) => {
  // Get token from localStorage (Zustand persist)
  if (typeof window !== 'undefined') {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (e) {
        console.error('Failed to parse auth token:', e);
      }
    }
  }
  return config;
});

// Add response interceptor for handling 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

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

export interface SearchResult {
  documentId: string;
  documentName: string;
  chunkText: string;
  score: number;
  pageNumber: number;
}

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
   * Get all documents for current user
   */
  getAll: async (): Promise<Document[]> => {
    const response = await api.get('/documents');
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
   * Download original document as PDF blob
   */
  download: async (documentId: string, fileName?: string) => {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || `document-${documentId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Delete document and all associated resources
   */
  delete: async (documentId: string) => {
    const response = await api.delete(`/documents/${documentId}`);
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

// Chat API
export const chatApi = {
  /**
   * Ask a question using RAG
   */
  ask: async (question: string, documentId?: string, conversationId?: string) => {
    const response = await api.post('/chat/ask', {
      question,
      documentId,
      conversationId,
    });
    return response.data;
  },

  /**
   * Get chat history
   */
  getHistory: async (limit: number = 50, offset: number = 0) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const response = await api.get(`/chat/history?${params}`);
    return response.data;
  },

  /**
   * Get chat history for a specific document
   */
  getDocumentHistory: async (documentId: string, limit: number = 50) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    const response = await api.get(`/chat/history/document/${documentId}?${params}`);
    return response.data;
  },

  /**
   * Delete a chat message
   */
  deleteMessage: async (chatId: string) => {
    const response = await api.delete(`/chat/${chatId}`);
    return response.data;
  },

  /**
   * Clear all chat history
   */
  clearHistory: async () => {
    const response = await api.delete('/chat/history/clear');
    return response.data;
  },

  /**
   * Get chat statistics
   */
  getStats: async () => {
    const response = await api.get('/chat/stats');
    return response.data;
  },
};

// Search API
export const searchApi = {
  /**
   * Hybrid Search
   */
  hybrid: async (query: string, limit: number = 10) => {
    const response = await api.post('/search/hybrid', { query, limit });
    return response.data?.data?.results || response.data?.results || [];
  },

  /**
   * Vector Search
   */
  vector: async (query: string, limit: number = 10) => {
    const response = await api.post('/search/vector', { query, limit });
    return response.data?.data?.results || response.data?.results || [];
  },

  /**
   * Keyword Search
   */
  keyword: async (query: string, limit: number = 10) => {
    const response = await api.post('/search/keyword', { query, limit });
    return response.data?.data?.results || response.data?.results || [];
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

// PDF Toolkit API
export const pdfToolkitApi = {
  /**
   * Merge multiple PDF files
   */
  merge: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await api.post('/pdf-toolkit/merge', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    });

    return response.data;
  },

  /**
   * Split a PDF file
   */
  split: async (file: File, ranges: { start: number; end: number }[]) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ranges', JSON.stringify(ranges));

    const response = await api.post('/pdf-toolkit/split', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    });

    return response.data;
  },

  /**
   * Convert images to a single PDF
   */
  convert: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await api.post('/pdf-toolkit/convert', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    });

    return response.data;
  },
};

// Resume Analyzer API
export const resumeAnalyzerApi = {
  /**
   * Analyze a resume against a job description
   */
  analyze: async (file: File, jobDescription: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jobDescription);

    const response = await api.post('/resume-analyzer/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

// AI Content Detector API
export const aiDetectorApi = {
  /**
   * Analyze text for AI content indicators
   */
  analyze: async (text: string) => {
    const response = await api.post('/ai-detector/analyze', { text });
    return response.data;
  },
};

// RAGAS Evaluation API
export const ragEvalApi = {
  /**
   * Trigger RAGAS evaluation run
   */
  evaluate: async () => {
    const response = await api.post('/rag/evaluate');
    return response.data;
  },

  /**
   * Get previous RAGAS evaluation benchmarks history
   */
  getHistory: async () => {
    const response = await api.get('/rag/evaluate/results');
    return response.data;
  },
};
