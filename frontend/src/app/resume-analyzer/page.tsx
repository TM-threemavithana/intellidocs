'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/features/auth/ProtectedRoute';
import { resumeAnalyzerApi } from '@/lib/api';

interface SectionFeedback {
  name: string;
  present: boolean;
  feedback: string;
}

interface AnalysisResult {
  score: number;
  sections: SectionFeedback[];
  keywords: {
    matched: string[];
    missing: string[];
  };
  recommendations: string[];
}

export default function ResumeAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload a PDF CV/resume file');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please input the job description');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await resumeAnalyzerApi.analyze(file, jobDescription);
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze resume. Make sure local Ollama is running.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 border-green-500';
    if (score >= 50) return 'text-yellow-600 border-yellow-500';
    return 'text-red-600 border-red-500';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              🎯 ATS Resume Analyzer
            </h1>
            <p className="mt-3 text-lg text-gray-500">
              Score your resume against any job description and get detailed AI feedback to land interviews.
            </p>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column - Input Form */}
            <div className={`${result ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all duration-300`}>
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6">
                <h2 className="text-xl font-bold text-gray-800">Job Details & CV</h2>
                
                {error && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-semibold">
                    ⚠️ {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload Resume (PDF format)
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="w-full text-sm text-gray-505 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {file && (
                      <p className="mt-2 text-xs text-gray-500 font-medium">
                        📄 Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {/* Job Description Text */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Job Description
                    </label>
                    <textarea
                      rows={8}
                      placeholder="Paste the target job description details here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-md font-semibold text-white shadow transition-all duration-200 ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.01]'
                    }`}
                  >
                    {loading ? 'Analyzing with AI...' : '🎯 Run ATS Audit'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column - Results Dashboard */}
            {result && (
              <div className="lg:col-span-7 space-y-6 animate-fade-in">
                {/* Score and Overview */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col md:flex-row items-center gap-8">
                  {/* Score circle */}
                  <div className={`w-28 h-28 rounded-full border-8 flex items-center justify-center ${getScoreColor(result.score)}`}>
                    <div className="text-center">
                      <span className="text-3xl font-extrabold">{result.score}</span>
                      <span className="text-xs block font-bold text-gray-400">ATS SCORE</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-gray-800">ATS Match Analysis</h3>
                    <p className="text-sm text-gray-500">
                      {result.score >= 80
                        ? '🎉 Strong match! Your resume matches the job profile very well.'
                        : result.score >= 50
                        ? '📈 Moderate match. Consider adding the missing keywords and resolving formatting gaps.'
                        : '⚠️ Low compatibility. High risk of rejection by automated screening filters.'}
                    </p>
                  </div>
                </div>

                {/* Section checklist */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Section Check</h3>
                  <div className="space-y-3">
                    {result.sections.map((sect, idx) => (
                      <div key={idx} className="flex gap-3 text-sm border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                        <span className="text-base">{sect.present ? '✅' : '❌'}</span>
                        <div>
                          <h4 className="font-bold text-gray-700">{sect.name}</h4>
                          <p className="text-gray-500 text-xs mt-0.5">{sect.feedback}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h3 className="text-base font-bold text-green-700 mb-3">Matched Keywords ({result.keywords.matched.length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.matched.map((kw, i) => (
                        <span key={i} className="text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded border border-green-200">
                          {kw}
                        </span>
                      ))}
                      {result.keywords.matched.length === 0 && (
                        <span className="text-xs text-gray-400">No matching keywords detected.</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h3 className="text-base font-bold text-amber-700 mb-3">Missing Keywords ({result.keywords.missing.length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.missing.map((kw, i) => (
                        <span key={i} className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded border border-amber-200">
                          {kw}
                        </span>
                      ))}
                      {result.keywords.missing.length === 0 && (
                        <span className="text-xs text-gray-450">Excellent! No critical missing keywords.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Improvement Recommendations</h3>
                  <ul className="space-y-3 text-sm text-gray-655 list-disc pl-5">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="leading-relaxed">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            )}

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
