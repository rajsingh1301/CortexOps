import React, { useState } from 'react';
import { 
  Terminal, 
  BookOpen, 
  Cpu, 
  Check, 
  Copy, 
  ShieldCheck, 
  ArrowRight, 
  Layers, 
  HelpCircle,
  Code2,
  Play
} from 'lucide-react';

function CodeSnippet({ code, title = 'bash' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="logdy-terminal-box" style={{ margin: '14px 0 20px' }}>
      <div className="logdy-terminal-header">
        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
          $ {title}
        </span>
        <button onClick={handleCopy} className="copy-pill-btn">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="logdy-terminal-body">
        <pre style={{ margin: 0, overflowX: 'auto', fontFamily: 'var(--font-mono)' }}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('installation');

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 24px 80px' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '36px', borderBottom: '1px solid var(--logdy-border)', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--logdy-text-heading)', fontWeight: '800', marginBottom: '8px' }}>
          Documentation
        </h1>
        <p style={{ color: 'var(--logdy-text-muted)', fontSize: '1rem' }}>
          Complete guide to installing, configuring, and operating the CortexOps autonomous CockroachDB CLI and Agent.
        </p>
      </div>

      {/* Grid Layout (Sidebar + Content) */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '36px' }}>
        
        {/* Sidebar */}
        <aside style={{
          position: 'sticky',
          top: '80px',
          height: 'fit-content',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: '700',
            color: 'var(--logdy-text-dim)',
            textTransform: 'uppercase',
            marginBottom: '8px',
            paddingLeft: '8px'
          }}>
            Navigation
          </div>

          {[
            { id: 'installation', label: '1. Installation' },
            { id: 'quickstart', label: '2. Quick Start' },
            { id: 'commands', label: '3. Command Reference' },
            { id: 'aliases', label: '4. Shortcuts & Aliases' },
            { id: 'workflow', label: '5. Incident Workflow' },
            { id: 'safety', label: '6. Safety Whitelist' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: activeSection === item.id ? '700' : '500',
                color: activeSection === item.id ? 'var(--logdy-orange)' : 'var(--logdy-text-muted)',
                background: activeSection === item.id ? 'rgba(255, 122, 0, 0.1)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {item.label}
            </button>
          ))}
        </aside>

        {/* Content Body */}
        <main style={{ minWidth: 0 }}>
          
          {/* 1. INSTALLATION */}
          <section id="installation" style={{ marginBottom: '50px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--logdy-text-heading)', fontWeight: '700', marginBottom: '10px' }}>
              Building & Installing the CLI
            </h2>
            <p style={{ color: 'var(--logdy-text-muted)', lineHeight: '1.6', fontSize: '0.92rem', marginBottom: '14px' }}>
              The <code className="mono cyan">cortexops</code> binary is compiled using Go 1.25+ and installed to system path (<code className="mono">~/.local/bin/cortexops</code>).
            </p>

            <CodeSnippet title="terminal build" code={`# 1. Clone repository
git clone https://github.com/rajsingh1301/CortexOps.git
cd CortexOps/go-agent

# 2. Build local binary
make build-cli

# 3. Install globally to PATH
make install`} />
          </section>

          {/* 2. QUICK START */}
          <section id="quickstart" style={{ marginBottom: '50px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--logdy-text-heading)', fontWeight: '700', marginBottom: '10px' }}>
              Quick Start & Telemetry Verification
            </h2>
            <p style={{ color: 'var(--logdy-text-muted)', lineHeight: '1.6', fontSize: '0.92rem', marginBottom: '14px' }}>
              Verify cluster connectivity and run live watch monitors directly from the terminal:
            </p>

            <CodeSnippet title="operator commands" code={`# Inspect main landing banner and cluster connection pill
cortexops

# Fetch live cluster CPU, queries, contention, and replication
cortexops status

# Launch live 2-second auto-refreshing dashboard
cortexops status --watch

# Open interactive decision approval queue
cortexops queue`} />
          </section>

          {/* 3. CORE COMMAND REFERENCE */}
          <section id="commands" style={{ marginBottom: '50px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--logdy-text-heading)', fontWeight: '700', marginBottom: '10px' }}>
              Full Command Reference
            </h2>
            <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.92rem', marginBottom: '16px' }}>
              Every command supports human-readable styled TUI tables, interactive Huh dropdowns, and automation-friendly JSON outputs.
            </p>

            {/* 3.1 ONBOARDING & SETUP */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                1. Onboarding & First-Run
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)', background: 'rgba(0,0,0,0.03)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '30%' }}>COMMAND</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)' }}>DESCRIPTION & USAGE</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '25%' }}>FLAGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops init</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Launches interactive 2-step setup (Connection URL & Cluster Label).</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>-a, --advanced</td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops init --advanced</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Configures all 4 parameters: Conn URL, Cluster Label, Orchestrator API URL, and Bedrock AI assist toggle.</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>Aliases: onboard, setup</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3.2 CLUSTER MANAGEMENT */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                2. Cluster Management (<code className="mono">cortexops cluster ...</code>)
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)', background: 'rgba(0,0,0,0.03)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '30%' }}>COMMAND</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)' }}>DESCRIPTION & USAGE</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '25%' }}>FLAGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cluster get-health</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Fetches live cluster CPU %, active queries, contention events, replication health, and safety gate state.</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>-w, --watch, -o json</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cluster list</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Lists all saved CockroachDB clusters with active indicator (<span style={{ color: 'var(--logdy-green)', fontWeight: 'bold' }}>● ACTIVE</span>).</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>Aliases: ls, show</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cluster add</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Interactively prompts and connects a new CockroachDB cluster profile with live ping validation.</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>Interactive wizard</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cluster switch [name]</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Switches the active CockroachDB cluster used for telemetry and remediation execution.</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>Aliases: use</td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cluster remove [name]</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Disconnects and deletes a cluster configuration profile from persistent storage.</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>Aliases: rm, delete, disconnect</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3.3 DECISION APPROVALS */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                3. Decision Approvals & Execution (<code className="mono">cortexops decision ...</code>)
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)', background: 'rgba(0,0,0,0.03)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '30%' }}>COMMAND</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)' }}>DESCRIPTION & USAGE</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '25%' }}>FLAGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>decision list</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Interactive Bubbletea TUI list to browse proposed decisions, approve with [a], or reject with [r].</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>--status, --limit, -n</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>decision approve [id]</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Authorizes decision ID and triggers safety-gated execution of the remediating CockroachDB action.</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>Interactive menu if ID omitted</td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>decision reject [id]</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Marks decision as rejected in CockroachDB decision journal without executing any command.</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>Interactive menu if ID omitted</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3.4 OPERATIONAL VECTOR MEMORY */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                4. Operational Vector Memory (<code className="mono">cortexops memory ...</code>)
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)', background: 'rgba(0,0,0,0.03)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '30%' }}>COMMAND</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)' }}>DESCRIPTION & USAGE</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '25%' }}>FLAGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>memory search "&lt;query&gt;"</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Semantic cosine similarity search across historical decisions, reasoning rationale, and execution outcomes.</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>-n, --limit, -o json</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3.5 CONFIGURATION */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                5. Configuration Management (<code className="mono">cortexops config ...</code>)
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)', background: 'rgba(0,0,0,0.03)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '30%' }}>COMMAND</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)' }}>DESCRIPTION & USAGE</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)', width: '25%' }}>FLAGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>config view</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Displays effective configuration settings and active file path (~/.cortexops/config.yaml).</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>-o json, -o plain</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>config get &lt;key&gt;</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Reads a specific configuration key value (<code className="mono">api_url</code>, <code className="mono">output</code>, <code className="mono">no_color</code>, <code className="mono">default_limit</code>).</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>Scriptable</td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>config set &lt;key&gt; &lt;val&gt;</td>
                      <td style={{ padding: '10px 14px', color: 'var(--logdy-text-muted)' }}>Persists configuration values to ~/.cortexops/config.yaml with secure 0600 file permissions.</td>
                      <td className="mono cyan" style={{ padding: '10px 14px' }}>Interactive if empty</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3.6 GLOBAL FLAGS */}
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                6. Global Flags
              </h3>
              <div className="feature-box" style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  <div><strong className="cyan">-o, --output</strong>: table | json | plain</div>
                  <div><strong className="cyan">-q, --quiet</strong>: Print essential IDs only</div>
                  <div><strong className="cyan">--no-color</strong>: Disable ANSI color codes</div>
                  <div><strong className="cyan">-n, --limit</strong>: Limit returned item count</div>
                  <div><strong className="cyan">--status</strong>: proposed | executed | rejected</div>
                  <div><strong className="cyan">--api-url</strong>: Override orchestrator API URL</div>
                  <div><strong className="cyan">--config</strong>: Custom config file path</div>
                  <div><strong className="cyan">-h, --help</strong>: Print command help screen</div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. SHORTCUT ALIASES */}
          <section id="aliases" style={{ marginBottom: '50px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--logdy-text-heading)', fontWeight: '700', marginBottom: '10px' }}>
              Shortcuts & Productivity Aliases
            </h2>
            <div className="feature-box" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', fontFamily: 'var(--font-mono)' }}>
                <div>
                  <span style={{ color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops status</span>
                  <div style={{ color: 'var(--logdy-text-dim)', fontSize: '0.8rem' }}>→ <span className="cyan">cluster get-health [--watch]</span></div>
                </div>
                <div>
                  <span style={{ color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops queue</span>
                  <div style={{ color: 'var(--logdy-text-dim)', fontSize: '0.8rem' }}>→ <span className="cyan">decision list --status=proposed</span></div>
                </div>
                <div>
                  <span style={{ color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops approve [id]</span>
                  <div style={{ color: 'var(--logdy-text-dim)', fontSize: '0.8rem' }}>→ <span className="cyan">decision approve [id]</span></div>
                </div>
                <div>
                  <span style={{ color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops reject [id]</span>
                  <div style={{ color: 'var(--logdy-text-dim)', fontSize: '0.8rem' }}>→ <span className="cyan">decision reject [id]</span></div>
                </div>
                <div>
                  <span style={{ color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops ask "&lt;q&gt;"</span>
                  <div style={{ color: 'var(--logdy-text-dim)', fontSize: '0.8rem' }}>→ <span className="cyan">memory search "&lt;q&gt;"</span></div>
                </div>
                <div>
                  <span style={{ color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops disconnect [name]</span>
                  <div style={{ color: 'var(--logdy-text-dim)', fontSize: '0.8rem' }}>→ <span className="cyan">cluster remove [name]</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. INCIDENT WORKFLOW */}
          <section id="workflow" style={{ marginBottom: '50px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--logdy-text-heading)', fontWeight: '700', marginBottom: '10px' }}>
              Incident Remediation Runbook
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="feature-box" style={{ padding: '18px' }}>
                <div className="mono orange" style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '6px' }}>
                  STEP 1: ANOMALY DETECTION
                </div>
                <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
                  Node-orchestrator telemetry loop detects CPU spike to 84% and 2 contention locks on CockroachDB cluster.
                </p>
                <CodeSnippet title="telemetry status" code={`cortexops status`} />
              </div>

              <div className="feature-box" style={{ padding: '18px' }}>
                <div className="mono cyan" style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '6px' }}>
                  STEP 2: REVIEW DECISION REASONING
                </div>
                <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
                  Claude 3.5 Bedrock synthesizes the CockroachDB Agent Skill for scale operations and proposes decision ID <code className="mono">a625baf7</code>.
                </p>
                <CodeSnippet title="queue review" code={`cortexops queue`} />
              </div>

              <div className="feature-box" style={{ padding: '18px' }}>
                <div className="mono green" style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '6px' }}>
                  STEP 3: AUTHORIZE SAFETY GATE EXECUTION
                </div>
                <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
                  Operator approves. Go-Agent whitelist gate verifies command string prefix and executes scale action.
                </p>
                <CodeSnippet title="approve execution" code={`cortexops approve a625baf7`} />
              </div>

              <div className="feature-box" style={{ padding: '18px' }}>
                <div className="mono cyan" style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '6px' }}>
                  STEP 4: NATURAL LANGUAGE SEMANTIC RECALL
                </div>
                <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
                  Query vector decision memory at any point to verify reasoning for past actions.
                </p>
                <CodeSnippet title="vector search" code={`cortexops ask "why did you scale up the cluster on Tuesday?"`} />
              </div>
            </div>
          </section>

          {/* 6. SAFETY WHITELIST */}
          <section id="safety" style={{ marginBottom: '50px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--logdy-text-heading)', fontWeight: '700', marginBottom: '10px' }}>
              Safety Whitelist Specifications
            </h2>
            <div className="feature-box" style={{ padding: '20px', borderLeft: '4px solid var(--logdy-green)' }}>
              <ul style={{ color: 'var(--logdy-text-muted)', paddingLeft: '20px', lineHeight: '1.8', fontSize: '0.9rem' }}>
                <li><strong style={{ color: 'var(--logdy-text-heading)' }}>Strict Action Type Whitelist:</strong> Only <code className="mono cyan">backup</code>, <code className="mono cyan">scale_up</code>, <code className="mono cyan">schema_review</code>, and <code className="mono cyan">no_action</code> are permitted.</li>
                <li><strong style={{ color: 'var(--logdy-text-heading)' }}>CLI Prefix Enforcement:</strong> All execution strings must begin strictly with <code className="mono">ccloud cluster</code>.</li>
                <li><strong style={{ color: 'var(--logdy-text-heading)' }}>Zero Shell Expansion:</strong> Shell metacharacters (<code className="mono">;</code>, <code className="mono">&amp;&amp;</code>, <code className="mono">|</code>, <code className="mono">&gt;</code>) are blocked.</li>
              </ul>
            </div>
          </section>

        </main>
      </div>

    </div>
  );
}
