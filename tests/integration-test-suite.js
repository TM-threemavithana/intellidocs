/**
 * COMPREHENSIVE INTEGRATION TEST SUITE
 * Covers Auth, PDF Toolkit, Resume Analyzer, and AI Content Detector.
 */

const { PDFDocument } = require('../backend/node_modules/pdf-lib');

const API_BASE = 'http://localhost:3000';
let testResults = [];
let authToken = '';

// Helper to print colored console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Helper to make multipart request
async function uploadFiles(endpoint, files, fields = {}, headers = {}) {
  const boundary = `----TestBoundary${Date.now().toString(16)}`;
  const chunks = [];

  for (const file of files) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.originalname}"\r\n`));
    chunks.push(Buffer.from(`Content-Type: ${file.mimetype}\r\n\r\n`));
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`));
    chunks.push(Buffer.from(`${value}\r\n`));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(chunks);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
      ...headers
    },
    body: body,
  });

  if (response.headers.get('content-type')?.includes('application/json')) {
    const data = await response.json();
    return { status: response.status, data };
  } else {
    const buffer = Buffer.from(await response.arrayBuffer());
    return { status: response.status, buffer, contentType: response.headers.get('content-type') };
  }
}

// Helper to construct simple test PDF
async function createMockPdf(title = 'Mock PDF Document', pagesCount = 1) {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < pagesCount; i++) {
    const page = pdfDoc.addPage([300, 300]);
    page.drawText(`${title} - Page ${i + 1}`, { x: 30, y: 150, size: 12 });
  }
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// 1. Auth Flow Test
async function testAuthFlow() {
  log('\n🔑 Step 1: Authentication & Authorization Flow', 'blue');
  log('─'.repeat(60));
  
  const rand = Math.floor(Math.random() * 10000);
  const email = `integration-user-${rand}@intellidocs.ai`;
  const password = 'super_secure_pass_123';
  const name = 'Integration Tester';

  try {
    // 1.1 Register
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const registerData = await registerResponse.json();
    
    if (registerResponse.status !== 201) {
      throw new Error(`Register failed with status ${registerResponse.status}: ${JSON.stringify(registerData)}`);
    }
    log('✅ User registered successfully');

    // 1.2 Login
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginResponse.json();

    if (loginResponse.status !== 200 || !loginData.access_token) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    authToken = loginData.access_token;
    log('✅ User login successful, JWT token acquired');

    // 1.3 Profile Validation (Guarded)
    const profileResponse = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const profileData = await profileResponse.json();

    if (profileResponse.status !== 200 || profileData.user.email !== email) {
      throw new Error(`Guarded profile test failed: ${JSON.stringify(profileData)}`);
    }
    log(`✅ Guarded profile accessed successfully (User: ${profileData.user.name})`);

    testResults.push({ test: 'Authentication & Guarded Access Flow', status: 'PASS' });
  } catch (error) {
    log(`❌ Auth Test Failed: ${error.message}`, 'red');
    testResults.push({ test: 'Authentication & Guarded Access Flow', status: 'FAIL', error: error.message });
  }
}

// 2. PDF Toolkit Integration Test
async function testPdfToolkitIntegration() {
  log('\n📄 Step 2: PDF Toolkit Operations', 'blue');
  log('─'.repeat(60));

  try {
    const pdf1 = await createMockPdf('First PDF', 2);
    const pdf2 = await createMockPdf('Second PDF', 1);

    // 2.1 PDF Merge
    const files = [
      { fieldname: 'files', originalname: 'doc1.pdf', mimetype: 'application/pdf', buffer: pdf1 },
      { fieldname: 'files', originalname: 'doc2.pdf', mimetype: 'application/pdf', buffer: pdf2 }
    ];

    const mergeResponse = await uploadFiles('/pdf-toolkit/merge', files);
    if (mergeResponse.status !== 201 || !mergeResponse.buffer) {
      throw new Error(`Merge failed: Status ${mergeResponse.status}`);
    }

    const mergedDoc = await PDFDocument.load(mergeResponse.buffer);
    if (mergedDoc.getPageCount() !== 3) {
      throw new Error(`Expected merged page count 3, got ${mergedDoc.getPageCount()}`);
    }
    log('✅ PDF Merge successful (Merged 2 + 1 pages)');

    // 2.2 PDF Split
    const splitResponse = await uploadFiles('/pdf-toolkit/split', [
      { fieldname: 'file', originalname: 'merged.pdf', mimetype: 'application/pdf', buffer: mergeResponse.buffer }
    ], {
      ranges: JSON.stringify([{ start: 1, end: 2 }])
    });

    if (splitResponse.status !== 201 || !splitResponse.buffer) {
      throw new Error(`Split failed: Status ${splitResponse.status}`);
    }

    const splitDoc = await PDFDocument.load(splitResponse.buffer);
    if (splitDoc.getPageCount() !== 2) {
      throw new Error(`Expected split page count 2, got ${splitDoc.getPageCount()}`);
    }
    log('✅ PDF Split successful (Sliced pages 1-2)');

    testResults.push({ test: 'PDF Toolkit Integration (Merge & Split)', status: 'PASS' });
  } catch (error) {
    log(`❌ PDF Toolkit Test Failed: ${error.message}`, 'red');
    testResults.push({ test: 'PDF Toolkit Integration (Merge & Split)', status: 'FAIL', error: error.message });
  }
}

// 3. Resume Analyzer Integration Test
async function testResumeAnalyzerIntegration() {
  log('\n🎯 Step 3: Resume Analyzer Forensics', 'blue');
  log('─'.repeat(60));

  try {
    const cv = await createMockPdf('John Developer Resume\nSkills: React, Node, SQL', 1);
    const jobDescription = 'Senior Frontend Engineer with strong React and Docker experience.';

    const response = await uploadFiles('/resume-analyzer/analyze', [
      { fieldname: 'file', originalname: 'cv.pdf', mimetype: 'application/pdf', buffer: cv }
    ], { jobDescription });

    if (response.status !== 201 || !response.data.success || !response.data.data) {
      throw new Error(`Resume audit failed: ${JSON.stringify(response.data)}`);
    }

    const audit = response.data.data;
    if (typeof audit.score !== 'number' || !Array.isArray(audit.recommendations)) {
      throw new Error('Audit response holds invalid formats');
    }
    log(`✅ ATS Resume Analyzer audit complete. Score: ${audit.score}/100`);

    testResults.push({ test: 'Resume Analyzer Integration', status: 'PASS' });
  } catch (error) {
    log(`❌ Resume Analyzer Test Failed: ${error.message}`, 'red');
    testResults.push({ test: 'Resume Analyzer Integration', status: 'FAIL', error: error.message });
  }
}

// 4. AI Content Detector Integration Test
async function testAiDetectorIntegration() {
  log('\n🤖 Step 4: AI Content Detector Auditing', 'blue');
  log('─'.repeat(60));

  const content = `
  This text is composed to evaluate semantic parameters such as perplexity and burstiness.
  In regular writing, human authors choose word combinations with highly diverse distributions.
  Robotic systems tend to maintain stable sentence structures resulting in low burstiness indices.
  Through our custom parsing routines, we can assess spelling indexes and vocabulary variations.
  `;

  try {
    const response = await fetch(`${API_BASE}/ai-detector/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content.trim() })
    });
    const result = await response.json();

    if (response.status !== 201 || !result.success || !result.data) {
      throw new Error(`AI check failed: ${JSON.stringify(result)}`);
    }

    const audit = result.data;
    if (typeof audit.score !== 'number' || typeof audit.perplexity !== 'number' || typeof audit.burstiness !== 'number') {
      throw new Error('Invalid stats format returned');
    }
    log(`✅ AI Content Detector completed successfully. AI Likelihood: ${audit.score}%`);

    testResults.push({ test: 'AI Content Detector Integration', status: 'PASS' });
  } catch (error) {
    log(`❌ AI Content Detector Test Failed: ${error.message}`, 'red');
    testResults.push({ test: 'AI Content Detector Integration', status: 'FAIL', error: error.message });
  }
}

// Main Test Runner
async function runAll() {
  log('🚀 Starting Complete E2E Integration Test Suite...\n', 'yellow');
  const startTime = Date.now();

  await testAuthFlow();
  await testPdfToolkitIntegration();
  await testResumeAnalyzerIntegration();
  await testAiDetectorIntegration();

  const totalTime = Date.now() - startTime;
  
  log('\n' + '='.repeat(60), 'blue');
  log('📊 INTEGRATION TEST SUITE SUMMARY', 'blue');
  log('='.repeat(60), 'blue');

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;

  log(`\nTotal Test Scenarios: ${testResults.length}`);
  log(`✅ Passed: ${passed}`);
  log(`❌ Failed: ${failed}`);
  log(`📈 Success Rate: ${((passed / testResults.length) * 100).toFixed(1)}%`);
  log(`⏱️ Total Duration: ${totalTime}ms`);

  log('\n' + '-'.repeat(60));
  testResults.forEach((r, i) => {
    const statusIcon = r.status === 'PASS' ? '✅' : '❌';
    log(`${i + 1}. ${statusIcon} ${r.test}: ${r.status}`);
  });
  log('='.repeat(60) + '\n', 'blue');

  // Save to file
  const fs = require('fs');
  fs.writeFileSync('tests/integration-test-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTime: `${totalTime}ms`,
    summary: { total: testResults.length, passed, failed },
    results: testResults
  }, null, 2));

  process.exit(failed > 0 ? 1 : 0);
}

runAll();
