// src/db.js
//
// Thin query layer used by the API (index.js) for the dashboard.
// Supports dynamic cluster connection, auto-schema migration, and graceful fallback.

import pg from "pg";

let activeConnString = process.env.COCKROACH_CONN_STRING || process.env.DATABASE_URL || "";
let pool = activeConnString ? new pg.Pool({ connectionString: activeConnString, connectionTimeoutMillis: 5000 }) : null;
let isConnected = false;

// Attempt initial connection test and auto schema setup if connection string exists
if (pool) {
  testAndInitSchema(pool)
    .then(() => {
      isConnected = true;
      console.log("✓ CockroachDB connected & schema initialized successfully!");
    })
    .catch((err) => {
      console.warn("! Initial CockroachDB connection pending:", err.message);
      isConnected = false;
    });
}

export function isDbConnected() {
  return isConnected && pool !== null;
}

export function getActiveConnectionString() {
  return activeConnString;
}

export async function testAndInitSchema(targetPool) {
  // Test connection
  await targetPool.query("SELECT 1;");
  
  // Create tables if they do not exist
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS cluster_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cpu_percent FLOAT8 NOT NULL,
      active_queries INT8 NOT NULL,
      contention_events INT8 DEFAULT 0,
      replication_status STRING DEFAULT 'healthy',
      raw_mcp_response JSONB,
      captured_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action_type STRING NOT NULL,
      trigger_source STRING DEFAULT 'anomaly_detector',
      reasoning_text STRING NOT NULL,
      embedding VECTOR(1024),
      confidence FLOAT8 DEFAULT 0.9,
      ccloud_command STRING,
      status STRING DEFAULT 'proposed',
      outcome STRING,
      created_at TIMESTAMPTZ DEFAULT now(),
      resolved_at TIMESTAMPTZ
    );
  `);
}

export async function updateConnection(newConnString) {
  const testPool = new pg.Pool({ connectionString: newConnString, connectionTimeoutMillis: 6000 });
  try {
    await testAndInitSchema(testPool);
    if (pool) {
      pool.end().catch(() => {});
    }
    pool = testPool;
    activeConnString = newConnString;
    isConnected = true;
    return { success: true, message: "Connected to CockroachDB cluster and initialized schema tables successfully." };
  } catch (err) {
    testPool.end().catch(() => {});
    throw new Error(`Connection test failed: ${err.message}`);
  }
}

export async function listDecisions({ status, limit = 50 } = {}) {
  if (!pool || !isConnected) return [];
  try {
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
  } catch (err) {
    console.warn("[listDecisions] Warning:", err.message);
    return [];
  }
}

export async function similarDecisions(queryEmbedding, limit = 5) {
  if (!pool || !isConnected) return [];
  try {
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
  } catch (err) {
    console.warn("[similarDecisions] Warning:", err.message);
    return [];
  }
}

export async function setDecisionStatus(id, status) {
  if (!pool || !isConnected) return null;
  const { rows } = await pool.query(
    `UPDATE decisions SET status = $2, resolved_at = CASE WHEN $2 IN ('executed','rejected') THEN now() ELSE resolved_at END
     WHERE id = $1
     RETURNING id, status`,
    [id, status]
  );
  return rows[0];
}

export async function recordOutcome(id, outcome) {
  if (!pool || !isConnected) return null;
  const { rows } = await pool.query(
    `UPDATE decisions SET outcome = $2 WHERE id = $1 RETURNING id, outcome`,
    [id, outcome]
  );
  return rows[0];
}

export async function getDecisionById(id) {
  if (!pool || !isConnected) return null;
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
  if (!pool || !isConnected) return null;
  try {
    const { rows } = await pool.query(
      `SELECT id, cpu_percent, active_queries, contention_events, replication_status, raw_mcp_response, captured_at
       FROM cluster_snapshots
       ORDER BY captured_at DESC
       LIMIT 1`
    );
    return rows[0];
  } catch (err) {
    console.warn("[getLatestSnapshot] Warning:", err.message);
    return null;
  }
}

export async function insertSnapshot({
  cpuPercent,
  activeQueries,
  contentionEvents = 0,
  replicationStatus = "healthy",
  raw = {}
}) {
  if (!pool || !isConnected) return null;
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
  if (!pool || !isConnected) return null;
  const vectorStr = Array.isArray(embedding) ? `[${embedding.join(",")}]` : embedding;
  const { rows } = await pool.query(
    `INSERT INTO decisions (action_type, trigger_source, reasoning_text, embedding, confidence, ccloud_command, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, action_type, trigger_source, reasoning_text, confidence, ccloud_command, status, created_at`,
    [actionType, triggerSource, reasoningText, vectorStr, confidence, ccloudCommand, status]
  );
  return rows[0];
}
