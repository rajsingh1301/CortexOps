// src/db.js
//
// Thin query layer used by the API (index.js) for the dashboard.
// The Go agent owns writing new decisions from the observe/reason loop;
// this module is mainly for reads (dashboard feed, approval queue) plus
// the approve/reject state transition, which is a UI-triggered action
// that then hands off to the Go ccloud wrapper for execution.

import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.COCKROACH_CONN_STRING || process.env.DATABASE_URL,
});

export async function listDecisions({ status, limit = 50 } = {}) {
  const params = [];
  let where = "";
  if (status) {
    params.push(status);
    where = `WHERE status = $${params.length}`;
  }
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT id, action_type, trigger_source, reasoning_text, confidence,
            ccloud_command, status, outcome, created_at, resolved_at
     FROM decisions
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

export async function similarDecisions(queryEmbedding, limit = 5) {
  const vectorStr = Array.isArray(queryEmbedding)
    ? `[${queryEmbedding.join(",")}]`
    : queryEmbedding;
  const { rows } = await pool.query(
    `SELECT id, action_type, reasoning_text, confidence, ccloud_command, status, outcome, created_at
     FROM decisions
     ORDER BY embedding <-> $1
     LIMIT $2`,
    [vectorStr, limit]
  );
  return rows;
}

export async function setDecisionStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE decisions SET status = $2, resolved_at = CASE WHEN $2 IN ('executed','rejected') THEN now() ELSE resolved_at END
     WHERE id = $1
     RETURNING id, status`,
    [id, status]
  );
  return rows[0];
}

export async function recordOutcome(id, outcome) {
  const { rows } = await pool.query(
    `UPDATE decisions SET outcome = $2 WHERE id = $1 RETURNING id, outcome`,
    [id, outcome]
  );
  return rows[0];
}

export async function getDecisionById(id) {
  const { rows } = await pool.query(
    `SELECT id, action_type, trigger_source, reasoning_text, confidence,
            ccloud_command, status, outcome, created_at, resolved_at
     FROM decisions
     WHERE id = $1`,
    [id]
  );
  return rows[0];
}

export async function getLatestSnapshot() {
  const { rows } = await pool.query(
    `SELECT id, cpu_percent, active_queries, contention_events, replication_status, raw_mcp_response, captured_at
     FROM cluster_snapshots
     ORDER BY captured_at DESC
     LIMIT 1`
  );
  return rows[0];
}

export async function insertSnapshot({
  cpuPercent,
  activeQueries,
  contentionEvents = 0,
  replicationStatus = "healthy",
  raw = {}
}) {
  const { rows } = await pool.query(
    `INSERT INTO cluster_snapshots (cpu_percent, active_queries, contention_events, replication_status, raw_mcp_response, captured_at)
     VALUES ($1, $2, $3, $4, $5, now())
     RETURNING id, cpu_percent, active_queries, contention_events, replication_status, captured_at`,
    [cpuPercent, activeQueries, contentionEvents, replicationStatus, JSON.stringify(raw)]
  );
  return rows[0];
}

export async function insertDecision({
  actionType,
  triggerSource = "anomaly_detector",
  reasoningText,
  embedding,
  confidence = 0.9,
  ccloudCommand = null,
  status = "proposed"
}) {
  const vectorStr = Array.isArray(embedding) ? `[${embedding.join(",")}]` : embedding;
  const { rows } = await pool.query(
    `INSERT INTO decisions (action_type, trigger_source, reasoning_text, embedding, confidence, ccloud_command, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, action_type, trigger_source, reasoning_text, confidence, ccloud_command, status, created_at`,
    [actionType, triggerSource, reasoningText, vectorStr, confidence, ccloudCommand, status]
  );
  return rows[0];
}


