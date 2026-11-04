'use client';

import { ProtectedRoute } from '@/components/features/auth/ProtectedRoute';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { documentApi, Document } from '@/lib/api';

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError('');
      const docs = await documentApi.getAll();
      setDocuments(docs || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      setActionMessage(`Downloading ${doc.fileName}...`);
      await documentApi.download(doc.id, doc.fileName);
      setActionMessage('');
    } catch (err: any) {
      setError(`Failed to download ${doc.fileName}`);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Are you sure you want to permanently delete "${doc.fileName}"? This will remove its vectors and OCR data.`)) {
      return;
    }

    try {
      setDeletingId(doc.id);
      setError('');
      await documentApi.delete(doc.id);
      setActionMessage(`Successfully deleted "${doc.fileName}"`);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to delete ${doc.fileName}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
              <p className="text-gray-600 mt-2">Manage, download, search, and chat with your uploaded PDF documents</p>
            </div>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
            >
              + Upload Document
            </Link>
          </div>

          {actionMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
              <span>{actionMessage}</span>
              <button type="button" onClick={() => setActionMessage('')} className="text-green-600 font-bold">&times;</button>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="text-red-600 font-bold">&times;</button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
              <div className="text-6xl mb-4">📄</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No documents yet</h2>
              <p className="text-gray-600 mb-6">Upload your first document to enable OCR, semantic search, and RAG chat</p>
              <Link
                href="/"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
              >
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">📄</div>
                      {doc.ocrApplied ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          OCR Processed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Processing OCR
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-2 truncate" title={doc.fileName}>
                      {doc.fileName}
                    </h3>

                    <div className="space-y-1 text-sm text-gray-600 mb-6">
                      <p>📊 {doc.pageCount} pages</p>
                      <p>💾 {formatFileSize(doc.fileSize)}</p>
                      <p>📅 {new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <Link
                      href={`/chat?doc=${doc.id}`}
                      className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      💬 Chat
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      title="Download PDF"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      ⬇️ Download
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      title="Delete document"
                      className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === doc.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
