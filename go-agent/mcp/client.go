// Package mcp wraps calls to CockroachDB's Managed MCP Server.
//
// This is intentionally read-only: it never issues writes. All state-
// changing actions go through the ccloud package instead, gated by human
// approval. Keeping these concerns in separate packages makes the
// "observe vs act" boundary obvious in code review and in the demo.
package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

// ClusterSnapshot is our own normalized view of whatever the MCP server
// returns — MCP tool responses are free-form JSON, so we shape them into
// something the rest of the app can rely on.
type ClusterSnapshot struct {
	CPUPercent        float64                `json:"cpu_percent"`
	ActiveQueries      int                    `json:"active_queries"`
	ContentionEvents   int                    `json:"contention_events"`
	ReplicationStatus  string                 `json:"replication_status"`
	Raw                map[string]interface{} `json:"raw"`
	CapturedAt         time.Time              `json:"captured_at"`
}

// Client holds the connection to the Managed MCP Server endpoint.
// Endpoint is typically https://cockroachlabs.cloud/mcp with either
// OAuth 2.1 (interactive) or a service-account API key (autonomous agent —
// what we use here, since this runs unattended on a schedule).
type Client struct {
	Endpoint string
	APIKey   string
	// underlying MCP session/transport goes here once wired to
	// github.com/modelcontextprotocol/go-sdk — kept abstract for now so
	// this file compiles and is testable before that wiring is done.
}

func NewClient(endpoint, apiKey string) *Client {
	return &Client{Endpoint: endpoint, APIKey: apiKey}
}

// GetClusterHealth calls the MCP server's cluster-health tool
// (list databases/tables, node status, replication) — read-only.
//
// TODO(week2): replace this stub with a real go-sdk session.CallTool(...)
// against the "cluster_health" and "statement_stats" MCP tools. Stubbed
// here so the rest of the pipeline (reasoning, storage) can be built and
// tested against a predictable shape before the live MCP wiring lands.
func (c *Client) GetClusterHealth(ctx context.Context) (*ClusterSnapshot, error) {
	if c.Endpoint == "" || c.APIKey == "" {
		return nil, fmt.Errorf("mcp client not configured: missing endpoint or api key")
	}

	// --- STUB: replace with real MCP tool call ---
	snapshot := &ClusterSnapshot{
		CPUPercent:       22.5,
		ActiveQueries:    5,
		ContentionEvents: 0,
		ReplicationStatus: "healthy",
		Raw:              map[string]interface{}{"stub": true},
		CapturedAt:       time.Now().UTC(),
	}
	return snapshot, nil
}

// GetSlowQueries calls the MCP server's slow-query / statement-stats tool.
// Also read-only. Used as additional context before the reasoning step
// decides whether an action is warranted.
func (c *Client) GetSlowQueries(ctx context.Context, limit int) ([]map[string]interface{}, error) {
	// --- STUB: replace with real MCP tool call ---
	return []map[string]interface{}{}, nil
}

// ToJSON is a convenience for logging the raw context alongside a decision
// (see decisions.Store.RecordDecision — mcp_context JSONB column).
func (s *ClusterSnapshot) ToJSON() ([]byte, error) {
	return json.Marshal(s)
}
