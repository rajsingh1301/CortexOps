#!/usr/bin/env bash
# Starts a throwaway local stack for recording docs/demo/demo.tape.
# Uses an insecure single-node CockroachDB on localhost:26300, the orchestrator
# in mock-Bedrock mode, and go-agent in ccloud dry-run mode. No real credentials.
#
# Usage: DEMO_DIR=/tmp/cortexops-demo docs/demo/setup.sh   (stop with: docs/demo/teardown.sh)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEMO_DIR="${DEMO_DIR:-$(mktemp -d)}"
mkdir -p "$DEMO_DIR/crdb" "$DEMO_DIR/home/.cortexops"
CONN="postgresql://root@localhost:26300/infra_historian?sslmode=disable"

cockroach start-single-node --insecure --store="$DEMO_DIR/crdb" \
  --listen-addr=localhost:26300 --http-addr=localhost:8090 --background >"$DEMO_DIR/crdb.log" 2>&1
sleep 4
cockroach sql --insecure --host=localhost:26300 -f "$ROOT/db/schema.sql" >/dev/null

COMMON_ENV=(env -i PATH="$PATH" HOME="$DEMO_DIR/home" COCKROACH_CONN_STRING="$CONN")

( cd "$ROOT/node-orchestrator" && exec "${COMMON_ENV[@]}" USE_MOCK_BEDROCK=true \
    BEDROCK_EMBEDDING_MODEL_ID=cohere.embed-english-v3 PORT=4000 GO_AGENT_URL=http://localhost:5005 \
    node src/index.js ) >"$DEMO_DIR/orchestrator.log" 2>&1 </dev/null &
echo $! >"$DEMO_DIR/orchestrator.pid"
sleep 3

( cd "$ROOT/go-agent" && go build -o "$DEMO_DIR/go-agent" . )
( exec "${COMMON_ENV[@]}" COCKROACH_MCP_ENDPOINT=http://localhost:0 COCKROACH_MCP_API_KEY=your-service-account-api-key \
    CCLOUD_CLUSTER_NAME=demo-cluster CCLOUD_DRY_RUN=true NODE_ORCHESTRATOR_URL=http://localhost:4000 \
    "$DEMO_DIR/go-agent" ) >"$DEMO_DIR/go-agent.log" 2>&1 </dev/null &
echo $! >"$DEMO_DIR/go-agent.pid"
sleep 4   # let go-agent's startup cycle finish; the seed below replaces its rows

cockroach sql --insecure --host=localhost:26300 -f "$ROOT/docs/demo/seed-demo.sql" >/dev/null
(cd "$ROOT/node-orchestrator" && "${COMMON_ENV[@]}" USE_MOCK_BEDROCK=true \
  BEDROCK_EMBEDDING_MODEL_ID=cohere.embed-english-v3 node scripts/backfill_embeddings.js)

cat >"$DEMO_DIR/home/.cortexops/config.yaml" <<YAML
active_cluster: demo-cluster
clusters:
  demo-cluster:
    label: Demo Cluster
api_url: http://localhost:4000
onboarding_completed: true
YAML

echo "Demo stack ready. DEMO_DIR=$DEMO_DIR"
echo "Record with: HOME=$DEMO_DIR/home PATH=<dir containing cortexops>:\$PATH vhs docs/demo/demo.tape"
