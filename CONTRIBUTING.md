# Contributing

## Running locally

CortexOps has three components: a Go agent, a Node orchestrator, and a Vite/React frontend.

1. Copy `.env.example` to `.env` in the relevant component directories and fill in your CockroachDB connection string and AWS Bedrock credentials.
2. Start everything at once:
   ```bash
   ./start.sh
   ```
   This launches `go-agent`, `node-orchestrator`, and `frontend` together.
3. Or run a single component during development, e.g. the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Running tests

```bash
cd go-agent
go test ./... -v
```

## Submitting a change

1. Fork the repo and create a branch off `main`.
2. Keep changes scoped to one component where possible.
3. Run the relevant component's tests/lint before opening a PR (`go test ./...` for `go-agent`, `npm run lint` for `frontend`).
4. Open a PR describing what changed and why.
