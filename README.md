# CortexOps

> An AI-assisted operations agent for CockroachDB. It proposes fixes, remembers why, and waits for a human to approve.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)](go-agent/go.mod)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react)](frontend/package.json)
[![CockroachDB](https://img.shields.io/badge/Database-CockroachDB%20Vector-6933FF?logo=cockroachlabs)](https://www.cockroachlabs.com)
[![AWS Bedrock](https://img.shields.io/badge/AI-Amazon%20Bedrock-FF9900?logo=amazonaws)](https://aws.amazon.com/bedrock/)

![CortexOps CLI demo](docs/demo/demo.gif)

*A 33-second terminal walkthrough: cluster health, the approval queue, approving a whitelisted action (ccloud in dry-run), the Safety Gate rejecting `drop_database`, and a memory search. Recorded against a throwaway local CockroachDB with mock Bedrock. Scripts to reproduce it are in [`docs/demo`](docs/demo).*

## Why CortexOps

- **Decision memory.** Every proposal's reasoning is embedded and stored in CockroachDB (`VECTOR(1024)`), so you can ask `cortexops ask "why did we scale up?"` months later.
- **Human approval.** The agent loop only ever writes decisions with status `proposed`. Execution is triggered by an explicit approve action in the CLI or dashboard.
- **Safety Gate.** Execution goes through an allowlist of four action types. Anything else is rejected with HTTP 400. The LLM's free-text `ccloudCommand` is stored for display but is never executed.

## Quick Start (no AWS)

Offline mode replaces Bedrock with a mock. It still needs a CockroachDB cluster with vector index support. It does not need AWS credentials, a `ccloud` binary, or a real MCP endpoint.

**Prerequisites:** Go 1.25+, Node.js 18+, a CockroachDB connection string, and the [`cockroach` CLI](https://www.cockroachlabs.com/docs/stable/install-cockroachdb) for loading the schema.

```bash
git clone https://github.com/rajsingh1301/CortexOps.git
cd CortexOps

# 1. Create the schema (includes the vector index)
export COCKROACH_CONN_STRING="postgresql://USER:PASSWORD@HOST:26257/infra_historian?sslmode=verify-full"
cockroach sql --url "$COCKROACH_CONN_STRING" -f db/schema.sql

# 2. Orchestrator config: mock Bedrock, Cohere-sized (1024-dim) embeddings
cp .env.example node-orchestrator/.env
#    then edit node-orchestrator/.env and set COCKROACH_CONN_STRING

# 3. Go agent config (all four values are required at startup)
cat > go-agent/.env <<EOF
COCKROACH_CONN_STRING=$COCKROACH_CONN_STRING
COCKROACH_MCP_ENDPOINT=http://localhost:0
COCKROACH_MCP_API_KEY=your-service-account-api-key
CCLOUD_CLUSTER_NAME=demo-cluster
EOF

# 4. Start orchestrator (:4000), go-agent (:5005), frontend (:5173)
./start.sh
```

The placeholder MCP key makes the agent use a fixed local baseline snapshot. `CCLOUD_DRY_RUN` defaults to `true`, so no `ccloud` command is run.

In a second terminal:

```bash
cd go-agent && make build-cli && ./cortexops init   # point the CLI at your cluster

./cortexops simulate        # inject a CPU spike; creates a proposed decision
./cortexops queue           # list proposed decisions
./cortexops approve <id>    # run it through the Safety Gate (dry-run)
./cortexops ask "why did you scale up?"
```

The dashboard is at `http://localhost:5173/dashboard`.

In mock mode the embeddings are deterministic hashes of the text, not semantic vectors, so `ask` returns rows in an arbitrary order. Use real Bedrock embeddings to evaluate search quality.

## Safety Gate

Implemented in `go-agent/main.go` (`POST /execute`, port 5005) as an explicit `switch` on `actionType`.

| `actionType` | What runs | Notes |
|---|---|---|
| `backup` | `ccloud backup create --cluster <name>` | |
| `scale_up` | `ccloud cluster scale --nodes +1 --cluster <name>` | Node count is fixed at +1 in code |
| `schema_review` | `ccloud cluster describe --cluster <name>` | Read-only |
| `no_action` | Nothing; returns an audit message | |

Anything else returns HTTP 400 and never reaches `ccloud`. Command arguments are built in `go-agent/ccloud/wrapper.go` from fixed templates, never from model output.

Example of a blocked action (output format is from the code):

```bash
curl -s -X POST localhost:5005/execute \
  -H 'Content-Type: application/json' \
  -d '{"decisionId":"test","actionType":"drop_database"}'
```

```json
{"error":"actionType 'drop_database' rejected by safety whitelist"}
```

The agent log also prints `[Rejected] Action type "drop_database" is not in the execution whitelist!`.

## Architecture

```
 ┌────────────────────────────────────────────────────────┐
 │            CockroachDB Cloud Cluster                   │
 │  - Relational Data & Telemetry Tables                  │
 │  - VECTOR(1024) Journal (C-SPANN Vector Index)         │
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
 │  - Claude (Reasoning & Runbook Generation)             │
 │  - Cohere / Titan Embeddings (Vector)                  │
 └──────────────────────────┬─────────────────────────────┘
                            │
               3. Propose Decision & Embed
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │       Operator Approval & Safety Whitelist Gate        │
 │  - Go-Agent Whitelist Gate (:5005)                     │
 │  - Standalone Terminal CLI (Bubbletea / Cobra)         │
 │  - React Operator Web Dashboard                        │
 └──────────────────────────┬─────────────────────────────┘
                            │
               4. Approve & Execute
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │               CockroachDB ccloud CLI                   │
 │  - Backup, scale up, cluster describe                  │
 └────────────────────────────────────────────────────────┘
```

Flow: the Go agent observes the cluster and calls the orchestrator's `POST /reason`. The orchestrator embeds the situation, retrieves similar past decisions, asks Bedrock for a decision, and embeds the reasoning. The agent stores the row as `proposed`. On approval, the orchestrator calls the agent's `POST /execute`. See [docs/architecture.md](docs/architecture.md) for design notes.

## CockroachDB integration

- **MCP client** (`go-agent/mcp/client.go`): read-only HTTP calls (`cluster_health`, `statement_stats`) authenticated with a bearer API key. It never connects to the database. If the key is missing or any call fails, it logs a warning and returns a fixed baseline snapshot.
- **Vector memory** (`db/schema.sql`): `decisions.embedding VECTOR(1024)` with a `vector_cosine_ops` index. `reasoning_text`, `confidence`, `skills_consulted`, `ccloud_command`, `status` and `outcome` are stored alongside it.
- **Agent Skills** (`.agents/skills/`, `go-agent/skills/loader.go`): the loader reads `SKILL.md` files from `SKILLS_REPO_PATH` and selects them by `when_to_use` keyword match. See Limitations.
- **ccloud** (`go-agent/ccloud/wrapper.go`): the only code that calls `exec.Command("ccloud", ...)`. Supports dry-run (default on).

## AWS integration

- **Amazon Bedrock** (`node-orchestrator/src/bedrock.js`): `InvokeModel` for reasoning (Anthropic messages format) and embeddings (Cohere or Titan). Model IDs come from `BEDROCK_MODEL_ID` and `BEDROCK_EMBEDDING_MODEL_ID`; there are no hardcoded defaults. Embedding calls retry with exponential backoff on throttling.
- **AWS Lambda** (`go-agent/cmd/lambda`, `go-agent/template.yaml`): SAM template that runs the observe-reason-record cycle every 5 minutes.
- **Amazon CloudWatch** (`go-agent/monitoring/cloudwatch.go`): publishes cycle metrics (`CycleStatus`, `CPUPercent`, `ActiveQueries`, `DecisionConfidence`) under the `CortexOps` namespace. Wired in Lambda mode only.

## Full setup

### Install the CLI

```bash
# Build from source (recommended)
cd CortexOps/go-agent && make build-cli && make install   # installs to ~/.local/bin and ~/go/bin

# Or via Go
go install github.com/rajsingh1301/CortexOps/go-agent/cmd/cortexops@latest
```

There is also a one-line installer. Read [`install.sh`](install.sh) before piping it to a shell: it clones the repo, builds with Go, copies the binary to `~/.local/bin`, `~/go/bin` and (if writable) `/usr/local/bin`, and may append a PATH line to your shell RC file.

```bash
curl -sSL https://raw.githubusercontent.com/rajsingh1301/CortexOps/main/install.sh | bash
```

### Configure

```bash
cortexops init              # interactive onboarding; saves ~/.cortexops/config.yaml
cortexops init --advanced   # also sets the orchestrator API URL
```

For Bedrock, set these in `node-orchestrator/.env` and set `USE_MOCK_BEDROCK=false`:

```bash
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=<an Anthropic Claude model ID enabled in your account>
BEDROCK_EMBEDDING_MODEL_ID=cohere.embed-english-v3   # 1024 dims, matches VECTOR(1024)
```

`.env.example` ships with `anthropic.claude-3-5-sonnet-20241022-v2:0` as a sample value. Check Bedrock model availability for your region and account. If you use a Titan embedding model, make sure it outputs 1024 dimensions to match the schema.

### Verify and operate

| Command | Purpose |
|---|---|
| `cortexops status` (`--watch` / `-w`) | Cluster telemetry; `-w` refreshes every 2s |
| `cortexops queue` | Proposed decisions (alias of `decision list --status=proposed`) |
| `cortexops approve [id]` | Approve and execute via the Safety Gate; prompts if no ID is given |
| `cortexops reject [id]` | Reject a proposal |
| `cortexops ask "<question>"` | Semantic search over past reasoning (alias of `memory search`) |
| `cortexops simulate` | Inject a CPU spike to create a proposal. `simulate calm` resets telemetry |

Global flags: `-o table|json|plain`, `-q`, `-n <limit>`, `--no-color`, `--status`, `--api-url`, `--config`. Other command groups: `cluster`, `decision`, `memory`, `config`, `version`.

If the orchestrator is unreachable, `status`, `queue` and `ask` fall back to querying CockroachDB directly. In that mode `ask` uses text matching, not vector search.

## Example output

Illustrative only. Rendering and values will differ on your machine.

`cortexops status`

```
CortexOps Cluster Health · primary-cockroachdb
╭────────────────────┬─────────────────────────────────╮
│ METRIC             │ CURRENT STATUS / VALUE          │
├────────────────────┼─────────────────────────────────┤
│ CPU Load           │ ████████████████░░░░ 88.5%      │
│ Active Queries     │ 18 queries                      │
│ Contention Events  │ 2 events                        │
│ Replication Status │ HEALTHY                         │
│ Safety Gate        │ ACTIVE (Port 5005 Whitelist)    │
│ Connection Mode    │ Orchestrator Daemon (:4000)     │
╰────────────────────┴─────────────────────────────────╯
```

`cortexops queue`

```
Decision Queue · Orchestrator Daemon (:4000) (status: proposed, count: 1)
╭──────────┬──────────┬──────┬────────────┬─────────────────────────────────────╮
│ ID       │ ACTION   │ CONF │ STATUS     │ REASONING & EXECUTION COMMAND       │
├──────────┼──────────┼──────┼────────────┼─────────────────────────────────────┤
│ a625baf7 │ scale_up │ 90%  │ PROPOSED   │ CPU usage is high at 88.5% ...      │
│          │          │      │            │ ccloud cluster scale --nodes +1 ... │
╰──────────┴──────────┴──────┴────────────┴─────────────────────────────────────╯
```

`cortexops ask "why did you scale up?"` prints each match in a bordered box with its action, confidence, status, reasoning text and outcome. Use `-o json` for machine-readable output.

## Configuration

`~/.cortexops/config.yaml` (written by `cortexops init`; the directory is created with mode `0700`):

```yaml
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

Service configuration uses environment variables. See [`.env.example`](.env.example). Go-agent additionally reads `COCKROACH_MCP_ENDPOINT`, `COCKROACH_MCP_API_KEY`, `CCLOUD_CLUSTER_NAME`, `CCLOUD_DRY_RUN` (default `true`), `SKILLS_REPO_PATH`, `NODE_ORCHESTRATOR_URL`, `GO_AGENT_PORT` and `OBSERVE_INTERVAL_SECONDS`.

Real credentials belong in `.env` files (git-ignored) or a secret manager. Never commit connection strings, AWS keys or MCP API keys.

## Tech stack

| Layer | Technologies |
|---|---|
| CLI and agent | Go 1.25, Cobra, Viper, Bubble Tea, Huh, Lip Gloss, pgx |
| Orchestrator | Node.js (ES modules), Express, `pg`, `@aws-sdk/client-bedrock-runtime` |
| Dashboard | React 19, Vite, Recharts |
| Database | CockroachDB, `VECTOR(1024)` with a vector index |
| AI | Amazon Bedrock (Anthropic Claude for reasoning, Cohere or Titan for embeddings) |
| Cloud | AWS Lambda (SAM), Amazon CloudWatch, `ccloud` CLI |

## Limitations

- **Approval is enforced by workflow, not by the gate.** `POST /execute` on the Go agent is unauthenticated and does not check that a decision was approved. The orchestrator's approve endpoint also does not check that a decision is still `proposed`. Run the agent on localhost or a private network.
- **Non-zero `ccloud` exit codes are recorded but not treated as failures.** A failed command can still be marked `executed`.
- **Remediation effect is simulated.** After an approval, the orchestrator writes a synthetic "recovered" snapshot (CPU 8.5%). It does not measure the cluster.
- **Telemetry is mostly simulated.** The MCP client falls back to a fixed snapshot on any error, and its tool names and response shape have not been validated against a live Managed MCP server in this repo. `status` reads `cluster_snapshots`, which is only written by the simulate endpoints, approvals and the CLI.
- **Agent Skills are not effectively injected in the scheduled loop.** The matcher needs a `when_to_use` list in each skill's frontmatter, which the bundled skills do not have, and the default `./skills-repo` path is git-ignored.
- **Scope is narrow.** Four actions, scale-up fixed at +1 node, and the model chooses among them.
- **Search operator needs checking.** The index uses `vector_cosine_ops`, but queries order by `<->`. In CockroachDB `<->` is L2 distance and `<=>` is cosine distance, so the index may not be used and results are L2-ranked.
- **Tests and CI are minimal.** One test file covers a copy of the `/execute` handler, not the production handler. There are no tests for other packages and no CI workflow.

## Roadmap

- Verify approval state and add authentication on `/execute`.
- Treat non-zero `ccloud` exit codes as failures.
- Align the vector query operator with the index and add a regression test.
- Wire live MCP telemetry into `cluster_snapshots` and add CI.

## Built for

- **Event:** <!-- TODO(me): hackathon name, date and result -->
- **Team:** <!-- TODO(me): team members / links -->
- **Demo:** <!-- TODO(me): demo video or live URL, if any -->

## Contributing and License

See [CONTRIBUTING.md](CONTRIBUTING.md). Released under the [MIT License](LICENSE).
