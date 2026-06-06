'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/features/auth/ProtectedRoute';
import { pdfToolkitApi } from '@/lib/api';

type ToolMode = 'merge' | 'split' | 'convert';

export default function PdfToolkitPage() {
  const [mode, setMode] = useState<ToolMode>('merge');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for Merge PDFs
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);

  // States for Split PDF
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState<{ start: number; end: number }[]>([{ start: 1, end: 1 }]);

  // States for Image to PDF
  const [convertFiles, setConvertFiles] = useState<File[]>([]);

  const handleMergeFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMergeFiles(Array.from(e.target.files));
      setError(null);
    }
  };

  const handleSplitFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSplitFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleConvertFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      const selectedFiles = Array.from(e.target.files);
      const invalid = selectedFiles.some(f => !allowedTypes.includes(f.type));
      if (invalid) {
        setError('Only PNG and JPEG images are allowed');
        return;
      }
      setConvertFiles(selectedFiles);
      setError(null);
    }
  };

  const triggerDownload = (blob: Blob, defaultFilename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', defaultFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mergeFiles.length < 2) {
      setError('Please select at least two PDF files to merge');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const blob = await pdfToolkitApi.merge(mergeFiles);
      triggerDownload(blob, 'merged_document.pdf');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to merge PDF files.');
    } finally {
      setLoading(false);
    }
  };

  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitFile) {
      setError('Please select a PDF file to split');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const blob = await pdfToolkitApi.split(splitFile, ranges);
      const filename = ranges.length === 1 ? 'split_pages.pdf' : 'split_documents.zip';
      triggerDownload(blob, filename);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to split PDF file.');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (convertFiles.length === 0) {
      setError('Please select at least one image file to convert');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const blob = await pdfToolkitApi.convert(convertFiles);
      triggerDownload(blob, 'converted_images.pdf');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to convert images.');
    } finally {
      setLoading(false);
    }
  };

  const addRange = () => {
    setRanges([...ranges, { start: 1, end: 1 }]);
  };

  const updateRange = (index: number, key: 'start' | 'end', val: number) => {
    const newRanges = [...ranges];
    newRanges[index][key] = val;
    setRanges(newRanges);
  };

  const removeRange = (index: number) => {
    if (ranges.length > 1) {
      setRanges(ranges.filter((_, i) => i !== index));
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              🛠️ PDF Toolkit
            </h1>
            <p className="mt-3 text-lg text-gray-500">
              Split, merge, or convert your documents in seconds using secure local tools.
            </p>
          </div>

          {/* Mode Selector Tab Bar */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-150 p-1.5 rounded-lg inline-flex border border-gray-250">
              <button
                onClick={() => { setMode('merge'); setError(null); }}
                className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                  mode === 'merge'
                    ? 'bg-white text-blue-700 shadow-md scale-102'
                    : 'text-gray-650 hover:text-gray-900'
                }`}
              >
                🔗 Merge PDFs
              </button>
              <button
                onClick={() => { setMode('split'); setError(null); }}
                className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                  mode === 'split'
                    ? 'bg-white text-blue-700 shadow-md scale-102'
                    : 'text-gray-650 hover:text-gray-900'
                }`}
              >
                ✂️ Split PDF
              </button>
              <button
                onClick={() => { setMode('convert'); setError(null); }}
                className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                  mode === 'convert'
                    ? 'bg-white text-blue-700 shadow-md scale-102'
                    : 'text-gray-650 hover:text-gray-900'
                }`}
              >
                🖼️ Images to PDF
              </button>
            </div>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Active Tool Form Container */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            
            {/* Merge PDFs Mode */}
            {mode === 'merge' && (
              <form onSubmit={handleMergeSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select PDF Documents to Merge
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleMergeFilesChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 file:cursor-pointer hover:file:bg-blue-100"
                  />
                </div>

                {mergeFiles.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Selected Files ({mergeFiles.length}):</h4>
                    <ul className="space-y-2">
                      {mergeFiles.map((file, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm text-gray-600 bg-white p-2.5 rounded border border-gray-150">
                          <span>📄 {file.name}</span>
                          <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || mergeFiles.length < 2}
                  className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all ${
                    loading || mergeFiles.length < 2
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:scale-[1.01]'
                  }`}
                >
                  {loading ? 'Merging PDF Files...' : '🔗 Download Merged PDF'}
                </button>
              </form>
            )}

            {/* Split PDF Mode */}
            {mode === 'split' && (
              <form onSubmit={handleSplitSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select PDF Document to Split
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleSplitFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 file:cursor-pointer hover:file:bg-blue-100"
                  />
                  {splitFile && (
                    <p className="mt-2 text-xs text-gray-500">
                      File: 📄 {splitFile.name} ({(splitFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-gray-700">
                      Page Ranges (1-Indexed)
                    </label>
                    <button
                      type="button"
                      onClick={addRange}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      ➕ Add Range
                    </button>
                  </div>

                  {ranges.map((range, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-150">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">From</span>
                        <input
                          type="number"
                          min="1"
                          value={range.start}
                          onChange={(e) => updateRange(idx, 'start', parseInt(e.target.value) || 1)}
                          className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">To</span>
                        <input
                          type="number"
                          min="1"
                          value={range.end}
                          onChange={(e) => updateRange(idx, 'end', parseInt(e.target.value) || 1)}
                          className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRange(idx)}
                        disabled={ranges.length === 1}
                        className={`text-sm text-red-500 hover:text-red-700 ${
                          ranges.length === 1 ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || !splitFile}
                  className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all ${
                    loading || !splitFile
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:scale-[1.01]'
                  }`}
                >
                  {loading ? 'Splitting PDF...' : '✂️ Download Split Documents'}
                </button>
              </form>
            )}

            {/* Convert to PDF Mode */}
            {mode === 'convert' && (
              <form onSubmit={handleConvertSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Images to Convert (PNG / JPEG)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleConvertFilesChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 file:cursor-pointer hover:file:bg-blue-100"
                  />
                </div>

                {convertFiles.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Selected Images ({convertFiles.length}):</h4>
                    <ul className="space-y-2">
                      {convertFiles.map((file, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm text-gray-600 bg-white p-2.5 rounded border border-gray-150">
                          <span>🖼️ {file.name}</span>
                          <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || convertFiles.length === 0}
                  className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all ${
                    loading || convertFiles.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:scale-[1.01]'
                  }`}
                >
                  {loading ? 'Converting Images...' : '🖼️ Download Generated PDF'}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
