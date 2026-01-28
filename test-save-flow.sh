#!/bin/bash

# Test script for project save/load flow
# Usage: ./test-save-flow.sh [BASE_URL]

BASE_URL="${1:-http://localhost:3000}"

echo "=== Testing Project Save/Load Flow ==="
echo "Base URL: $BASE_URL"
echo ""

# Sample nodes representing the imported YAML
NODES_V1='[
  {
    "id": "node-1",
    "type": "KindNode",
    "position": {"x": 100, "y": 100},
    "data": {"kind": "Deployment", "type": "Deployment", "values": {"kind": "Deployment", "apiVersion": "apps/v1"}}
  },
  {
    "id": "node-2",
    "type": "KindNode",
    "position": {"x": 100, "y": 300},
    "data": {"kind": "Service", "type": "Service", "values": {"kind": "Service", "apiVersion": "v1"}}
  }
]'

EDGES_V1='[]'

# Version 2: Remove the Service node
NODES_V2='[
  {
    "id": "node-1",
    "type": "KindNode",
    "position": {"x": 150, "y": 150},
    "data": {"kind": "Deployment", "type": "Deployment", "values": {"kind": "Deployment", "apiVersion": "apps/v1"}}
  }
]'

EDGES_V2='[]'

echo "Step 1: Create new project with 2 nodes"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"test-save-$(date +%s)\",
    \"nodes\": $NODES_V1,
    \"edges\": $EDGES_V1,
    \"message\": \"Initial version with 2 nodes\"
  }")

echo "Response: $CREATE_RESPONSE"
echo ""

# Extract project ID
PROJECT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Project ID: $PROJECT_ID"

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: Failed to create project"
  exit 1
fi

echo ""
echo "Step 2: Load project to verify initial state"
GET_RESPONSE=$(curl -s "$BASE_URL/api/projects/$PROJECT_ID")
NODE_COUNT=$(echo "$GET_RESPONSE" | grep -o '"id":"node-' | wc -l)
echo "Loaded project has $NODE_COUNT nodes"
echo ""

echo "Step 3: Update project - remove Service node (keep only 1 node)"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/projects/$PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"nodes\": $NODES_V2,
    \"edges\": $EDGES_V2,
    \"message\": \"Removed Service node\"
  }")

echo "Update Response: $UPDATE_RESPONSE"
echo ""

echo "Step 4: Get version history"
VERSIONS_RESPONSE=$(curl -s "$BASE_URL/api/projects/$PROJECT_ID/versions")
VERSION_COUNT=$(echo "$VERSIONS_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
echo "Project now has $VERSION_COUNT versions"
echo "Versions: $VERSIONS_RESPONSE"
echo ""

echo "Step 5: Reload project to verify save persisted"
RELOAD_RESPONSE=$(curl -s "$BASE_URL/api/projects/$PROJECT_ID")
RELOAD_NODE_COUNT=$(echo "$RELOAD_RESPONSE" | grep -o '"id":"node-' | wc -l)
echo "Reloaded project has $RELOAD_NODE_COUNT nodes"
echo ""

echo "=== VERIFICATION ==="
if [ "$RELOAD_NODE_COUNT" -eq 1 ]; then
  echo "✅ PASS: Save worked correctly - node deletion persisted"
else
  echo "❌ FAIL: Expected 1 node after save, got $RELOAD_NODE_COUNT"
  echo ""
  echo "Full reload response:"
  echo "$RELOAD_RESPONSE" | head -500
fi

echo ""
echo "Step 6: Cleanup - delete test project"
curl -s -X DELETE "$BASE_URL/api/projects/$PROJECT_ID" > /dev/null
echo "Project deleted"
