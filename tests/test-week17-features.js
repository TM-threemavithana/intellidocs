/**
 * WEEK 17-18 TEST SUITE: RAGAS Evaluation Framework
 * 
 * Tests:
 * 1. Benchmark trigger, scoring evaluations, and detail reports
 */

const API_BASE = 'http://localhost:3000';
let testResults = [];

// Helper to make a POST request
async function postEval() {
  const response = await fetch(`${API_BASE}/rag/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  const responseData = await response.json();
  return { status: response.status, data: responseData };
}

// Test 1: RAGAS Benchmark Scoring
async function testRagasEvaluation() {
  console.log('\n🎯 TEST 1: RAGAS Pipeline Benchmark Quality Audit');
  console.log('─'.repeat(55));

  try {
    const response = await postEval();

    if (response.status === 201 && response.data.success && response.data.data) {
      const result = response.data.data;
      
      // Basic assertions on JSON keys
      const hasAvg = typeof result.averageScore === 'number' && result.averageScore >= 0 && result.averageScore <= 100;
      const hasFaith = typeof result.faithfulness === 'number' && result.faithfulness >= 0 && result.faithfulness <= 100;
      const hasRel = typeof result.relevance === 'number' && result.relevance >= 0 && result.relevance <= 100;
      const hasRecall = typeof result.recall === 'number' && result.recall >= 0 && result.recall <= 100;
      const hasPrec = typeof result.precision === 'number' && result.precision >= 0 && result.precision <= 100;
      const hasDetails = Array.isArray(result.details) && result.details.length > 0;

      if (hasAvg && hasFaith && hasRel && hasRecall && hasPrec && hasDetails) {
        console.log('✅ RAGAS benchmark evaluation successful');
        console.log(`   RAGAS Score: ${result.averageScore}%`);
        console.log(`   Faithfulness: ${result.faithfulness}%`);
        console.log(`   Answer Relevance: ${result.relevance}%`);
        console.log(`   Context Recall: ${result.recall}%`);
        console.log(`   Context Precision: ${result.precision}%`);
        console.log(`   Benchmark test cases run: ${result.details.length}`);
        testResults.push({ test: 'RAGAS Benchmark Scoring', status: 'PASS' });
        return true;
      } else {
        console.log('❌ Invalid RAGAS response format:', result);
        testResults.push({ test: 'RAGAS Benchmark Scoring', status: 'FAIL', error: 'Invalid response keys' });
        return false;
      }
    } else {
      console.log('❌ RAGAS request failed. Response:', response);
      testResults.push({ test: 'RAGAS Benchmark Scoring', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'RAGAS Benchmark Scoring', status: 'FAIL', error: error.message });
    return false;
  }
}

// Print final summary
function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 WEEK 17-18 TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const total = testResults.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  console.log('\n' + '-'.repeat(70));
  console.log('Test Results:');
  console.log('-'.repeat(70));

  testResults.forEach((result, idx) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${idx + 1}. ${icon} ${result.test}: ${result.status}`);
  });

  console.log('\n' + '='.repeat(70));
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Week 17-18 RAGAS Evaluation Framework is complete! 🚀');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please review errors.');
    process.exit(1);
  }
}

async function runAll() {
  console.log('🚀 Starting Week 17-18 Test Suite...\n');
  await testRagasEvaluation();
  printSummary();
}

runAll();
