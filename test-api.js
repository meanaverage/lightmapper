#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors/safe');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper function to make requests
async function makeRequest(method, path, data = null, requiresAuth = true) {
  const headers = {};
  if (requiresAuth) {
    headers['X-API-Key'] = API_KEY;
  }
  
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${path}`,
      data,
      headers,
      validateStatus: () => true // Don't throw on any status
    });
    return response;
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

// Test function
async function test(name, testFn) {
  totalTests++;
  process.stdout.write(`Testing: ${name}... `);
  
  try {
    await testFn();
    passedTests++;
    console.log(colors.green('✓ PASSED'));
  } catch (error) {
    failedTests++;
    console.log(colors.red('✗ FAILED'));
    console.log(colors.red(`  Error: ${error.message}`));
  }
}

// Assert function
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Main test suite
async function runTests() {
  console.log(colors.bold('\n🧪 LightMapper API Test Suite\n'));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : 'Not set'}\n`);
  
  // System Endpoints
  console.log(colors.bold.underline('System Endpoints:'));
  
  await test('GET /health', async () => {
    const res = await makeRequest('GET', '/health', null, false);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.status === 'ok', 'Health status should be ok');
    assert(res.data.timestamp, 'Should have timestamp');
  });
  
  // Scene Management
  console.log(colors.bold.underline('\nScene Management:'));
  
  let createdSceneId;
  
  await test('GET /api/internal/scenes', async () => {
    const res = await makeRequest('GET', '/api/internal/scenes');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Should return array');
  });
  
  await test('POST /api/internal/scenes', async () => {
    const newScene = {
      name: 'Test Scene',
      lights: {
        'light.test': { on: true, brightness: 100 }
      }
    };
    const res = await makeRequest('POST', '/api/internal/scenes', newScene);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.id, 'Should return scene ID');
    createdSceneId = res.data.id;
  });
  
  await test('GET /api/internal/scenes/:id', async () => {
    if (!createdSceneId) return;
    const res = await makeRequest('GET', `/api/internal/scenes/${createdSceneId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.name === 'Test Scene', 'Scene name should match');
  });
  
  await test('PUT /api/internal/scenes/:id', async () => {
    if (!createdSceneId) return;
    const update = { name: 'Updated Test Scene' };
    const res = await makeRequest('PUT', `/api/internal/scenes/${createdSceneId}`, update);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  await test('POST /api/internal/scenes/:id/apply', async () => {
    if (!createdSceneId) return;
    const res = await makeRequest('POST', `/api/internal/scenes/${createdSceneId}/apply`);
    assert([200, 500].includes(res.status), `Expected 200 or 500, got ${res.status}`);
  });
  
  await test('DELETE /api/internal/scenes/:id', async () => {
    if (!createdSceneId) return;
    const res = await makeRequest('DELETE', `/api/internal/scenes/${createdSceneId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  // Configuration
  console.log(colors.bold.underline('\nConfiguration:'));
  
  await test('GET /api/internal/config', async () => {
    const res = await makeRequest('GET', '/api/internal/config');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.gridSize, 'Should have gridSize');
    assert(res.data.defaults, 'Should have defaults');
  });
  
  await test('GET /api/internal/mappings', async () => {
    const res = await makeRequest('GET', '/api/internal/mappings');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Should return array');
  });
  
  await test('POST /api/internal/mappings', async () => {
    const mappings = { '1': { ha_entity_id: 'light.test', friendly_name: 'Test Light' } };
    const res = await makeRequest('POST', '/api/internal/mappings', { mappings });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  // Floorplan
  console.log(colors.bold.underline('\nFloorplan:'));
  
  await test('GET /api/internal/floorplan', async () => {
    const res = await makeRequest('GET', '/api/internal/floorplan');
    assert([200, 404].includes(res.status), `Expected 200 or 404, got ${res.status}`);
  });
  
  await test('POST /api/internal/floorplan', async () => {
    const layout = { objects: [] };
    const res = await makeRequest('POST', '/api/internal/floorplan', { layout });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  // Floorplan Lights
  console.log(colors.bold.underline('\nFloorplan Lights:'));
  
  await test('GET /api/internal/floorplan/lights', async () => {
    const res = await makeRequest('GET', '/api/internal/floorplan/lights');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.lights, 'Should have lights array');
  });
  
  await test('POST /api/internal/floorplan/lights', async () => {
    const light = { entity_id: 'light.test', position: { x: 100, y: 100 } };
    const res = await makeRequest('POST', '/api/internal/floorplan/lights', light);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  await test('GET /api/internal/floorplan/lights/:entityId', async () => {
    const res = await makeRequest('GET', '/api/internal/floorplan/lights/light.test');
    assert([200, 404].includes(res.status), `Expected 200 or 404, got ${res.status}`);
  });
  
  await test('PUT /api/internal/floorplan/lights/:entityId', async () => {
    const position = { position: { x: 200, y: 200 } };
    const res = await makeRequest('PUT', '/api/internal/floorplan/lights/light.test', position);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  await test('POST /api/internal/floorplan/lights/:entityId/highlight', async () => {
    const highlight = { duration: 1000, color: '#ff0000' };
    const res = await makeRequest('POST', '/api/internal/floorplan/lights/light.test/highlight', highlight);
    assert([200, 503].includes(res.status), `Expected 200 or 503, got ${res.status}`);
  });
  
  await test('DELETE /api/internal/floorplan/lights/:entityId', async () => {
    const res = await makeRequest('DELETE', '/api/internal/floorplan/lights/light.test');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  // Layer Operations
  console.log(colors.bold.underline('\nLayer Operations:'));
  
  await test('POST /api/internal/layers/:layerId/bring-to-front', async () => {
    const res = await makeRequest('POST', '/api/internal/layers/test-layer/bring-to-front');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  await test('POST /api/internal/layers/:layerId/send-to-back', async () => {
    const res = await makeRequest('POST', '/api/internal/layers/test-layer/send-to-back');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  await test('POST /api/internal/layers/:layerId/bring-forward', async () => {
    const res = await makeRequest('POST', '/api/internal/layers/test-layer/bring-forward');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  await test('POST /api/internal/layers/:layerId/send-backward', async () => {
    const res = await makeRequest('POST', '/api/internal/layers/test-layer/send-backward');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
  
  // Home Assistant Proxy
  console.log(colors.bold.underline('\nHome Assistant Proxy:'));
  
  await test('GET /api/lights', async () => {
    const res = await makeRequest('GET', '/api/lights', null, false);
    assert([200, 500].includes(res.status), `Expected 200 or 500, got ${res.status}`);
  });
  
  await test('GET /api/areas', async () => {
    const res = await makeRequest('GET', '/api/areas', null, false);
    assert([200, 500].includes(res.status), `Expected 200 or 500, got ${res.status}`);
  });
  
  // Summary
  console.log(colors.bold('\n📊 Test Summary:'));
  console.log(`Total tests: ${totalTests}`);
  console.log(colors.green(`Passed: ${passedTests}`));
  console.log(colors.red(`Failed: ${failedTests}`));
  
  if (failedTests === 0) {
    console.log(colors.green.bold('\n✅ All tests passed!'));
  } else {
    console.log(colors.red.bold(`\n❌ ${failedTests} test(s) failed`));
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(colors.red('Fatal error running tests:'), error);
  process.exit(1);
});