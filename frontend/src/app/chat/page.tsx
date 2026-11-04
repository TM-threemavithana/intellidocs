'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/features/auth/ProtectedRoute';
import Chat from '@/components/features/chat/Chat';
import { documentApi, Document } from '@/lib/api';

function ChatContent() {
  const searchParams = useSearchParams();
  const docParam = searchParams.get('doc');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(docParam || undefined);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    if (docParam) {
      setSelectedDocumentId(docParam);
    }
  }, [docParam]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const docs = await documentApi.getAll();
      setDocuments(docs || []);
    } catch (err) {
      console.error('Failed to load documents for chat:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Document Chat</h1>
          <p className="text-gray-600 mt-2">
            Ask questions about your documents and get AI-powered answers with citations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Document Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Documents</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                  {documents.length}
                </span>
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDocumentId(undefined)}
                  className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                    !selectedDocumentId
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  🌐 All Documents
                </button>

                {loadingDocs ? (
                  <div className="py-4 text-center text-xs text-gray-500">Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-400">
                    No documents uploaded yet.
                  </div>
                ) : (
                  documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDocumentId(doc.id)}
                      title={doc.fileName}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                        selectedDocumentId === doc.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="truncate pr-2">📄 {doc.fileName}</span>
                      <span className="text-xs opacity-75 whitespace-nowrap">{doc.pageCount}p</span>
                    </button>
                  ))
                )}
              </div>

              {/* Info Box */}
              <div className="mt-6 p-3 bg-blue-50 rounded text-xs text-gray-700">
                <p className="font-semibold mb-1">💡 How it works:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Ask questions grounded in uploaded docs</li>
                  <li>Semantic search retrieves top passages</li>
                  <li>Answers include verifiable citations</li>
                  <li>Click citations to trace exact source pages</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3 h-[calc(100vh-200px)]">
            <Chat documentId={selectedDocumentId} />
          </div>
        </div>

        {/* Example Questions */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-3">💬 Suggested Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              'What is the key takeaway from the uploaded document?',
              'Summarize the methodology or key steps explained in the text.',
              'What metrics or benchmarks are reported in this file?',
              'Explain the core terminology and concepts introduced.',
              'Are there any limitations or recommendations stated?',
              'Provide an executive summary with bullet points.',
            ].map((question, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                &ldquo;{question}&rdquo;
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading chat workspace...</div>}>
        <ChatContent />
      </Suspense>
    </ProtectedRoute>
  );
}
