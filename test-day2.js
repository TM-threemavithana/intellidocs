// Day 2 Testing Script
const http = require('http');

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Day 2 Testing: Ollama Embeddings Integration\n');
  
  // Test 1: Check embeddings stats
  console.log('1️⃣  Checking embeddings stats...');
  try {
    const stats = await makeRequest('GET', '/embeddings/stats');
    console.log('✅ Stats:', JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 2: Check if there are any documents
  console.log('\n2️⃣  Checking for documents...');
  try {
    // We'll need to query the database or check via API
    console.log('ℹ️  To test embeddings, you need to:');
    console.log('   1. Upload a PDF document via frontend (http://localhost:3001)');
    console.log('   2. Wait for OCR to complete');
    console.log('   3. Generate embeddings: POST /embeddings/generate/{documentId}');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 3: Test search with sample query
  console.log('\n3️⃣  Testing search endpoint...');
  try {
    const searchResult = await makeRequest('POST', '/embeddings/search', {
      query: 'test query',
      topK: 5
    });
    console.log('✅ Search result:', JSON.stringify(searchResult, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n✅ Day 2 tests complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Upload a document via frontend');
  console.log('   2. Generate embeddings for the document');
  console.log('   3. Test semantic search');
}

runTests().catch(console.error);
