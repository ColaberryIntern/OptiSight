#!/bin/bash
set -e

echo "============================================"
echo "  OptiSight AI - Validation Script"
echo "============================================"

ERRORS=0
WARNINGS=0

# ── Secret Detection ──────────────────────────────────────────────────
echo ""
echo "==> Checking for hardcoded secrets..."
SECRET_FILES=$(grep -rl --include="*.js" --include="*.jsx" --include="*.ts" --include="*.py" \
  -E "(password|secret|api_key)\s*[:=]\s*['\"][^'\"]+['\"]" . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude="knexfile.js" \
  --exclude="*.test.*" \
  --exclude="*.spec.*" \
  --exclude=".env.example" 2>/dev/null || true)

if [ -n "$SECRET_FILES" ]; then
  echo "  WARNING: Potential hardcoded secrets found in:"
  echo "$SECRET_FILES" | sed 's/^/    /'
  WARNINGS=$((WARNINGS + 1))
else
  echo "  OK: No hardcoded secrets detected."
fi

# ── Node.js Service Tests ────────────────────────────────────────────
echo ""
echo "==> Running Node.js service tests..."
for service in shared user_service data_ingestion_service analytics_service recommendation_service notification_service; do
  if [ -d "$service" ] && [ -f "$service/package.json" ]; then
    echo "  Testing $service..."
    (cd "$service" && npm test 2>&1) || { echo "  FAIL: $service tests failed"; ERRORS=$((ERRORS + 1)); }
  fi
done

# ── Frontend Tests ────────────────────────────────────────────────────
echo ""
echo "==> Running frontend tests..."
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
  (cd frontend && npm test 2>&1) || { echo "  FAIL: frontend tests failed"; ERRORS=$((ERRORS + 1)); }
fi

# ── Python AI Engine Tests ────────────────────────────────────────────
echo ""
echo "==> Running AI engine tests..."
if [ -d "ai_engine" ] && [ -f "ai_engine/requirements.txt" ]; then
  if command -v python3 &>/dev/null; then
    (cd ai_engine && python3 -m pytest tests/ -v 2>&1) || { echo "  FAIL: ai_engine tests failed"; ERRORS=$((ERRORS + 1)); }
  else
    echo "  SKIP: python3 not available"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# ── Docker Build Verification ────────────────────────────────────────
echo ""
echo "==> Verifying Docker Compose configuration..."
if command -v docker &>/dev/null; then
  docker compose config --quiet 2>&1 || { echo "  FAIL: docker-compose.yml is invalid"; ERRORS=$((ERRORS + 1)); }
  echo "  OK: Docker Compose config is valid."
else
  echo "  SKIP: docker not available"
  WARNINGS=$((WARNINGS + 1))
fi

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Validation Summary"
echo "============================================"
echo "  Errors:   $ERRORS"
echo "  Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
  echo "  RESULT: FAILED"
  exit 1
else
  echo "  RESULT: PASSED"
  exit 0
fi
