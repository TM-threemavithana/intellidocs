/**
 * Simple Chat API Test
 * Tests the /chat/ask endpoint with a quick question
 */

const question = "What is machine learning?";
const documentId = "cmq25hc2s000176twan8gx1ui";
const userId = "default-user";

console.log("🧪 Testing Chat API");
console.log("===================");
console.log(`Question: ${question}`);
console.log(`Document ID: ${documentId}`);
console.log(`User ID: ${userId}`);
console.log("");

const startTime = Date.now();

fetch("http://localhost:3000/chat/ask", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    question,
    documentId,
    userId,
  }),
})
  .then((response) => {
    console.log(`✅ Response Status: ${response.status}`);
    return response.json();
  })
  .then((data) => {
    const duration = Date.now() - startTime;
    console.log("");
    console.log("📊 Response Data:");
    console.log("===================");
    
    if (data.success) {
      console.log("✅ Success: true");
      console.log("");
      console.log("🤖 Answer:");
      console.log(data.data.answer);
      console.log("");
      console.log("📚 Citations:", data.data.citations.length);
      data.data.citations.forEach((citation, idx) => {
        console.log(`  ${idx + 1}. ${citation.documentName} - Page ${citation.pageNumber} (Relevance: ${(citation.relevanceScore * 100).toFixed(1)}%)`);
      });
      console.log("");
      console.log(`⏱️  Response Time: ${data.data.responseTime}ms`);
      console.log(`⏱️  Total Duration: ${duration}ms`);
    } else {
      console.log("❌ Success: false");
      console.log("Error:", data.message);
    }
  })
  .catch((error) => {
    console.error("❌ Error:", error.message);
  });
