// Infrastructure Historian — Go agent service (HTTP server mode).
// For Lambda mode, see cmd/lambda/main.go.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/rajsingh1301/CortexOps/go-agent/ccloud"
	"github.com/rajsingh1301/CortexOps/go-agent/core"
	"github.com/rajsingh1301/CortexOps/go-agent/decisions"
	"github.com/rajsingh1301/CortexOps/go-agent/mcp"
	"github.com/rajsingh1301/CortexOps/go-agent/skills"
)

func main() {
	ctx := context.Background()

	connString := core.MustEnv("COCKROACH_CONN_STRING")
	mcpEndpoint := core.MustEnv("COCKROACH_MCP_ENDPOINT")
	mcpAPIKey := core.MustEnv("COCKROACH_MCP_API_KEY")
	clusterName := core.MustEnv("CCLOUD_CLUSTER_NAME")
	skillsRepoPath := core.EnvOr("SKILLS_REPO_PATH", "./skills-repo")
	orchestratorURL := core.EnvOr("NODE_ORCHESTRATOR_URL", "http://localhost:4000")
	port := core.EnvOr("GO_AGENT_PORT", "5005")

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

	dryRun := core.EnvOr("CCLOUD_DRY_RUN", "true") == "true"
	ccloudWrapper := ccloud.NewWrapper(clusterName, dryRun)

	// Trigger initial cycle immediately, then repeat every 5 minutes
	observeInterval := core.EnvOr("OBSERVE_INTERVAL_SECONDS", "300")
	intervalSec := 300
	if parsed, err := time.ParseDuration(observeInterval + "s"); err == nil {
		intervalSec = int(parsed.Seconds())
	}
	go func() {
		// Run immediately on startup
		core.RunObserveReasonCycle(ctx, mcpClient, skillLoader, store, orchestratorURL, nil)

		ticker := time.NewTicker(time.Duration(intervalSec) * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				log.Printf("--- Periodic re-observe tick (every %ds) ---", intervalSec)
				core.RunObserveReasonCycle(ctx, mcpClient, skillLoader, store, orchestratorURL, nil)
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

		var req core.ExecuteRequest
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
