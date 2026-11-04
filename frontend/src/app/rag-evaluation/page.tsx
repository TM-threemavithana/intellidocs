'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/features/auth/ProtectedRoute';
import { ragEvalApi } from '@/lib/api';

interface DetailReport {
  question: string;
  generatedAnswer: string;
  groundTruth: string;
  faithfulness: number;
  relevance: number;
  recall: number;
  precision: number;
  reasoning: string;
}

interface EvaluationRecord {
  id: string;
  timestamp: string;
  faithfulness: number;
  relevance: number;
  recall: number;
  precision: number;
  averageScore: number;
  testCasesCount: number;
  details: DetailReport[];
}

export default function RagEvaluationPage() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  const [activeReport, setActiveReport] = useState<EvaluationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DetailReport | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await ragEvalApi.getHistory();
      if (response.success && response.data) {
        setHistory(response.data);
        setActiveReport((prev) => (!prev && response.data.length > 0 ? response.data[0] : prev));
      }
    } catch (err: any) {
      console.error('Failed to retrieve history', err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRunEvaluation = async () => {
    setLoading(true);
    setError(null);
    setSelectedDetail(null);

    try {
      const response = await ragEvalApi.evaluate();
      if (response.success && response.data) {
        setActiveReport(response.data);
        fetchHistory();
      } else {
        throw new Error('Evaluation benchmarking failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to benchmark RAG. Make sure local Ollama is running.');
    } finally {
      setLoading(false);
    }
  };

  const getMetricColor = (score: number) => {
    if (score >= 80) return 'text-green-650 border-green-500 bg-green-50';
    if (score >= 50) return 'text-yellow-650 border-yellow-500 bg-yellow-50';
    return 'text-red-650 border-red-500 bg-red-50';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                ⚖️ RAGAS Evaluation Framework
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Benchmark the quality of retrieval, context correctness, and faithfulness of generated answers using Ollama local audits.
              </p>
            </div>
            <div>
              <button
                onClick={handleRunEvaluation}
                disabled={loading}
                className={`py-3 px-6 rounded-lg font-bold text-white shadow-md transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01]'
                }`}
              >
                {loading ? '🧮 Benchmarking Pipeline...' : '🎯 Run RAGAS Benchmark'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-semibold">
              ⚠️ {error}
            </div>
          )}

          {activeReport ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Dashboard Side (Scores and breakdown) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Overall Score */}
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6 flex flex-col md:flex-row items-center gap-8">
                  <div className={`w-28 h-28 rounded-full border-8 flex items-center justify-center ${getMetricColor(activeReport.averageScore)}`}>
                    <div className="text-center">
                      <span className="text-3xl font-extrabold">{activeReport.averageScore}%</span>
                      <span className="text-[10px] block font-bold text-gray-400">RAGAS SCORE</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1 text-center md:text-left">
                    <h3 className="text-xl font-bold text-gray-800">Benchmark Diagnostics</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      This score represents the composite average quality index of context precision, context recall, faithfulness, and answer relevance.
                    </p>
                    <p className="text-xs text-gray-400 font-medium">Evaluated Run: {new Date(activeReport.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                {/* 4 Core Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                    <span className="text-2xl font-extrabold text-teal-600 block">{activeReport.faithfulness}%</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Faithfulness</span>
                  </div>
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                    <span className="text-2xl font-extrabold text-blue-600 block">{activeReport.relevance}%</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Answer Relevance</span>
                  </div>
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                    <span className="text-2xl font-extrabold text-indigo-600 block">{activeReport.precision}%</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Context Precision</span>
                  </div>
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                    <span className="text-2xl font-extrabold text-purple-600 block">{activeReport.recall}%</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Context Recall</span>
                  </div>
                </div>

                {/* Question Breakdown List */}
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">Benchmark Q&A Breakdowns</h3>
                  <p className="text-xs text-gray-400 font-medium">Select a question to inspect the generation, expected ground truths, and evaluation audits.</p>
                  
                  <div className="space-y-3">
                    {activeReport.details.map((detail, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedDetail(detail)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-150 hover:bg-gray-50 ${
                          selectedDetail?.question === detail.question ? 'border-indigo-500 bg-indigo-50/20' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <h4 className="text-sm font-bold text-gray-700">{detail.question}</h4>
                        <div className="flex gap-4 mt-2.5 text-xs font-semibold text-gray-400">
                          <span>Faithfulness: <span className="text-teal-600">{detail.faithfulness}%</span></span>
                          <span>Relevance: <span className="text-blue-600">{detail.relevance}%</span></span>
                          <span>Precision: <span className="text-indigo-600">{detail.precision}%</span></span>
                          <span>Recall: <span className="text-purple-600">{detail.recall}%</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diagnostics details */}
                {selectedDetail && (
                  <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4 animate-fade-in">
                    <h3 className="text-lg font-bold text-gray-800">Linguistic Forensics Details</h3>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">Ground Truth Expected Answer</span>
                        <p className="text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-150 italic">"{selectedDetail.groundTruth}"</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">RAG Pipeline Generated Answer</span>
                        <p className="text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-150 font-medium">"{selectedDetail.generatedAnswer}"</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">Metric Diagnostics Reasoning</span>
                        <p className="text-gray-655 font-mono text-xs whitespace-pre-wrap leading-relaxed bg-gray-900 text-gray-100 p-3 rounded">
                          {selectedDetail.reasoning}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* History Side */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Historical Evaluations</h3>
                  <div className="space-y-3">
                    {history.map((record, index) => (
                      <div
                        key={record.id}
                        onClick={() => setActiveReport(record)}
                        className={`p-3.5 border rounded-lg cursor-pointer transition-all duration-150 hover:bg-gray-50 ${
                          activeReport.id === record.id ? 'border-indigo-500 bg-indigo-50/10' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-gray-400">Run #{history.length - index}</span>
                          <span className="text-xs text-gray-500">{new Date(record.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700">Avg Quality score:</span>
                          <span className="text-base font-extrabold text-indigo-600">{record.averageScore}%</span>
                        </div>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No evaluations logged yet.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center space-y-4">
              <span className="text-5xl block">📊</span>
              <h3 className="text-xl font-bold text-gray-800">No RAGAS Benchmark Performed</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                Click the run button to perform a complete test suite check against standard QA data and score contexts and relevance.
              </p>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
