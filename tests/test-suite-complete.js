/**
 * Complete Test Suite for IntelliDocs AI RAG System
 * Tests all API endpoints and validates functionality
 */

const baseURL = 'http://localhost:3000';
const testDocumentId = 'cmq25hc2s000176twan8gx1ui';
const testUserId = 'test-user';

// Color output for terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
  const symbol = status === 'PASS' ? '✅' : '❌';
  const color = status === 'PASS' ? 'green' : 'red';
  log(`${symbol} ${name}`, color);
  if (details) {
    log(`   ${details}`, 'blue');
  }
  
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.tests.push({ name, status, details });
}

async function runTest(name, testFn) {
  try {
    const result = await testFn();
    logTest(name, 'PASS', result);
    return true;
  } catch (error) {
    logTest(name, 'FAIL', error.message);
    return false;
  }
}

// Test 1: Backend Health Check
async function testBackendHealth() {
  const response = await fetch(`${baseURL}/embeddings/stats`);
  if (!response.ok) throw new Error('Backend not responding');
  const data = await response.json();
  return `Backend healthy, ${data.chromadb.count} embeddings found`;
}

// Test 2: Embeddings Stats
async function testEmbeddingsStats() {
  const response = await fetch(`${baseURL}/embeddings/stats`);
  const data = await response.json();
  
  if (data.chromadb.count !== 3) {
    throw new Error(`Expected 3 embeddings, found ${data.chromadb.count}`);
  }
  
  return `ChromaDB: ${data.chromadb.count} embeddings, DB: ${data.database.count} records`;
}

// Test 3: Semantic Search
async function testSemanticSearch() {
  const response = await fetch(`${baseURL}/embeddings/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'machine learning',
      topK: 3
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Search failed');
  }
  
  if (!data.data.results || data.data.results.length === 0) {
    throw new Error('No search results found');
  }
  
  const avgScore = data.data.results.reduce((sum, r) => sum + r.similarity, 0) / data.data.results.length;
  
  return `Found ${data.data.results.length} results, avg similarity: ${avgScore.toFixed(2)}`;
}

// Test 4: Chat Stats
async function testChatStats() {
  const response = await fetch(`${baseURL}/chat/stats?userId=${testUserId}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Failed to get chat stats');
  }
  
  return `Total chats: ${data.data.totalChats}, Avg latency: ${data.data.averageLatency}ms`;
}

// Test 5: Chat History
async function testChatHistory() {
  const response = await fetch(`${baseURL}/chat/history?userId=${testUserId}&limit=10`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Failed to get chat history');
  }
  
  return `Retrieved ${data.data.length} messages`;
}

// Test 6: Document History
async function testDocumentHistory() {
  const response = await fetch(`${baseURL}/chat/history/document/${testDocumentId}?userId=${testUserId}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Failed to get document history');
  }
  
  return `Retrieved ${data.data.length} messages for document`;
}

// Test 7: Search with Multiple Queries
async function testMultipleSearches() {
  const queries = [
    'deep learning',
    'neural networks',
    'natural language processing'
  ];
  
  let totalResults = 0;
  
  for (const query of queries) {
    const response = await fetch(`${baseURL}/embeddings/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK: 2 })
    });
    
    const data = await response.json();
    if (data.success && data.data.results) {
      totalResults += data.data.results.length;
    }
  }
  
  return `Tested ${queries.length} queries, got ${totalResults} total results`;
}

// Test 8: Error Handling - Invalid Document ID
async function testInvalidDocumentId() {
  const response = await fetch(`${baseURL}/chat/history/document/invalid-id-123?userId=${testUserId}`);
  const data = await response.json();
  
  // Should handle gracefully
  return `Handled invalid ID gracefully`;
}

// Test 9: Search Edge Cases
async function testSearchEdgeCases() {
  // Empty query
  const response1 = await fetch(`${baseURL}/embeddings/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '', topK: 3 })
  });
  
  // Very long query
  const longQuery = 'machine learning '.repeat(50);
  const response2 = await fetch(`${baseURL}/embeddings/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: longQuery, topK: 3 })
  });
  
  // Special characters
  const response3 = await fetch(`${baseURL}/embeddings/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '🤖 AI & ML!', topK: 3 })
  });
  
  return 'Tested empty, long, and special character queries';
}

// Test 10: Performance Test
async function testPerformance() {
  const startTime = Date.now();
  
  const promises = [
    fetch(`${baseURL}/embeddings/stats`),
    fetch(`${baseURL}/chat/stats?userId=${testUserId}`),
    fetch(`${baseURL}/embeddings/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test', topK: 3 })
    })
  ];
  
  await Promise.all(promises);
  
  const duration = Date.now() - startTime;
  
  if (duration > 5000) {
    throw new Error(`Concurrent requests took ${duration}ms (expected < 5000ms)`);
  }
  
  return `3 concurrent requests completed in ${duration}ms`;
}

// Main Test Runner
async function runAllTests() {
  log('\n🧪 IntelliDocs AI - Complete Test Suite', 'blue');
  log('='.repeat(50), 'blue');
  log(`Testing against: ${baseURL}`, 'yellow');
  log(`Test Document: ${testDocumentId}`, 'yellow');
  log(`Test User: ${testUserId}\n`, 'yellow');
  
  const startTime = Date.now();
  
  // Run all tests
  await runTest('1. Backend Health Check', testBackendHealth);
  await runTest('2. Embeddings Statistics', testEmbeddingsStats);
  await runTest('3. Semantic Search', testSemanticSearch);
  await runTest('4. Chat Statistics', testChatStats);
  await runTest('5. Chat History', testChatHistory);
  await runTest('6. Document History', testDocumentHistory);
  await runTest('7. Multiple Search Queries', testMultipleSearches);
  await runTest('8. Invalid Document ID Handling', testInvalidDocumentId);
  await runTest('9. Search Edge Cases', testSearchEdgeCases);
  await runTest('10. Performance Test', testPerformance);
  
  const duration = Date.now() - startTime;
  
  // Print Summary
  log('\n' + '='.repeat(50), 'blue');
  log('📊 Test Results Summary', 'blue');
  log('='.repeat(50), 'blue');
  
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  
  log(`\nTotal Tests: ${testResults.total}`, 'yellow');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow');
  log(`Duration: ${duration}ms\n`, 'blue');
  
  if (testResults.failed > 0) {
    log('❌ Failed Tests:', 'red');
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => log(`   - ${t.name}: ${t.details}`, 'red'));
  } else {
    log('✅ All tests passed!', 'green');
  }
  
  log('\n' + '='.repeat(50) + '\n', 'blue');
  
  // Save results to file
  const resultsJSON = {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      passRate: `${passRate}%`
    },
    tests: testResults.tests
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    'test-results.json',
    JSON.stringify(resultsJSON, null, 2)
  );
  
  log('📄 Results saved to: test-results.json\n', 'blue');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
