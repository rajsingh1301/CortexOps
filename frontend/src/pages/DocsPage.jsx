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

          {/* 3. CORE COMMANDS */}
          <section id="commands" style={{ marginBottom: '50px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--logdy-text-heading)', fontWeight: '700', marginBottom: '10px' }}>
              Core Command Matrix
            </h2>
            
            <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--logdy-card-border)', background: 'rgba(0,0,0,0.03)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)' }}>COMMAND</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)' }}>DESCRIPTION</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--logdy-orange)', fontFamily: 'var(--font-mono)' }}>FLAGS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                    <td className="mono" style={{ padding: '12px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cluster get-health</td>
                    <td style={{ padding: '12px 14px', color: 'var(--logdy-text-muted)' }}>Inspects live CPU %, queries, contention, replication.</td>
                    <td className="mono cyan" style={{ padding: '12px 14px' }}>--watch, --output json</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                    <td className="mono" style={{ padding: '12px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>decision list</td>
                    <td style={{ padding: '12px 14px', color: 'var(--logdy-text-muted)' }}>Lists pending proposed AI remediations in approval queue.</td>
                    <td className="mono cyan" style={{ padding: '12px 14px' }}>--status, --limit, -n</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                    <td className="mono" style={{ padding: '12px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>decision approve [id]</td>
                    <td style={{ padding: '12px 14px', color: 'var(--logdy-text-muted)' }}>Authorizes decision ID; executes whitelisted ccloud command.</td>
                    <td className="mono cyan" style={{ padding: '12px 14px' }}>Interactive prompt if ID omitted</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                    <td className="mono" style={{ padding: '12px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>decision reject [id]</td>
                    <td style={{ padding: '12px 14px', color: 'var(--logdy-text-muted)' }}>Marks decision as rejected in CockroachDB decision journal.</td>
                    <td className="mono cyan" style={{ padding: '12px 14px' }}>Interactive prompt if ID omitted</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--logdy-card-border)' }}>
                    <td className="mono" style={{ padding: '12px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>memory search "&lt;q&gt;"</td>
                    <td style={{ padding: '12px 14px', color: 'var(--logdy-text-muted)' }}>Semantic vector similarity search over historical decision reasoning.</td>
                    <td className="mono cyan" style={{ padding: '12px 14px' }}>--limit, --output json</td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ padding: '12px 14px', color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>config view / set</td>
                    <td style={{ padding: '12px 14px', color: 'var(--logdy-text-muted)' }}>Manages persistent YAML settings (~/.cortexops/config.yaml).</td>
                    <td className="mono cyan" style={{ padding: '12px 14px' }}>api_url, output, default_limit</td>
                  </tr>
                </tbody>
              </table>
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
                  <div style={{ color: 'var(--logdy-text-dim)', fontSize: '0.8rem' }}>→ <span className="cyan">decision approve</span></div>
                </div>
                <div>
                  <span style={{ color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops reject [id]</span>
                  <div style={{ color: 'var(--logdy-text-dim)', fontSize: '0.8rem' }}>→ <span className="cyan">decision reject</span></div>
                </div>
                <div>
                  <span style={{ color: 'var(--logdy-text-heading)', fontWeight: 'bold' }}>cortexops ask "&lt;q&gt;"</span>
                  <div style={{ color: 'var(--logdy-text-dim)', fontSize: '0.8rem' }}>→ <span className="cyan">memory search</span></div>
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
