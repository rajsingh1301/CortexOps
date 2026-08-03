// Lambda entry point for the CortexOps observe → reason → record cycle.
//
// This handler is triggered by an EventBridge scheduled rule (e.g. every 5 min).
// It runs exactly one observe cycle, publishes CloudWatch metrics, and returns
// a JSON summary.
//
// Build:
//   GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bootstrap ./cmd/lambda/
//
// Deploy via SAM:
//   sam deploy --guided
package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/lambda"

	"github.com/rajsingh1301/CortexOps/go-agent/core"
	"github.com/rajsingh1301/CortexOps/go-agent/decisions"
	"github.com/rajsingh1301/CortexOps/go-agent/mcp"
	"github.com/rajsingh1301/CortexOps/go-agent/monitoring"
	"github.com/rajsingh1301/CortexOps/go-agent/skills"
)

// handler is invoked by the Lambda runtime on each EventBridge trigger.
func handler(ctx context.Context) (core.CycleResult, error) {
	log.Println("[Lambda] CortexOps observe cycle triggered")

	connString := core.MustEnv("COCKROACH_CONN_STRING")
	mcpEndpoint := core.MustEnv("COCKROACH_MCP_ENDPOINT")
	mcpAPIKey := core.MustEnv("COCKROACH_MCP_API_KEY")
	skillsRepoPath := core.EnvOr("SKILLS_REPO_PATH", "./skills-repo")
	orchestratorURL := core.MustEnv("NODE_ORCHESTRATOR_URL")

	store, err := decisions.NewStore(ctx, connString)
	if err != nil {
		log.Printf("[Lambda Error] Store connection failed: %v", err)
		return core.CycleResult{Status: "failed", Error: err.Error()}, nil
	}
	defer store.Close()

	mcpClient := mcp.NewClient(mcpEndpoint, mcpAPIKey)

	skillLoader := skills.NewLoader(skillsRepoPath)
	if err := skillLoader.LoadAll(); err != nil {
		log.Printf("[Lambda Warning] Skills loading: %v", err)
	}

	// Initialize CloudWatch monitor for metric publishing
	monitor := monitoring.NewMonitor(ctx)

	result := core.RunObserveReasonCycle(ctx, mcpClient, skillLoader, store, orchestratorURL, monitor)

	log.Printf("[Lambda] Cycle complete: status=%s actionType=%s decisionId=%s",
		result.Status, result.ActionType, result.DecisionID)

	return result, nil
}

func main() {
	lambda.Start(handler)
}
