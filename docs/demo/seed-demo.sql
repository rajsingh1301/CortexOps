-- Demo data for docs/demo/demo.tape. Throwaway local cluster only.
-- Embeddings are left NULL and filled by node-orchestrator/scripts/backfill_embeddings.js.
SET DATABASE = infra_historian;

DELETE FROM decisions WHERE true;
DELETE FROM cluster_snapshots WHERE true;

INSERT INTO decisions (id, action_type, trigger_source, reasoning_text, confidence, skills_consulted, ccloud_command, status, outcome, created_at, resolved_at)
VALUES
    ('a625baf7-1361-47a1-b468-75c0b9e18c10', 'scale_up', 'cpu_alert',
     'Sustained CPU above 80% for 15 minutes, with active queries up 3x. The pattern does not match any known maintenance job. Recommending one additional node.',
     0.88, ARRAY['performance-and-scaling'], 'ccloud cluster scale --nodes +1 --cluster demo-cluster', 'proposed', NULL, now() - interval '12 minutes', NULL),

    ('3c1f9d52-7a40-4e8b-9b6e-2d5a1c7e4f01', 'schema_review', 'slow_query_detector',
     'Statement stats show a full table scan on decisions filtered by status, averaging 1.4s. An index on (status, created_at) would likely remove the scan. Review before applying.',
     0.76, ARRAY['query-and-schema-design'], NULL, 'proposed', NULL, now() - interval '35 minutes', NULL),

    ('9e7b2a64-5d13-4c08-a1f2-6b8d0e3c5a72', 'backup', 'scheduled',
     'Nightly backup window reached with no long-running jobs in the job table. Proceeding with the routine backup.',
     0.95, ARRAY['operations-and-lifecycle'], 'ccloud backup create --cluster demo-cluster', 'proposed', NULL, now() - interval '2 hours', NULL),

    ('c4d8e1f0-2b97-4a35-8e6c-1f0a9b7d3e55', 'scale_up', 'cpu_alert',
     'Last week, CPU stayed above 85% for 20 minutes after a traffic increase from a new tenant. No maintenance job explained it, so one node was added to restore headroom.',
     0.91, ARRAY['performance-and-scaling'], 'ccloud cluster scale --nodes +1 --cluster demo-cluster', 'executed',
     'Scale-up completed; CPU settled below 50% within 10 minutes.', now() - interval '7 days', now() - interval '7 days' + interval '4 minutes');

INSERT INTO cluster_snapshots (cpu_percent, active_queries, contention_events, replication_status, raw_mcp_response)
VALUES (88.5, 18, 2, 'healthy', '{"note": "demo snapshot"}');
