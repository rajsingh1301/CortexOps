# CortexOPS

An AI agent that manages its own CockroachDB cluster — and remembers, semantically, why it made every decision.

Built for the CockroachDB × AWS Hackathon (Build with Agentic Memory).

## The Idea

Most "agent + database" hackathon projects use the database as a passive memory store for
some unrelated product. This project is deliberately self-referential: the agent's job is
to operate a CockroachDB cluster (via the `ccloud` CLI, guided by CockroachDB's own Agent
Skills), and every decision it makes — and the reasoning behind it — is embedded and stored
back in that same cluster. Ask it "why did you take a backup on Tuesday" and it retrieves
the actual reasoning, not a guess.

## CockroachDB Tools Used

| Tool | Role |
|---|---|
| **Managed MCP Server** | Read-only introspection — cluster health, query stats, contention — before any decision is made |
| **Agent Skills Repo** | The agent's operating procedure — consulted before every consequential action |
| **ccloud CLI** | The agent's "hands" — provisions backups, checks health, scaling actions |
| **Distributed Vector Indexing** | The decision journal — semantic search over the agent's own operational history |

## AWS Services Used

| Service | Role |
|---|---|
| **Bedrock** | Reasoning (Claude 3.5 Sonnet) + Embeddings (Cohere embed-english-v3) |
| **Lambda** | Scheduled trigger for the observe → reason → log loop |
| **CloudWatch** | Optional external signal correlation |

## Repo Layout

```
cortexOps/
├── db/
│   ├── schema.sql           # CockroachDB schema (decisions, command log, skill invocations, snapshots)
│   └── seed.sql             # Sample rows for local testing
├── go-agent/                # Go service: MCP client + ccloud wrapper + skill loader (port 5005)
│   ├── main.go
│   ├── main_test.go         # Safety whitelist unit tests
│   ├── cmd/
│   │   ├── cortexops/       # Production TUI CLI (Cobra, Viper, Lipgloss, Huh, Spinner)
│   │   └── lambda/          # AWS Lambda handler entrypoint
│   ├── core/                # Shared observe-reason cycle logic
│   ├── monitoring/          # CloudWatch custom metrics publisher
│   ├── mcp/client.go        # CockroachDB Managed MCP Server client (Bearer auth)
│   ├── ccloud/wrapper.go    # Whitelisted ccloud CLI actions (backup, scale_up, schema_review, no_action)
│   ├── skills/loader.go     # Agent Skills YAML loader
│   └── decisions/store.go   # CockroachDB vector decision storage
├── node-orchestrator/       # Node.js: Bedrock calls + orchestration + API (port 4000)
│   └── src/
│       ├── index.js         # Express API (POST /reason, GET /decisions, approve/reject, /search)
│       ├── bedrock.js       # AWS Bedrock SDK (Claude reasoning + Cohere embeddings)
│       └── db.js            # CockroachDB pg client + vector similarity search
├── frontend/                # React dashboard (port 5173)
│   └── src/
│       ├── App.jsx          # Main app with tabs (Decision Feed, Memory Search)
│       └── components/
│           ├── ClusterMetrics.jsx   # Live cluster health indicators
│           ├── DecisionCard.jsx     # AI decision cards with Approve/Reject
│           └── MemorySearch.jsx     # "Why did you...?" vector search
├── docs/
│   └── architecture.md
├── start.sh                 # One-command launcher for all 3 services
└── todo.md                  # Implementation progress tracker
```

## Quick Start

### One-Command Launch
```bash
./start.sh
```
This starts all 3 services — go-agent (:5005), node-orchestrator (:4000), frontend (:5173).

---

## 💻 `cortexops` TUI CLI Tool

CortexOps includes a production-grade Command-Line Interface (`cortexops`) built with **Cobra**, **Viper**, **Lipgloss**, **Huh**, and **Spinner**.

### Building & Installing the CLI
```bash
cd go-agent
make build-cli
make install # Installs globally to ~/.local/bin/cortexops
```

### Complete CLI Command Directory

```bash
# ----------------------------------------------------------------------------
# 1. ONBOARDING & SETUP WIZARD
# ----------------------------------------------------------------------------
cortexops init               # 2-step setup: Connection URL & Cluster Name
cortexops init --advanced    # 4-step setup: Includes custom API URL & AI assist toggle
cortexops onboard            # Alias for init

# ----------------------------------------------------------------------------
# 2. CLUSTER MANAGEMENT
# ----------------------------------------------------------------------------
cortexops cluster get-health # Inspect live cluster CPU, queries, contention & safety gate
cortexops status             # Alias for cluster get-health
cortexops status --watch     # Live 2-second auto-refreshing TUI dashboard
cortexops status -o json     # Automation-friendly JSON output

cortexops cluster list       # List all configured CockroachDB clusters with active indicator
cortexops cluster ls         # Alias for cluster list
cortexops cluster add        # Interactively connect and validate a new cluster
cortexops cluster switch <name>  # Switch active CockroachDB cluster profile
cortexops cluster remove <name>  # Disconnect and delete a cluster configuration
cortexops disconnect         # Interactive cluster disconnect menu

# ----------------------------------------------------------------------------
# 3. DECISION APPROVALS & REMEDIATION QUEUE
# ----------------------------------------------------------------------------
cortexops decision list      # Interactive Bubbletea TUI list of proposed AI remediations
cortexops queue              # Alias for decision list (use [a] approve, [r] reject)
cortexops queue --limit 3    # Limit displayed items

cortexops decision approve <id>  # Authorize decision ID and execute whitelisted action
cortexops approve <id>           # Alias for decision approve (interactive if ID omitted)

cortexops decision reject <id>   # Reject decision without executing command
cortexops reject <id>            # Alias for decision reject (interactive if ID omitted)

# ----------------------------------------------------------------------------
# 4. OPERATIONAL VECTOR MEMORY SEARCH
# ----------------------------------------------------------------------------
cortexops memory search "why did you scale up?"  # Semantic cosine similarity search
cortexops ask "why did you take a backup?"       # Alias for memory search
cortexops ask                                    # Opens interactive search prompt

# ----------------------------------------------------------------------------
# 5. CONFIGURATION MANAGEMENT (~/.cortexops/config.yaml, mode 0600)
# ----------------------------------------------------------------------------
cortexops config view        # Display effective configuration and active path
cortexops config get api_url # Get a specific config value
cortexops config set default_limit 10 # Persist a config setting

# ----------------------------------------------------------------------------
# 6. GLOBAL FLAGS & UTILITIES
# ----------------------------------------------------------------------------
cortexops --help             # Command help
cortexops version            # Version and active connected endpoint
cortexops completion zsh     # Shell autocompletion generator (zsh/bash/fish)
```

---

## Architecture

```
[Scheduled Trigger / Lambda / EventBridge]
       │
       ▼
[go-agent :5005] ──MCP (read)──▶ [CockroachDB Cloud: Managed MCP Server]
       │
       ├──loads──▶ [Agent Skills (YAML)]
       │
       ├──POST /reason──▶ [node-orchestrator :4000] ──Bedrock──▶ [Claude 3.5 Sonnet + Cohere]
       │                         │
       ▼                         ▼
[decisions.Store] ◀───── writes row (mcp_context, skills, embedding VECTOR(1024))
       │
       ▼
[CockroachDB: decisions, cluster_snapshots, skill_invocations]
       ▲                                               ▲
       │                                               │
[React Dashboard :5173]                  [cortexops CLI Tool]
       │                                               │
       └──REST API (:4000) ────────────────────────────┘
              │
              └──Approve──▶ node-orchestrator ──▶ go-agent /execute ──▶ ccloud CLI (whitelist-gated)
```

## Safety Design

Every executable action is gated by a strict `switch-case` whitelist in `go-agent/main.go`:
- `backup` → `ccloud backup create`
- `scale_up` → `ccloud cluster scale`
- `schema_review` → `ccloud cluster describe` (read-only)
- `no_action` → Audit log record (no-op)

Any action not in this list is rejected with `HTTP 400 Bad Request`. The LLM never constructs shell commands directly.

## Running Tests

```bash
cd go-agent && go test -v ./...
```

## License

Built for the CockroachDB × AWS Hackathon 2026.