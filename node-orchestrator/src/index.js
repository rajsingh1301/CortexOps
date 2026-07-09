// src/index.js
//
// Express API that the React dashboard (Week 3+) talks to. Two jobs:
//   1. Serve decision feed / approval queue (reads via db.js)
//   2. Power the "why did you..." search box (embed question -> vector search)
//
// The observe->reason->record loop itself (Go side) can call Bedrock
// directly too (see bedrock.js being importable from either side if you
// port it), or this service can expose a POST /reason endpoint the Go
// agent calls instead. Pick one direction and document it in
// docs/architecture.md so it's unambiguous during the demo write-up.

import "dotenv/config";
import express from "express";
import cors from "cors";
import { embed } from "./bedrock.js";
import { listDecisions, similarDecisions, setDecisionStatus, recordOutcome } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

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

// POST /decisions/:id/approve   { } -> triggers execution (calls out to the
// Go ccloud service; wire the actual HTTP call once that endpoint exists
// in Week 3 — stubbed here so the approval UI has something to hit now)
app.post("/decisions/:id/approve", async (req, res) => {
  try {
    const updated = await setDecisionStatus(req.params.id, "approved");
    // TODO(week3): call the Go agent's execution endpoint here, then
    // await recordOutcome(req.params.id, outcomeText) once it responds.
    res.json({ ...updated, note: "approved — execution wiring pending (Week 3)" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`orchestrator api listening on :${port}`);
});
