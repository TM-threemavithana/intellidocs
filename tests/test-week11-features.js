/**
 * WEEK 11 TEST SUITE: PDF Toolkit
 * 
 * Tests:
 * 1. PDF Merging
 * 2. PDF Splitting
 * 3. Image-to-PDF Conversion
 */

const { PDFDocument } = require('../backend/node_modules/pdf-lib');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';
let testResults = [];

// Helper to create a basic PDF buffer with a given number of pages
async function createTestPdf(pagesCount = 1, text = 'Hello Page') {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < pagesCount; i++) {
    const page = pdfDoc.addPage([200, 200]);
    page.drawText(`${text} ${i + 1}`, { x: 20, y: 100, size: 12 });
  }
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// Helper to make a multipart request
async function uploadFiles(endpoint, files, fields = {}) {
  // We construct a simple multipart body manually
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

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    return { status: response.status, data, contentType };
  } else {
    const buffer = Buffer.from(await response.arrayBuffer());
    return { status: response.status, data: buffer, contentType };
  }
}

// Test 1: Merge PDFs
async function testMergePdfs() {
  console.log('\n🔗 TEST 1: Merge PDFs');
  console.log('─'.repeat(50));

  try {
    const doc1 = await createTestPdf(1, 'Document One Page');
    const doc2 = await createTestPdf(2, 'Document Two Page');

    const files = [
      { fieldname: 'files', originalname: 'doc1.pdf', mimetype: 'application/pdf', buffer: doc1 },
      { fieldname: 'files', originalname: 'doc2.pdf', mimetype: 'application/pdf', buffer: doc2 }
    ];

    const response = await uploadFiles('/pdf-toolkit/merge', files);

    if (response.status === 201 && response.contentType.includes('application/pdf')) {
      // Load merged PDF and verify page count
      const mergedPdf = await PDFDocument.load(response.data);
      const pageCount = mergedPdf.getPageCount();

      if (pageCount === 3) {
        console.log('✅ PDF merge successful');
        console.log(`   Merged PDF page count: ${pageCount} (Expected: 3)`);
        testResults.push({ test: 'PDF Merge', status: 'PASS' });
        return true;
      } else {
        console.log(`❌ Page count mismatch: got ${pageCount}, expected 3`);
        testResults.push({ test: 'PDF Merge', status: 'FAIL', error: 'Page count mismatch' });
        return false;
      }
    } else {
      console.log('❌ Merge request failed. Status:', response.status);
      testResults.push({ test: 'PDF Merge', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'PDF Merge', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 2: Split PDF (Single range)
async function testSplitPdfSingle() {
  console.log('\n✂️ TEST 2: Split PDF (Single Range)');
  console.log('─'.repeat(50));

  try {
    const doc = await createTestPdf(5, 'Multi Page Document');
    const files = [
      { fieldname: 'file', originalname: 'doc.pdf', mimetype: 'application/pdf', buffer: doc }
    ];

    const response = await uploadFiles('/pdf-toolkit/split', files, {
      ranges: JSON.stringify([{ start: 2, end: 4 }])
    });

    if (response.status === 201 && response.contentType.includes('application/pdf')) {
      const splitPdf = await PDFDocument.load(response.data);
      const pageCount = splitPdf.getPageCount();

      if (pageCount === 3) {
        console.log('✅ PDF split (single range) successful');
        console.log(`   Split PDF page count: ${pageCount} (Expected: 3, pages 2-4)`);
        testResults.push({ test: 'PDF Split Single', status: 'PASS' });
        return true;
      } else {
        console.log(`❌ Page count mismatch: got ${pageCount}, expected 3`);
        testResults.push({ test: 'PDF Split Single', status: 'FAIL', error: 'Page count mismatch' });
        return false;
      }
    } else {
      console.log('❌ Split request failed. Status:', response.status);
      testResults.push({ test: 'PDF Split Single', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'PDF Split Single', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 3: Split PDF (Multiple ranges, returns zip)
async function testSplitPdfMultiple() {
  console.log('\n📦 TEST 3: Split PDF (Multiple Ranges -> ZIP)');
  console.log('─'.repeat(50));

  try {
    const doc = await createTestPdf(5, 'Multi Page Document');
    const files = [
      { fieldname: 'file', originalname: 'doc.pdf', mimetype: 'application/pdf', buffer: doc }
    ];

    const response = await uploadFiles('/pdf-toolkit/split', files, {
      ranges: JSON.stringify([
        { start: 1, end: 2 },
        { start: 4, end: 5 }
      ])
    });

    if (response.status === 201 && response.contentType.includes('application/zip')) {
      console.log('✅ PDF split (multiple ranges) returned ZIP archive');
      console.log(`   Zip buffer size: ${response.data.length} bytes`);
      testResults.push({ test: 'PDF Split Multiple (ZIP)', status: 'PASS' });
      return true;
    } else {
      console.log('❌ Split request failed. Status:', response.status);
      testResults.push({ test: 'PDF Split Multiple (ZIP)', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'PDF Split Multiple (ZIP)', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 4: Convert Images to PDF
async function testConvertImages() {
  console.log('\n🖼️ TEST 4: Convert Images to PDF');
  console.log('─'.repeat(50));

  try {
    // We create a dummy 1x1 pixel PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const files = [
      { fieldname: 'files', originalname: 'image1.png', mimetype: 'image/png', buffer: pngBuffer },
      { fieldname: 'files', originalname: 'image2.png', mimetype: 'image/png', buffer: pngBuffer }
    ];

    const response = await uploadFiles('/pdf-toolkit/convert', files);

    if (response.status === 201 && response.contentType.includes('application/pdf')) {
      const generatedPdf = await PDFDocument.load(response.data);
      const pageCount = generatedPdf.getPageCount();

      if (pageCount === 2) {
        console.log('✅ Image-to-PDF conversion successful');
        console.log(`   Generated PDF page count: ${pageCount} (Expected: 2)`);
        testResults.push({ test: 'Image to PDF Conversion', status: 'PASS' });
        return true;
      } else {
        console.log(`❌ Page count mismatch: got ${pageCount}, expected 2`);
        testResults.push({ test: 'Image to PDF Conversion', status: 'FAIL', error: 'Page count mismatch' });
        return false;
      }
    } else {
      console.log('❌ Convert request failed. Status:', response.status);
      testResults.push({ test: 'Image to PDF Conversion', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'Image to PDF Conversion', status: 'FAIL', error: error.message });
    return false;
  }
}

// Print final test results
function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 WEEK 11 TEST SUMMARY');
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
    console.log('🎉 ALL TESTS PASSED! Week 11 PDF Toolkit feature is complete! 🚀');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please review errors.');
    process.exit(1);
  }
}

async function runAll() {
  console.log('🚀 Starting Week 11 Test Suite...\n');
  await testMergePdfs();
  await testSplitPdfSingle();
  await testSplitPdfMultiple();
  await testConvertImages();
  printSummary();
}

runAll();
