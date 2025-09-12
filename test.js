// Simple test script to verify the backend is working
const axios = require('axios');

async function testBackend() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    console.log('🧪 Testing Website Cloner Backend...\n');
    
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseUrl}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test crawl endpoint with a simple website
    console.log('\n2. Testing crawl endpoint...');
    const crawlResponse = await axios.post(`${baseUrl}/api/crawl`, {
      url: 'https://example.com'
    });
    
    if (crawlResponse.data.success) {
      console.log('✅ Crawl test passed!');
      console.log('📄 HTML length:', crawlResponse.data.html.length, 'characters');
      console.log('🌐 Original URL:', crawlResponse.data.url);
      console.log('⏰ Timestamp:', crawlResponse.data.timestamp);
    } else {
      console.log('❌ Crawl test failed:', crawlResponse.data.error);
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 5000');
      console.log('   Run: cd backend && npm start');
    }
  }
}

// Run the test
testBackend();
