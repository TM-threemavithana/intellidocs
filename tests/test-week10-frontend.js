/**
 * WEEK 10 FRONTEND TEST SUITE
 * 
 * Tests all frontend integration features:
 * 1. Registration Flow
 * 2. Login Flow
 * 3. Protected Routes
 * 4. Profile Management
 * 5. Documents Page
 * 6. Search Page
 * 7. Navigation
 */

const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:3000';
let testResults = [];
let testUser = null;
let accessToken = null;

// Helper function to make HTTP requests
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, data: { error: error.message } };
  }
}

// Helper to check if page is accessible
async function checkPageAccessible(path) {
  try {
    const response = await fetch(`${FRONTEND_URL}${path}`);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Test 1: Backend Health Check
async function testBackendHealth() {
  console.log('\n🏥 TEST 1: Backend Health Check');
  console.log('─'.repeat(50));
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
    });

    // 401 is expected (not authenticated), but means backend is responding
    if (response.status === 401 || response.status === 200) {
      console.log('✅ Backend is responding');
      testResults.push({ test: 'Backend Health', status: 'PASS' });
      return true;
    } else {
      console.log('❌ Backend not responding correctly:', response.status);
      testResults.push({ test: 'Backend Health', status: 'FAIL' });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'Backend Health', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 2: User Registration (Backend)
async function testUserRegistration() {
  console.log('\n📝 TEST 2: User Registration (Backend API)');
  console.log('─'.repeat(50));
  
  try {
    const email = `test${Date.now()}@example.com`;
    const response = await makeRequest(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'Test123!@#',
        name: 'Test User',
      }),
    });

    if (response.status === 201 && response.data.access_token) {
      testUser = {
        email,
        password: 'Test123!@#',
        id: response.data.user.id,
        name: response.data.user.name,
      };
      accessToken = response.data.access_token;
      
      console.log('✅ User registration successful');
      console.log(`   Email: ${email}`);
      console.log(`   User ID: ${response.data.user.id}`);
      console.log(`   Token: ${accessToken.substring(0, 20)}...`);
      testResults.push({ test: 'User Registration', status: 'PASS' });
      return true;
    } else {
      console.log('❌ Registration failed:', response.data);
      testResults.push({ test: 'User Registration', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'User Registration', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 3: User Login (Backend)
async function testUserLogin() {
  console.log('\n🔐 TEST 3: User Login (Backend API)');
  console.log('─'.repeat(50));
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    if (response.status === 200 && response.data.access_token) {
      accessToken = response.data.access_token;
      console.log('✅ User login successful');
      console.log(`   Token: ${accessToken.substring(0, 20)}...`);
      testResults.push({ test: 'User Login', status: 'PASS' });
      return true;
    } else {
      console.log('❌ Login failed:', response.data);
      testResults.push({ test: 'User Login', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'User Login', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 4: Protected Endpoint Access
async function testProtectedEndpoint() {
  console.log('\n🔒 TEST 4: Protected Endpoint Access');
  console.log('─'.repeat(50));
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200 && response.data.id) {
      console.log('✅ Protected endpoint accessible with token');
      console.log(`   User: ${response.data.email}`);
      testResults.push({ test: 'Protected Endpoint', status: 'PASS' });
      return true;
    } else {
      console.log('❌ Failed to access protected endpoint:', response.data);
      testResults.push({ test: 'Protected Endpoint', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'Protected Endpoint', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 5: Frontend Pages Accessibility
async function testFrontendPages() {
  console.log('\n🌐 TEST 5: Frontend Pages Accessibility');
  console.log('─'.repeat(50));
  
  const pages = [
    { path: '/', name: 'Home/Dashboard' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
    { path: '/forgot-password', name: 'Forgot Password' },
    { path: '/profile', name: 'Profile' },
    { path: '/documents', name: 'Documents' },
    { path: '/chat', name: 'Chat' },
    { path: '/search', name: 'Search' },
  ];

  let allAccessible = true;
  
  for (const page of pages) {
    const accessible = await checkPageAccessible(page.path);
    if (accessible) {
      console.log(`✅ ${page.name} (${page.path}) - Accessible`);
    } else {
      console.log(`❌ ${page.name} (${page.path}) - Not Accessible`);
      allAccessible = false;
    }
  }

  if (allAccessible) {
    console.log('✅ All frontend pages are accessible');
    testResults.push({ test: 'Frontend Pages', status: 'PASS' });
  } else {
    console.log('❌ Some frontend pages are not accessible');
    testResults.push({ test: 'Frontend Pages', status: 'FAIL' });
  }

  return allAccessible;
}

// Test 6: Profile Update
async function testProfileUpdate() {
  console.log('\n👤 TEST 6: Profile Update');
  console.log('─'.repeat(50));
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/users/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Test User',
      }),
    });

    if (response.status === 200 && response.data.name === 'Updated Test User') {
      console.log('✅ Profile updated successfully');
      console.log(`   New name: ${response.data.name}`);
      testResults.push({ test: 'Profile Update', status: 'PASS' });
      return true;
    } else {
      console.log('❌ Profile update failed:', response.data);
      testResults.push({ test: 'Profile Update', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'Profile Update', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 7: Password Change
async function testPasswordChange() {
  console.log('\n🔑 TEST 7: Password Change');
  console.log('─'.repeat(50));
  
  try {
    const newPassword = 'NewTest123!@#';
    const response = await makeRequest(`${BACKEND_URL}/users/me/password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        currentPassword: testUser.password,
        newPassword,
      }),
    });

    if (response.status === 200) {
      console.log('✅ Password changed successfully');
      
      // Verify login with new password
      const loginResponse = await makeRequest(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: newPassword,
        }),
      });

      if (loginResponse.status === 200) {
        console.log('✅ Login with new password successful');
        testUser.password = newPassword;
        accessToken = loginResponse.data.access_token;
        testResults.push({ test: 'Password Change', status: 'PASS' });
        return true;
      } else {
        console.log('❌ Login with new password failed');
        testResults.push({ test: 'Password Change', status: 'FAIL', error: 'New password login failed' });
        return false;
      }
    } else {
      console.log('❌ Password change failed:', response.data);
      testResults.push({ test: 'Password Change', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'Password Change', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 8: Documents API
async function testDocumentsAPI() {
  console.log('\n📄 TEST 8: Documents API');
  console.log('─'.repeat(50));
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/documents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200) {
      console.log('✅ Documents API accessible');
      console.log(`   Found ${response.data.length} documents`);
      testResults.push({ test: 'Documents API', status: 'PASS' });
      return true;
    } else {
      console.log('❌ Documents API failed:', response.data);
      testResults.push({ test: 'Documents API', status: 'FAIL', error: response.data });
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    testResults.push({ test: 'Documents API', status: 'FAIL', error: error.message });
    return false;
  }
}

// Summary function
function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 WEEK 10 FRONTEND TEST SUMMARY');
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
  
  testResults.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${JSON.stringify(result.error).substring(0, 100)}`);
    }
  });
  
  console.log('\n' + '='.repeat(70));
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Week 10 frontend integration is complete!');
    console.log('\n✨ Frontend Features Verified:');
    console.log('   ✅ User authentication working');
    console.log('   ✅ Protected endpoints accessible');
    console.log('   ✅ Profile management functional');
    console.log('   ✅ All pages accessible');
    console.log('   ✅ Backend integration complete');
  } else {
    console.log('⚠️ Some tests failed. Please review the errors above.');
  }
  
  console.log('\n📝 Manual Testing:');
  console.log('   → Visit http://localhost:3001');
  console.log('   → Try registering a new user');
  console.log('   → Test login/logout flow');
  console.log('   → Navigate through all pages');
  console.log('   → Test responsive design (resize browser)');
  
  console.log('='.repeat(70) + '\n');
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Week 10 Frontend Test Suite...\n');
  console.log('Testing: Frontend Integration with Authentication');
  console.log('Frontend: ' + FRONTEND_URL);
  console.log('Backend: ' + BACKEND_URL);
  console.log('='.repeat(70));
  
  try {
    await testBackendHealth();
    await testUserRegistration();
    await testUserLogin();
    await testProtectedEndpoint();
    await testFrontendPages();
    await testProfileUpdate();
    await testPasswordChange();
    await testDocumentsAPI();
    
    printSummary();
  } catch (error) {
    console.log('\n❌ Test suite error:', error.message);
    console.log(error.stack);
  }
}

// Run tests
runAllTests();
