module github.com/yourname/infra-historian/go-agent

go 1.22

require (
	github.com/jackc/pgx/v5 v5.6.0
	github.com/modelcontextprotocol/go-sdk v0.2.0 // MCP client — confirm latest version on go.dev before `go mod tidy`
	github.com/google/uuid v1.6.0
	gopkg.in/yaml.v3 v3.0.1
)

// NOTE: run `go mod tidy` once you have network access — the exact
// go-sdk version and its transitive deps aren't pinned precisely here.
