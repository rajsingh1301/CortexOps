-- Infrastructure Historian — CockroachDB Schema
-- Run against your CockroachDB Cloud cluster:
--   cockroach sql --url "$COCKROACH_CONN_STRING" -f db/schema.sql

CREATE DATABASE IF NOT EXISTS infra_historian;
SET DATABASE = infra_historian;

-- =========================================================================
-- decisions: the core memory journal.
-- Every time the agent observes something and decides (or decides not to)
-- take an action, a row goes here. embedding lets us semantically search
-- "why did you ..." questions later. status tracks the approval workflow.
-- =========================================================================
CREATE TABLE IF NOT EXISTS decisions (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type        STRING NOT NULL,          -- e.g. 'backup', 'scale_up', 'no_action', 'schema_review'
    trigger_source     STRING,                    -- e.g. 'scheduled', 'cpu_alert', 'manual'
    reasoning_text     STRING NOT NULL,           -- human-readable "why" — this is what gets embedded
    embedding          VECTOR(1536),               -- Bedrock Titan embedding of reasoning_text
    confidence         FLOAT,                      -- 0.0–1.0, model's self-reported confidence
    mcp_context        JSONB,                      -- snapshot of cluster state that informed this decision
    skills_consulted   STRING[],                   -- names of Agent Skills consulted, e.g. {'performance-and-scaling'}
    ccloud_command     STRING,                      -- the actual command proposed/executed, if any
    status             STRING NOT NULL DEFAULT 'proposed', -- proposed | approved | rejected | executed | failed
    outcome            STRING,                     -- what happened after execution, filled in later
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at        TIMESTAMPTZ
);

-- Vector index for semantic "why did you..." search (CockroachDB C-SPANN).
-- cosine distance is the safest default for normalized embeddings (Titan/OpenAI).
CREATE VECTOR INDEX IF NOT EXISTS decisions_embedding_idx
    ON decisions (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS decisions_status_idx ON decisions (status);
CREATE INDEX IF NOT EXISTS decisions_created_at_idx ON decisions (created_at DESC);

-- =========================================================================
-- ccloud_command_log: raw audit trail of every ccloud CLI invocation.
-- Separate from `decisions` so we keep a strict, append-only record of
-- exactly what was executed, independent of the reasoning narrative.
-- =========================================================================
CREATE TABLE IF NOT EXISTS ccloud_command_log (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    decision_id   UUID REFERENCES decisions(id),
    command       STRING NOT NULL,
    args          JSONB,
    exit_code     INT,
    stdout        STRING,
    stderr        STRING,
    executed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_by   STRING       -- 'agent' or a human user id, if manually approved/run
);

-- =========================================================================
-- skill_invocations: which CockroachDB Agent Skill was consulted, with what
-- input, and what structured guidance it returned. Lets us later prove
-- (and debug) that the agent used skills correctly, not just "sometimes".
-- =========================================================================
CREATE TABLE IF NOT EXISTS skill_invocations (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    decision_id     UUID REFERENCES decisions(id),
    skill_name      STRING NOT NULL,       -- e.g. 'performance-and-scaling/diagnose-cpu-spike'
    input_summary   JSONB,
    output_summary  JSONB,
    invoked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- cluster_snapshots: periodic read-only observations pulled via the
-- Managed MCP Server. Time-series of cluster health independent of whether
-- any decision was made from it — useful for trend detection later.
-- =========================================================================
CREATE TABLE IF NOT EXISTS cluster_snapshots (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cpu_percent        FLOAT,
    active_queries     INT,
    contention_events  INT,
    replication_status STRING,
    raw_mcp_response   JSONB,
    captured_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cluster_snapshots_captured_at_idx
    ON cluster_snapshots (captured_at DESC);
