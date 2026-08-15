// Package main implements the `cortexops` Command-Line Interface (CLI).
//
// Interactive TUI & CLI application built with:
//   - Cobra (github.com/spf13/cobra): Clean command hierarchy & grouped help
//   - Bubbletea (github.com/charmbracelet/bubbletea): Interactive TUI queue & live watch dashboards
//   - Bubbles (github.com/charmbracelet/bubbles): Spinners, progress bars, and list components
//   - Lipgloss (github.com/charmbracelet/lipgloss): CockroachDB coral brand styling, color palettes & tables
//   - Huh (github.com/charmbracelet/huh): Interactive forms, selection menus & confirmation prompts
//   - Figure (github.com/common-nighthawk/go-figure): ASCII banner on help screens
//   - Viper (github.com/spf13/viper): Persistent YAML configuration (~/.cortexops/config.yaml)
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/charmbracelet/bubbles/list"
	sp "github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/lipgloss/table"
	"github.com/common-nighthawk/go-figure"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"golang.org/x/term"
)

const (
	cliVersion = "v1.2.0"
)

// Global flag variables
var (
	outputFormat     string
	flagQuiet        bool
	flagNoColor      bool
	flagLimit        int
	flagStatus       string
	flagAPIURL       string
	flagWatch        bool
	flagAdvancedInit bool
	configFile       string
	isTTY            bool
)

// ============================================================================
// LIPGLOSS BRAND DESIGN SYSTEM & PALETTES
// ============================================================================

var (
	// Brand Color Palette
	colorCoral   = lipgloss.Color("#FF5252") // CockroachDB Coral/Red
	colorCyan    = lipgloss.Color("#00BCD4") // Command Accent Cyan
	colorGreen   = lipgloss.Color("#4CAF50") // Success Green (✓)
	colorYellow  = lipgloss.Color("#FFA726") // Warning / Pending Yellow (⚠)
	colorCrimson = lipgloss.Color("#EF5350") // Error / Rejected Red (✗)
	colorSlate   = lipgloss.Color("#78909C") // Muted Subtitle & Section Headers
	colorWhite   = lipgloss.Color("#ECEFF1") // Body Text
	colorDim     = lipgloss.Color("#546E7A") // Dim gray borders

	// Unicode Symbols
	iconSuccess = "✓"
	iconError   = "✗"
	iconWarning = "⚠"
	iconInfo    = "→"
	iconBolt    = "⚡"
	iconSearch  = "🔍"
	iconCheck   = "✅"

	// Typography & Container Styles
	brandMarkStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorCoral)

	subTitleStyle = lipgloss.NewStyle().
			Foreground(colorSlate)

	sectionHeaderStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorSlate).
			MarginTop(1).
			MarginBottom(0)

	cmdNameStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorCyan)

	descStyle = lipgloss.NewStyle().
			Foreground(colorWhite)

	headerBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colorCoral).
			Padding(1, 2).
			MarginBottom(1)

	cardBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colorSlate).
			Padding(0, 1).
			MarginBottom(1)

	successStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorGreen)

	errorStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorCrimson)

	errorBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.DoubleBorder()).
			BorderForeground(colorCrimson).
			Padding(1, 2).
			MarginBottom(1)

	warningStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorYellow)

	infoStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorCyan)

	boldStyle = lipgloss.NewStyle().
			Bold(true)
)

// Data Models
type ClusterHealth struct {
	CPUPercent        float64     `json:"cpu_percent"`
	ActiveQueries     interface{} `json:"active_queries"`
	ContentionEvents  interface{} `json:"contention_events"`
	ReplicationStatus string      `json:"replication_status"`
	CapturedAt        string      `json:"captured_at"`
}

type Decision struct {
	ID              string   `json:"id"`
	ActionType      string   `json:"action_type"`
	TriggerSource   string   `json:"trigger_source"`
	ReasoningText   string   `json:"reasoning_text"`
	Confidence      float64  `json:"confidence"`
	SkillsConsulted []string `json:"skills_consulted"`
	CcloudCommand   string   `json:"ccloud_command"`
	Status          string   `json:"status"`
	Outcome         string   `json:"outcome"`
	CreatedAt       string   `json:"created_at"`
}

type SearchMatch struct {
	ID            string  `json:"id"`
	ActionType    string  `json:"action_type"`
	ReasoningText string  `json:"reasoning_text"`
	Confidence    float64 `json:"confidence"`
	CcloudCommand string  `json:"ccloud_command"`
	Status        string  `json:"status"`
	Outcome       string  `json:"outcome"`
	CreatedAt     string  `json:"created_at"`
}

type SearchResponse struct {
	Question string        `json:"question"`
	Matches  []SearchMatch `json:"matches"`
}

// ============================================================================
// INITIALIZATION & ENVIRONMENT SETUP
// ============================================================================

func initTTYChecks() {
	isTTY = term.IsTerminal(int(os.Stdout.Fd()))
	if !isTTY || os.Getenv("NO_COLOR") != "" {
		lipgloss.SetColorProfile(0) // Disable colors on non-TTY pipes
	}
}

func getConfigFileLocation() string {
	if configFile != "" {
		return configFile
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "config.yaml"
	}
	return filepath.Join(home, ".cortexops", "config.yaml")
}

func isOnboardingCompleted() bool {
	configPath := getConfigFileLocation()
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return false
	}
	if viper.GetBool("onboarding_completed") {
		return true
	}
	if len(viper.GetStringMap("clusters")) > 0 || viper.GetString("api_url") != "" {
		return true
	}
	return false
}

func initViper() {
	if configFile != "" {
		viper.SetConfigFile(configFile)
	} else {
		home, err := os.UserHomeDir()
		if err == nil {
			configDir := filepath.Join(home, ".cortexops")
			_ = os.MkdirAll(configDir, 0700)
			viper.AddConfigPath(configDir)
			viper.SetConfigName("config")
			viper.SetConfigType("yaml")
		}
	}

	viper.SetDefault("api_url", "http://localhost:4000")
	viper.SetDefault("output", "table")
	viper.SetDefault("default_limit", 10)
	viper.SetDefault("no_color", false)
	viper.SetDefault("onboarding_completed", false)

	viper.SetEnvPrefix("CORTEXOPS")
	viper.AutomaticEnv()
	_ = viper.ReadInConfig()

	// Ensure config file permissions are 0600 if it exists
	if cfgFile := viper.ConfigFileUsed(); cfgFile != "" {
		_ = os.Chmod(cfgFile, 0600)
	}
}

func getEffectiveAPIURL() string {
	if flagAPIURL != "" {
		return strings.TrimRight(flagAPIURL, "/")
	}
	if envURL := os.Getenv("CORTEXOPS_API_URL"); envURL != "" {
		return strings.TrimRight(envURL, "/")
	}
	// Check active cluster URL if available
	activeCluster := viper.GetString("active_cluster")
	if activeCluster != "" {
		clusterKey := fmt.Sprintf("clusters.%s.api_url", activeCluster)
		if clusterURL := viper.GetString(clusterKey); clusterURL != "" {
			return strings.TrimRight(clusterURL, "/")
		}
	}
	return strings.TrimRight(viper.GetString("api_url"), "/")
}

func getEffectiveOutputFormat() string {
	if outputFormat != "" {
		return strings.ToLower(outputFormat)
	}
	if envOut := os.Getenv("CORTEXOPS_OUTPUT"); envOut != "" {
		return strings.ToLower(envOut)
	}
	return strings.ToLower(viper.GetString("output"))
}

// ============================================================================
// SPINNERS & ERROR PRESENTATION
// ============================================================================

func startSpinner(msg string) *spinner.Spinner {
	outFormat := getEffectiveOutputFormat()
	if !isTTY || flagQuiet || outFormat == "json" || outFormat == "plain" {
		return nil
	}
	s := spinner.New(spinner.CharSets[14], 80*time.Millisecond)
	s.Suffix = " " + cmdNameStyle.Render(msg)
	s.Start()
	return s
}

func stopSpinner(s *spinner.Spinner) {
	if s != nil {
		s.Stop()
	}
}

func printErrorAndExit(summary string, suggestion string) {
	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		errObj := map[string]string{
			"error":      summary,
			"suggestion": suggestion,
		}
		jsonBytes, _ := json.Marshal(errObj)
		fmt.Println(string(jsonBytes))
		os.Exit(1)
	}

	if !isTTY || flagNoColor || viper.GetBool("no_color") {
		fmt.Fprintf(os.Stderr, "Error [%s]: %s\n", iconError, summary)
		if suggestion != "" {
			fmt.Fprintf(os.Stderr, "Suggestion [%s]: %s\n", iconInfo, suggestion)
		}
		fmt.Println()
		os.Exit(1)
	}

	errContent := errorStyle.Render(fmt.Sprintf("%s Error: ", iconError)) + boldStyle.Render(summary)
	if suggestion != "" {
		errContent += "\n\n" + infoStyle.Render(fmt.Sprintf("%s Suggested Fix: ", iconInfo)) + suggestion
	}

	fmt.Println(errorBoxStyle.Render(errContent))
	os.Exit(1)
}

func parseIntVal(v interface{}) int {
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case string:
		if parsed, err := strconv.Atoi(val); err == nil {
			return parsed
		}
	}
	return 0
}

// ============================================================================
// STYLED LANDING SCREEN (Run when no arguments are provided)
// ============================================================================

func getQuickClusterStatus() (bool, string) {
	apiURL := getEffectiveAPIURL()
	client := http.Client{
		Timeout: 1500 * time.Millisecond,
	}
	resp, err := client.Get(apiURL + "/cluster/health")
	if err != nil {
		if strings.Contains(apiURL, "localhost") {
			fallbackURL := strings.Replace(apiURL, "localhost", "127.0.0.1", 1)
			if resp2, err2 := client.Get(fallbackURL + "/cluster/health"); err2 == nil {
				defer resp2.Body.Close()
				if resp2.StatusCode == http.StatusOK {
					return true, apiURL
				}
			}
		}
		return false, apiURL
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK, apiURL
}

func renderLandingScreen(cmd *cobra.Command) {
	// 1. Compact ASCII Banner (go-figure "small" font)
	fig := figure.NewFigure("CortexOps", "small", true)
	if isTTY && !flagNoColor && !viper.GetBool("no_color") {
		fmt.Println(brandMarkStyle.Render(fig.String()))
	} else {
		fmt.Println(fig.String())
	}

	// 2. Status / Health & Version Indicator Pill
	connected, apiURL := getQuickClusterStatus()
	var statusLine string
	if connected {
		statusLine = fmt.Sprintf("%s %s %s %s",
			lipgloss.NewStyle().Bold(true).Foreground(colorGreen).Render("● Connected to cluster"),
			lipgloss.NewStyle().Foreground(colorSlate).Render("("+apiURL+")"),
			lipgloss.NewStyle().Foreground(colorSlate).Render("·"),
			lipgloss.NewStyle().Bold(true).Foreground(colorWhite).Render(cliVersion),
		)
	} else {
		statusLine = fmt.Sprintf("%s %s %s %s",
			lipgloss.NewStyle().Bold(true).Foreground(colorCrimson).Render("○ Not connected"),
			lipgloss.NewStyle().Foreground(colorSlate).Render("("+apiURL+")"),
			lipgloss.NewStyle().Foreground(colorSlate).Render("·"),
			lipgloss.NewStyle().Bold(true).Foreground(colorWhite).Render(cliVersion),
		)
	}
	fmt.Println(statusLine)
	fmt.Println(subTitleStyle.Render("Autonomous, AI-assisted operations & self-healing agent for CockroachDB clusters."))
	fmt.Println()

	// Clear Visual Hierarchy Styles:
	// Section Headers (Accent Yellow) > Command Names (Bold White) > Descriptions (Dimmed Gray)
	secHeaderStyle := lipgloss.NewStyle().Bold(true).Foreground(colorYellow)
	cmdNameBright := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#FFFFFF"))
	descDim := lipgloss.NewStyle().Foreground(lipgloss.Color("#78909C"))
	flagBright := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#ECEFF1"))
	aliasArrow := lipgloss.NewStyle().Foreground(colorCyan)

	// 3. USAGE Section
	fmt.Println(secHeaderStyle.Render("USAGE"))
	fmt.Printf("  %s %s\n\n", cmdNameBright.Render("cortexops"), descDim.Render("<command> [flags]"))

	// 4. CORE COMMANDS Section (Real top-level commands)
	fmt.Println(secHeaderStyle.Render("CORE COMMANDS"))
	renderRow := func(nameStr, descStr string) {
		paddedName := lipgloss.NewStyle().Width(18).Render("  " + cmdNameBright.Render(nameStr))
		fmt.Printf("%s%s\n", paddedName, descDim.Render(descStr))
	}
	renderRow("cluster", "Inspect CockroachDB cluster telemetry, load & health")
	renderRow("decision", "Manage proposed decision approval queue & executions")
	renderRow("memory", "Query operational decision memory via vector search")
	renderRow("config", "Manage persistent CLI configuration (~/.cortexops/config.yaml)")
	renderRow("version", "Print CLI version and connected endpoint info")
	fmt.Println()

	// 5. ALIASES Section (Fast shortcuts)
	fmt.Println(secHeaderStyle.Render("ALIASES"))
	renderAlias := func(aliasStr, targetCmdStr string) {
		paddedAlias := lipgloss.NewStyle().Width(18).Render("  " + cmdNameBright.Render(aliasStr))
		fmt.Printf("%s%s %s\n", paddedAlias, aliasArrow.Render("→"), descDim.Render(targetCmdStr))
	}
	renderAlias("status", "cluster get-health [--watch]")
	renderAlias("queue", "decision list --status=proposed (Interactive TUI)")
	renderAlias("approve", "decision approve [id]")
	renderAlias("reject", "decision reject [id]")
	renderAlias("ask", "memory search \"<query>\"")
	fmt.Println()

	// 6. FLAGS Section
	fmt.Println(secHeaderStyle.Render("FLAGS"))
	renderFlag := func(flagStr, descStr string) {
		paddedFlag := lipgloss.NewStyle().Width(26).Render("  " + flagBright.Render(flagStr))
		fmt.Printf("%s%s\n", paddedFlag, descDim.Render(descStr))
	}
	renderFlag("-h, --help", "Show help for cortexops")
	renderFlag("-v, --version", "Show cortexops version")
	renderFlag("-o, --output string", "Output format (table|json|plain)")
	renderFlag("-q, --quiet", "Output essential identifiers only")
	renderFlag("    --no-color", "Disable ANSI color formatting")
	renderFlag("-n, --limit int", "Limit number of returned items")
	renderFlag("    --api-url string", "Override node-orchestrator API endpoint")
	renderFlag("    --config string", "Custom config file path")
	fmt.Println()

	// 7. Closing Hint
	fmt.Println(descDim.Render("Run 'cortexops <command> --help' for more information on a command."))
}

// ============================================================================
// COBRA COMMAND TREE DEFINITIONS
// ============================================================================

var rootCmd = &cobra.Command{
	Use:     "cortexops",
	Short:   "Autonomous, AI-assisted operations & self-healing agent for CockroachDB clusters",
	Long:    "Official command-line interface for telemetry inspection, interactive decision approvals,\ngated safety execution, and vector operational memory retrieval.",
	Version: cliVersion,
	Run: func(cmd *cobra.Command, args []string) {
		outFormat := getEffectiveOutputFormat()
		if outFormat == "json" {
			handleVersionJSON()
			return
		}
		renderLandingScreen(cmd)
	},
}

// 1. Cluster resource command
var clusterCmd = &cobra.Command{
	Use:     "cluster",
	Short:   "Inspect CockroachDB cluster telemetry, health, and multi-cluster configurations",
	Long:    "Query cluster CPU load %, active query count, contention events, or manage multiple CockroachDB cluster profiles.",
	Aliases: []string{"c"},
}

var clusterHealthCmd = &cobra.Command{
	Use:     "get-health",
	Aliases: []string{"status", "health"},
	Short:   "Fetch live cluster telemetry from Managed MCP Server",
	Long:    "Retrieves real-time cluster status including CPU load %, query count, contention, replication, and safety gate state. Supports live refreshing --watch mode.",
	Example: "  cortexops cluster get-health\n" +
		"  cortexops status --watch\n" +
		"  cortexops status --output json",
	Run: func(cmd *cobra.Command, args []string) {
		if flagWatch && isTTY && getEffectiveOutputFormat() == "table" {
			runStatusWatchTUI()
		} else {
			handleClusterHealth()
		}
	},
}

var clusterListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls", "show"},
	Short:   "List configured CockroachDB clusters",
	Long:    "Displays all CockroachDB clusters saved in ~/.cortexops/config.yaml and highlights the active cluster.",
	Example: "  cortexops cluster list\n" +
		"  cortexops cluster list --output json",
	Run: func(cmd *cobra.Command, args []string) {
		handleClusterList()
	},
}

var clusterAddCmd = &cobra.Command{
	Use:     "add",
	Short:   "Add a new CockroachDB cluster configuration",
	Long:    "Interactively configure a new CockroachDB cluster and save it to persistent configuration.",
	Example: "  cortexops cluster add",
	Run: func(cmd *cobra.Command, args []string) {
		handleClusterAdd()
	},
}

var clusterSwitchCmd = &cobra.Command{
	Use:     "switch [cluster_name]",
	Aliases: []string{"use"},
	Short:   "Switch active CockroachDB cluster",
	Long:    "Changes the default active cluster used for telemetry inspection, decision proposals, and execution.",
	Example: "  cortexops cluster switch production-cluster\n" +
		"  cortexops cluster switch",
	Run: func(cmd *cobra.Command, args []string) {
		name := ""
		if len(args) > 0 {
			name = args[0]
		}
		handleClusterSwitch(name)
	},
}

var clusterRemoveCmd = &cobra.Command{
	Use:     "remove [cluster_name]",
	Aliases: []string{"rm", "delete", "disconnect"},
	Short:   "Disconnect and remove a configured cluster profile",
	Long:    "Removes a CockroachDB cluster configuration from ~/.cortexops/config.yaml.",
	Example: "  cortexops cluster remove perky-tamarin\n" +
		"  cortexops cluster remove",
	Run: func(cmd *cobra.Command, args []string) {
		name := ""
		if len(args) > 0 {
			if args[0] == "cluster" && len(args) > 1 {
				name = args[1]
			} else {
				name = args[0]
			}
		}
		handleClusterRemove(name)
	},
}

// 1.1 Init / Onboard command
var initCmd = &cobra.Command{
	Use:     "init",
	Aliases: []string{"onboard", "setup"},
	Short:   "Run interactive CockroachDB cluster onboarding wizard",
	Long:    "Guides you through connecting a CockroachDB cluster, verifying connectivity, and configuring AI settings.",
	Example: "  cortexops init\n" +
		"  cortexops init --advanced\n" +
		"  cortexops onboard",
	Run: func(cmd *cobra.Command, args []string) {
		runOnboardingWizard(flagAdvancedInit)
	},
}

var aliasDisconnectCmd = &cobra.Command{
	Use:     "disconnect [cluster_name]",
	Aliases: []string{"remove"},
	Short:   "Alias for 'cluster remove'",
	Run: func(cmd *cobra.Command, args []string) {
		name := ""
		if len(args) > 0 {
			if args[0] == "cluster" && len(args) > 1 {
				name = args[1]
			} else {
				name = args[0]
			}
		}
		handleClusterRemove(name)
	},
}

// 1.2 Simulate / Anomaly Injection command
var simulateCmd = &cobra.Command{
	Use:     "simulate [anomaly_type]",
	Aliases: []string{"spike", "load", "chaos"},
	Short:   "Simulate high cluster load or CPU anomalies to trigger AI decision flow",
	Long:    "Simulates elevated CPU utilization, active query surge, and contention to trigger the Observe → Reason → Propose loop.",
	Example: "  cortexops simulate\n" +
		"  cortexops simulate spike\n" +
		"  cortexops load",
	Run: func(cmd *cobra.Command, args []string) {
		handleSimulateLoad()
	},
}

// 2. Decision resource command
var decisionCmd = &cobra.Command{
	Use:     "decision",
	Short:   "Manage proposed decision queue and execution approvals",
	Long:    "List pending decisions, approve decisions to trigger safety-gated execution, or reject decisions.",
	Aliases: []string{"d", "decisions"},
}

var decisionListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls", "queue"},
	Short:   "List decisions in the approval queue (launches interactive TUI in TTY)",
	Long:    "Lists proposed decisions. In an interactive terminal, launches a Bubbletea list view for navigation, approval, and rejection.",
	Example: "  cortexops decision list\n" +
		"  cortexops queue\n" +
		"  cortexops queue --output json",
	Run: func(cmd *cobra.Command, args []string) {
		outFormat := getEffectiveOutputFormat()
		if isTTY && !flagQuiet && (outFormat == "table" || outFormat == "") && flagStatus == "" {
			runQueueBubbleteaTUI()
		} else {
			handleDecisionListStatic()
		}
	},
}

var decisionApproveCmd = &cobra.Command{
	Use:     "approve [decision_id]",
	Aliases: []string{"app"},
	Short:   "Approve & execute a proposed decision via safety whitelist",
	Long:    "Triggers safety-gated execution in go-agent for the specified decision ID. If ID is omitted, launches interactive prompt.",
	Example: "  cortexops decision approve a625baf7-1361-47a1-b468-75c0b9e18c10\n" +
		"  cortexops approve",
	Run: func(cmd *cobra.Command, args []string) {
		id := ""
		if len(args) > 0 {
			id = args[0]
		}
		handleDecisionApprove(id)
	},
}

var decisionRejectCmd = &cobra.Command{
	Use:     "reject [decision_id]",
	Aliases: []string{"rej"},
	Short:   "Reject a proposed decision",
	Long:    "Marks a decision as rejected in CockroachDB. If ID is omitted, launches interactive prompt.",
	Example: "  cortexops decision reject 372463d1-462f-46a6-96b4-8d91e2b0df19\n" +
		"  cortexops reject",
	Run: func(cmd *cobra.Command, args []string) {
		id := ""
		if len(args) > 0 {
			id = args[0]
		}
		handleDecisionReject(id)
	},
}

// 3. Memory resource command
var memoryCmd = &cobra.Command{
	Use:     "memory",
	Short:   "Query operational decision memory via vector search",
	Long:    "Perform semantic natural language vector similarity search over historical cluster operations in CockroachDB.",
	Aliases: []string{"m"},
}

var memorySearchCmd = &cobra.Command{
	Use:     "search [query]",
	Aliases: []string{"ask", "find"},
	Short:   "Perform vector similarity search over past operational reasoning",
	Long:    "Queries CockroachDB vector index for decisions matching your question.",
	Example: "  cortexops memory search \"why did you scale up last week?\"\n" +
		"  cortexops ask \"why was a backup taken on Tuesday?\"\n" +
		"  cortexops ask --limit 2 --output json",
	Run: func(cmd *cobra.Command, args []string) {
		query := ""
		if len(args) > 0 {
			query = strings.Join(args, " ")
		}
		handleMemorySearch(query)
	},
}

// 4. Config resource command
var configCmd = &cobra.Command{
	Use:     "config",
	Short:   "Manage persistent CLI configuration settings",
	Long:    "View, get, or set CortexOps CLI configuration parameters persisted in ~/.cortexops/config.yaml.",
	Aliases: []string{"cfg"},
}

var configViewCmd = &cobra.Command{
	Use:     "view",
	Aliases: []string{"show", "ls"},
	Short:   "View current effective CLI configuration",
	Example: "  cortexops config view\n" +
		"  cortexops config view --output json",
	Run: func(cmd *cobra.Command, args []string) {
		handleConfigView()
	},
}

var configGetCmd = &cobra.Command{
	Use:     "get <key>",
	Short:   "Get a specific config value",
	Example: "  cortexops config get api_url\n" +
		"  cortexops config get output",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) < 1 {
			printErrorAndExit("Config key required", "Usage: cortexops config get api_url\nValid keys: api_url, output, default_limit, no_color")
		}
		handleConfigGet(args[0])
	},
}

var configSetCmd = &cobra.Command{
	Use:     "set [key] [value]",
	Short:   "Persist a configuration value",
	Example: "  cortexops config set api_url http://localhost:4000\n" +
		"  cortexops config set output json\n" +
		"  cortexops config set default_limit 10",
	Run: func(cmd *cobra.Command, args []string) {
		key := ""
		val := ""
		if len(args) >= 1 {
			key = args[0]
		}
		if len(args) >= 2 {
			val = args[1]
		}
		handleConfigSet(key, val)
	},
}

// 5. Version command
var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print CLI version and configuration info",
	Run: func(cmd *cobra.Command, args []string) {
		outFormat := getEffectiveOutputFormat()
		if outFormat == "json" {
			handleVersionJSON()
			return
		}

		fmt.Println(brandMarkStyle.Render(fmt.Sprintf("%s CortexOps CLI ", iconBolt)) + boldStyle.Render(cliVersion))
		fmt.Printf("  %s %s\n", boldStyle.Render("Connected API:"), cmdNameStyle.Render(getEffectiveAPIURL()))
		fmt.Printf("  %s %s\n", boldStyle.Render("Config File:  "), subTitleStyle.Render(viper.ConfigFileUsed()))
	},
}

// 6. Direct shortcut aliases
var aliasStatusCmd = &cobra.Command{
	Use:    "status",
	Short:  "Alias for 'cluster get-health'",
	Hidden: false,
	Run: func(cmd *cobra.Command, args []string) {
		if flagWatch && isTTY && getEffectiveOutputFormat() == "table" {
			runStatusWatchTUI()
		} else {
			handleClusterHealth()
		}
	},
}

var aliasQueueCmd = &cobra.Command{
	Use:    "queue",
	Short:  "Alias for 'decision list --status=proposed'",
	Hidden: false,
	Run: func(cmd *cobra.Command, args []string) {
		outFormat := getEffectiveOutputFormat()
		if isTTY && !flagQuiet && (outFormat == "table" || outFormat == "") && flagStatus == "" {
			runQueueBubbleteaTUI()
		} else {
			handleDecisionListStatic()
		}
	},
}

var aliasApproveCmd = &cobra.Command{
	Use:   "approve [decision_id]",
	Short: "Alias for 'decision approve'",
	Run: func(cmd *cobra.Command, args []string) {
		id := ""
		if len(args) > 0 {
			id = args[0]
		}
		handleDecisionApprove(id)
	},
}

var aliasRejectCmd = &cobra.Command{
	Use:   "reject [decision_id]",
	Short: "Alias for 'decision reject'",
	Run: func(cmd *cobra.Command, args []string) {
		id := ""
		if len(args) > 0 {
			id = args[0]
		}
		handleDecisionReject(id)
	},
}

var aliasAskCmd = &cobra.Command{
	Use:   "ask [query]",
	Short: "Alias for 'memory search'",
	Run: func(cmd *cobra.Command, args []string) {
		query := ""
		if len(args) > 0 {
			query = strings.Join(args, " ")
		}
		handleMemorySearch(query)
	},
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&outputFormat, "output", "o", "", "Output format (table|json|plain)")
	rootCmd.PersistentFlags().BoolVarP(&flagQuiet, "quiet", "q", false, "Output essential identifiers only")
	rootCmd.PersistentFlags().BoolVar(&flagNoColor, "no-color", false, "Disable ANSI color formatting")
	rootCmd.PersistentFlags().IntVarP(&flagLimit, "limit", "n", 0, "Limit number of returned items")
	rootCmd.PersistentFlags().StringVar(&flagStatus, "status", "", "Filter decision status (proposed|executed|rejected|failed)")
	rootCmd.PersistentFlags().StringVar(&flagAPIURL, "api-url", "", "Override node-orchestrator API endpoint")
	rootCmd.PersistentFlags().StringVar(&configFile, "config", "", "Custom config file path")

	// Watch flag for status
	clusterHealthCmd.Flags().BoolVarP(&flagWatch, "watch", "w", false, "Live watch mode (refreshes TUI telemetry dashboard)")
	aliasStatusCmd.Flags().BoolVarP(&flagWatch, "watch", "w", false, "Live watch mode (refreshes TUI telemetry dashboard)")

	// First-run automatic onboarding check
	rootCmd.PersistentPreRunE = func(cmd *cobra.Command, args []string) error {
		name := cmd.Name()
		if name == "help" || name == "version" || name == "init" || name == "onboard" || name == "setup" || name == "completion" {
			return nil
		}
		if cmd.Flags().Changed("help") || cmd.Flags().Changed("version") {
			return nil
		}
		if !isTTY || flagQuiet || getEffectiveOutputFormat() == "json" {
			return nil
		}
		if os.Getenv("CORTEXOPS_SKIP_ONBOARDING") == "true" {
			return nil
		}
		if !isOnboardingCompleted() {
			runOnboardingWizard(false)
		}
		return nil
	}

	clusterCmd.AddCommand(clusterHealthCmd, clusterListCmd, clusterAddCmd, clusterSwitchCmd, clusterRemoveCmd)
	rootCmd.AddCommand(clusterCmd)

	decisionCmd.AddCommand(decisionListCmd, decisionApproveCmd, decisionRejectCmd)
	rootCmd.AddCommand(decisionCmd)

	memoryCmd.AddCommand(memorySearchCmd)
	rootCmd.AddCommand(memoryCmd)

	configCmd.AddCommand(configViewCmd, configGetCmd, configSetCmd)
	rootCmd.AddCommand(configCmd)

	initCmd.Flags().BoolVarP(&flagAdvancedInit, "advanced", "a", false, "Configure advanced onboarding parameters (API endpoint, AI toggles)")
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(simulateCmd)

	rootCmd.AddCommand(aliasStatusCmd, aliasQueueCmd, aliasApproveCmd, aliasRejectCmd, aliasAskCmd, aliasDisconnectCmd)
}

// ============================================================================
// BUBBLETEA INTERACTIVE DECISION QUEUE MODEL (bubbles/list + spinner + stats)
// ============================================================================

type decisionItem struct {
	decision Decision
}

func (i decisionItem) Title() string {
	shortID := i.decision.ID
	if len(shortID) > 8 {
		shortID = shortID[:8]
	}
	return fmt.Sprintf("[%s] %s (Conf: %.0f%%)", shortID, i.decision.ActionType, i.decision.Confidence*100)
}

func (i decisionItem) Description() string {
	desc := i.decision.ReasoningText
	if len(desc) > 90 {
		desc = desc[:87] + "..."
	}
	return desc
}

func (i decisionItem) FilterValue() string {
	return i.decision.ActionType + " " + i.decision.ReasoningText + " " + i.decision.ID
}

type queueModel struct {
	list          list.Model
	decisions     []Decision
	spinner       sp.Model
	statusMsg     string
	err           error
	approvedCount int
	rejectedCount int
	confirming    bool
	confirmAction string // "approve" or "reject"
	confirmID     string
	executing     bool
}

type decisionsLoadedMsg struct {
	decisions []Decision
	err       error
}

type decisionActionCompletedMsg struct {
	action string // "approve" or "reject"
	id     string
	err    error
}

func fetchDecisionsCmd() tea.Cmd {
	return func() tea.Msg {
		apiURL := getEffectiveAPIURL()
		resp, err := http.Get(apiURL + "/decisions?status=proposed")
		if err != nil {
			return decisionsLoadedMsg{err: err}
		}
		defer resp.Body.Close()

		var listData []Decision
		if err := json.NewDecoder(resp.Body).Decode(&listData); err != nil {
			return decisionsLoadedMsg{err: err}
		}
		return decisionsLoadedMsg{decisions: listData}
	}
}

func executeDecisionCmd(action, id string) tea.Cmd {
	return func() tea.Msg {
		apiURL := getEffectiveAPIURL()
		url := fmt.Sprintf("%s/decisions/%s/%s", apiURL, id, action)
		resp, err := http.Post(url, "application/json", nil)
		if err != nil {
			return decisionActionCompletedMsg{action: action, id: id, err: err}
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return decisionActionCompletedMsg{action: action, id: id, err: fmt.Errorf("HTTP %d", resp.StatusCode)}
		}
		return decisionActionCompletedMsg{action: action, id: id}
	}
}

func newQueueModel() queueModel {
	s := sp.New()
	s.Spinner = sp.Dot
	s.Style = lipgloss.NewStyle().Foreground(colorCyan)

	l := list.New([]list.Item{}, list.NewDefaultDelegate(), 0, 0)
	l.Title = "📋 CortexOps Pending Decision Approval Queue"
	l.Styles.Title = brandMarkStyle.Copy().MarginLeft(1)

	return queueModel{
		list:      l,
		spinner:   s,
		statusMsg: "Loading decisions...",
	}
}

func (m queueModel) Init() tea.Cmd {
	return tea.Batch(m.spinner.Tick, fetchDecisionsCmd())
}

func (m queueModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		if m.confirming {
			switch strings.ToLower(msg.String()) {
			case "y":
				m.confirming = false
				m.executing = true
				m.statusMsg = fmt.Sprintf("Executing %s for %s...", m.confirmAction, m.confirmID[:8])
				return m, executeDecisionCmd(m.confirmAction, m.confirmID)
			case "n", "esc":
				m.confirming = false
				m.statusMsg = "Operation cancelled."
				return m, nil
			}
			return m, nil
		}

		switch msg.String() {
		case "a":
			if sel, ok := m.list.SelectedItem().(decisionItem); ok {
				m.confirming = true
				m.confirmAction = "approve"
				m.confirmID = sel.decision.ID
			}
		case "r":
			if sel, ok := m.list.SelectedItem().(decisionItem); ok {
				m.confirming = true
				m.confirmAction = "reject"
				m.confirmID = sel.decision.ID
			}
		case "q", "ctrl+c":
			return m, tea.Quit
		}

	case tea.WindowSizeMsg:
		m.list.SetSize(msg.Width, msg.Height-4)

	case decisionsLoadedMsg:
		if msg.err != nil {
			m.err = msg.err
			m.statusMsg = fmt.Sprintf("%s Failed to fetch decisions: %s", iconError, msg.err.Error())
			return m, nil
		}
		m.decisions = msg.decisions
		var items []list.Item
		for _, d := range msg.decisions {
			items = append(items, decisionItem{decision: d})
		}
		m.list.SetItems(items)
		m.statusMsg = fmt.Sprintf("%s %d pending decision(s) loaded.", iconInfo, len(items))

	case decisionActionCompletedMsg:
		m.executing = false
		if msg.err != nil {
			m.statusMsg = fmt.Sprintf("%s Failed to %s decision: %v", iconError, msg.action, msg.err)
		} else {
			if msg.action == "approve" {
				m.approvedCount++
				m.statusMsg = fmt.Sprintf("%s Decision %s APPROVED & EXECUTED!", iconCheck, msg.id[:8])
			} else {
				m.rejectedCount++
				m.statusMsg = fmt.Sprintf("🚫 Decision %s REJECTED!", msg.id[:8])
			}
			return m, fetchDecisionsCmd()
		}
	}

	var cmd tea.Cmd
	m.list, cmd = m.list.Update(msg)
	cmds = append(cmds, cmd)

	var spinCmd tea.Cmd
	m.spinner, spinCmd = m.spinner.Update(msg)
	cmds = append(cmds, spinCmd)

	return m, tea.Batch(cmds...)
}

func (m queueModel) View() string {
	if m.err != nil {
		return errorBoxStyle.Render(fmt.Sprintf("%s Error loading decisions: %s\nIs node-orchestrator running on port 4000?", iconError, m.err.Error()))
	}

	var sb strings.Builder
	sb.WriteString(m.list.View() + "\n")

	if m.confirming {
		actionColor := successStyle
		if m.confirmAction == "reject" {
			actionColor = errorStyle
		}
		prompt := fmt.Sprintf("\n%s Are you sure you want to %s decision %s? [y/n]",
			warningStyle.Render(fmt.Sprintf("%s CONFIRM:", iconWarning)),
			actionColor.Render(strings.ToUpper(m.confirmAction)),
			cmdNameStyle.Render(m.confirmID[:8]))
		sb.WriteString(prompt + "\n")
	} else if m.executing {
		sb.WriteString(fmt.Sprintf("\n%s %s\n", m.spinner.View(), m.statusMsg))
	} else {
		sb.WriteString(subTitleStyle.Render("Press [a] Approve · [r] Reject · [q] Quit | Navigation: ↑/↓") + "\n")
	}

	statusBar := fmt.Sprintf("Session Stats: %s %s Approved | %s %s Rejected | %s Pending | API: %s",
		iconSuccess, successStyle.Render(strconv.Itoa(m.approvedCount)),
		iconError, errorStyle.Render(strconv.Itoa(m.rejectedCount)),
		warningStyle.Render(strconv.Itoa(len(m.decisions))),
		cmdNameStyle.Render(getEffectiveAPIURL()))

	sb.WriteString(cardBoxStyle.Render(statusBar))
	return sb.String()
}

func runQueueBubbleteaTUI() {
	p := tea.NewProgram(newQueueModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		handleDecisionListStatic()
	}
}

// ============================================================================
// BUBBLETEA WATCH DASHBOARD MODEL (htop/k9s style status watch)
// ============================================================================

type tickMsg time.Time

type watchModel struct {
	health    ClusterHealth
	err       error
	lastCheck time.Time
}

func fetchHealthTickCmd() tea.Cmd {
	return tea.Tick(2*time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func getHealthMsgCmd() tea.Cmd {
	return func() tea.Msg {
		apiURL := getEffectiveAPIURL()
		resp, err := http.Get(apiURL + "/cluster/health")
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		var h ClusterHealth
		if err := json.NewDecoder(resp.Body).Decode(&h); err != nil {
			return err
		}
		return h
	}
}

func (m watchModel) Init() tea.Cmd {
	return tea.Batch(getHealthMsgCmd(), fetchHealthTickCmd())
}

func (m watchModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		if msg.String() == "q" || msg.String() == "ctrl+c" {
			return m, tea.Quit
		}
	case tickMsg:
		m.lastCheck = time.Time(msg)
		return m, tea.Batch(getHealthMsgCmd(), fetchHealthTickCmd())
	case ClusterHealth:
		m.health = msg
		m.err = nil
	case error:
		m.err = msg
	}
	return m, nil
}

func (m watchModel) View() string {
	if m.err != nil {
		return errorBoxStyle.Render(fmt.Sprintf("%s Failed to connect to cluster: %s", iconError, m.err.Error()))
	}

	cpuBar := renderProgressBar(m.health.CPUPercent)
	activeQueries := parseIntVal(m.health.ActiveQueries)
	contentionEvents := parseIntVal(m.health.ContentionEvents)

	repStr := successStyle.Render(fmt.Sprintf("%s HEALTHY", iconSuccess))
	if strings.ToLower(m.health.ReplicationStatus) != "healthy" {
		repStr = errorStyle.Render(fmt.Sprintf("%s %s", iconError, strings.ToUpper(m.health.ReplicationStatus)))
	}

	content := fmt.Sprintf(
		"🪲 CORTEXOPS LIVE CLUSTER DASHBOARD (--watch mode, refresh 2s)\n"+
			"Target API: %s | Press [q] to Quit\n\n"+
			"%s : %s %.1f%%\n"+
			"%s : %d queries active\n"+
			"%s : %d events\n"+
			"%s : %s\n"+
			"%s : %s\n"+
			"%s : %s",
		cmdNameStyle.Render(getEffectiveAPIURL()),
		boldStyle.Render("CPU Load           "), cpuBar, m.health.CPUPercent,
		boldStyle.Render("Active Queries     "), activeQueries,
		boldStyle.Render("Contention Events  "), contentionEvents,
		boldStyle.Render("Replication Status "), repStr,
		boldStyle.Render("Safety Gate Status "), successStyle.Render(fmt.Sprintf("%s ACTIVE (Port 5005 Whitelist)", iconSuccess)),
		boldStyle.Render("Last Refreshed     "), subTitleStyle.Render(time.Now().Format("15:04:05 MST")),
	)

	return headerBoxStyle.Render(content)
}

func renderProgressBar(percent float64) string {
	width := 20
	filled := int((percent / 100.0) * float64(width))
	if filled > width {
		filled = width
	}
	bar := strings.Repeat("█", filled) + strings.Repeat("░", width-filled)
	if percent > 70 {
		return errorStyle.Render(bar)
	} else if percent > 40 {
		return warningStyle.Render(bar)
	}
	return successStyle.Render(bar)
}

func runStatusWatchTUI() {
	p := tea.NewProgram(watchModel{}, tea.WithAltScreen())
	_, _ = p.Run()
}

// ============================================================================
// STATIC HANDLERS & HELPERS
// ============================================================================

func handleVersionJSON() {
	obj := map[string]interface{}{
		"version":     cliVersion,
		"api_url":     getEffectiveAPIURL(),
		"config_path": viper.ConfigFileUsed(),
		"is_tty":      isTTY,
	}
	jsonBytes, _ := json.MarshalIndent(obj, "", "  ")
	fmt.Println(string(jsonBytes))
}

func handleClusterHealth() {
	apiURL := getEffectiveAPIURL()
	s := startSpinner("Fetching cluster telemetry from node-orchestrator...")

	resp, err := http.Get(apiURL + "/cluster/health")
	stopSpinner(s)

	if err != nil {
		printErrorAndExit(
			fmt.Sprintf("Failed to connect to CortexOps API at %s: %v", apiURL, err),
			"Is node-orchestrator running? Start services with './start.sh' or set CORTEXOPS_API_URL.",
		)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		printErrorAndExit(fmt.Sprintf("Failed to read API response: %v", err), "")
	}

	if resp.StatusCode != http.StatusOK {
		printErrorAndExit(
			fmt.Sprintf("API returned HTTP %d: %s", resp.StatusCode, string(bodyBytes)),
			"Check node-orchestrator service logs.",
		)
	}

	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		var rawObj interface{}
		if err := json.Unmarshal(bodyBytes, &rawObj); err == nil {
			prettyJSON, _ := json.MarshalIndent(rawObj, "", "  ")
			fmt.Println(string(prettyJSON))
		} else {
			fmt.Println(string(bodyBytes))
		}
		return
	}

	var health ClusterHealth
	if err := json.Unmarshal(bodyBytes, &health); err != nil {
		printErrorAndExit(fmt.Sprintf("Failed to parse cluster health JSON: %v", err), "")
	}

	activeQueries := parseIntVal(health.ActiveQueries)
	contentionEvents := parseIntVal(health.ContentionEvents)

	if flagQuiet || outFormat == "plain" {
		fmt.Printf("cpu=%.1f%% active_queries=%d contention_events=%d replication=%s safety_gate=active\n",
			health.CPUPercent, activeQueries, contentionEvents, health.ReplicationStatus)
		return
	}

	// CPU Bar & Formatting
	cpuBar := renderProgressBar(health.CPUPercent)
	cpuStr := fmt.Sprintf("%s %.1f%%", cpuBar, health.CPUPercent)

	repStr := successStyle.Render(fmt.Sprintf("%s HEALTHY", iconSuccess))
	if strings.ToLower(health.ReplicationStatus) != "healthy" {
		repStr = errorStyle.Render(fmt.Sprintf("%s %s", iconError, strings.ToUpper(health.ReplicationStatus)))
	}

	safetyStr := successStyle.Render(fmt.Sprintf("%s ACTIVE (Port 5005 Whitelist)", iconSuccess))

	// Structured Metric Table using lipgloss/table
	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(lipgloss.NewStyle().Foreground(colorSlate)).
		Headers("METRIC", "CURRENT STATUS / VALUE").
		Rows(
			[]string{"CPU Load", cpuStr},
			[]string{"Active Queries", fmt.Sprintf("%d queries", activeQueries)},
			[]string{"Contention Events", fmt.Sprintf("%d events", contentionEvents)},
			[]string{"Replication Status", repStr},
			[]string{"Safety Gate", safetyStr},
		)

	if health.CapturedAt != "" {
		t.Row("Last Telemetry Sync", subTitleStyle.Render(health.CapturedAt))
	}

	fmt.Println(brandMarkStyle.Render(fmt.Sprintf("🪲 CortexOps Cluster Health · %s", getEffectiveAPIURL())))
	fmt.Println(t)
	fmt.Println()
}

func handleDecisionListStatic() {
	apiURL := getEffectiveAPIURL()
	targetStatus := "proposed"
	if flagStatus != "" {
		targetStatus = flagStatus
	}

	s := startSpinner("Fetching decision queue...")
	endpoint := fmt.Sprintf("%s/decisions?status=%s", apiURL, url.QueryEscape(targetStatus))
	resp, err := http.Get(endpoint)
	stopSpinner(s)

	if err != nil {
		printErrorAndExit(
			fmt.Sprintf("Failed to fetch decisions from %s: %v", apiURL, err),
			"Ensure node-orchestrator is running or check API endpoint.",
		)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		printErrorAndExit(fmt.Sprintf("Failed to read decision response: %v", err), "")
	}

	var decisionsList []Decision
	if err := json.Unmarshal(bodyBytes, &decisionsList); err != nil {
		printErrorAndExit(fmt.Sprintf("Failed to parse decision list: %v", err), "")
	}

	limit := viper.GetInt("default_limit")
	if flagLimit > 0 {
		limit = flagLimit
	}
	if limit > 0 && len(decisionsList) > limit {
		decisionsList = decisionsList[:limit]
	}

	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		prettyJSON, _ := json.MarshalIndent(decisionsList, "", "  ")
		fmt.Println(string(prettyJSON))
		return
	}

	if flagQuiet {
		for _, d := range decisionsList {
			fmt.Println(d.ID)
		}
		return
	}

	if outFormat == "plain" {
		for _, d := range decisionsList {
			fmt.Printf("%s\t%s\t%.2f\t%s\t%s\n", d.ID, d.ActionType, d.Confidence, d.Status, d.ReasoningText)
		}
		return
	}

	if len(decisionsList) == 0 {
		fmt.Println(successStyle.Render(fmt.Sprintf("%s No decisions found with status '%s'.", iconSuccess, targetStatus)))
		return
	}

	fmt.Println(brandMarkStyle.Render(fmt.Sprintf("📋 Decision Queue (status: %s, count: %d)", targetStatus, len(decisionsList))))

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(lipgloss.NewStyle().Foreground(colorCyan)).
		Headers("ID", "ACTION", "CONF", "STATUS", "REASONING & EXECUTION COMMAND")

	for _, d := range decisionsList {
		shortID := d.ID
		if len(shortID) > 8 {
			shortID = shortID[:8]
		}
		confStr := fmt.Sprintf("%.0f%%", d.Confidence*100)

		statusBadge := d.Status
		switch strings.ToLower(d.Status) {
		case "executed":
			statusBadge = successStyle.Render(fmt.Sprintf("%s EXECUTED", iconSuccess))
		case "proposed":
			statusBadge = warningStyle.Render(fmt.Sprintf("%s PROPOSED", iconWarning))
		case "rejected":
			statusBadge = errorStyle.Render(fmt.Sprintf("%s REJECTED", iconError))
		case "failed":
			statusBadge = errorStyle.Render(fmt.Sprintf("%s FAILED", iconError))
		}

		reasonAndCmd := d.ReasoningText
		if d.CcloudCommand != "" {
			reasonAndCmd += "\n" + infoStyle.Render(fmt.Sprintf("%s %s", iconBolt, d.CcloudCommand))
		}

		t.Row(shortID, cmdNameStyle.Render(d.ActionType), confStr, statusBadge, reasonAndCmd)
	}

	fmt.Println(t)
	fmt.Println()
}

func fetchProposedDecisions() ([]Decision, error) {
	apiURL := getEffectiveAPIURL()
	resp, err := http.Get(apiURL + "/decisions?status=proposed")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var listData []Decision
	if err := json.NewDecoder(resp.Body).Decode(&listData); err != nil {
		return nil, err
	}
	return listData, nil
}

func handleDecisionApprove(id string) {
	apiURL := getEffectiveAPIURL()

	// If no ID provided and TTY is active, show interactive Huh selection prompt
	if id == "" && isTTY && getEffectiveOutputFormat() == "table" {
		s := startSpinner("Loading pending decisions for approval...")
		decisions, err := fetchProposedDecisions()
		stopSpinner(s)

		if err != nil || len(decisions) == 0 {
			if len(decisions) == 0 {
				fmt.Println(infoStyle.Render(fmt.Sprintf("%s No pending proposed decisions to approve.", iconInfo)))
				return
			}
			printErrorAndExit(fmt.Sprintf("Failed to load decisions: %v", err), "Ensure node-orchestrator is running.")
		}

		options := make([]huh.Option[string], len(decisions))
		for i, d := range decisions {
			shortID := d.ID
			if len(shortID) > 8 {
				shortID = shortID[:8]
			}
			label := fmt.Sprintf("[%s] %s (Conf: %.0f%%) - %s", shortID, d.ActionType, d.Confidence*100, d.ReasoningText)
			if len(label) > 80 {
				label = label[:77] + "..."
			}
			options[i] = huh.NewOption(label, d.ID)
		}

		var selectedID string
		selectForm := huh.NewSelect[string]().
			Title("Select a proposed decision to approve & execute:").
			Options(options...).
			Value(&selectedID)

		if err := selectForm.Run(); err != nil {
			fmt.Println(subTitleStyle.Render("Approval cancelled."))
			return
		}
		id = selectedID

		var confirmed bool
		confirmForm := huh.NewConfirm().
			Title(fmt.Sprintf("Are you sure you want to approve & execute decision %s?", id[:8])).
			Value(&confirmed)

		if err := confirmForm.Run(); err != nil || !confirmed {
			fmt.Println(subTitleStyle.Render("Approval cancelled."))
			return
		}
	}

	if id == "" {
		printErrorAndExit("Decision ID is required", "Usage: cortexops approve <decision_id>\nOr run interactively in a TTY terminal.")
	}

	s := startSpinner(fmt.Sprintf("Approving & executing decision %s via safety gate...", id))
	resp, err := http.Post(fmt.Sprintf("%s/decisions/%s/approve", apiURL, id), "application/json", nil)
	stopSpinner(s)

	if err != nil {
		printErrorAndExit(
			fmt.Sprintf("Failed to contact API for approval: %v", err),
			"Is node-orchestrator running? Check network connection.",
		)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		printErrorAndExit(
			fmt.Sprintf("Approval failed (HTTP %d): %s", resp.StatusCode, string(bodyBytes)),
			"Verify the decision ID exists and check go-agent /execute safety logs.",
		)
	}

	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		fmt.Println(string(bodyBytes))
		return
	}

	var result struct {
		ID      string `json:"id"`
		Status  string `json:"status"`
		Outcome string `json:"outcome"`
	}
	_ = json.Unmarshal(bodyBytes, &result)

	if flagQuiet || outFormat == "plain" {
		fmt.Printf("id=%s status=%s outcome=%s\n", result.ID, result.Status, result.Outcome)
		return
	}

	fmt.Println(successStyle.Render(fmt.Sprintf("%s Decision Approved and Executed Successfully!", iconSuccess)))
	fmt.Printf("  %s %s\n", boldStyle.Render("Status: "), successStyle.Render(result.Status))
	fmt.Printf("  %s %s\n\n", boldStyle.Render("Outcome:"), cmdNameStyle.Render(result.Outcome))
}

func handleDecisionReject(id string) {
	apiURL := getEffectiveAPIURL()

	// If no ID provided and TTY is active, show interactive Huh selection prompt
	if id == "" && isTTY && getEffectiveOutputFormat() == "table" {
		s := startSpinner("Loading pending decisions for rejection...")
		decisions, err := fetchProposedDecisions()
		stopSpinner(s)

		if err != nil || len(decisions) == 0 {
			if len(decisions) == 0 {
				fmt.Println(infoStyle.Render(fmt.Sprintf("%s No pending proposed decisions to reject.", iconInfo)))
				return
			}
			printErrorAndExit(fmt.Sprintf("Failed to load decisions: %v", err), "Ensure node-orchestrator is running.")
		}

		options := make([]huh.Option[string], len(decisions))
		for i, d := range decisions {
			shortID := d.ID
			if len(shortID) > 8 {
				shortID = shortID[:8]
			}
			label := fmt.Sprintf("[%s] %s (Conf: %.0f%%) - %s", shortID, d.ActionType, d.Confidence*100, d.ReasoningText)
			if len(label) > 80 {
				label = label[:77] + "..."
			}
			options[i] = huh.NewOption(label, d.ID)
		}

		var selectedID string
		selectForm := huh.NewSelect[string]().
			Title("Select a proposed decision to reject:").
			Options(options...).
			Value(&selectedID)

		if err := selectForm.Run(); err != nil {
			fmt.Println(subTitleStyle.Render("Rejection cancelled."))
			return
		}
		id = selectedID

		var confirmed bool
		confirmForm := huh.NewConfirm().
			Title(fmt.Sprintf("Are you sure you want to reject decision %s?", id[:8])).
			Value(&confirmed)

		if err := confirmForm.Run(); err != nil || !confirmed {
			fmt.Println(subTitleStyle.Render("Rejection cancelled."))
			return
		}
	}

	if id == "" {
		printErrorAndExit("Decision ID is required", "Usage: cortexops reject <decision_id>\nOr run interactively in a TTY terminal.")
	}

	s := startSpinner(fmt.Sprintf("Rejecting decision %s...", id))
	resp, err := http.Post(fmt.Sprintf("%s/decisions/%s/reject", apiURL, id), "application/json", nil)
	stopSpinner(s)

	if err != nil {
		printErrorAndExit(
			fmt.Sprintf("Failed to contact API for rejection: %v", err),
			"Ensure node-orchestrator API is reachable.",
		)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		printErrorAndExit(
			fmt.Sprintf("Rejection failed (HTTP %d): %s", resp.StatusCode, string(bodyBytes)),
			"Verify that decision ID exists.",
		)
	}

	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		fmt.Println(string(bodyBytes))
		return
	}

	if flagQuiet || outFormat == "plain" {
		fmt.Println(id)
		return
	}

	fmt.Println(errorStyle.Render(fmt.Sprintf("%s Decision marked as Rejected.", iconError)) + "\n")
}

func handleMemorySearch(query string) {
	apiURL := getEffectiveAPIURL()

	// If query is missing in interactive TTY, prompt with huh
	if query == "" && isTTY && getEffectiveOutputFormat() == "table" {
		inputForm := huh.NewInput().
			Title("Enter operational memory search query:").
			Placeholder("e.g. why did you scale up last week?").
			Value(&query)

		if err := inputForm.Run(); err != nil || strings.TrimSpace(query) == "" {
			fmt.Println(subTitleStyle.Render("Search cancelled."))
			return
		}
	}

	if strings.TrimSpace(query) == "" {
		printErrorAndExit("Search query string is required", "Usage: cortexops ask \"why did you scale up?\"")
	}

	s := startSpinner(fmt.Sprintf("Searching operational memory for \"%s\"...", query))
	searchURL := fmt.Sprintf("%s/search?q=%s", apiURL, url.QueryEscape(query))
	resp, err := http.Get(searchURL)
	stopSpinner(s)

	if err != nil {
		printErrorAndExit(
			fmt.Sprintf("Vector search failed: %v", err),
			"Check node-orchestrator API connection.",
		)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		printErrorAndExit(fmt.Sprintf("Failed to read search response: %v", err), "")
	}

	if resp.StatusCode != http.StatusOK {
		printErrorAndExit(
			fmt.Sprintf("Search API returned HTTP %d: %s", resp.StatusCode, string(bodyBytes)),
			"Check vector search backend logs.",
		)
	}

	var searchResp SearchResponse
	if err := json.NewDecoder(bytes.NewBuffer(bodyBytes)).Decode(&searchResp); err != nil {
		printErrorAndExit(fmt.Sprintf("Failed to parse search response: %v", err), "")
	}

	limit := 5
	if flagLimit > 0 {
		limit = flagLimit
	}
	if limit > 0 && len(searchResp.Matches) > limit {
		searchResp.Matches = searchResp.Matches[:limit]
	}

	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		prettyJSON, _ := json.MarshalIndent(searchResp, "", "  ")
		fmt.Println(string(prettyJSON))
		return
	}

	if flagQuiet {
		for _, m := range searchResp.Matches {
			fmt.Println(m.ID)
		}
		return
	}

	if outFormat == "plain" {
		for _, m := range searchResp.Matches {
			fmt.Printf("%s\t%s\t%.2f\t%s\t%s\n", m.ID, m.ActionType, m.Confidence, m.Status, m.ReasoningText)
		}
		return
	}

	if len(searchResp.Matches) == 0 {
		fmt.Println(infoStyle.Render(fmt.Sprintf("%s No matching decisions found in memory.", iconInfo)))
		return
	}

	// 1. Calculate dynamic terminal width for consistent responsive layout
	termWidth := 80
	if w, _, err := term.GetSize(int(os.Stdout.Fd())); err == nil && w > 0 {
		termWidth = w
	}
	boxWidth := termWidth - 4
	if boxWidth < 50 {
		boxWidth = 50
	} else if boxWidth > 105 {
		boxWidth = 105
	}
	contentWidth := boxWidth - 4 // minus border (2) and padding (2)

	matchBoxStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorSlate).
		Padding(0, 1).
		Width(boxWidth)

	fmt.Println(brandMarkStyle.Render(fmt.Sprintf("%s Vector Memory Search Results (%d matches for \"%s\")", iconSearch, len(searchResp.Matches), query)))
	fmt.Println()

	for i, m := range searchResp.Matches {
		idShort := m.ID
		if len(idShort) > 8 {
			idShort = idShort[:8]
		}

		// Top Header Lines: Rank, Similarity, ID, Action, Status
		headerLine1 := fmt.Sprintf("%s %s  %s",
			iconBolt,
			cmdNameStyle.Render(fmt.Sprintf("#%d Match", i+1)),
			lipgloss.NewStyle().Bold(true).Foreground(colorCyan).Render(fmt.Sprintf("%.0f%% Similarity", m.Confidence*100)),
		)
		if idShort != "" {
			headerLine1 += "  " + lipgloss.NewStyle().Foreground(colorSlate).Render("(id: "+idShort+")")
		}

		headerLine2 := fmt.Sprintf("Action: %s   Status: %s",
			warningStyle.Render(strings.ToUpper(m.ActionType)),
			formatStatusBadge(m.Status),
		)

		var lines []string
		lines = append(lines, headerLine1, headerLine2, "")

		// Reasoning Section
		reasoningHeading := lipgloss.NewStyle().Bold(true).Foreground(colorCyan).Render("Reasoning:")
		reasoningBody := lipgloss.NewStyle().Width(contentWidth).Render(m.ReasoningText)
		lines = append(lines, reasoningHeading)
		lines = append(lines, reasoningBody)

		// Outcome Section (if present)
		if m.Outcome != "" && m.Outcome != "null" {
			lines = append(lines, "")
			outcomeHeading := lipgloss.NewStyle().Bold(true).Foreground(colorGreen).Render("Outcome:")
			outcomeBody := lipgloss.NewStyle().Width(contentWidth).Render(m.Outcome)
			lines = append(lines, outcomeHeading)
			lines = append(lines, outcomeBody)
		}

		// Command Section (if present)
		if m.CcloudCommand != "" && m.CcloudCommand != "null" {
			lines = append(lines, "")
			cmdHeading := lipgloss.NewStyle().Bold(true).Foreground(colorYellow).Render("Executed Command:")
			cmdBody := lipgloss.NewStyle().Width(contentWidth).Foreground(colorSlate).Render("$ " + m.CcloudCommand)
			lines = append(lines, cmdHeading)
			lines = append(lines, cmdBody)
		}

		cardContent := strings.Join(lines, "\n")
		fmt.Println(matchBoxStyle.Render(cardContent))
		if i < len(searchResp.Matches)-1 {
			fmt.Println()
		}
	}
}

func formatStatusBadge(status string) string {
	switch strings.ToLower(status) {
	case "executed":
		return successStyle.Render("✓ EXECUTED")
	case "proposed":
		return warningStyle.Render("● PROPOSED")
	case "rejected":
		return errorStyle.Render("🚫 REJECTED")
	case "failed":
		return errorStyle.Render("✗ FAILED")
	default:
		return subTitleStyle.Render(strings.ToUpper(status))
	}
}

func handleConfigView() {
	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		data, _ := json.MarshalIndent(map[string]interface{}{
			"effective_config": map[string]interface{}{
				"api_url":       getEffectiveAPIURL(),
				"output":        getEffectiveOutputFormat(),
				"no_color":      viper.GetBool("no_color"),
				"default_limit": viper.GetInt("default_limit"),
			},
			"config_path": viper.ConfigFileUsed(),
		}, "", "  ")
		fmt.Println(string(data))
		return
	}

	if outFormat == "plain" {
		fmt.Printf("config_path=%s\napi_url=%s\noutput=%s\nno_color=%t\ndefault_limit=%d\n",
			viper.ConfigFileUsed(), getEffectiveAPIURL(), getEffectiveOutputFormat(),
			viper.GetBool("no_color"), viper.GetInt("default_limit"))
		return
	}

	fmt.Println(brandMarkStyle.Render("⚙️ CortexOps CLI Configuration"))

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(lipgloss.NewStyle().Foreground(colorSlate)).
		Headers("KEY", "CURRENT VALUE").
		Rows(
			[]string{"Config File Path", viper.ConfigFileUsed()},
			[]string{"API URL", cmdNameStyle.Render(getEffectiveAPIURL())},
			[]string{"Output Format", cmdNameStyle.Render(getEffectiveOutputFormat())},
			[]string{"No Color", fmt.Sprintf("%t", viper.GetBool("no_color"))},
			[]string{"Default Limit", fmt.Sprintf("%d", viper.GetInt("default_limit"))},
		)

	fmt.Println(t)
	fmt.Println()
}

func handleConfigGet(key string) {
	key = strings.ToLower(key)
	var val string
	switch key {
	case "api_url", "api-url":
		val = getEffectiveAPIURL()
	case "output":
		val = getEffectiveOutputFormat()
	case "no_color", "no-color":
		val = fmt.Sprintf("%t", viper.GetBool("no_color"))
	case "default_limit", "default-limit":
		val = fmt.Sprintf("%d", viper.GetInt("default_limit"))
	default:
		printErrorAndExit(
			fmt.Sprintf("Unknown config key '%s'", key),
			"Valid keys are: api_url, output, no_color, default_limit",
		)
	}

	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		data, _ := json.Marshal(map[string]string{key: val})
		fmt.Println(string(data))
	} else {
		fmt.Println(val)
	}
}

func handleConfigSet(key, value string) {
	// If key or value is missing and TTY, prompt with Huh
	if (key == "" || value == "") && isTTY && getEffectiveOutputFormat() == "table" {
		if key == "" {
			selectForm := huh.NewSelect[string]().
				Title("Select configuration key to update:").
				Options(
					huh.NewOption("api_url (CortexOps Node API URL)", "api_url"),
					huh.NewOption("output (table | json | plain)", "output"),
					huh.NewOption("default_limit (default item count)", "default_limit"),
					huh.NewOption("no_color (disable ANSI colors)", "no_color"),
				).
				Value(&key)

			if err := selectForm.Run(); err != nil || key == "" {
				fmt.Println(subTitleStyle.Render("Configuration update cancelled."))
				return
			}
		}

		if value == "" {
			inputForm := huh.NewInput().
				Title(fmt.Sprintf("Enter value for '%s':", key)).
				Value(&value)

			if err := inputForm.Run(); err != nil || value == "" {
				fmt.Println(subTitleStyle.Render("Configuration update cancelled."))
				return
			}
		}
	}

	if key == "" || value == "" {
		printErrorAndExit("Key and value required", "Usage: cortexops config set api_url http://localhost:4000")
	}

	key = strings.ToLower(key)
	switch key {
	case "api_url", "api-url":
		viper.Set("api_url", strings.TrimRight(value, "/"))
	case "output":
		viper.Set("output", strings.ToLower(value))
	case "no_color", "no-color":
		viper.Set("no_color", (value == "true" || value == "1"))
	case "default_limit", "default-limit":
		if parsed, err := strconv.Atoi(value); err == nil {
			viper.Set("default_limit", parsed)
		} else {
			printErrorAndExit("default_limit must be an integer", "Example: cortexops config set default_limit 10")
		}
	default:
		printErrorAndExit(
			fmt.Sprintf("Unknown config key '%s'", key),
			"Valid keys are: api_url, output, no_color, default_limit",
		)
	}

	if err := viper.WriteConfig(); err != nil {
		_ = viper.SafeWriteConfig()
	}

	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		data, _ := json.Marshal(map[string]string{
			"status": "updated",
			"key":    key,
			"value":  value,
		})
		fmt.Println(string(data))
	} else {
		fmt.Println(successStyle.Render(fmt.Sprintf("%s Config updated successfully!", iconSuccess)) + fmt.Sprintf(" Persisted %s=%s to %s", key, value, viper.ConfigFileUsed()))
	}
}

// ============================================================================
// ONBOARDING WIZARD & MULTI-CLUSTER MANAGEMENT
// ============================================================================

func maskConnStr(s string) string {
	if s == "" {
		return "none"
	}
	u, err := url.Parse(s)
	if err != nil || u.User == nil {
		return s
	}
	if _, hasPass := u.User.Password(); hasPass {
		u.User = url.UserPassword(u.User.Username(), "••••••")
		return u.String()
	}
	return s
}

func testClusterConnectionLive(apiURL, connStr string) (bool, string) {
	client := http.Client{
		Timeout: 2500 * time.Millisecond,
	}
	cleanURL := strings.TrimRight(apiURL, "/")
	resp, err := client.Get(cleanURL + "/cluster/health")
	if err == nil {
		defer resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			return true, ""
		}
	} else if strings.Contains(cleanURL, "localhost") {
		fallbackURL := strings.Replace(cleanURL, "localhost", "127.0.0.1", 1)
		if resp2, err2 := client.Get(fallbackURL + "/cluster/health"); err2 == nil {
			defer resp2.Body.Close()
			if resp2.StatusCode == http.StatusOK {
				return true, ""
			}
		}
	}

	// Direct CockroachDB cluster TCP connectivity validation
	if connStr != "" {
		if u, err := url.Parse(connStr); err == nil && u.Host != "" {
			hostPort := u.Host
			if !strings.Contains(hostPort, ":") {
				hostPort += ":26257"
			}
			conn, err := net.DialTimeout("tcp", hostPort, 3*time.Second)
			if err == nil {
				_ = conn.Close()
				return true, ""
			}
		}
	}

	if err != nil {
		return false, fmt.Sprintf("Failed to reach endpoint: %v", err)
	}
	return false, fmt.Sprintf("HTTP %d returned from %s/cluster/health", resp.StatusCode, apiURL)
}

func saveClusterConfig(name, apiURL, connStr string, aiEnabled bool, markOnboarded bool) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	configDir := filepath.Join(home, ".cortexops")
	if err := os.MkdirAll(configDir, 0700); err != nil {
		return err
	}
	configPath := filepath.Join(configDir, "config.yaml")

	viper.Set("active_cluster", name)
	viper.Set("api_url", strings.TrimRight(apiURL, "/"))
	if markOnboarded {
		viper.Set("onboarding_completed", true)
	}

	clustersMap := viper.GetStringMap("clusters")
	if clustersMap == nil {
		clustersMap = make(map[string]interface{})
	}
	clustersMap[name] = map[string]interface{}{
		"name":       name,
		"api_url":    strings.TrimRight(apiURL, "/"),
		"conn_str":   connStr,
		"ai_enabled": aiEnabled,
		"created_at": time.Now().UTC().Format(time.RFC3339),
	}
	viper.Set("clusters", clustersMap)

	if err := viper.WriteConfig(); err != nil {
		if err := viper.SafeWriteConfig(); err != nil {
			// In case of write issues, attempt direct write
			f, err := os.OpenFile(configPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
			if err == nil {
				_ = viper.WriteConfigTo(f)
				_ = f.Close()
			}
		}
	}
	_ = os.Chmod(configPath, 0600)
	return nil
}

func runOnboardingWizard(advanced bool) {
	if !isTTY || flagQuiet || getEffectiveOutputFormat() == "json" {
		return
	}

	// 1. Dynamic Terminal Width calculation for clean border wrapping
	termWidth := 80
	if w, _, err := term.GetSize(int(os.Stdout.Fd())); err == nil && w > 0 {
		termWidth = w
	}
	boxWidth := termWidth - 4
	if boxWidth < 40 {
		boxWidth = 40
	} else if boxWidth > 76 {
		boxWidth = 76
	}

	// 2. Welcome Banner with dynamic width and wrapped description
	welcomeHeader := brandMarkStyle.Render("🚀 CortexOps — Cluster Onboarding Wizard")
	welcomeSub := subTitleStyle.Width(boxWidth - 6).Render("Connect your CockroachDB cluster and initialize autonomous AI operations in seconds.")

	welcomeBox := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorCoral).
		Padding(1, 2).
		Width(boxWidth).
		MarginBottom(1).
		Render(welcomeHeader + "\n" + welcomeSub)

	fmt.Println(welcomeBox)

	// Defaults
	connStr := ""
	clusterName := ""
	apiURL := "http://localhost:4000"
	aiEnabled := true

	for {
		var groups []*huh.Group

		if !advanced {
			// Fast 2-step first-run wizard
			groups = append(groups, huh.NewGroup(
				huh.NewInput().
					Title("1. CockroachDB SQL Connection String").
					Description("Enter your CockroachDB connection URL (stored with 0600 mode in ~/.cortexops/config.yaml)").
					Placeholder("postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=verify-full").
					Value(&connStr).
					Validate(func(s string) error {
						val := strings.TrimSpace(s)
						if val == "" {
							return fmt.Errorf("connection string is required")
						}
						if !strings.HasPrefix(val, "postgres://") && !strings.HasPrefix(val, "postgresql://") {
							return fmt.Errorf("must be a valid postgresql:// connection URL")
						}
						return nil
					}),

				huh.NewInput().
					Title("2. Cluster Name / Environment Label").
					Description("A friendly label for this cluster (press enter for default: default-cluster)").
					Placeholder("default-cluster").
					Value(&clusterName),
			))
		} else {
			// Advanced 4-step wizard
			groups = append(groups, huh.NewGroup(
				huh.NewInput().
					Title("1. CockroachDB SQL Connection String").
					Description("Enter your CockroachDB connection URL").
					Placeholder("postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=verify-full").
					Value(&connStr).
					Validate(func(s string) error {
						val := strings.TrimSpace(s)
						if val == "" {
							return fmt.Errorf("connection string is required")
						}
						if !strings.HasPrefix(val, "postgres://") && !strings.HasPrefix(val, "postgresql://") {
							return fmt.Errorf("must be a valid postgresql:// connection URL")
						}
						return nil
					}),

				huh.NewInput().
					Title("2. Cluster Name / Environment Label").
					Placeholder("default-cluster").
					Value(&clusterName),

				huh.NewInput().
					Title("3. Node Orchestrator API URL").
					Description("Endpoint hosting Bedrock reasoning, MCP telemetry & vector index").
					Value(&apiURL).
					Validate(func(s string) error {
						if !strings.HasPrefix(s, "http://") && !strings.HasPrefix(s, "https://") {
							return fmt.Errorf("must start with http:// or https://")
						}
						return nil
					}),

				huh.NewConfirm().
					Title("4. Enable AI-assisted decision making (Claude 3.5 Sonnet / AWS Bedrock)?").
					Description("Allows the agent to synthesize CockroachDB Agent Skills runbooks").
					Value(&aiEnabled),
			))
		}

		form := huh.NewForm(groups...)
		if err := form.Run(); err != nil {
			fmt.Println(subTitleStyle.Render("Setup cancelled."))
			return
		}

		if strings.TrimSpace(clusterName) == "" {
			clusterName = "default-cluster"
		}

		// Step 3: Test live connection
		s := startSpinner("Testing connection to CockroachDB cluster...")
		time.Sleep(300 * time.Millisecond)
		ok, errMsg := testClusterConnectionLive(apiURL, connStr)
		stopSpinner(s)

		if ok {
			fmt.Println(successStyle.Render(fmt.Sprintf("%s Connection verified!", iconSuccess)) + " CockroachDB cluster is online and reachable.")
			break
		}

		// Connection failed - human readable prompt
		fmt.Println()
		fmt.Println(warningStyle.Render(fmt.Sprintf("%s Could not connect to cluster API at %s", iconWarning, apiURL)))
		fmt.Println(subTitleStyle.Render(fmt.Sprintf("  Detail: %s\n  Tip: Ensure your services are running (e.g. run './start.sh' or node-orchestrator).", errMsg)))
		fmt.Println()

		action := ""
		actionSelect := huh.NewSelect[string]().
			Title("How would you like to proceed?").
			Options(
				huh.NewOption("Save configuration anyway & continue", "save"),
				huh.NewOption("Retry connection test", "retry"),
				huh.NewOption("Edit connection details", "edit"),
				huh.NewOption("Cancel setup", "cancel"),
			).
			Value(&action)

		if err := actionSelect.Run(); err != nil || action == "cancel" {
			fmt.Println(subTitleStyle.Render("Setup cancelled."))
			return
		}

		if action == "save" {
			break
		}
		if action == "retry" {
			s2 := startSpinner("Retrying connection...")
			time.Sleep(400 * time.Millisecond)
			ok2, _ := testClusterConnectionLive(apiURL, connStr)
			stopSpinner(s2)
			if ok2 {
				fmt.Println(successStyle.Render(fmt.Sprintf("%s Connection verified!", iconSuccess)) + " Cluster is reachable.")
				break
			}
			fmt.Println(warningStyle.Render("Retry failed. Saving configuration..."))
			break
		}
		// If edit, loop restarts
	}

	// Step 4: Save configuration
	if err := saveClusterConfig(clusterName, apiURL, connStr, aiEnabled, true); err != nil {
		fmt.Println(errorStyle.Render(fmt.Sprintf("%s Error saving config: %v", iconError, err)))
		return
	}

	configPath := getConfigFileLocation()
	fmt.Println()
	fmt.Println(successStyle.Render(fmt.Sprintf("✨ You're all set! Connected cluster '%s' configured in %s (mode 0600).", clusterName, configPath)))
	fmt.Println()
	fmt.Println(boldStyle.Render("Recommended next commands to try:"))
	fmt.Printf("  • %s %s\n", cmdNameStyle.Render("cortexops status"), descStyle.Render("Inspect live cluster telemetry & health"))
	fmt.Printf("  • %s %s\n", cmdNameStyle.Render("cortexops status --watch"), descStyle.Render("Launch live 2s auto-refreshing dashboard"))
	fmt.Printf("  • %s %s\n", cmdNameStyle.Render("cortexops queue"), descStyle.Render("View proposed AI remediation actions"))
	fmt.Printf("  • %s %s\n", cmdNameStyle.Render("cortexops --help"), descStyle.Render("Explore full command directory"))
	fmt.Println()
}

func handleClusterList() {
	outFormat := getEffectiveOutputFormat()
	clustersMap := viper.GetStringMap("clusters")
	activeCluster := viper.GetString("active_cluster")

	if outFormat == "json" {
		data, _ := json.MarshalIndent(map[string]interface{}{
			"active_cluster": activeCluster,
			"clusters":       clustersMap,
		}, "", "  ")
		fmt.Println(string(data))
		return
	}

	if len(clustersMap) == 0 {
		fmt.Println(subTitleStyle.Render("No clusters configured yet."))
		fmt.Printf("Run %s to connect your first CockroachDB cluster.\n", cmdNameStyle.Render("cortexops init"))
		return
	}

	fmt.Println(brandMarkStyle.Render(fmt.Sprintf("%s Configured CockroachDB Clusters", iconBolt)))

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(lipgloss.NewStyle().Foreground(colorSlate)).
		Headers("ACTIVE", "NAME", "API URL", "CONN STRING", "AI ENABLED")

	for name, val := range clustersMap {
		activeMarker := " "
		nameDisplay := name
		if name == activeCluster {
			activeMarker = lipgloss.NewStyle().Bold(true).Foreground(colorGreen).Render("● ACTIVE")
			nameDisplay = cmdNameStyle.Render(name)
		}

		apiURL := ""
		connStr := ""
		aiEnabled := "true"

		if m, ok := val.(map[string]interface{}); ok {
			if u, ok := m["api_url"].(string); ok {
				apiURL = u
			}
			if c, ok := m["conn_str"].(string); ok {
				connStr = maskConnStr(c)
			}
			if ai, ok := m["ai_enabled"].(bool); ok {
				aiEnabled = fmt.Sprintf("%t", ai)
			}
		}

		t.Row(activeMarker, nameDisplay, apiURL, connStr, aiEnabled)
	}

	fmt.Println(t)
	fmt.Println()
}

func handleClusterAdd() {
	if !isTTY {
		printErrorAndExit("Interactive TTY required for cluster add", "Run cortexops cluster add in an interactive terminal")
	}

	clusterName := ""
	apiURL := "http://localhost:4000"
	connStr := "postgresql://root@localhost:26257/defaultdb?sslmode=disable"
	aiEnabled := true

	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Cluster Name / Environment Label").
				Placeholder("e.g. staging-cluster, analytics-crdb").
				Value(&clusterName).
				Validate(func(s string) error {
					if strings.TrimSpace(s) == "" {
						return fmt.Errorf("cluster name cannot be empty")
					}
					return nil
				}),

			huh.NewInput().
				Title("Node Orchestrator API URL").
				Value(&apiURL).
				Validate(func(s string) error {
					if !strings.HasPrefix(s, "http://") && !strings.HasPrefix(s, "https://") {
						return fmt.Errorf("must start with http:// or https://")
					}
					return nil
				}),

			huh.NewInput().
				Title("CockroachDB SQL Connection String").
				Value(&connStr).
				Validate(func(s string) error {
					if !strings.HasPrefix(s, "postgres://") && !strings.HasPrefix(s, "postgresql://") {
						return fmt.Errorf("must be a valid postgresql:// connection string")
					}
					return nil
				}),

			huh.NewConfirm().
				Title("Enable AI-assisted decision making?").
				Value(&aiEnabled),
		),
	)

	if err := form.Run(); err != nil || clusterName == "" {
		fmt.Println(subTitleStyle.Render("Cluster addition cancelled."))
		return
	}

	s := startSpinner("Testing connection to new cluster...")
	time.Sleep(300 * time.Millisecond)
	ok, _ := testClusterConnectionLive(apiURL, connStr)
	stopSpinner(s)

	if ok {
		fmt.Println(successStyle.Render(fmt.Sprintf("%s Connection verified!", iconSuccess)))
	} else {
		fmt.Println(warningStyle.Render(fmt.Sprintf("%s Warning: Could not reach cluster API at %s (saving anyway)", iconWarning, apiURL)))
	}

	if err := saveClusterConfig(clusterName, apiURL, connStr, aiEnabled, false); err != nil {
		printErrorAndExit(fmt.Sprintf("Failed to save cluster config: %v", err), "")
	}

	fmt.Println(successStyle.Render(fmt.Sprintf("%s Cluster '%s' added successfully!", iconSuccess, clusterName)))
	fmt.Printf("Run %s to switch to this cluster.\n\n", cmdNameStyle.Render("cortexops cluster switch "+clusterName))
}

func handleClusterSwitch(name string) {
	clustersMap := viper.GetStringMap("clusters")
	if len(clustersMap) == 0 {
		printErrorAndExit("No clusters configured yet", "Run 'cortexops init' to configure your first cluster")
	}

	if name == "" && isTTY {
		options := make([]huh.Option[string], 0, len(clustersMap))
		for cName := range clustersMap {
			options = append(options, huh.NewOption(cName, cName))
		}

		selectForm := huh.NewSelect[string]().
			Title("Select active CockroachDB cluster:").
			Options(options...).
			Value(&name)

		if err := selectForm.Run(); err != nil || name == "" {
			fmt.Println(subTitleStyle.Render("Cluster switch cancelled."))
			return
		}
	}

	if name == "" {
		printErrorAndExit("Cluster name required", "Usage: cortexops cluster switch <name>")
	}

	clusterData, exists := clustersMap[name]
	if !exists {
		printErrorAndExit(fmt.Sprintf("Cluster '%s' not found", name), "Run 'cortexops cluster list' to see available clusters")
	}

	viper.Set("active_cluster", name)
	if m, ok := clusterData.(map[string]interface{}); ok {
		if u, ok := m["api_url"].(string); ok && u != "" {
			viper.Set("api_url", u)
		}
	}

	if err := viper.WriteConfig(); err != nil {
		_ = viper.SafeWriteConfig()
	}
	_ = os.Chmod(getConfigFileLocation(), 0600)

	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		data, _ := json.Marshal(map[string]string{
			"status":         "switched",
			"active_cluster": name,
		})
		fmt.Println(string(data))
	} else {
		fmt.Println(successStyle.Render(fmt.Sprintf("%s Switched active cluster to '%s'", iconSuccess, name)))
	}
}

func handleClusterRemove(name string) {
	clustersMap := viper.GetStringMap("clusters")
	if len(clustersMap) == 0 {
		// If no named clusters but api_url exists, allow resetting
		if viper.GetString("api_url") != "" {
			viper.Set("api_url", "")
			viper.Set("active_cluster", "")
			viper.Set("onboarding_completed", false)
			if err := viper.WriteConfig(); err != nil {
				_ = viper.SafeWriteConfig()
			}
			fmt.Println(successStyle.Render(fmt.Sprintf("%s Disconnected from default cluster.", iconSuccess)))
			return
		}
		printErrorAndExit("No clusters configured to disconnect", "Run 'cortexops init' to connect a cluster")
	}

	if name == "" && isTTY {
		options := make([]huh.Option[string], 0, len(clustersMap))
		for cName := range clustersMap {
			options = append(options, huh.NewOption(cName, cName))
		}

		selectForm := huh.NewSelect[string]().
			Title("Select CockroachDB cluster to disconnect/remove:").
			Options(options...).
			Value(&name)

		if err := selectForm.Run(); err != nil || name == "" {
			fmt.Println(subTitleStyle.Render("Cluster removal cancelled."))
			return
		}
	}

	if name == "" {
		printErrorAndExit("Cluster name required", "Usage: cortexops cluster remove <name>")
	}

	if _, exists := clustersMap[name]; !exists {
		printErrorAndExit(fmt.Sprintf("Cluster '%s' not found", name), "Run 'cortexops cluster list' to see available clusters")
	}

	delete(clustersMap, name)
	viper.Set("clusters", clustersMap)

	activeCluster := viper.GetString("active_cluster")
	if activeCluster == name {
		newActive := ""
		for k := range clustersMap {
			newActive = k
			break
		}
		viper.Set("active_cluster", newActive)
		if newActive != "" {
			if m, ok := clustersMap[newActive].(map[string]interface{}); ok {
				if u, ok := m["api_url"].(string); ok {
					viper.Set("api_url", u)
				}
			}
		} else {
			viper.Set("api_url", "")
			viper.Set("onboarding_completed", false)
		}
	}

	if err := viper.WriteConfig(); err != nil {
		_ = viper.SafeWriteConfig()
	}
	_ = os.Chmod(getConfigFileLocation(), 0600)

	outFormat := getEffectiveOutputFormat()
	if outFormat == "json" {
		data, _ := json.Marshal(map[string]string{
			"status":  "removed",
			"cluster": name,
		})
		fmt.Println(string(data))
	} else {
		fmt.Println(successStyle.Render(fmt.Sprintf("%s Cluster '%s' disconnected and removed from configuration.", iconSuccess, name)))
	}
}

func handleSimulateLoad() {
	apiURL := viper.GetString("api_url")
	if apiURL == "" {
		apiURL = "http://localhost:4000"
	}

	fmt.Println(brandMarkStyle.Render(fmt.Sprintf("%s CortexOps Anomaly Simulator & Load Generator", iconBolt)))
	fmt.Println(subTitleStyle.Render("Injecting simulated CPU spike & query contention to test Bedrock AI reasoning..."))
	fmt.Println()

	s := startSpinner("Simulating high load on CockroachDB cluster...")
	time.Sleep(400 * time.Millisecond)

	payload := map[string]interface{}{
		"cpu":     88.5,
		"queries": 18,
	}
	bodyBytes, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", strings.TrimRight(apiURL, "/")+"/simulate/spike", bytes.NewBuffer(bodyBytes))
	if err != nil {
		stopSpinner(s)
		printErrorAndExit(fmt.Sprintf("Failed to create simulation request: %v", err), "")
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	stopSpinner(s)

	if err != nil {
		printErrorAndExit(fmt.Sprintf("Failed to connect to orchestrator API: %v", err), "Ensure node-orchestrator is running (./start.sh)")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		printErrorAndExit(fmt.Sprintf("Simulation failed (HTTP %d): %s", resp.StatusCode, string(respBody)), "")
	}

	var result struct {
		Status    string `json:"status"`
		Situation string `json:"situation"`
		Decision  struct {
			ID            string  `json:"id"`
			ActionType    string  `json:"action_type"`
			ReasoningText string  `json:"reasoning_text"`
			Confidence    float64 `json:"confidence"`
			CcloudCommand string  `json:"ccloud_command"`
			CreatedAt     string  `json:"created_at"`
		} `json:"decision"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		printErrorAndExit(fmt.Sprintf("Failed to parse response: %v", err), "")
	}

	idShort := result.Decision.ID
	if len(idShort) > 8 {
		idShort = idShort[:8]
	}

	fmt.Println(successStyle.Render(fmt.Sprintf("%s Anomaly Detected & Synthesized by AI Agent!", iconSuccess)))
	fmt.Println()

	boxStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorYellow).
		Padding(1, 2).
		Width(76)

	cardContent := fmt.Sprintf(
		"%s %s  %s  %s\n\n"+
			"%s\n%s\n\n"+
			"%s\n%s\n\n"+
			"%s\n%s",
		cmdNameStyle.Render("PROPOSED ACTION:"),
		warningStyle.Render(strings.ToUpper(result.Decision.ActionType)),
		lipgloss.NewStyle().Bold(true).Foreground(colorCyan).Render(fmt.Sprintf("%.0f%% Confidence", result.Decision.Confidence*100)),
		lipgloss.NewStyle().Foreground(colorSlate).Render("(id: "+idShort+")"),
		lipgloss.NewStyle().Bold(true).Foreground(colorCyan).Render("Reasoning:"),
		lipgloss.NewStyle().Width(70).Render(result.Decision.ReasoningText),
		lipgloss.NewStyle().Bold(true).Foreground(colorYellow).Render("Recommended Gated Action:"),
		lipgloss.NewStyle().Foreground(colorSlate).Render("$ "+result.Decision.CcloudCommand),
		lipgloss.NewStyle().Bold(true).Foreground(colorGreen).Render("Next Action:"),
		"Review on Web Dashboard or run 'cortexops queue' to approve!",
	)

	fmt.Println(boxStyle.Render(cardContent))
	fmt.Println()
	fmt.Printf("👉 Run %s or %s to authorize!\n", cmdNameStyle.Render("cortexops approve "+idShort), cmdNameStyle.Render("cortexops queue"))
}

func main() {
	initTTYChecks()
	initViper()

	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
