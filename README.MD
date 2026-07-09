# CortexOPS

An AI agent that manages its own CockroachDB cluster — and remembers, semantically, why it made every decision.

Built for the CockroachDB × AWS Hackathon (Build with Agentic Memory).

## The idea

Most "agent + database" hackathon projects use the database as a passive memory store for
some unrelated product. This project is deliberately self-referential: the agent's job is
to operate a CockroachDB cluster (via the `ccloud` CLI, guided by CockroachDB's own Agent
Skills), and every decision it makes — and the reasoning behind it — is embedded and stored
back in that same cluster. Ask it "why did you take a backup on Tuesday" and it retrieves
the actual reasoning, not a guess.

## CockroachDB tools used

| Tool | Role |
|---|---|
| **Managed MCP Server** | Read-only introspection — cluster health, query stats, contention — before any decision is made |
| **Agent Skills Repo** | The agent's operating procedure — consulted before every consequential action |
| **ccloud CLI** | The agent's "hands" — provisions backups, checks health, (later) scaling actions |
| **Distributed Vector Indexing** | The decision journal — semantic search over the agent's own operational history |

## AWS services used

| Service | Role |
|---|---|
| **Bedrock** | Reasoning (decide what to do) + embeddings (for the journal) |
| **Lambda** | Scheduled trigger for the observe→reason→log loop |
| **CloudWatch** | Optional external signal correlation |

## Repo layout

```
cortexOps/ (root)
├── db/
│   ├── schema.sql        # CockroachDB schema (decisions, command log, skill invocations, snapshots)
│   └── seed.sql          # Sample rows for local testing before real embeddings exist
├── go-agent/             # Go service: MCP client + ccloud wrapper + skill loader
│   ├── main.go
│   ├── mcp/client.go
│   ├── ccloud/wrapper.go
│   ├── skills/loader.go
│   └── decisions/store.go
├── node-orchestrator/     # Node.js: Bedrock calls + orchestration + API for the dashboard
│   └── src/
│       ├── index.js
│       ├── bedrock.js
│       └── db.js
├── frontend/              # React dashboard (built in Week 3)
└── docs/
    └── architecture.md
```

## Setup (Week 1, Day 1-2 — Priority 0)

1. **CockroachDB Cloud**
   ```bash
   # Sign up at cockroachlabs.cloud, create a free-tier serverless cluster
   # Enable the Managed MCP Server for the cluster from the Cloud Console
   # Generate a service-account API key with read-only scope for MCP
   ```

2. **ccloud CLI**
   ```bash
   curl -sSL https://binaries.cockroachdb.com/ccloud/install.sh | sh
   ccloud auth login
   ccloud cluster list   # sanity check
   ```

3. **CockroachDB Agent Skills**
   ```bash
   npx skills add cockroachlabs/cockroachdb-skills
   ```

4. **AWS Bedrock**
   ```bash
   # In AWS Console: Bedrock > Model access > request access to an Anthropic Claude model
   # and a Titan (or Cohere) embeddings model. Approval can take a few hours — do this first.
   aws configure   # set your credentials/region
   ```

5. **Environment variables** — copy `.env.example` to `.env` in both `go-agent/` and
   `node-orchestrator/` and fill in:
   - `COCKROACH_CONN_STRING`
   - `COCKROACH_MCP_ENDPOINT` / `COCKROACH_MCP_API_KEY`
   - `AWS_REGION`, `BEDROCK_MODEL_ID`, `BEDROCK_EMBEDDING_MODEL_ID`

## Build order (see full 30-day plan)

1. `db/schema.sql` — run this against your cluster first
2. `db/seed.sql` — seed a few rows, confirm vector search works
3. `go-agent` — MCP read + skill loading (no writes yet)
4. `node-orchestrator` — Bedrock reasoning + embedding + writing to `decisions`
5. `go-agent/ccloud` — the write path, gated by human approval
6. `frontend` — dashboard