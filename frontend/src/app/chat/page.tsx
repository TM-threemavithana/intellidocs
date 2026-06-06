'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/features/auth/ProtectedRoute';
import Chat from '@/components/features/chat/Chat';

export default function ChatPage() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();

  return (
    <ProtectedRoute>
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
                <h3 className="font-semibold mb-3">Documents</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedDocumentId(undefined)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      !selectedDocumentId
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    All Documents
                  </button>
                  <button
                    onClick={() => setSelectedDocumentId('cmq25hc2s000176twan8gx1ui')}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedDocumentId === 'cmq25hc2s000176twan8gx1ui'
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    📄 ML Document
                  </button>
                </div>

                {/* Info Box */}
                <div className="mt-6 p-3 bg-blue-50 rounded text-xs text-gray-700">
                  <p className="font-semibold mb-1">💡 How it works:</p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>Ask questions about your documents</li>
                    <li>AI finds relevant content</li>
                    <li>Get answers with citations</li>
                    <li>View source pages</li>
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
            <h3 className="font-semibold mb-3">💬 Example Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                'What is deep learning?',
                'How do neural networks work?',
                'Explain natural language processing',
                'What are the types of machine learning?',
                'What is a transformer model?',
                'How does reinforcement learning work?',
              ].map((question, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  "{question}"
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
