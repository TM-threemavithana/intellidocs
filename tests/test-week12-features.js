/**
 * WEEK 12 TEST SUITE: Resume Analyzer (ATS Scoring)
 * 
 * Tests:
 * 1. Resume PDF text parsing
 * 2. ATS Scoring audit analysis
 */

const { PDFDocument } = require('../backend/node_modules/pdf-lib');

const API_BASE = 'http://localhost:3000';
let testResults = [];

// Helper to create a basic PDF buffer with custom text representing a resume
async function createTestResumePdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 400]);
  
  page.drawText('John Doe Resume', { x: 50, y: 350, size: 20 });
  page.drawText('Email: john.doe@example.com | Phone: 123-456-7890', { x: 50, y: 320, size: 10 });
  
  page.drawText('Experience:', { x: 50, y: 280, size: 14 });
  page.drawText('- Software Engineer at Tech Corp (2020-Present)', { x: 50, y: 260, size: 11 });
  page.drawText('  Worked with React, TypeScript, and Node.js backend services.', { x: 50, y: 240, size: 10 });
  
  page.drawText('Education:', { x: 50, y: 200, size: 14 });
  page.drawText('- BS in Computer Science, State University (2016-2020)', { x: 50, y: 180, size: 11 });
  
  page.drawText('Skills:', { x: 50, y: 140, size: 14 });
  page.drawText('React, TypeScript, Node.js, HTML, CSS, JavaScript, Git', { x: 50, y: 120, size: 11 });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// Helper to make a multipart request
async function uploadFiles(endpoint, files, fields = {}) {
  const boundary = `----TestBoundary${Date.now().toString(16)}`;
  const chunks = [];

  // Add files
  for (const file of files) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.originalname}"\r\n`));
    chunks.push(Buffer.from(`Content-Type: ${file.mimetype}\r\n\r\n`));
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  // Add text fields
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
    },
    body: body,
  });

  const data = await response.json();
  return { status: response.status, data };
}

// Test 1: ATS Audit Analysis
async function testAtsAudit() {
  console.log('\n🎯 TEST 1: Resume ATS Audit');
  console.log('─'.repeat(50));

  try {
    const resumePdf = await createTestResumePdf();
    const files = [
      { fieldname: 'file', originalname: 'resume.pdf', mimetype: 'application/pdf', buffer: resumePdf }
    ];

    const jobDescription = `
    Job Title: Senior React Engineer
    Requirements:
    - Strong experience in React, TypeScript, and Node.js
    - Experience with Docker, Kubernetes, and cloud deployment (AWS) is a plus
    - Good communication skills
    `;

    const response = await uploadFiles('/resume-analyzer/analyze', files, {
      jobDescription: jobDescription
    });

    if (response.status === 201 && response.data.success && response.data.data) {
      const audit = response.data.data;
      
      // Basic assertions on JSON keys
      const hasScore = typeof audit.score === 'number' && audit.score >= 0 && audit.score <= 100;
      const hasSections = Array.isArray(audit.sections) && audit.sections.length > 0;
      const hasKeywords = audit.keywords && Array.isArray(audit.keywords.matched) && Array.isArray(audit.keywords.missing);
      const hasRecs = Array.isArray(audit.recommendations) && audit.recommendations.length > 0;

      if (hasScore && hasSections && hasKeywords && hasRecs) {
        console.log('✅ Resume ATS audit analysis successful');
        console.log(`   ATS Score: ${audit.score}/100`);
        console.log(`   Sections checked: ${audit.sections.map(s => s.name).join(', ')}`);
        console.log(`   Keywords matched: ${audit.keywords.matched.join(', ')}`);
        console.log(`   Keywords missing: ${audit.keywords.missing.join(', ')}`);
        console.log(`   Recommendations count: ${audit.recommendations.length}`);
        testResults.push({ test: 'Resume ATS Audit', status: 'PASS' });
        return true;
      } else {
        console.log('❌ Invalid audit response format:', audit);
        testResults.push({ test: 'Resume ATS Audit', status: 'FAIL', error: 'Invalid response keys' });
        return false;
      }
    } else {
      console.log('❌ Audit request failed. Response:', response);
      testResults.push({ test: 'Resume ATS Audit', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'Resume ATS Audit', status: 'FAIL', error: error.message });
    return false;
  }
}

// Print final summary
function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 WEEK 12 TEST SUMMARY');
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
    console.log('🎉 ALL TESTS PASSED! Week 12 Resume Analyzer is complete! 🚀');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please review errors.');
    process.exit(1);
  }
}

async function runAll() {
  console.log('🚀 Starting Week 12 Test Suite...\n');
  await testAtsAudit();
  printSummary();
}

runAll();
