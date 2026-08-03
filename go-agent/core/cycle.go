// Package core contains the shared observe → reason → record cycle logic
// used by both the HTTP server (main.go) and the Lambda handler (cmd/lambda/).
package core

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/rajsingh1301/CortexOps/go-agent/decisions"
	"github.com/rajsingh1301/CortexOps/go-agent/mcp"
	"github.com/rajsingh1301/CortexOps/go-agent/monitoring"
	"github.com/rajsingh1301/CortexOps/go-agent/skills"
)

// SkillPayload represents a skill sent to the reasoning endpoint.
type SkillPayload struct {
	Name string `json:"name"`
	Body string `json:"body"`
}

// ReasonRequest is the payload sent to node-orchestrator's POST /reason.
type ReasonRequest struct {
	MCPContext     map[string]interface{} `json:"mcpContext"`
	RelevantSkills []SkillPayload         `json:"relevantSkills"`
	Situation      string                 `json:"situation"`
}

// ReasonResponse is the structured decision returned by POST /reason.
type ReasonResponse struct {
	ActionType    string    `json:"actionType"`
	ReasoningText string    `json:"reasoningText"`
	Embedding     []float32 `json:"embedding"`
	Confidence    float64   `json:"confidence"`
	CcloudCommand *string   `json:"ccloudCommand"`
}

// ExecuteRequest is the payload for the POST /execute safety gate.
type ExecuteRequest struct {
	DecisionID string `json:"decisionId"`
	ActionType string `json:"actionType"`
}

// CycleResult summarizes the outcome of one observe-reason-record cycle.
type CycleResult struct {
	DecisionID string  `json:"decisionId"`
	ActionType string  `json:"actionType"`
	Confidence float64 `json:"confidence"`
	Situation  string  `json:"situation"`
	Status     string  `json:"status"`
	Error      string  `json:"error,omitempty"`
}

// CallReasonEndpoint sends the cluster state & skills to node-orchestrator's /reason route.
func CallReasonEndpoint(orchestratorURL string, reqPayload ReasonRequest) (*ReasonResponse, error) {
	bodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal reason request: %w", err)
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	url := fmt.Sprintf("%s/reason", orchestratorURL)
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to POST to /reason at %s: %w", url, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read /reason response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("orchestrator /reason returned HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var reasonResp ReasonResponse
	if err := json.Unmarshal(respBody, &reasonResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal /reason JSON response: %w", err)
	}

	return &reasonResp, nil
}

// RunObserveReasonCycle executes the observe → consult → reason → record loop.
// Returns a CycleResult summarizing the outcome.
// If monitor is non-nil, publishes CloudWatch metrics at the end of each cycle.
func RunObserveReasonCycle(ctx context.Context, mcpClient *mcp.Client, skillLoader *skills.Loader, store *decisions.Store, orchestratorURL string, monitor *monitoring.Monitor) CycleResult {
	log.Println("--- Starting Observe → Reason → Record cycle ---")

	result := CycleResult{Status: "failed"}
	var cpuPercent float64
	var activeQueries int

	// 1. Observe
	snapshot, err := mcpClient.GetClusterHealth(ctx)
	if err != nil {
		log.Printf("[Error] MCP observe failed: %v", err)
		result.Error = fmt.Sprintf("MCP observe failed: %v", err)
		publishMetrics(ctx, monitor, false, cpuPercent, activeQueries, 0, "error")
		return result
	}
	cpuPercent = snapshot.CPUPercent
	activeQueries = snapshot.ActiveQueries
	log.Printf("Observed cluster state: cpu=%.1f%% active_queries=%d", cpuPercent, activeQueries)

	// 2. Consult skills
	situation := "checking routine cluster health"
	if snapshot.CPUPercent > 70 {
		situation = "cpu spike investigation"
	}
	result.Situation = situation

	relevant := skillLoader.FindRelevant(situation)
	log.Printf("Found %d relevant skill(s) for situation %q", len(relevant), situation)

	skillPayloads := make([]SkillPayload, 0, len(relevant))
	skillNames := make([]string, 0, len(relevant))
	for _, s := range relevant {
		skillPayloads = append(skillPayloads, SkillPayload{Name: s.Name, Body: s.Body})
		skillNames = append(skillNames, s.Name)
	}

	// 3. Reason via node-orchestrator
	reasonReq := ReasonRequest{
		MCPContext: map[string]interface{}{
			"cpu_percent":        snapshot.CPUPercent,
			"active_queries":     snapshot.ActiveQueries,
			"contention_events":  snapshot.ContentionEvents,
			"replication_status": snapshot.ReplicationStatus,
			"raw":                snapshot.Raw,
		},
		RelevantSkills: skillPayloads,
		Situation:      situation,
	}

	reasonResp, err := CallReasonEndpoint(orchestratorURL, reasonReq)
	if err != nil {
		log.Printf("[Error] Reasoning call failed: %v. Skipping decision recording for this cycle.", err)
		result.Error = fmt.Sprintf("Reasoning call failed: %v", err)
		return result
	}

	log.Printf("Received AI decision: actionType=%s confidence=%.2f", reasonResp.ActionType, reasonResp.Confidence)
	result.ActionType = reasonResp.ActionType
	result.Confidence = reasonResp.Confidence

	// 4. Record to CockroachDB with status='proposed'
	mcpJSON, _ := snapshot.ToJSON()
	ccloudCmd := ""
	if reasonResp.CcloudCommand != nil {
		ccloudCmd = *reasonResp.CcloudCommand
	}

	id, err := store.RecordDecision(ctx, decisions.Decision{
		ActionType:      reasonResp.ActionType,
		TriggerSource:   "scheduled_run",
		ReasoningText:   reasonResp.ReasoningText,
		Embedding:       reasonResp.Embedding,
		Confidence:      reasonResp.Confidence,
		MCPContext:      mcpJSON,
		SkillsConsulted: skillNames,
		CcloudCommand:   ccloudCmd,
		Status:          "proposed",
	})

	if err != nil {
		log.Printf("[Error] Recording decision failed: %v", err)
		result.Error = fmt.Sprintf("Recording decision failed: %v", err)
		return result
	}

	log.Printf("Successfully recorded decision %s in DB with status 'proposed'", id)
	result.DecisionID = id.String()
	result.Status = "proposed"

	publishMetrics(ctx, monitor, true, cpuPercent, activeQueries, reasonResp.Confidence, reasonResp.ActionType)

	return result
}

// MustEnv reads a required environment variable or fatally exits.
func MustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("Missing required env var: %s", key)
	}
	return v
}

// EnvOr reads an environment variable with a fallback default.
func EnvOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// publishMetrics is a nil-safe helper that publishes cycle metrics to CloudWatch.
func publishMetrics(ctx context.Context, monitor *monitoring.Monitor, success bool, cpuPercent float64, activeQueries int, confidence float64, actionType string) {
	if monitor == nil {
		return
	}
	monitor.PublishCycleMetrics(ctx, monitoring.CycleMetrics{
		CycleSuccess:  success,
		CPUPercent:    cpuPercent,
		ActiveQueries: activeQueries,
		Confidence:    confidence,
		ActionType:    actionType,
	})
}

