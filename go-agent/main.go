// Infrastructure Historian — Go agent service.
package main

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

	"github.com/rajsingh1301/CortexOps/go-agent/ccloud"
	"github.com/rajsingh1301/CortexOps/go-agent/decisions"
	"github.com/rajsingh1301/CortexOps/go-agent/mcp"
	"github.com/rajsingh1301/CortexOps/go-agent/skills"
)

type SkillPayload struct {
	Name string `json:"name"`
	Body string `json:"body"`
}

type ReasonRequest struct {
	MCPContext     map[string]interface{} `json:"mcpContext"`
	RelevantSkills []SkillPayload         `json:"relevantSkills"`
	Situation      string                 `json:"situation"`
}

type ReasonResponse struct {
	ActionType    string    `json:"actionType"`
	ReasoningText string    `json:"reasoningText"`
	Embedding     []float32 `json:"embedding"`
	Confidence    float64   `json:"confidence"`
	CcloudCommand *string   `json:"ccloudCommand"`
}

type ExecuteRequest struct {
	DecisionID string `json:"decisionId"`
	ActionType string `json:"actionType"`
}

// callReasonEndpoint sends the cluster state & skills to node-orchestrator's /reason route.
func callReasonEndpoint(orchestratorURL string, reqPayload ReasonRequest) (*ReasonResponse, error) {
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

// runObserveReasonCycle executes the observe -> consult -> reason -> record loop.
func runObserveReasonCycle(ctx context.Context, mcpClient *mcp.Client, skillLoader *skills.Loader, store *decisions.Store, orchestratorURL string) {
	log.Println("--- Starting Observe → Reason → Record cycle ---")

	// 1. Observe
	snapshot, err := mcpClient.GetClusterHealth(ctx)
	if err != nil {
		log.Printf("[Error] MCP observe failed: %v", err)
		return
	}
	log.Printf("Observed cluster state: cpu=%.1f%% active_queries=%d", snapshot.CPUPercent, snapshot.ActiveQueries)

	// 2. Consult skills
	situation := "checking routine cluster health"
	if snapshot.CPUPercent > 70 {
		situation = "cpu spike investigation"
	}
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

	reasonResp, err := callReasonEndpoint(orchestratorURL, reasonReq)
	if err != nil {
		log.Printf("[Error] Reasoning call failed: %v. Skipping decision recording for this cycle.", err)
		return
	}

	log.Printf("Received AI decision: actionType=%s confidence=%.2f", reasonResp.ActionType, reasonResp.Confidence)

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
		return
	}

	log.Printf("Successfully recorded decision %s in DB with status 'proposed'", id)
}

func main() {
	ctx := context.Background()

	connString := mustEnv("COCKROACH_CONN_STRING")
	mcpEndpoint := mustEnv("COCKROACH_MCP_ENDPOINT")
	mcpAPIKey := mustEnv("COCKROACH_MCP_API_KEY")
	clusterName := mustEnv("CCLOUD_CLUSTER_NAME")
	skillsRepoPath := envOr("SKILLS_REPO_PATH", "./skills-repo")
	orchestratorURL := envOr("NODE_ORCHESTRATOR_URL", "http://localhost:4000")
	port := envOr("GO_AGENT_PORT", "5005")

	store, err := decisions.NewStore(ctx, connString)
	if err != nil {
		log.Fatalf("Store connection error: %v", err)
	}
	defer store.Close()

	mcpClient := mcp.NewClient(mcpEndpoint, mcpAPIKey)

	skillLoader := skills.NewLoader(skillsRepoPath)
	if err := skillLoader.LoadAll(); err != nil {
		log.Printf("Warning loading skills from %s: %v", skillsRepoPath, err)
	}

	dryRun := envOr("CCLOUD_DRY_RUN", "true") == "true"
	ccloudWrapper := ccloud.NewWrapper(clusterName, dryRun)

	// Trigger initial cycle immediately, then repeat every 5 minutes
	observeInterval := envOr("OBSERVE_INTERVAL_SECONDS", "300")
	intervalSec := 300
	if parsed, err := time.ParseDuration(observeInterval + "s"); err == nil {
		intervalSec = int(parsed.Seconds())
	}
	go func() {
		// Run immediately on startup
		runObserveReasonCycle(ctx, mcpClient, skillLoader, store, orchestratorURL)

		ticker := time.NewTicker(time.Duration(intervalSec) * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				log.Printf("--- Periodic re-observe tick (every %ds) ---", intervalSec)
				runObserveReasonCycle(ctx, mcpClient, skillLoader, store, orchestratorURL)
			case <-ctx.Done():
				return
			}
		}
	}()

	// Setup HTTP server for execution triggers
	mux := http.NewServeMux()

	// POST /execute — safety-critical gated endpoint
	mux.HandleFunc("/execute", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req ExecuteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid JSON request body"}`, http.StatusBadRequest)
			return
		}

		log.Printf("Received execution request: decisionId=%s actionType=%s", req.DecisionID, req.ActionType)

		var result *ccloud.CommandResult
		var execErr error

		// Strict Whitelist Safety Gate (explicit switch-case)
		switch req.ActionType {
		case "backup":
			result, execErr = ccloudWrapper.CreateBackup(r.Context())
		case "scale_up":
			result, execErr = ccloudWrapper.ScaleUp(r.Context(), 1)
		case "schema_review":
			result, execErr = ccloudWrapper.SchemaReview(r.Context())
		case "no_action":
			result, execErr = ccloudWrapper.NoAction(r.Context())
		default:
			log.Printf("[Rejected] Action type %q is not in the execution whitelist!", req.ActionType)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{
				"error": fmt.Sprintf("actionType '%s' rejected by safety whitelist", req.ActionType),
			})
			return
		}

		if execErr != nil {
			log.Printf("[Error] Execution failed for actionType %s: %v", req.ActionType, execErr)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"error": execErr.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	})

	log.Printf("go-agent server listening on :%s (ccloud dryRun=%v)...", port, dryRun)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("HTTP server failed: %v", err)
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("Missing required env var: %s", key)
	}
	return v
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
