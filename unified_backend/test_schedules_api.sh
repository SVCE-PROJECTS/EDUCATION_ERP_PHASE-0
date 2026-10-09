#!/bin/bash

# ============================================================
# Schedules API Test Script
# Tests all CRUD operations on /api/schedules endpoints
# ============================================================

# Configuration
BASE_URL="http://localhost:5000/api"
AUTH_URL="$BASE_URL/auth/login"
SCHEDULES_URL="$BASE_URL/schedules"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test credentials (use a faculty user from your seed data)
# Adjust these credentials based on your database
USERNAME="faculty1"
PASSWORD="password123"

echo "============================================================"
echo "SCHEDULES API TEST"
echo "============================================================"
echo ""

# Step 1: Login to get token
echo -e "${YELLOW}[1] Logging in to get authentication token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed. Response:${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: GET - List all schedules (should be empty initially)
echo -e "${YELLOW}[2] GET /api/schedules - List all schedules${NC}"
GET_ALL_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$SCHEDULES_URL" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$GET_ALL_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$GET_ALL_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status Code: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

# Step 3: POST - Create a new schedule
echo -e "${YELLOW}[3] POST /api/schedules - Create new schedule${NC}"
TODAY=$(date +%Y-%m-%d)
POST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$SCHEDULES_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Test Meeting\",
    \"description\": \"Testing schedules API\",
    \"date\": \"$TODAY\",
    \"start_time\": \"10:00:00\"
  }")

HTTP_STATUS=$(echo "$POST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$POST_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status Code: $HTTP_STATUS"
echo "Response: $BODY"

# Extract schedule_id from response
SCHEDULE_ID=$(echo "$BODY" | grep -o '"schedule_id":[0-9]*' | cut -d: -f2)
echo "Created Schedule ID: $SCHEDULE_ID"
echo ""

if [ -z "$SCHEDULE_ID" ]; then
  echo -e "${RED}❌ Failed to create schedule${NC}"
  exit 1
fi

# Step 4: GET - List schedules again (should show the created one)
echo -e "${YELLOW}[4] GET /api/schedules - List schedules after creation${NC}"
GET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$SCHEDULES_URL" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$GET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status Code: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

# Step 5: GET with date range filter
echo -e "${YELLOW}[5] GET /api/schedules?from=$TODAY&to=$TODAY - Filter by date${NC}"
GET_FILTERED_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$SCHEDULES_URL?from=$TODAY&to=$TODAY" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$GET_FILTERED_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$GET_FILTERED_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status Code: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

# Step 6: PUT - Update the schedule
echo -e "${YELLOW}[6] PUT /api/schedules/$SCHEDULE_ID - Update schedule${NC}"
PUT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT "$SCHEDULES_URL/$SCHEDULE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Updated Test Meeting\",
    \"description\": \"Updated description\",
    \"date\": \"$TODAY\",
    \"start_time\": \"11:00:00\",
    \"status\": \"pending\"
  }")

HTTP_STATUS=$(echo "$PUT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$PUT_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status Code: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

# Step 7: PATCH - Mark as completed
echo -e "${YELLOW}[7] PATCH /api/schedules/$SCHEDULE_ID/complete - Mark as completed${NC}"
PATCH_COMPLETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH "$SCHEDULES_URL/$SCHEDULE_ID/complete" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$PATCH_COMPLETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$PATCH_COMPLETE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status Code: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

# Step 8: PATCH - Mark as pending again
echo -e "${YELLOW}[8] PATCH /api/schedules/$SCHEDULE_ID/pending - Mark as pending${NC}"
PATCH_PENDING_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH "$SCHEDULES_URL/$SCHEDULE_ID/pending" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$PATCH_PENDING_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$PATCH_PENDING_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status Code: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

# Step 9: DELETE - Delete the schedule
echo -e "${YELLOW}[9] DELETE /api/schedules/$SCHEDULE_ID - Delete schedule${NC}"
DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "$SCHEDULES_URL/$SCHEDULE_ID" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status Code: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

# Step 10: Verify deletion
echo -e "${YELLOW}[10] GET /api/schedules - Verify schedule was deleted${NC}"
VERIFY_DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$SCHEDULES_URL" \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$VERIFY_DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$VERIFY_DELETE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status Code: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}ALL TESTS COMPLETED${NC}"
echo -e "${GREEN}============================================================${NC}"
