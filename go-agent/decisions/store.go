// Package decisions reads and writes the agent's memory journal
// (the `decisions` table) in CockroachDB.
package decisions

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Decision struct {
	ID              uuid.UUID
	ActionType       string
	TriggerSource    string
	ReasoningText    string
	Embedding        []float32 // len 1536, produced by node-orchestrator via Bedrock Titan
	Confidence       float64
	MCPContext       []byte // raw JSON
	SkillsConsulted  []string
	CcloudCommand    string
	Status           string
}

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(ctx context.Context, connString string) (*Store, error) {
	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		return nil, fmt.Errorf("connecting to cockroachdb: %w", err)
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() {
	s.pool.Close()
}

// RecordDecision inserts a new row with status='proposed'. The embedding
// is expected to already be computed (node-orchestrator calls Bedrock for
// this before invoking this method) — this package doesn't call Bedrock
// itself to keep the Go service focused on CockroachDB + ccloud + MCP.
func (s *Store) RecordDecision(ctx context.Context, d Decision) (uuid.UUID, error) {
	var embedStr interface{} = nil
	if len(d.Embedding) > 0 {
		var strVals []string
		for _, v := range d.Embedding {
			strVals = append(strVals, fmt.Sprintf("%g", v))
		}
		embedStr = fmt.Sprintf("[%s]", strings.Join(strVals, ","))
	}

	var id uuid.UUID
	err := s.pool.QueryRow(ctx, `
		INSERT INTO decisions
			(action_type, trigger_source, reasoning_text, embedding, confidence,
			 mcp_context, skills_consulted, ccloud_command, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'proposed')
		RETURNING id
	`, d.ActionType, d.TriggerSource, d.ReasoningText, embedStr, d.Confidence,
		d.MCPContext, d.SkillsConsulted, d.CcloudCommand).Scan(&id)

	if err != nil {
		return uuid.Nil, fmt.Errorf("inserting decision: %w", err)
	}
	return id, nil
}

// MarkExecuted updates a decision after a human approves it and the
// ccloud command has actually run.
func (s *Store) MarkExecuted(ctx context.Context, id uuid.UUID, outcome string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE decisions
		SET status = 'executed', outcome = $2, resolved_at = now()
		WHERE id = $1
	`, id, outcome)
	return err
}

// SimilarDecisions is the heart of the "why journal" — semantic search
// over past reasoning using CockroachDB's distributed vector index.
// queryEmbedding is the embedding of the user's question (e.g. "why did
// you scale up last week"), also computed via Bedrock in node-orchestrator.
func (s *Store) SimilarDecisions(ctx context.Context, queryEmbedding []float32, limit int) ([]Decision, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, action_type, trigger_source, reasoning_text, confidence,
		       ccloud_command, status
		FROM decisions
		ORDER BY embedding <-> $1
		LIMIT $2
	`, queryEmbedding, limit)
	if err != nil {
		return nil, fmt.Errorf("similarity search: %w", err)
	}
	defer rows.Close()

	var results []Decision
	for rows.Next() {
		var d Decision
		if err := rows.Scan(&d.ID, &d.ActionType, &d.TriggerSource, &d.ReasoningText,
			&d.Confidence, &d.CcloudCommand, &d.Status); err != nil {
			return nil, err
		}
		results = append(results, d)
	}
	return results, rows.Err()
}
