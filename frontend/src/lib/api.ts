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
