'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/features/auth/ProtectedRoute';
import { aiDetectorApi } from '@/lib/api';

interface SentenceAnalysis {
  text: string;
  aiProbability: number;
  reason: string;
}

interface DetectionResult {
  score: number; // Overall AI Likelihood (0-100)
  perplexity: number;
  burstiness: number;
  readability: number;
  sentences: SentenceAnalysis[];
  report: string;
}

export default function AiDetectorPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<SentenceAnalysis | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please provide text to analyze');
      return;
    }
    if (text.trim().length < 100) {
      setError('Text must be at least 100 characters long');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedSentence(null);

    try {
      const response = await aiDetectorApi.analyze(text);
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze text. Make sure local Ollama is running.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-650 border-red-500 bg-red-50';
    if (score >= 40) return 'text-amber-650 border-amber-500 bg-amber-50';
    return 'text-green-650 border-green-500 bg-green-50';
  };

  const getSentenceBg = (prob: number) => {
    if (prob >= 75) return 'bg-red-100 hover:bg-red-200 cursor-pointer border-b border-red-350';
    if (prob >= 40) return 'bg-amber-100 hover:bg-amber-200 cursor-pointer border-b border-amber-350';
    return 'hover:bg-gray-100 cursor-pointer';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              🤖 AI Content & Plagiarism Detector
            </h1>
            <p className="mt-3 text-lg text-gray-500">
              Verify if your writing contains predictable patterns, low burstiness, or robotic phrasing typical of LLMs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input Side */}
            <div className={`${result ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all duration-300`}>
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6">
                <h2 className="text-xl font-bold text-gray-800">Analyze Document</h2>

                {error && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-semibold">
                    ⚠️ {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Input Content (min. 100 characters)
                    </label>
                    <textarea
                      rows={12}
                      placeholder="Paste your report, essay, or email body copy here..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-sans leading-relaxed"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1 font-medium">
                      <span>Word Count: {text.trim().split(/\s+/).filter(Boolean).length}</span>
                      <span>Characters: {text.length}</span>
                    </div>
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
                    {loading ? 'Performing Forensic Audit...' : '🔍 Check for AI Patterns'}
                  </button>
                </form>
              </div>
            </div>

            {/* Results Side */}
            {result && (
              <div className="lg:col-span-7 space-y-6 animate-fade-in">
                {/* Likelihood Gauge */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col md:flex-row items-center gap-8">
                  <div className={`w-28 h-28 rounded-full border-8 flex items-center justify-center ${getScoreColor(result.score)}`}>
                    <div className="text-center">
                      <span className="text-3xl font-extrabold">{result.score}%</span>
                      <span className="text-[10px] block font-bold text-gray-400">AI SCORE</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-center md:text-left flex-1">
                    <h3 className="text-2xl font-bold text-gray-800">AI Likelihood Index</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {result.score >= 70
                        ? '🚨 High confidence! The phrasing, vocabulary diversity, and sentence uniformity highly resemble generative AI text.'
                        : result.score >= 40
                        ? '⚖️ Mixed authorship. Text shows some structured formulaic choices. Check highlighted sentences.'
                        : '🌿 Highly likely human! Text showcases natural burstiness and rich lexical entropy.'}
                    </p>
                  </div>
                </div>

                {/* Dashboard Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                    <span className="text-2xl font-extrabold text-blue-600 block">{result.perplexity}%</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Vocabulary Entropy</span>
                  </div>
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                    <span className="text-2xl font-extrabold text-indigo-600 block">{result.burstiness}%</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Sentence Burstiness</span>
                  </div>
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                    <span className="text-2xl font-extrabold text-teal-600 block">{result.readability}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Flesch Readability</span>
                  </div>
                </div>

                {/* Highlighted Document Screen */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">Sentence-by-Sentence Scan</h3>
                  <p className="text-xs text-gray-400 font-medium">Click on highlighted sentences to see AI forensic reasons.</p>
                  
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-60 overflow-y-auto text-sm leading-relaxed text-gray-800 font-sans">
                    {result.sentences.map((sentence, idx) => (
                      <span
                        key={idx}
                        onClick={() => setSelectedSentence(sentence)}
                        className={`inline-block mr-1 rounded-sm px-0.5 transition-colors duration-150 ${getSentenceBg(sentence.aiProbability)}`}
                      >
                        {sentence.text}{' '}
                      </span>
                    ))}
                  </div>

                  {selectedSentence && (
                    <div className="p-4 bg-blue-50 border border-blue-150 rounded-lg animate-fade-in space-y-1">
                      <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Linguistic Diagnostics</h4>
                      <p className="text-sm text-gray-700 italic">"{selectedSentence.text}"</p>
                      <p className="text-xs text-blue-700 font-semibold mt-1">
                        AI Probability: {selectedSentence.aiProbability}% — {selectedSentence.reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Detailed Report */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">AI Forensics Audit Report</h3>
                  <p className="text-sm text-gray-650 leading-relaxed font-sans whitespace-pre-line">
                    {result.report}
                  </p>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
