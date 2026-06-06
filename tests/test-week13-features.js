/**
 * WEEK 13 TEST SUITE: AI Content Detector
 * 
 * Tests:
 * 1. AI detector text scoring and parameter calculations
 */

const API_BASE = 'http://localhost:3000';
let testResults = [];

// Helper to make a JSON request
async function postJson(endpoint, data) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();
  return { status: response.status, data: responseData };
}

// Test 1: AI Content Detection Analysis
async function testAiDetection() {
  console.log('\n🎯 TEST 1: AI Content Detection forensic audit');
  console.log('─'.repeat(50));

  const textToAnalyze = `
  Artificial intelligence has transformed the landscape of modern technology.
  Many systems use advanced statistical engines to evaluate user input query sequences.
  This content is generated programmatically to demonstrate the baseline functionality.
  The uniform structure indicates a lower perplexity pattern and low burstiness variance.
  These models construct sentences by selecting the highest probability tokens sequentially.
  This consistency makes identifying automated writing styles straightforward with statistical tools.
  `;

  try {
    const response = await postJson('/ai-detector/analyze', {
      text: textToAnalyze.trim()
    });

    if (response.status === 201 && response.data.success && response.data.data) {
      const result = response.data.data;
      
      // Basic assertions on JSON keys
      const hasScore = typeof result.score === 'number' && result.score >= 0 && result.score <= 100;
      const hasPerplexity = typeof result.perplexity === 'number' && result.perplexity >= 0 && result.perplexity <= 100;
      const hasBurstiness = typeof result.burstiness === 'number' && result.burstiness >= 0 && result.burstiness <= 100;
      const hasReadability = typeof result.readability === 'number';
      const hasSentences = Array.isArray(result.sentences) && result.sentences.length > 0;
      const hasReport = typeof result.report === 'string' && result.report.trim().length > 0;

      if (hasScore && hasPerplexity && hasBurstiness && hasReadability && hasSentences && hasReport) {
        console.log('✅ AI content detection analysis successful');
        console.log(`   Likelihood Score: ${result.score}%`);
        console.log(`   Lexical Entropy (Perplexity): ${result.perplexity}%`);
        console.log(`   Burstiness Index: ${result.burstiness}%`);
        console.log(`   Readability Level: ${result.readability}`);
        console.log(`   Sentences evaluated: ${result.sentences.length}`);
        console.log(`   Forensic Report Preview: ${result.report.substring(0, 100)}...`);
        testResults.push({ test: 'AI Content Detection', status: 'PASS' });
        return true;
      } else {
        console.log('❌ Invalid detection response format:', result);
        testResults.push({ test: 'AI Content Detection', status: 'FAIL', error: 'Invalid response keys' });
        return false;
      }
    } else {
      console.log('❌ Detection request failed. Response:', response);
      testResults.push({ test: 'AI Content Detection', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'AI Content Detection', status: 'FAIL', error: error.message });
    return false;
  }
}

// Print final summary
function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 WEEK 13 TEST SUMMARY');
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
    console.log('🎉 ALL TESTS PASSED! Week 13 AI Content Detector is complete! 🚀');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please review errors.');
    process.exit(1);
  }
}

async function runAll() {
  console.log('🚀 Starting Week 13 Test Suite...\n');
  await testAiDetection();
  printSummary();
}

runAll();
