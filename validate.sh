#!/usr/bin/env bash
set -e

echo "========================================="
echo " OptiSight AI — Full Validation Suite"
echo "========================================="
echo ""

PASS=0
FAIL=0
SKIP=0

run_test() {
  local name="$1"
  local dir="$2"
  local cmd="$3"

  echo "--- $name ---"
  if [ ! -d "$dir" ]; then
    echo "  SKIP (directory not found)"
    SKIP=$((SKIP + 1))
    return
  fi

  if (cd "$dir" && eval "$cmd") 2>&1; then
    echo "  PASS"
    PASS=$((PASS + 1))
  else
    echo "  FAIL"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

# Install dependencies
echo "Installing shared dependencies..."
(cd shared && npm install --silent) 2>/dev/null || true
echo ""

# Run all test suites
run_test "Shared Middleware" "shared" "npx jest --ci 2>&1"
run_test "User Service" "user_service" "npm install --silent 2>/dev/null && npx jest --ci 2>&1"
run_test "Data Ingestion Service" "data_ingestion_service" "npm install --silent 2>/dev/null && npx jest --ci 2>&1"
run_test "Analytics Service" "analytics_service" "npm install --silent 2>/dev/null && npx jest --ci 2>&1"
run_test "Notification Service" "notification_service" "npm install --silent 2>/dev/null && npx jest --ci 2>&1"
run_test "Recommendation Service" "recommendation_service" "npm install --silent 2>/dev/null && npx jest --ci 2>&1"
run_test "AI Engine (Python)" "ai_engine" "python -m pytest --tb=short -q 2>&1"
run_test "Frontend (React)" "frontend" "npm install --silent 2>/dev/null && npx vitest run 2>&1"

# Summary
echo "========================================="
echo " Results: $PASS passed, $FAIL failed, $SKIP skipped"
echo "========================================="

if [ $FAIL -gt 0 ]; then
  exit 1
fi

echo "All tests passed!"
