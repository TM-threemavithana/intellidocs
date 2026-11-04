'use client';

import { ProtectedRoute } from '@/components/features/auth/ProtectedRoute';
import { useState } from 'react';
import Link from 'next/link';
import { searchApi, SearchResult } from '@/lib/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'hybrid' | 'vector' | 'keyword'>('hybrid');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setSearched(true);

    try {
      const searchFn = searchApi[searchType];
      const searchResults = await searchFn(query.trim(), 10);
      setResults(searchResults || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Search Documents</h1>
            <p className="text-gray-600 mt-2">
              Find key information across all your uploaded documents using hybrid semantic and keyword retrieval
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <form onSubmit={handleSearch}>
              <div className="mb-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for terms, questions, or conceptual topics..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  disabled={isSearching}
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex gap-2">
                  {(['hybrid', 'vector', 'keyword'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSearchType(type)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        searchType === type
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'hybrid' ? '⚡ Hybrid' : type === 'vector' ? '🧠 Vector' : '🔤 Keyword'}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !query.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {isSearching ? 'Searching...' : '🔍 Search'}
                </button>
              </div>
            </form>
          </div>

          {/* Search Results */}
          {isSearching ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Retrieving matching passages...</p>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No matching results found</h2>
              <p className="text-gray-600">Try rephrasing your query or switching between Hybrid and Keyword modes.</p>
            </div>
          ) : results.length > 0 ? (
            <div>
              <p className="text-gray-600 mb-4 font-medium">{results.length} relevant passages retrieved</p>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📄</span>
                        <h3 className="font-semibold text-gray-900">{result.documentName}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium">Page {result.pageNumber || 1}</span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {Math.round((result.score || 0) * 100)}% match
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100 mb-3">
                      {result.chunkText}
                    </p>
                    <div className="flex justify-end">
                      <Link
                        href={`/chat?doc=${result.documentId}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        Ask questions about this document &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}
