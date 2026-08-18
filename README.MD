# CortexOps

> **Autonomous, AI-Assisted Operations & Vector Semantic Decision Memory Agent for CockroachDB Clusters**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react)](https://react.dev)
[![CockroachDB](https://img.shields.io/badge/Database-CockroachDB%20Vector-6933FF?logo=cockroachlabs)](https://www.cockroachlabs.com)
[![AWS Bedrock](https://img.shields.io/badge/AI-Amazon%20Bedrock%20Claude%203.5-FF9900?logo=amazonaws)](https://aws.amazon.com/bedrock/)

---

## 🔗 Demo Links

- 🌐 **Live Web Application:** [[DEMO_URL_HERE]]([DEMO_URL_HERE])
- 🎥 **Video Walkthrough (YouTube/Vimeo):** [[DEMO_VIDEO_URL_HERE]]([DEMO_VIDEO_URL_HERE])

---

## 💡 What It Does

Operating distributed databases like CockroachDB at scale requires continuous monitoring, deep domain expertise, and rapid incident remediation. However, database operations face three critical challenges:

1. **Context Loss & Amnesia:** When an operator scales a cluster, drops an index, or adjusts zone configurations during an outage, the rationale is lost in chat logs or memory. Future engineers cannot answer *"Why did we make this decision?"*
2. **Alert Fatigue & Remediation Delay:** Spikes in CPU or lock contention require manual query analysis and CLI commands, delaying recovery.
3. **Unsafe Autonomous Execution:** Traditional automated scripts lack domain guardrails and safety verification, risking catastrophic schema locks or unintended drop actions.

### The CortexOps Solution
**CortexOps** is an autonomous, AI-assisted operations agent that continuously observes CockroachDB telemetry, diagnoses anomalies using specialized **CockroachDB Agent Skills**, formulates human-in-the-loop remediation proposals, executes them through a **strict whitelist Safety Gate**, and writes every decision's reasoning into CockroachDB using **Distributed Vector Indexing**. 

Whenever an engineer asks natural-language questions (e.g. `cortexops ask "why did you scale up the cluster on Tuesday?"`), CortexOps performs semantic cosine similarity search directly against CockroachDB's vector store to provide instant, auditable answers.

---

## 🪲 CockroachDB Integration

CortexOps natively integrates with CockroachDB core infrastructure across four specialized layers:

### 1. Model Context Protocol (MCP) Server Integration
- The Go agent connects to CockroachDB MCP servers (`go-agent/mcp/client.go`) to query live cluster health, active statement diagnostics, and range distribution metrics safely without exposing root database credentials.

### 2. Distributed Vector Indexing (C-SPANN Cosine Search)
- Decisions and their reasoning narratives are converted into **1024-dimensional vector embeddings** and stored directly inside CockroachDB in the `infra_historian.decisions` table:
  ```sql
  CREATE TABLE IF NOT EXISTS decisions (
      id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      action_type      STRING NOT NULL,
      reasoning_text   STRING NOT NULL,
      embedding        VECTOR(1024),
      confidence       FLOAT,
      status           STRING NOT NULL DEFAULT 'proposed',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE VECTOR INDEX IF NOT EXISTS decisions_embedding_idx
      ON decisions (embedding vector_cosine_ops);
  ```
- Natural language queries from the CLI (`cortexops ask`) and Web Dashboard execute real-time cosine distance searches (`ORDER BY embedding <-> $1 LIMIT 5`) over CockroachDB's distributed vector index.

### 3. CockroachDB Agent Skills
- CortexOps embeds specialized, domain-specific CockroachDB Agent Skills (`.agents/skills/`):
  - `performance-and-scaling`: Guidelines for node scaling, hot range mitigation, and CPU anomaly handling.
  - `query-and-schema-design`: Detection of unindexed queries, lock contention, and schema change storage risks.
  - `operations-and-lifecycle`: Quorum monitoring, backup/restore schedules, and rolling version upgrades.
  - `auditing-cis-benchmark`: CIS CockroachDB benchmark Level 1 security hardening.
- These skills are dynamically injected into Bedrock AI prompts to ground all operational proposals in verified CockroachDB best practices.

### 4. `ccloud` CLI Remediation Execution
- When human operators approve proposed actions, CortexOps invokes the CockroachDB Cloud CLI (`ccloud cluster scale`, `ccloud cluster backup`) with strict argument parsing and exit-code validation (`go-agent/ccloud/runner.go`).

---

## ☁️ AWS Integration

CortexOps uses AWS services for intelligence, serverless execution, and operational observability:

### 1. Amazon Bedrock (Claude 3.5 Sonnet & Cohere Embeddings)
- **Reasoning Engine:** Calls `anthropic.claude-3-5-sonnet-20241022-v2:0` via the AWS Bedrock Runtime SDK to evaluate cluster snapshots against CockroachDB Agent Skills and formulate structured remediation runbooks.
- **Embedding Generation:** Uses `cohere.embed-english-v3` (or `amazon.titan-embed-text-v2:0`) to generate 1024-dimension float vectors for both operational decisions and operator search queries.

### 2. AWS Lambda
- Serverless event listener and scheduled telemetry handler (`go-agent/cmd/lambda/main.go`) that triggers autonomous health checks and anomaly evaluations.

### 3. Amazon CloudWatch
- Telemetry emitter (`go-agent/monitoring/cloudwatch.go`) that exports cluster CPU usage, lock contention counters, and decision execution metrics to AWS CloudWatch for enterprise monitoring.

---

## 🏗️ Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │            CockroachDB Cloud Cluster                   │
 │  - Relational Data & Telemetry Tables                  │
 │  - VECTOR(1024) Journal (C-SPANN Cosine Index)         │
 └──────────────────────────┬─────────────────────────────┘
                            │
              1. Telemetry / MCP Context
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │           Node.js & Go Orchestration Engine            │
 │  - Telemetry Observe Loop & Anomaly Detection          │
 │  - CockroachDB Agent Skills Evaluation                 │
 └──────────────────────────┬─────────────────────────────┘
                            │
               2. Synthesize with Context & Skills
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │               Amazon Bedrock AI                        │
 │  - Claude 3.5 Sonnet (Reasoning & Runbook Generation)  │
 │  - Cohere / Titan Embeddings (1024-dim Vector)         │
 └──────────────────────────┬─────────────────────────────┘
                            │
               3. Propose Decision & Embed
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │       Operator Approval & Safety Whitelist Gate        │
 │  - Go-Agent Whitelist Gate (:5005)                     │
 │  - Standalone Terminal CLI (Bubbletea / Cobra)         │
 │  - React Operator Web Dashboard (Render / Vercel)      │
 └──────────────────────────┬─────────────────────────────┘
                            │
               4. Approve & Execute
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │               CockroachDB ccloud CLI                   │
 │  - Scale Node Pools, Trigger Backups, Adjust Zone      │
 └────────────────────────────────────────────────────────┘
```

> Placeholder for Visual Architecture Diagram:
> 
> `![CortexOps Architecture]([ARCHITECTURE_DIAGRAM_URL_HERE])`

---

## 🚀 Setup & Run Instructions

### Prerequisites
- **Go:** `1.22` or `1.25+` installed
- **Node.js:** `18.x` or `20.x+` (for orchestrator and frontend)
- **CockroachDB:** Connection string to a Serverless or Dedicated cluster (v24.x+ with vector indexing support)
- **AWS Account:** *(Optional)* AWS Credentials with access to Amazon Bedrock (`Claude 3.5 Sonnet` and `Cohere Embed English v3`). A built-in offline smart fallback engine is enabled by default if AWS credentials are not configured.

---

### 1. Installation

#### Method A: 1-Line Universal Global Installer (macOS & Linux)
```bash
curl -sSL https://raw.githubusercontent.com/rajsingh1301/CortexOps/main/install.sh | bash
```

#### Method B: Go Global Install
```bash
go install github.com/rajsingh1301/CortexOps/go-agent/cmd/cortexops@latest
```

#### Method C: Build from Source
```bash
# Clone the repository
git clone https://github.com/rajsingh1301/CortexOps.git
cd CortexOps/go-agent

# Build and install local binary
make build-cli
make install
```

---

### 2. Configuration & Onboarding

Run the interactive onboarding wizard to connect your CockroachDB cluster:
```bash
cortexops init
```

For advanced configuration (custom orchestrator API URL, Bedrock model IDs):
```bash
cortexops init --advanced
```

---

### 3. Verify & Operate

```bash
# 1. Inspect cluster health and connection status
cortexops status

# 2. Launch live 2-second auto-refreshing terminal dashboard
cortexops status --watch

# 3. View pending AI-proposed decisions in interactive TUI
cortexops queue

# 4. Approve an operational proposal
cortexops approve <decision-id>

# 5. Query vector semantic memory using natural language
cortexops ask "why did you scale up the cluster?"
```

---

### 4. Running the Web Dashboard Locally

```bash
# Start all services (Frontend, Node Orchestrator, Go Safety Gate)
./start.sh
```
- Open **Web Dashboard:** `http://localhost:5173/dashboard`
- Open **Interactive Docs:** `http://localhost:5173/docs`

---

## ⚙️ Example Configuration

CortexOps reads configuration from `~/.cortexops/config.yaml` or root `.env` variables:

```yaml
# ~/.cortexops/config.yaml
active_cluster: primary-cockroachdb
clusters:
  primary-cockroachdb:
    connection_string: "postgresql://user:password@host:26257/infra_historian?sslmode=verify-full"
    label: "Primary Production Cluster"
api_url: "http://localhost:4000"
output: "table"
no_color: false
default_limit: 20
```

Refer to [`.env.example`](file:///.env.example) for environment variable templates.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **CLI & Systems Agent** | **Go 1.25**, Cobra CLI, Charmbracelet (Bubbletea, Huh, Lipgloss), pgx |
| **Frontend Web App** | **React 19**, Vite, Recharts, Lucide React, CSS3 Tokens |
| **Orchestrator Backend** | **Node.js (ES Modules)**, Express, pg, `@aws-sdk/client-bedrock-runtime` |
| **Database & Vector Store** | **CockroachDB** (Distributed C-SPANN Vector Index, `VECTOR(1024)`) |
| **Artificial Intelligence** | **Amazon Bedrock** (Anthropic Claude 3.5 Sonnet, Cohere Embed English v3) |
| **Cloud & Telemetry** | **AWS Lambda**, **Amazon CloudWatch**, **CockroachDB ccloud CLI** |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](file:///LICENSE) file for details.