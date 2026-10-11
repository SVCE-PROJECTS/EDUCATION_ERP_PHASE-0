/**
 * Schedules API Test Script (Node.js)
 * Tests all CRUD operations on /api/schedules endpoints
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const AUTH_URL = `${BASE_URL}/auth/login`;
const SCHEDULES_URL = `${BASE_URL}/schedules`;

// Test credentials (adjust based on your database)
const USERNAME = 'faculty1';
const PASSWORD = 'password123';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

let token = '';
let scheduleId = null;

// Helper function to log with color
function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Test functions
async function login() {
  log('\n[1] Logging in to get authentication token...', 'yellow');
  try {
    const response = await axios.post(AUTH_URL, {
      username: USERNAME,
      password: PASSWORD,
    });
    
    token = response.data.accessToken;
    log(`✓ Login successful (Status: ${response.status})`, 'green');
    log(`Token: ${token.substring(0, 20)}...`);
    return true;
  } catch (error) {
    log(`❌ Login failed: ${error.message}`, 'red');
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

async function getAllSchedules(step, description) {
  log(`\n[${step}] GET /api/schedules - ${description}`, 'yellow');
  try {
    const response = await axios.get(SCHEDULES_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    log(`Status Code: ${response.status}`, 'green');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    return response;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    log(`Status Code: ${error.response?.status}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

async function createSchedule() {
  log('\n[3] POST /api/schedules - Create new schedule', 'yellow');
  
  const today = new Date().toISOString().split('T')[0];
  const scheduleData = {
    title: 'Test Meeting',
    description: 'Testing schedules API',
    date: today,
    start_time: '10:00:00',
  };
  
  try {
    const response = await axios.post(SCHEDULES_URL, scheduleData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    scheduleId = response.data.schedule_id;
    log(`Status Code: ${response.status}`, 'green');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    log(`Created Schedule ID: ${scheduleId}`, 'green');
    return response;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    log(`Status Code: ${error.response?.status}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

async function getSchedulesWithFilter() {
  log('\n[5] GET /api/schedules?from&to - Filter by date', 'yellow');
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const response = await axios.get(SCHEDULES_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params: { from: today, to: today },
    });
    
    log(`Status Code: ${response.status}`, 'green');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    return response;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    log(`Status Code: ${error.response?.status}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

async function updateSchedule() {
  log(`\n[6] PUT /api/schedules/${scheduleId} - Update schedule`, 'yellow');
  
  const today = new Date().toISOString().split('T')[0];
  const updateData = {
    title: 'Updated Test Meeting',
    description: 'Updated description',
    date: today,
    start_time: '11:00:00',
    status: 'pending',
  };
  
  try {
    const response = await axios.put(`${SCHEDULES_URL}/${scheduleId}`, updateData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    log(`Status Code: ${response.status}`, 'green');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    return response;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    log(`Status Code: ${error.response?.status}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

async function markAsCompleted() {
  log(`\n[7] PATCH /api/schedules/${scheduleId}/complete - Mark as completed`, 'yellow');
  
  try {
    const response = await axios.patch(`${SCHEDULES_URL}/${scheduleId}/complete`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    log(`Status Code: ${response.status}`, 'green');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    return response;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    log(`Status Code: ${error.response?.status}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

async function markAsPending() {
  log(`\n[8] PATCH /api/schedules/${scheduleId}/pending - Mark as pending`, 'yellow');
  
  try {
    const response = await axios.patch(`${SCHEDULES_URL}/${scheduleId}/pending`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    log(`Status Code: ${response.status}`, 'green');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    return response;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    log(`Status Code: ${error.response?.status}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

async function deleteSchedule() {
  log(`\n[9] DELETE /api/schedules/${scheduleId} - Delete schedule`, 'yellow');
  
  try {
    const response = await axios.delete(`${SCHEDULES_URL}/${scheduleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    log(`Status Code: ${response.status}`, 'green');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`);
    return response;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    log(`Status Code: ${error.response?.status}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

// Main test execution
async function runTests() {
  log('============================================================', 'yellow');
  log('SCHEDULES API TEST', 'yellow');
  log('============================================================', 'yellow');
  
  try {
    // 1. Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      log('\n❌ Cannot continue without authentication', 'red');
      process.exit(1);
    }
    
    // 2. Get all schedules (initial state)
    await getAllSchedules(2, 'List all schedules (initial)');
    
    // 3. Create a schedule
    const createResponse = await createSchedule();
    if (!createResponse || !scheduleId) {
      log('\n❌ Cannot continue without creating a schedule', 'red');
      process.exit(1);
    }
    
    // 4. Get all schedules (after creation)
    await getAllSchedules(4, 'List schedules after creation');
    
    // 5. Get schedules with date filter
    await getSchedulesWithFilter();
    
    // 6. Update schedule
    await updateSchedule();
    
    // 7. Mark as completed
    await markAsCompleted();
    
    // 8. Mark as pending
    await markAsPending();
    
    // 9. Delete schedule
    await deleteSchedule();
    
    // 10. Verify deletion
    await getAllSchedules(10, 'Verify schedule was deleted');
    
    log('\n============================================================', 'green');
    log('ALL TESTS COMPLETED', 'green');
    log('============================================================', 'green');
    
  } catch (error) {
    log(`\n❌ Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the tests
runTests();
