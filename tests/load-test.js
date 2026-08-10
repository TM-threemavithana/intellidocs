/**
 * CONCURRENCY & LOAD TEST HARNESS
 * Simulates 100 concurrent asynchronous requests to evaluate API stability under load.
 */

const API_BASE = 'http://localhost:3000';
const CONCURRENCY_TARGET = 100;

const endpoints = [
  '/embeddings/stats',
  '/chat/stats?userId=integration-user'
];

async function runLoadTest() {
  console.log('🚀 Starting Concurrency & Load Stress Test...');
  console.log(`🎯 Target Concurrency: ${CONCURRENCY_TARGET} concurrent queries`);
  console.log(`🔗 Testing endpoints:\n   ${endpoints.join('\n   ')}\n`);

  const startTime = Date.now();
  const requests = [];

  for (let i = 0; i < CONCURRENCY_TARGET; i++) {
    const endpoint = endpoints[i % endpoints.length];
    
    requests.push((async (id) => {
      const reqStart = Date.now();
      try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        const latency = Date.now() - reqStart;
        return {
          id,
          success: res.ok,
          status: res.status,
          latency,
          error: null
        };
      } catch (err) {
        return {
          id,
          success: false,
          status: 500,
          latency: Date.now() - reqStart,
          error: err.message
        };
      }
    })(i + 1));
  }

  const results = await Promise.all(requests);
  const totalDuration = Date.now() - startTime;

  // Compute stats
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const latencies = results.map(r => r.latency);
  
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  console.log('='.repeat(60));
  console.log('📊 CONCURRENCY PERFORMANCE BENCHMARKS');
  console.log('='.repeat(60));
  console.log(`Concurrently Dispatched : ${CONCURRENCY_TARGET}`);
  console.log(`Successful Response     : ${successful}`);
  console.log(`Failed Response         : ${failed}`);
  console.log(`Success Rate            : ${((successful / CONCURRENCY_TARGET) * 100).toFixed(1)}%`);
  console.log(`Min Request Latency     : ${minLatency}ms`);
  console.log(`Max Request Latency     : ${maxLatency}ms`);
  console.log(`Average Latency         : ${avgLatency}ms`);
  console.log(`Total Batch Duration    : ${totalDuration}ms`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ Stress test detected failures:');
    results.filter(r => !r.success).slice(0, 5).forEach(r => {
      console.log(`   - Request #${r.id} failed with status: ${r.status}. Error: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All concurrent requests succeeded without any connection drop or timeouts!');
    process.exit(0);
  }
}

runLoadTest().catch(err => {
  console.error('❌ Load test harness error:', err.message);
  process.exit(1);
});
