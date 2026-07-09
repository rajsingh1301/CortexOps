-- Sample rows for local testing of the vector search UI before the real
-- agent loop is producing genuine embeddings. Embeddings below are
-- truncated placeholders — replace with real Bedrock Titan output
-- (1536 dims) once node-orchestrator/src/bedrock.js is wired up.
--
-- Run: cockroach sql --url "$COCKROACH_CONN_STRING" -f db/seed.sql
-- NOTE: this file assumes embeddings will be generated and inserted via
-- the seed_embeddings.js helper script (see node-orchestrator/scripts),
-- since hand-writing 1536-dim vectors isn't practical. The rows below
-- insert with a NULL embedding first; run the helper script afterward
-- to backfill embeddings for these reasoning_text values.

SET DATABASE = infra_historian;

INSERT INTO decisions (action_type, trigger_source, reasoning_text, confidence, skills_consulted, ccloud_command, status)
VALUES
    ('backup', 'scheduled',
     'Nightly backup window reached with no active long-running jobs (checked via MCP job table). Proceeding with routine backup per operations-and-lifecycle skill guidance.',
     0.95, ARRAY['operations-and-lifecycle'], 'ccloud backup create --cluster infra-historian-demo', 'proposed'),

    ('no_action', 'cpu_alert',
     'CPU spiked to 62% for 3 minutes. Checked statement statistics via MCP: spike matches a known nightly ANALYZE job, not user query load. performance-and-scaling skill confirms this pattern is expected maintenance activity. No action needed.',
     0.88, ARRAY['performance-and-scaling'], NULL, 'executed'),

    ('schema_review', 'manual',
     'User requested a new index on the decisions table for status lookups. query-and-schema-design skill flagged that a single-column index on a low-cardinality field (status has 5 values) may not be worth the write overhead; recommended monitoring query patterns for 48h before adding.',
     0.71, ARRAY['application-development'], NULL, 'proposed'),

    ('scale_up', 'cpu_alert',
     'Sustained CPU above 80% for 15 minutes correlated with a 3x increase in active_queries (per cluster_snapshots). This does not match any known maintenance pattern from prior incidents. Recommending an additional node per performance-and-scaling guidance.',
     0.82, ARRAY['performance-and-scaling'], 'ccloud cluster scale --nodes +1 --cluster infra-historian-demo', 'proposed');

INSERT INTO cluster_snapshots (cpu_percent, active_queries, contention_events, replication_status, raw_mcp_response)
VALUES
    (18.2, 4, 0, 'healthy', '{"note": "baseline snapshot"}'),
    (62.0, 6, 1, 'healthy', '{"note": "nightly ANALYZE job"}'),
    (81.5, 19, 3, 'healthy', '{"note": "sustained load spike"}');
