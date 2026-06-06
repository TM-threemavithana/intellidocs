'use client';

import { useState } from 'react';
import { useAuth, useRequireAuth } from '@/lib/hooks/useAuth';
import { DocumentUpload } from '../components/features/documents/DocumentUpload';
import { OCRResults } from '../components/features/documents/OCRResults';
import { JobStatus } from '../components/features/documents/JobStatus';
import { Document } from '../lib/api';
import Link from 'next/link';

export default function Home() {
  const { user } = useAuth();
  const { isLoading } = useRequireAuth();
  const [uploadedDocument, setUploadedDocument] = useState<Document | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleUploadSuccess = (document: Document) => {
    setUploadedDocument(document);
    setShowResults(false);
  };

  const handleJobComplete = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setUploadedDocument(null);
    setShowResults(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-lg text-gray-600">
              Upload and manage your documents with AI
            </p>
          </div>

          <div className="space-y-8">
            {!uploadedDocument && (
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Upload Document
                </h2>
                <DocumentUpload
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={(error) => console.error(error)}
                />
              </div>
            )}

            {uploadedDocument && !showResults && (
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      Processing Document
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {uploadedDocument.fileName}
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Upload Another
                  </button>
                </div>

                <JobStatus
                  documentId={uploadedDocument.id}
                  onComplete={handleJobComplete}
                  autoRefresh={true}
                  refreshInterval={2000}
                />

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">ℹ️ Processing:</span> Your document is being processed with Tesseract OCR. 
                    This may take a few moments depending on the document size.
                  </p>
                </div>
              </div>
            )}

            {uploadedDocument && showResults && (
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    OCR Results
                  </h2>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Upload Another Document
                  </button>
                </div>

                <OCRResults
                  documentId={uploadedDocument.id}
                  documentName={uploadedDocument.fileName}
                />
              </div>
            )}
          </div>

          {!uploadedDocument && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
              <Link
                href="/documents"
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-3">📄</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  My Documents
                </h3>
                <p className="text-sm text-gray-600">
                  View and manage all uploaded documents
                </p>
              </Link>

              <Link
                href="/chat"
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-3">💬</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Chat with Docs
                </h3>
                <p className="text-sm text-gray-600">
                  Ask questions about your documents
                </p>
              </Link>

              <Link
                href="/search"
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-3">🔍</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Smart Search
                </h3>
                <p className="text-sm text-gray-600">
                  Search across all documents with AI
                </p>
              </Link>

              <Link
                href="/profile"
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-3">👤</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Profile
                </h3>
                <p className="text-sm text-gray-600">
                  Manage your account settings
                </p>
              </Link>
            </div>
          )}

          <div className="mt-12 text-center text-sm text-gray-500">
            <p>IntelliDocs AI - Intelligent Document Management System</p>
          </div>
        </div>
      </main>
  );
}
