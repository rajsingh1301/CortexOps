# 📋 CortexOps Implementation TODO

System Roadmap & Progress Tracker for **CortexOps (Infrastructure Historian)**.

---

## ✅ Completed Milestones

- [x] **Database Schema & Vector Search Index**
  - Created `decisions` table with `VECTOR(1024)` column for Cohere embeddings.
  - Added cosine-distance vector index (`decisions_embedding_idx`).
  - Added `ccloud_command_log`, `skill_invocations`, and `cluster_snapshots` tables.
  - Seeded initial sample rows and backfilled 1024-dim embeddings.

- [x] **Backend Infrastructure & Bedrock Integrations**
  - Configured AWS Bedrock SDK client with exponential backoff & retry handling for `ThrottlingException` (HTTP 429).
  - Added support for Cohere embedding models (`cohere.embed-english-v3`).
  - Added `USE_MOCK_BEDROCK` support for offline local development.

- [x] **End-to-End Core Loop Wiring (`go-agent` ↔ `node-orchestrator`)**
  - Implemented `POST /reason` in `node-orchestrator` (payload validation, vector similarity retrieval of past decisions, Bedrock reasoning, embedding generation).
  - Wired `go-agent`'s Observe → Reason → Propose cycle over HTTP to `node-orchestrator`.
  - Implemented long-running HTTP server in `go-agent` on port `5005` with `POST /execute`.
  - **Strict Whitelist Safety Gate**: Enforced explicit `switch-case` whitelist (`backup`, `scale_up`), rejecting unauthorized shell commands with `HTTP 400 Bad Request`.
  - Wired `POST /decisions/:id/approve` in `node-orchestrator` to invoke `go-agent`'s `/execute` and update database status to `executed`/`failed` with outcome logs.
  - Created unit tests (`go-agent/main_test.go`) and verified end-to-end flow.

---

## 🚀 Remaining Tasks

### Phase 1: React Dashboard (Frontend) — *Next Priority*
- [x] **Setup Frontend Project** (`frontend/`)
  - Created React / Vite web app with modern glassmorphism styling, HSL gradients, and dark mode theme.
  - Installed `lucide-react` icons and built responsive dashboard shell layout.
  - Verified compilation (`npm run build`) and started dev server on `http://localhost:5173`.
- [x] **Decision Feed & Approval Queue UI**
  - Created modular `DecisionCard.jsx` component displaying AI reasoning, confidence scores, terminal `ccloudCommand` snippets, and skill tags.
  - Connected live API (`http://localhost:4000/decisions?status=proposed`) and history logs (`http://localhost:4000/decisions`).
  - Added interactive **Approve** and **Reject** buttons with live loading feedback, triggering `go-agent:5005` execution and auto-updating decision history.
- [x] **Semantic Memory Search UI ("Why did you...?")**
  - Built `MemorySearch.jsx` component featuring glowing natural language search bar, sample query suggestion chips, and loading states.
  - Connected live vector search API (`GET http://localhost:4000/search?q=...`) performing CockroachDB vector cosine distance search (`embedding <-> $1`).
  - Rendered search matches formatted with vector relevance rank badges (#1, #2, #3), reasoning text, confidence scores, and action outcomes.
- [x] **Cluster Metrics Status Bar**
  - Added `getLatestSnapshot()` helper in `db.js` and `GET /cluster/health` API route in `node-orchestrator`.
  - Built `ClusterMetrics.jsx` component displaying live CPU load %, active query count, contention events, replication health badge, and port `:5005` safety gate status.
  - Integrated live cluster health fetching into `App.jsx`.

---


### Phase 2: Live Integrations & Model Tuning
- [x] **Live AWS Bedrock Mode Verification**
  - Verified AWS Bedrock SDK client retry & exponential backoff handling for `ThrottlingException` (HTTP 429).
  - Verified graceful error handling & safety logging for AWS account payment instrument / marketplace quota access errors.
  - Confirmed seamless local development fallback (`USE_MOCK_BEDROCK=true`).
- [x] **Real CockroachDB Managed MCP Client**
  - Updated `go-agent/mcp/client.go` with HTTP POST JSON-RPC tool invocation for `cluster_health` and `statement_stats`.
  - Added service-account `Authorization: Bearer <API_KEY>` header authentication.
  - Implemented graceful local development baseline metrics fallback (`cpu_percent`, `active_queries`, `contention_events`, `replication_status`).
- [x] **Additional Whitelisted Actions**
  - Added `SchemaReview()` and `NoAction()` named action builders to `go-agent/ccloud/wrapper.go`.
  - Updated explicit safety gate switch statement in `go-agent/main.go` to whitelist `"schema_review"` and `"no_action"`.
  - Expanded unit test coverage in `go-agent/main_test.go` and verified end-to-end HTTP execution (200 OK).

---

### Phase 3: Production Readiness & Deployment
- [x] **AWS Lambda Scheduled Trigger**
  - Extracted shared observe-reason logic into `go-agent/core/cycle.go` (`RunObserveReasonCycle`, `CallReasonEndpoint`, shared types).
  - Refactored `go-agent/main.go` to import from `core/` package (HTTP server mode unchanged).
  - Created `go-agent/cmd/lambda/main.go` — Lambda handler using `aws-lambda-go` SDK, runs one observe cycle per EventBridge invocation.
  - Created `go-agent/template.yaml` — AWS SAM template with EventBridge `rate(5 minutes)` schedule, arm64, 256MB, 60s timeout.
  - Created `go-agent/Makefile` — `make build-lambda`, `make deploy`, `make test`.
  - Lambda binary cross-compiled: `bootstrap` (14MB, ELF ARM aarch64, statically linked).
  - All 7 unit tests pass, HTTP server build verified.
- [x] **CloudWatch Monitoring Integration**
  - Created `go-agent/monitoring/cloudwatch.go` — custom metrics publisher (`CycleStatus`, `CPUPercent`, `ActiveQueries`, `DecisionConfidence`).
  - Integrated into `core/cycle.go` with nil-safe `publishMetrics()` helper — publishes after each observe cycle.
  - Lambda handler initializes `monitoring.NewMonitor(ctx)` for live AWS CloudWatch publishing.
  - HTTP server mode passes `nil` monitor (metrics logged locally instead).
  - Added IAM `CloudWatchPutMetricPolicy` to SAM template Lambda role.
  - Added 2 CloudWatch Alarms to `template.yaml`:
    - `cortexops-cycle-failure` — fires when cycle failures exceed threshold in 15 minutes.
    - `cortexops-cpu-spike` — fires when cluster CPU exceeds 80% for 2 consecutive periods.
  - All 7 unit tests pass, HTTP server + Lambda binaries compile successfully.
- [x] **Module Cleanup**
  - Updated Go module import path in `go.mod` from `github.com/yourname/infra-historian/go-agent` to `github.com/rajsingh1301/CortexOps/go-agent`.
  - Updated all import paths in `main.go`, `main_test.go`. Build & tests pass.

---

### Polish & Hackathon Readiness
- [x] **Production TUI CLI Makeover (`cortexops`)**
  - Migrated command parsing to **Cobra** (`github.com/spf13/cobra`) with resource commands (`cluster`, `decision`, `memory`, `config`) and top-level aliases (`status`, `queue`, `approve`, `reject`, `ask`).
  - Added **Lipgloss** (`github.com/charmbracelet/lipgloss`) TUI styling, colorized headers, telemetry boxes, and Lipgloss tables for tabular data.
  - Added **Huh** (`github.com/charmbracelet/huh`) interactive selection and input prompts when required flags/args are omitted.
  - Added **Spinner** (`github.com/briandowns/spinner`) terminal loading animations during API requests.
  - Added **Viper** (`github.com/spf13/viper`) YAML configuration management (`~/.cortexops/config.yaml`) with `config view/get/set` subcommands.
  - Added **Term** (`golang.org/x/term`) non-TTY stdout detection to automatically strip colors/styling when piped or redirected.
  - Added `--output` (`table`, `json`, `plain`), `--quiet`, `--limit`, and `--status` flags.
  - Added Cobra native `completion bash|zsh|fish` and `version` commands.
- [x] **One-Command Launcher (`start.sh`)**
  - Created root-level `start.sh` script starting all 3 services with colorful output and `Ctrl+C` cleanup.
- [x] **README Rewrite**
  - Added Quick Start, frontend setup, CLI TUI documentation, architecture diagram, safety design section, and test instructions.
- [x] **Architecture Doc Cleanup**
  - Marked all resolved design decisions as `[x]` in `docs/architecture.md`.
- [x] **Periodic Re-Observe Cycle**
  - Added `time.Ticker` (default 300s) in `go-agent/main.go` for continuous cluster monitoring.
  - Configurable via `OBSERVE_INTERVAL_SECONDS` env var.
- [x] **Node Orchestrator `.env.example`**
  - Added `.env.example` template for `node-orchestrator/`.
- [x] **Stale File Cleanup**
  - Removed `body.json`, `cohere_input.json`, `cohere_output.json`, `input.json` from root.

