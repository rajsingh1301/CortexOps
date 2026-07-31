# Architecture

## Why two backend services instead of one

- **go-agent** owns everything CockroachDB-native: the MCP client (read),
  the ccloud CLI wrapper (write, gated), and the Agent Skills loader.
  Go is the natural choice here because CockroachDB itself, the ccloud
  CLI, and the MCP go-sdk are all Go — this service is "speaking the
  cluster's native language."
- **node-orchestrator** owns everything AWS-native: Bedrock calls
  (reasoning + embeddings) and the HTTP API the React dashboard talks to.

## Call direction (pick one, document it, don't mix)

Recommended for the hackathon timeline: **Go calls Node**.

1. Lambda (or a local cron) triggers `go-agent`'s main loop.
2. `go-agent` observes via MCP, gathers relevant skills.
3. `go-agent` POSTs `{ mcpContext, relevantSkills, situation }` to a
   `/reason` endpoint you add to `node-orchestrator` (wraps `bedrock.reason()`).
4. `node-orchestrator` also does the similarity search against past
   decisions (needs an embedding of the *situation*, not just the
   question box) and includes that in the prompt.
5. `node-orchestrator` returns the structured decision back to `go-agent`.
6. `go-agent` writes the row to CockroachDB via `decisions.Store`.
7. If `actionType` requires a ccloud command, the row stays `status=proposed`
   until a human clicks Approve in the dashboard, which hits
   `node-orchestrator`'s `/decisions/:id/approve`, which then needs to
   call back into `go-agent` (add a small `/execute` HTTP endpoint to
   `go-agent`, or have `node-orchestrator` shell out to the compiled Go
   binary directly — simplest is a small HTTP server in `go-agent`).

This keeps the "who can execute ccloud commands" answer to exactly one
place (`go-agent`), which is the safety property judges will look for.

## Data flow diagram (textual, until you draw the real one)

```
[Lambda/cron]
      |
      v
[go-agent] --MCP (read)--> [CockroachDB Cloud: Managed MCP Server]
      |
      |--loads--> [Agent Skills repo, local files]
      |
      |--POST /reason--> [node-orchestrator] --Bedrock (Claude)--> [reasoning + confidence]
      |                         |
      |                    Bedrock (Titan embed)
      |                         |
      v                         v
[decisions.Store] <----- writes row (mcp_context, skills_consulted, embedding)
      |
      v
[CockroachDB: decisions, cluster_snapshots, skill_invocations tables]
      ^
      |
[React dashboard] <--REST-- [node-orchestrator API] --reads-- [CockroachDB]
      |
      |--Approve click--> node-orchestrator --> go-agent /execute --> ccloud CLI
```

## Resolved Design Decisions

- [x] Confirmed Cohere embedding model output dimension = **1024**.
      Updated `VECTOR(1024)` in `db/schema.sql`.
- [x] `go-agent` runs as a **long-lived HTTP server** on `:5005` —
      needed for `node-orchestrator` to call `/execute` back into it
      on human approval.
- [x] Skills loaded from local `./skills-repo` directory at startup
      via `skills/loader.go` YAML parser. Graceful fallback if
      directory missing.

