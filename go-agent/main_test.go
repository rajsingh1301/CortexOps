package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rajsingh1301/CortexOps/go-agent/ccloud"
)

func TestExecuteWhitelistSafetyGate(t *testing.T) {
	ccloudWrapper := ccloud.NewWrapper("test-cluster", true) // dryRun=true

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req ExecuteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid JSON request body"}`, http.StatusBadRequest)
			return
		}

		var result *ccloud.CommandResult
		var execErr error

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
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "actionType not in safety whitelist",
			})
			return
		}

		if execErr != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": execErr.Error()})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	})

	tests := []struct {
		name           string
		actionType     string
		expectedStatus int
	}{
		{
			name:           "whitelisted backup action",
			actionType:     "backup",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "whitelisted scale_up action",
			actionType:     "scale_up",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "whitelisted schema_review action",
			actionType:     "schema_review",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "whitelisted no_action action",
			actionType:     "no_action",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "rejected unauthorized command",
			actionType:     "rm -rf /",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "rejected arbitrary script execution",
			actionType:     "python -c 'import os'",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "rejected unknown actionType",
			actionType:     "unknown_action",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := ExecuteRequest{
				DecisionID: "test-uuid-1234",
				ActionType: tt.actionType,
			}
			body, _ := json.Marshal(payload)

			req := httptest.NewRequest("POST", "/execute", bytes.NewBuffer(body))
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != tt.expectedStatus {
				t.Errorf("expected status %d for actionType %q, got %d (body: %s)",
					tt.expectedStatus, tt.actionType, rec.Code, rec.Body.String())
			}
		})
	}
}
