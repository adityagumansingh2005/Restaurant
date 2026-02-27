/**
 * Test Authentication Endpoints
 * Run with: node test-auth.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';

const testData = {
  signup: {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '1234567890',
  },
  login: {
    email: 'test@example.com',
    password: 'password123',
  },
  order: {
    items: [{ id: 1, name: 'Pizza', price: 12.99 }],
    totalPrice: 12.99,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
  },
};

let authToken = null;

async function runTests() {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 Testing Restaurant API Authentication');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test 1: Signup
    console.log('Test 1: User Signup');
    console.log('POST /auth/signup');
    try {
      const signupRes = await axios.post(`${API_URL}/auth/signup`, testData.signup);
      console.log('✅ Signup successful');
      console.log(`   User ID: ${signupRes.data.data.user.userId}`);
      console.log(`   Email: ${signupRes.data.data.user.email}`);
      authToken = signupRes.data.data.token;
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  User already exists, testing login instead...');
      } else {
        throw error;
      }
    }

    // Test 2: Login
    console.log('\nTest 2: User Login');
    console.log('POST /auth/login');
    const loginRes = await axios.post(`${API_URL}/auth/login`, testData.login);
    console.log('✅ Login successful');
    console.log(`   Email: ${loginRes.data.data.user.email}`);
    authToken = loginRes.data.data.token;
    console.log(`   Token: ${authToken.substring(0, 20)}...`);

    // Test 3: Create Order with Auth
    console.log('\nTest 3: Create Order (with authentication)');
    console.log('POST /orders');
    const createOrderRes = await axios.post(`${API_URL}/orders`, testData.order, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    console.log('✅ Order created successfully');
    console.log(`   Order ID: ${createOrderRes.data.data.id}`);
    console.log(`   Status: ${createOrderRes.data.data.status}`);
    const orderId = createOrderRes.data.data.id;

    // Test 4: Get Menu
    console.log('\nTest 4: Get Menu (no authentication)');
    console.log('GET /menu');
    const menuRes = await axios.get(`${API_URL}/menu`);
    console.log('✅ Menu fetched successfully');
    console.log(`   Categories: ${Object.keys(menuRes.data.data).join(', ')}`);

    // Test 5: Get Health
    console.log('\nTest 5: Health Check');
    console.log('GET /health');
    const healthRes = await axios.get(`${API_URL}/health`);
    console.log('✅ API is healthy');
    console.log(`   Environment: ${healthRes.data.data.environment}`);

    // Test 6: Create Order without Auth (should fail)
    console.log('\nTest 6: Create Order without Auth (should fail)');
    console.log('POST /orders');
    try {
      await axios.post(`${API_URL}/orders`, testData.order);
      console.log('❌ FAILED - Request should have been rejected');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Request correctly rejected (401 Unauthorized)');
        console.log(`   Error: ${error.response.data.error}`);
      } else {
        throw error;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Check if server is running
setTimeout(() => {
  axios
    .get(`${API_URL}/health`)
    .then(() => {
      console.log('✅ Connected to API server\n');
      runTests();
    })
    .catch(() => {
      console.error('❌ Could not connect to API server at', API_URL);
      console.error('Make sure to start the server with: node index.js');
      process.exit(1);
    });
}, 1000);
