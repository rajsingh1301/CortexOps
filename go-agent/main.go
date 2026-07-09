// Infrastructure Historian — Go agent service.
//
// Responsibilities (deliberately NOT including LLM reasoning — that lives
// in node-orchestrator, which calls this service over HTTP, or this
// service could shell out to it; see docs/architecture.md for the exact
// call direction you choose):
//   1. Observe: pull cluster state via mcp.Client (read-only)
//   2. Consult: find relevant Agent Skills via skills.Loader
//   3. Record: write decisions/skill invocations to CockroachDB
//   4. Act (gated): execute approved actions via ccloud.Wrapper
//
// This file wires the pieces together as a single runnable binary for
// local development. In Week 4 this becomes the target invoked by a
// scheduled AWS Lambda (via a Go Lambda handler — see cmd/lambda/ once
// you add it).
package main

import (
	"context"
	"log"
	"os"

	"github.com/yourname/infra-historian/go-agent/ccloud"
	"github.com/yourname/infra-historian/go-agent/decisions"
	"github.com/yourname/infra-historian/go-agent/mcp"
	"github.com/yourname/infra-historian/go-agent/skills"
)

func main() {
	ctx := context.Background()

	connString := mustEnv("COCKROACH_CONN_STRING")
	mcpEndpoint := mustEnv("COCKROACH_MCP_ENDPOINT")
	mcpAPIKey := mustEnv("COCKROACH_MCP_API_KEY")
	clusterName := mustEnv("CCLOUD_CLUSTER_NAME")
	skillsRepoPath := envOr("SKILLS_REPO_PATH", "./skills-repo")

	store, err := decisions.NewStore(ctx, connString)
	if err != nil {
		log.Fatalf("store: %v", err)
	}
	defer store.Close()

	mcpClient := mcp.NewClient(mcpEndpoint, mcpAPIKey)

	skillLoader := skills.NewLoader(skillsRepoPath)
	if err := skillLoader.LoadAll(); err != nil {
		log.Fatalf("loading skills: %v", err)
	}

	// dryRun=true until you've manually verified CreateBackup once —
	// flip via CCLOUD_DRY_RUN=false when you're ready for Week 3.
	dryRun := envOr("CCLOUD_DRY_RUN", "true") == "true"
	ccloudWrapper := ccloud.NewWrapper(clusterName, dryRun)

	// --- Step 1: Observe ---
	snapshot, err := mcpClient.GetClusterHealth(ctx)
	if err != nil {
		log.Fatalf("mcp: %v", err)
	}
	log.Printf("observed cluster state: cpu=%.1f%% active_queries=%d",
		snapshot.CPUPercent, snapshot.ActiveQueries)

	// --- Step 2: Consult skills ---
	situation := "checking routine cluster health"
	if snapshot.CPUPercent > 70 {
		situation = "cpu spike investigation"
	}
	relevant := skillLoader.FindRelevant(situation)
	log.Printf("found %d relevant skill(s) for situation %q", len(relevant), situation)

	// --- Step 3: Record (reasoning normally comes from node-orchestrator
	// calling Bedrock; this is a placeholder until that call is wired in) ---
	mcpJSON, _ := snapshot.ToJSON()
	skillNames := []string{}
	for _, s := range relevant {
		skillNames = append(skillNames, s.Name)
	}

	id, err := store.RecordDecision(ctx, decisions.Decision{
		ActionType:      "no_action",
		TriggerSource:   "manual_run",
		ReasoningText:   "Placeholder reasoning — replace with Bedrock output from node-orchestrator. See README Week 2.",
		Embedding:       nil, // filled in once node-orchestrator computes it
		Confidence:      0.5,
		MCPContext:      mcpJSON,
		SkillsConsulted: skillNames,
		Status:          "proposed",
	})
	if err != nil {
		log.Fatalf("recording decision: %v", err)
	}
	log.Printf("recorded decision %s", id)

	// --- Step 4: Act (only if a human has approved via the dashboard) ---
	// Left commented out deliberately — wire this up in Week 3 once the
	// approval flow exists. Uncomment to test CreateBackup manually:
	//
	// result, err := ccloudWrapper.CreateBackup(ctx)
	// if err != nil {
	// 	log.Fatalf("ccloud: %v", err)
	// }
	// log.Printf("ccloud result: %+v", result)
	_ = ccloudWrapper
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing required env var: %s", key)
	}
	return v
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
