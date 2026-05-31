'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { documentApi, Document } from '../lib/api';

interface DocumentUploadProps {
  onUploadSuccess?: (document: Document) => void;
  onUploadError?: (error: string) => void;
}

export function DocumentUpload({ onUploadSuccess, onUploadError }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      setMessage({ type: 'error', text: 'No file selected' });
      return;
    }

    const file = acceptedFiles[0];

    // Validate file type
    if (file.type !== 'application/pdf') {
      const errorMsg = 'Only PDF files are allowed';
      setMessage({ type: 'error', text: errorMsg });
      onUploadError?.(errorMsg);
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      const errorMsg = 'File size must be less than 50MB';
      setMessage({ type: 'error', text: errorMsg });
      onUploadError?.(errorMsg);
      return;
    }

    setUploading(true);
    setMessage(null);
    setUploadProgress(0);

    try {
      // Simulate progress (since we don't have real progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await documentApi.upload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        const successMsg = `✓ ${response.message}`;
        setMessage({ type: 'success', text: successMsg });
        onUploadSuccess?.(response.document);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      const errorMsg = `✗ Upload failed: ${error.response?.data?.message || error.message}`;
      setMessage({ type: 'error', text: errorMsg });
      onUploadError?.(errorMsg);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, [onUploadSuccess, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          p-12 border-2 border-dashed rounded-lg text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {/* Upload Icon */}
          <div className="flex justify-center">
            <svg
              className={`w-16 h-16 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Text */}
          {uploading ? (
            <div>
              <p className="text-lg font-semibold text-blue-600">Uploading...</p>
              <p className="text-sm text-gray-500 mt-1">Please wait</p>
            </div>
          ) : isDragActive ? (
            <div>
              <p className="text-lg font-semibold text-blue-600">Drop PDF here</p>
              <p className="text-sm text-gray-500 mt-1">Release to upload</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-semibold text-gray-700">
                Drag & drop PDF here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to select file
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Maximum file size: 50MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {uploadProgress > 0 && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 text-center mt-2">
            {uploadProgress}%
          </p>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`
            mt-4 p-4 rounded-lg
            ${message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
            }
          `}
        >
          <p className="font-semibold">{message.text}</p>
        </div>
      )}
    </div>
  );
}
