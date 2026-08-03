// Package monitoring publishes CortexOps custom metrics to AWS CloudWatch.
//
// Metrics are published under the "CortexOps" namespace after each
// observe → reason → record cycle. When running locally without AWS
// credentials, all publish calls silently no-op.
package monitoring

import (
	"context"
	"log"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatch"
	cwtypes "github.com/aws/aws-sdk-go-v2/service/cloudwatch/types"
)

const namespace = "CortexOps"

// CycleMetrics holds the telemetry data collected from one observe cycle.
type CycleMetrics struct {
	CycleSuccess bool    // true if cycle completed and recorded a decision
	CPUPercent   float64 // cluster CPU % from MCP snapshot
	ActiveQueries int    // active query count from MCP snapshot
	Confidence   float64 // AI decision confidence (0.0–1.0)
	ActionType   string  // e.g. "backup", "no_action", "scale_up"
}

// Monitor wraps the CloudWatch client for metric publishing.
type Monitor struct {
	client  *cloudwatch.Client
	enabled bool
}

// NewMonitor creates a CloudWatch monitor. If AWS credentials are not
// available (e.g. local dev), it returns a no-op monitor that logs
// metrics locally instead of publishing to CloudWatch.
func NewMonitor(ctx context.Context) *Monitor {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Printf("[Monitor] AWS config not available — metrics will be logged locally: %v", err)
		return &Monitor{enabled: false}
	}

	return &Monitor{
		client:  cloudwatch.NewFromConfig(cfg),
		enabled: true,
	}
}

// PublishCycleMetrics sends custom metrics to CloudWatch after each cycle.
// If CloudWatch is unavailable, metrics are logged to stdout instead.
func (m *Monitor) PublishCycleMetrics(ctx context.Context, metrics CycleMetrics) {
	now := time.Now().UTC()

	// Build metric data points
	cycleStatusValue := 0.0
	if metrics.CycleSuccess {
		cycleStatusValue = 1.0
	}

	datums := []cwtypes.MetricDatum{
		{
			MetricName: aws.String("CycleStatus"),
			Value:      aws.Float64(cycleStatusValue),
			Unit:       cwtypes.StandardUnitCount,
			Timestamp:  &now,
			Dimensions: []cwtypes.Dimension{
				{Name: aws.String("ActionType"), Value: aws.String(metrics.ActionType)},
			},
		},
		{
			MetricName: aws.String("CPUPercent"),
			Value:      aws.Float64(metrics.CPUPercent),
			Unit:       cwtypes.StandardUnitPercent,
			Timestamp:  &now,
		},
		{
			MetricName: aws.String("ActiveQueries"),
			Value:      aws.Float64(float64(metrics.ActiveQueries)),
			Unit:       cwtypes.StandardUnitCount,
			Timestamp:  &now,
		},
		{
			MetricName: aws.String("DecisionConfidence"),
			Value:      aws.Float64(metrics.Confidence),
			Unit:       cwtypes.StandardUnitNone,
			Timestamp:  &now,
		},
	}

	if !m.enabled {
		log.Printf("[Monitor] (local) CycleStatus=%.0f CPUPercent=%.1f ActiveQueries=%d Confidence=%.2f ActionType=%s",
			cycleStatusValue, metrics.CPUPercent, metrics.ActiveQueries, metrics.Confidence, metrics.ActionType)
		return
	}

	_, err := m.client.PutMetricData(ctx, &cloudwatch.PutMetricDataInput{
		Namespace:  aws.String(namespace),
		MetricData: datums,
	})
	if err != nil {
		log.Printf("[Monitor Warning] CloudWatch PutMetricData failed: %v", err)
		return
	}

	log.Printf("[Monitor] Published %d metrics to CloudWatch namespace=%s", len(datums), namespace)
}
