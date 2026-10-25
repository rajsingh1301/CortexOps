#!/usr/bin/env bash
# Stops the demo stack started by setup.sh. Usage: DEMO_DIR=<same dir> docs/demo/teardown.sh
set -u
: "${DEMO_DIR:?set DEMO_DIR to the directory used by setup.sh}"
for p in orchestrator go-agent; do [ -f "$DEMO_DIR/$p.pid" ] && kill "$(cat "$DEMO_DIR/$p.pid")" 2>/dev/null; done
pkill -f "cockroach start-single-node --insecure --store=$DEMO_DIR/crdb" 2>/dev/null
echo "stopped"
