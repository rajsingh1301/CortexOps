#!/usr/bin/env bash
# Restores the seeded demo data (run before each recording; approving a decision changes it).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cockroach sql --insecure --host=localhost:26300 -f "$ROOT/docs/demo/seed-demo.sql" >/dev/null
cd "$ROOT/node-orchestrator"
env -i PATH="$PATH" COCKROACH_CONN_STRING="postgresql://root@localhost:26300/infra_historian?sslmode=disable" \
  USE_MOCK_BEDROCK=true BEDROCK_EMBEDDING_MODEL_ID=cohere.embed-english-v3 node scripts/backfill_embeddings.js >/dev/null
