import "dotenv/config";
import express from "express";
import cors from "cors";
import { embed, reason } from "./bedrock.js";
import { 
  listDecisions, 
  similarDecisions, 
  setDecisionStatus, 
  recordOutcome, 
  getDecisionById, 
  getLatestSnapshot, 
  insertDecision, 
  insertSnapshot,
  isDbConnected,
  getActiveConnectionString,
  updateConnection
} from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// GET /cluster/status
app.get("/cluster/status", (req, res) => {
  const connected = isDbConnected();
  const connStr = getActiveConnectionString();
  let clusterName = "CockroachDB";
  if (connStr) {
    const match = connStr.match(/@([^:/]+)/);
    if (match && match[1]) clusterName = match[1];
  }
  return res.json({
    connected,
    clusterName: connected ? clusterName : "Not Connected",
    message: connected ? "CockroachDB cluster is online and reachable" : "No active CockroachDB cluster connected"
  });
});

// POST /cluster/connect -> user connects cluster directly from web dashboard
app.post("/cluster/connect", async (req, res) => {
  const { connectionString, label } = req.body || {};
  if (!connectionString || !connectionString.trim()) {
    return res.status(400).json({ error: "CockroachDB connection string is required." });
  }

  try {
    const cleanStr = connectionString.trim().replace(/^['"]|['"]$/g, '');
    const result = await updateConnection(cleanStr);
    return res.json({
      success: true,
      cluster: label || "cockroachdb",
      message: result.message
    });
  } catch (err) {
    console.error("[POST /cluster/connect Error]", err.message);
    return res.status(400).json({ error: err.message });
  }
});

// GET /cluster/health
app.get("/cluster/health", async (req, res) => {
  if (!isDbConnected()) {
    return res.json({
      connected: false,
      cpu_percent: null,
      active_queries: null,
      contention_events: 0,
      replication_status: "disconnected",
      captured_at: new Date().toISOString(),
    });
  }

  try {
    const snapshot = await getLatestSnapshot();
    if (snapshot) {
      return res.json({ ...snapshot, connected: true });
    }
    return res.json({
      connected: true,
      cpu_percent: 22.5,
      active_queries: 5,
      contention_events: 0,
      replication_status: "healthy",
      captured_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[GET /cluster/health Warning]`, err.message);
    return res.json({
      connected: false,
      cpu_percent: null,
      active_queries: null,
      contention_events: 0,
      replication_status: "disconnected",
      captured_at: new Date().toISOString(),
    });
  }
});

// POST /reason (called by go-agent)
app.post("/reason", async (req, res) => {
  const { mcpContext, situation, relevantSkills = [] } = req.body || {};

  if (!mcpContext || !situation) {
    return res.status(400).json({ error: "Invalid payload: 'mcpContext' and 'situation' are required." });
  }

  try {
    // 1. Generate query embedding for situation
    const queryEmbedding = await embed(situation);

    // 2. Retrieve top 3 similar past decisions from DB
    const similarPastDecisions = await similarDecisions(queryEmbedding, 3);

    // 3. Ask Bedrock model for reasoning & decision
    const aiDecision = await reason({
      mcpContext,
      relevantSkills,
      similarPastDecisions,
    });

    // 4. Generate embedding for the reasoning text
    const decisionEmbedding = await embed(aiDecision.reasoningText || "");

    // 5. Return structured decision to go-agent
    return res.json({
      actionType: aiDecision.actionType,
      reasoningText: aiDecision.reasoningText,
      embedding: decisionEmbedding,
      confidence: aiDecision.confidence,
      ccloudCommand: aiDecision.ccloudCommand || null,
    });
  } catch (err) {
    console.error(`[POST /reason Error] situation: ${situation}, error:`, err.message);
    return res.status(500).json({ error: `Failed to process reasoning request: ${err.message}` });
  }
});

// GET /decisions?status=proposed
app.get("/decisions", async (req, res) => {
  try {
    const rows = await listDecisions({ status: req.query.status });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /decisions/:id/approve -> triggers go-agent execution at :5000/execute
app.post("/decisions/:id/approve", async (req, res) => {
  const { id } = req.params;
  try {
    const decision = await getDecisionById(id);
    if (!decision) {
      return res.status(404).json({ error: `Decision with ID ${id} not found.` });
    }

    const goAgentUrl = process.env.GO_AGENT_URL || "http://localhost:5005";
    const response = await fetch(`${goAgentUrl}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decisionId: id,
        actionType: decision.action_type,
      }),
    });

    const resultData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = resultData.error || resultData.Stdout || `HTTP ${response.status} from go-agent`;
      await setDecisionStatus(id, "failed");
      await recordOutcome(id, `Execution failed: ${errorMsg}`);
      return res.status(500).json({
        id,
        status: "failed",
        error: errorMsg,
      });
    }

    const outcomeText = resultData.Stdout || JSON.stringify(resultData);
    await setDecisionStatus(id, "executed");
    await recordOutcome(id, outcomeText);

    return res.json({
      id,
      status: "executed",
      outcome: outcomeText,
      result: resultData,
    });
  } catch (err) {
    console.error(`[POST /decisions/:id/approve Error] id: ${id}, error:`, err.message);
    try {
      await setDecisionStatus(id, "failed");
      await recordOutcome(id, `Execution error: ${err.message}`);
    } catch (_) {}
    return res.status(500).json({ error: `Failed to approve and execute decision: ${err.message}` });
  }
});

app.post("/decisions/:id/reject", async (req, res) => {
  try {
    const updated = await setDecisionStatus(req.params.id, "rejected");
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /search?q=why did you scale up last week
app.get("/search", async (req, res) => {
  const question = req.query.q;
  if (!question) {
    return res.status(400).json({ error: "missing ?q= query param" });
  }
  try {
    const queryEmbedding = await embed(question);
    const matches = await similarDecisions(queryEmbedding, 5);
    res.json({ question, matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /simulate/spike — Simulates a high CPU / active query spike & triggers AI Agent
app.post("/simulate/spike", async (req, res) => {
  try {
    const cpu = req.body.cpu || 88.5;
    const queries = req.body.queries || 18;
    const situation = `Critical CPU spike to ${cpu}% with ${queries} active queries exceeding threshold`;
    const mcpContext = {
      cpu_percent: cpu,
      active_queries: queries,
      contention_events: 2,
      replication_status: "healthy",
      captured_at: new Date().toISOString()
    };

    // Store the spike telemetry snapshot into CockroachDB cluster_snapshots
    await insertSnapshot({
      cpuPercent: cpu,
      activeQueries: queries,
      contentionEvents: 2,
      replicationStatus: "healthy",
      raw: mcpContext
    }).catch(err => console.error("Error inserting snapshot:", err.message));

    const relevantSkills = [
      {
        name: "performance-and-scaling",
        body: "Guidance: When sustained CPU usage exceeds 75% for > 10m correlated with query load increase, recommend scaling up cluster nodes (+1)."
      }
    ];

    const queryEmbedding = await embed(situation);
    const similarPastDecisions = await similarDecisions(queryEmbedding, 2);
    const aiDecision = await reason({ mcpContext, relevantSkills, similarPastDecisions });
    const decisionEmbedding = await embed(aiDecision.reasoningText || "");

    const newDecision = await insertDecision({
      actionType: aiDecision.actionType || "scale_up",
      triggerSource: "anomaly_detector",
      reasoningText: aiDecision.reasoningText || `Sustained CPU spiked to ${cpu}% with ${queries} active queries. Synthesizing performance-and-scaling skill guidance: scaling up node count.`,
      embedding: decisionEmbedding,
      confidence: aiDecision.confidence || 0.92,
      ccloudCommand: aiDecision.ccloudCommand || "ccloud cluster scale --nodes +1 --cluster infra-historian-demo",
      status: "proposed"
    });

    return res.json({
      status: "simulated_anomaly_created",
      situation,
      mcpContext,
      decision: newDecision
    });
  } catch (err) {
    console.error("Simulation endpoint error:", err);
    return res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`orchestrator api listening on :${port}`);
});

