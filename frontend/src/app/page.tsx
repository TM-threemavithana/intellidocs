'use client';

import { useState } from 'react';
import { DocumentUpload } from '../components/DocumentUpload';
import { OCRResults } from '../components/OCRResults';
import { JobStatus } from '../components/JobStatus';
import { Document } from '../lib/api';

export default function Home() {
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            IntelliDocs AI
          </h1>
          <p className="text-lg text-gray-600">
            Multi-language OCR with CER/WER Evaluation
          </p>
          
          {/* Navigation */}
          <div className="mt-6 flex justify-center gap-4">
            <a
              href="/"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📄 Document Upload
            </a>
            <a
              href="/chat"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              💬 Chat with Documents
            </a>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Upload Section */}
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

          {/* Job Status Section */}
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

          {/* Results Section */}
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

        {/* Features Section */}
        {!uploadedDocument && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl mb-3">🌍</div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Multi-language Support
              </h3>
              <p className="text-sm text-gray-600">
                Supports English, Sinhala, Tamil, Chinese, and Japanese
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Accuracy Metrics
              </h3>
              <p className="text-sm text-gray-600">
                CER and WER evaluation for quality assessment
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Fast Processing
              </h3>
              <p className="text-sm text-gray-600">
                Asynchronous OCR with real-time progress tracking
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>IntelliDocs AI - Week 2-3 OCR Pipeline Implementation</p>
        </div>
      </div>
    </main>
  );
}
