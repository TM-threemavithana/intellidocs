// Test search functionality
const http = require('http');

const searchQuery = {
  query: 'What is deep learning?',
  topK: 2
};

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/embeddings/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('🔍 Searching for:', searchQuery.query);
console.log('');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      console.log('✅ Search Results:');
      console.log('Query:', result.query);
      console.log('Found:', result.results.length, 'results\n');
      
      result.results.forEach((r, i) => {
        console.log(`--- Result ${i + 1} ---`);
        console.log('Text:', r.text.substring(0, 200) + '...');
        console.log('Similarity:', r.similarity.toFixed(4));
        console.log('Metadata:', {
          documentId: r.metadata.documentId,
          pageNumber: r.metadata.pageNumber,
          chunkIndex: r.metadata.chunkIndex,
          fileName: r.metadata.fileName
        });
        console.log('');
      });
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw data:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(JSON.stringify(searchQuery));
req.end();
