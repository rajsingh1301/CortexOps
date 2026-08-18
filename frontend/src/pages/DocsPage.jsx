import React, { useState, useMemo } from 'react';
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
  Play,
  Search,
  X
} from 'lucide-react';

const SECTIONS = [
  { id: 'installation', label: '1. Installation', title: 'Installing the CLI Globally' },
  { id: 'quickstart', label: '2. Quick Start', title: 'Quick Start & Telemetry Verification' },
  { id: 'commands', label: '3. Command Reference', title: 'Full Command Reference' },
  { id: 'aliases', label: '4. Shortcuts & Aliases', title: 'Shortcuts & Productivity Aliases' },
  { id: 'workflow', label: '5. Incident Workflow', title: 'Incident Remediation Runbook' },
  { id: 'safety', label: '6. Safety Whitelist', title: 'Safety Whitelist Specifications' }
];

// Lightweight syntax highlighter for shell commands & config
function renderHighlightedCode(code) {
  const lines = code.split('\n');

  return lines.map((line, lineIdx) => {
    // Comment line
    if (line.trim().startsWith('#')) {
      return (
        <div key={lineIdx} style={{ color: 'var(--logdy-text-dim)', fontStyle: 'italic' }}>
          {line}
        </div>
      );
    }

    // Tokenize line by whitespace while preserving punctuation
    const tokens = line.split(/(\s+|[|]|&&)/);

    return (
      <div key={lineIdx} style={{ minHeight: '1.4em' }}>
        {tokens.map((tok, tokIdx) => {
          if (!tok) return null;

          // Main command keyword
          if (['curl', 'bash', 'go', 'git', 'cd', 'make', 'cortexops'].includes(tok)) {
            return (
              <span key={tokIdx} style={{ color: 'var(--logdy-cyan)', fontWeight: '700' }}>
                {tok}
              </span>
            );
          }

          // Subcommands & Actions
          if (['init', 'status', 'queue', 'cluster', 'decision', 'memory', 'config', 'install', 'clone', 'ask', 'approve', 'reject', 'get-health', 'list', 'add', 'switch', 'remove', 'view', 'get', 'set'].includes(tok)) {
            return (
              <span key={tokIdx} style={{ color: 'var(--logdy-text-heading)', fontWeight: '600' }}>
                {tok}
              </span>
            );
          }

          // CLI Flags & Options (e.g. -sSL, --watch, -a, --advanced)
          if (tok.startsWith('-')) {
            return (
              <span key={tokIdx} style={{ color: 'var(--logdy-orange)', fontWeight: '600' }}>
                {tok}
              </span>
            );
          }

          // URLs
          if (tok.startsWith('http://') || tok.startsWith('https://')) {
            return (
              <span key={tokIdx} style={{ color: 'var(--logdy-green)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                {tok}
              </span>
            );
          }

          // Pipes and operators
          if (tok === '|' || tok === '&&') {
            return (
              <span key={tokIdx} style={{ color: '#f43f5e', fontWeight: 'bold' }}>
                {tok}
              </span>
            );
          }

          // String literals
          if (tok.startsWith('"') || tok.endsWith('"')) {
            return (
              <span key={tokIdx} style={{ color: '#fbbf24' }}>
                {tok}
              </span>
            );
          }

          // Normal token
          return <span key={tokIdx}>{tok}</span>;
        })}
      </div>
    );
  });
}

function CodeSnippet({ code, title = 'bash' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="logdy-terminal-box" style={{ 
      margin: '18px 0 28px',
      border: '1px solid var(--logdy-card-border)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <div className="logdy-terminal-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'var(--logdy-code-header)',
        borderBottom: '1px solid var(--logdy-card-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.7)', display: 'inline-block' }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.7)', display: 'inline-block' }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.7)', display: 'inline-block' }} />
          </div>
          <span style={{ color: 'var(--logdy-text-dim)', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', marginLeft: '4px' }}>
            $ {title}
          </span>
        </div>
        <button 
          onClick={handleCopy} 
          className="copy-pill-btn"
          style={{
            background: copied ? 'rgba(16, 185, 129, 0.15)' : 'var(--logdy-card-bg)',
            color: copied ? 'var(--logdy-green)' : 'var(--logdy-text-muted)',
            border: `1px solid ${copied ? 'var(--logdy-green)' : 'var(--logdy-card-border)'}`,
            padding: '4px 10px',
            fontSize: '0.74rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            transition: 'all 0.15s ease'
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="logdy-terminal-body" style={{ 
        padding: '16px 18px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: 'var(--logdy-code-bg)'
      }}>
        <pre style={{ 
          margin: 0, 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.84rem', 
          lineHeight: '1.65',
          whiteSpace: 'pre',
          color: 'var(--logdy-text-main)'
        }}>
          <code>{renderHighlightedCode(code)}</code>
        </pre>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('installation');
  const [searchQuery, setSearchQuery] = useState('');

  const activeIndex = useMemo(() => {
    const idx = SECTIONS.findIndex(s => s.id === activeSection);
    return idx >= 0 ? idx : 0;
  }, [activeSection]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.filter(s => 
      s.label.toLowerCase().includes(q) || 
      s.title.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const progressPercent = Math.round(((activeIndex + 1) / SECTIONS.length) * 100);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 24px 80px' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '36px', borderBottom: '1px solid var(--logdy-border)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ 
            fontSize: '0.72rem', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--logdy-orange)', 
            background: 'rgba(255, 122, 0, 0.12)', 
            padding: '2px 8px', 
            borderRadius: '4px', 
            border: '1px solid rgba(255, 122, 0, 0.3)',
            fontWeight: 700 
          }}>
            OFFICIAL REFERENCE
          </span>
        </div>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--logdy-text-heading)', fontWeight: '800', margin: '0 0 8px 0' }}>
          Documentation
        </h1>
        <p style={{ color: 'var(--logdy-text-muted)', fontSize: '1rem', margin: 0 }}>
          Complete guide to installing, configuring, and operating the CortexOps autonomous CockroachDB CLI and Agent.
        </p>
      </div>

      {/* Grid Layout (Sidebar + Content) */}
      <div className="docs-layout-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '36px' }}>
        
        {/* Sidebar */}
        <aside className="docs-sidebar-nav" style={{
          position: 'sticky',
          top: '80px',
          height: 'fit-content',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {/* Search Input Box */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={14} color="var(--logdy-text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs..."
              style={{
                width: '100%',
                padding: '7px 28px 7px 30px',
                background: 'var(--logdy-card-bg)',
                border: '1px solid var(--logdy-card-border)',
                borderRadius: '6px',
                color: 'var(--logdy-text-main)',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', color: 'var(--logdy-text-dim)', cursor: 'pointer' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: '700',
            color: 'var(--logdy-text-dim)',
            textTransform: 'uppercase',
            marginBottom: '4px',
            paddingLeft: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Navigation</span>
            {searchQuery && (
              <span style={{ color: 'var(--logdy-cyan)', fontSize: '0.7rem' }}>
                {filteredSections.length} match{filteredSections.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          {filteredSections.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  textAlign: 'left',
                  padding: '9px 14px',
                  borderRadius: '0 6px 6px 0',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? 'var(--logdy-orange)' : 'var(--logdy-text-muted)',
                  background: isActive ? 'rgba(255, 122, 0, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3.5px solid var(--logdy-orange)' : '3.5px solid transparent',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </aside>

        {/* Content Body */}
        <main style={{ minWidth: 0, overflowX: 'hidden' }}>
          
          {/* Section Progress Indicator HUD */}
          <div style={{ 
            background: 'var(--logdy-card-bg)', 
            border: '1px solid var(--logdy-card-border)', 
            borderRadius: '8px', 
            padding: '12px 18px', 
            marginBottom: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--logdy-text-muted)' }}>
                Section <strong style={{ color: 'var(--logdy-orange)' }}>{activeIndex + 1}</strong> of <strong style={{ color: 'var(--logdy-text-heading)' }}>{SECTIONS.length}</strong> · {SECTIONS[activeIndex].title}
              </span>
              <span style={{ color: 'var(--logdy-cyan)', fontWeight: 700 }}>
                {progressPercent}%
              </span>
            </div>
            {/* Progress bar line */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${progressPercent}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--logdy-orange), var(--logdy-cyan))', 
                borderRadius: '2px', 
                transition: 'width 0.3s ease' 
              }} />
            </div>
          </div>

          {/* 1. INSTALLATION */}
          <section id="installation" style={{ marginBottom: '64px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.45rem', color: 'var(--logdy-text-heading)', fontWeight: '800', marginBottom: '12px' }}>
              1. Installing the CLI Globally
            </h2>
            <p style={{ color: 'var(--logdy-text-muted)', lineHeight: '1.65', fontSize: '0.94rem', marginBottom: '16px' }}>
              Install <code className="mono cyan">cortexops</code> globally on macOS or Linux with a single command:
            </p>

            <CodeSnippet title="1-line universal global installer" code={`curl -sSL https://raw.githubusercontent.com/rajsingh1301/CortexOps/main/install.sh | bash`} />

            <div style={{ marginTop: '28px' }}>
              <div className="mono orange" style={{ fontSize: '0.88rem', fontWeight: 'bold', marginBottom: '10px' }}>
                Alternative: Go Global Install
              </div>
              <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.9rem', marginBottom: '12px', lineHeight: '1.5' }}>
                Compile and link the binary directly into your <code className="mono">$GOPATH/bin</code>:
              </p>
              <CodeSnippet title="go install" code={`go install github.com/rajsingh1301/CortexOps/go-agent/cmd/cortexops@latest`} />
            </div>

            <div style={{ marginTop: '28px' }}>
              <div className="mono cyan" style={{ fontSize: '0.88rem', fontWeight: 'bold', marginBottom: '10px' }}>
                Alternative: Build from Source
              </div>
              <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.9rem', marginBottom: '12px', lineHeight: '1.5' }}>
                Clone the full repository to build and test local modifications:
              </p>
              <CodeSnippet title="git clone & make" code={`# 1. Clone repository
git clone https://github.com/rajsingh1301/CortexOps.git
cd CortexOps/go-agent

# 2. Build local binary & install globally (~/.local/bin)
make build-cli
make install`} />
            </div>
          </section>

          {/* 2. QUICK START */}
          <section id="quickstart" style={{ marginBottom: '64px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.45rem', color: 'var(--logdy-text-heading)', fontWeight: '800', marginBottom: '12px' }}>
              2. Quick Start & Telemetry Verification
            </h2>
            <p style={{ color: 'var(--logdy-text-muted)', lineHeight: '1.65', fontSize: '0.94rem', marginBottom: '16px' }}>
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
          <section id="commands" style={{ marginBottom: '64px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.45rem', color: 'var(--logdy-text-heading)', fontWeight: '800', marginBottom: '12px' }}>
              3. Full Command Reference
            </h2>
            <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.94rem', marginBottom: '20px', lineHeight: '1.6' }}>
              Every command supports human-readable styled TUI tables, interactive Huh dropdowns, and automation-friendly JSON outputs.
            </p>

            {/* 3.1 ONBOARDING & SETUP */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.08rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                3.1 Onboarding & First-Run
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '16px' }}>
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
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.08rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                3.2 Cluster Management (<code className="mono">cortexops cluster ...</code>)
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '16px' }}>
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
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.08rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                3.3 Decision Approvals & Execution (<code className="mono">cortexops decision ...</code>)
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '16px' }}>
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
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.08rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                3.4 Operational Vector Memory (<code className="mono">cortexops memory ...</code>)
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '16px' }}>
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
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.08rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                3.5 Configuration Management (<code className="mono">cortexops config ...</code>)
              </h3>
              <div className="feature-box" style={{ padding: 0, overflowX: 'auto', marginBottom: '16px' }}>
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
              <h3 style={{ fontSize: '1.08rem', color: 'var(--logdy-orange)', fontWeight: '700', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                3.6 Global Flags
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
          <section id="aliases" style={{ marginBottom: '64px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.45rem', color: 'var(--logdy-text-heading)', fontWeight: '800', marginBottom: '12px' }}>
              4. Shortcuts & Productivity Aliases
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
          <section id="workflow" style={{ marginBottom: '64px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.45rem', color: 'var(--logdy-text-heading)', fontWeight: '800', marginBottom: '12px' }}>
              5. Incident Remediation Runbook
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="feature-box" style={{ padding: '20px' }}>
                <div className="mono orange" style={{ fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '8px' }}>
                  STEP 1: ANOMALY DETECTION
                </div>
                <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.92rem', marginBottom: '12px', lineHeight: '1.5' }}>
                  Node-orchestrator telemetry loop detects CPU spike to 84% and 2 contention locks on CockroachDB cluster.
                </p>
                <CodeSnippet title="telemetry status" code={`cortexops status`} />
              </div>

              <div className="feature-box" style={{ padding: '20px' }}>
                <div className="mono cyan" style={{ fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '8px' }}>
                  STEP 2: REVIEW DECISION REASONING
                </div>
                <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.92rem', marginBottom: '12px', lineHeight: '1.5' }}>
                  Claude 3.5 Bedrock synthesizes the CockroachDB Agent Skill for scale operations and proposes decision ID <code className="mono">a625baf7</code>.
                </p>
                <CodeSnippet title="queue review" code={`cortexops queue`} />
              </div>

              <div className="feature-box" style={{ padding: '20px' }}>
                <div className="mono green" style={{ fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '8px' }}>
                  STEP 3: AUTHORIZE SAFETY GATE EXECUTION
                </div>
                <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.92rem', marginBottom: '12px', lineHeight: '1.5' }}>
                  Operator approves. Go-Agent whitelist gate verifies command string prefix and executes scale action.
                </p>
                <CodeSnippet title="approve execution" code={`cortexops approve a625baf7`} />
              </div>

              <div className="feature-box" style={{ padding: '20px' }}>
                <div className="mono cyan" style={{ fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '8px' }}>
                  STEP 4: NATURAL LANGUAGE SEMANTIC RECALL
                </div>
                <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.92rem', marginBottom: '12px', lineHeight: '1.5' }}>
                  Query vector decision memory at any point to verify reasoning for past actions.
                </p>
                <CodeSnippet title="vector search" code={`cortexops ask "why did you scale up the cluster on Tuesday?"`} />
              </div>
            </div>
          </section>

          {/* 6. SAFETY WHITELIST */}
          <section id="safety" style={{ marginBottom: '64px', scrollMarginTop: '90px' }}>
            <h2 style={{ fontSize: '1.45rem', color: 'var(--logdy-text-heading)', fontWeight: '800', marginBottom: '12px' }}>
              6. Safety Whitelist Specifications
            </h2>
            <div className="feature-box" style={{ padding: '22px', borderLeft: '4px solid var(--logdy-green)' }}>
              <ul style={{ color: 'var(--logdy-text-muted)', paddingLeft: '20px', lineHeight: '1.85', fontSize: '0.92rem' }}>
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
