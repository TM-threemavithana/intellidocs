'use client';

import { useEffect, useState } from 'react';
import { documentApi, OCRPage } from '@/lib/api';

interface OCRResultsProps {
  documentId: string;
  documentName?: string;
}

export function OCRResults({ documentId, documentName }: OCRResultsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<{
    document: {
      id: string;
      fileName: string;
      pageCount: number;
      ocrApplied: boolean;
    };
    pages: OCRPage[];
  } | null>(null);

  useEffect(() => {
    const fetchOCRResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await documentApi.getOCRResults(documentId);
        
        if (response.success) {
          setOcrData(response);
        } else {
          setError('Failed to fetch OCR results');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch OCR results');
      } finally {
        setLoading(false);
      }
    };

    fetchOCRResults();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading OCR results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-semibold">❌ Error</p>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!ocrData || ocrData.pages.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 font-semibold">⚠️ No OCR Results</p>
        <p className="text-yellow-600 mt-1">
          OCR processing may still be in progress. Please check back in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">OCR Results</h2>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
          <span>📄 {ocrData.document.fileName}</span>
          <span>•</span>
          <span>{ocrData.document.pageCount} pages</span>
          <span>•</span>
          <span className={ocrData.document.ocrApplied ? 'text-green-600' : 'text-yellow-600'}>
            {ocrData.document.ocrApplied ? '✓ OCR Complete' : '⏳ Processing'}
          </span>
        </div>
      </div>

      {/* Pages */}
      <div className="space-y-4">
        {ocrData.pages.map((page) => (
          <div
            key={page.pageNumber}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            {/* Page Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Page {page.pageNumber}
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  Language: <span className="font-mono font-semibold">{page.language}</span>
                </span>
                <span className="text-gray-600">
                  Confidence: <span className="font-semibold text-blue-600">
                    {page.confidence?.toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>

            {/* Extracted Text */}
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {page.text || '(No text extracted)'}
              </p>
            </div>

            {/* Metrics (if available) */}
            {(page.cerScore !== null || page.werScore !== null) && (
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Accuracy Metrics:
                </p>
                <div className="flex gap-6 text-sm">
                  {page.cerScore !== null && (
                    <div>
                      <span className="text-gray-600">CER:</span>{' '}
                      <span className="font-mono font-semibold text-blue-700">
                        {(page.cerScore * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {page.werScore !== null && (
                    <div>
                      <span className="text-gray-600">WER:</span>{' '}
                      <span className="font-mono font-semibold text-blue-700">
                        {(page.werScore * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">{ocrData.pages.length}</span> page(s) processed
        </p>
      </div>
    </div>
  );
}
