import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TerminalDemo from '../components/TerminalDemo';

export default function LandingPage() {
  const [copiedInstall, setCopiedInstall] = useState(false);

  const handleCopyInstall = () => {
    navigator.clipboard.writeText('curl -sSL https://raw.githubusercontent.com/rajsingh1301/CortexOps/main/install.sh | bash');
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px 80px', textAlign: 'center' }}>
      
      {/* ========================================================================= */}
      {/* 1. HERO TITLE & TAGLINE (LOGDY STYLE) */}
      {/* ========================================================================= */}
      <h1 style={{
        fontSize: 'clamp(1.8rem, 4.5vw, 3rem)',
        fontWeight: '800',
        lineHeight: '1.25',
        marginBottom: '16px',
        color: 'var(--logdy-text-heading)',
        textWrap: 'balance'
      }}>
        <span className="orange">Supercharge</span> CockroachDB operations with autonomous AI runbooks & safety gating
      </h1>

      <p style={{
        fontSize: 'clamp(0.95rem, 2.5vw, 1.2rem)',
        color: 'var(--logdy-text-muted)',
        maxWidth: '680px',
        margin: '0 auto 36px',
        lineHeight: '1.6',
        textWrap: 'balance'
      }}>
        <span className="orange">Save 90% of SRE toil</span> diagnosing query contention, automating cluster scaling, and remembering past decisions.
      </p>

      {/* ========================================================================= */}
      {/* 2. HERO INSTALL CODE BOX (THE CENTERPIECE HOOK) */}
      {/* ========================================================================= */}
      <div style={{ maxWidth: '640px', margin: '0 auto 40px', textAlign: 'left' }}>
        <div className="logdy-terminal-box">
          <div className="logdy-terminal-header">
            <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              bash — 1-command global install
            </span>
            <button onClick={handleCopyInstall} className="copy-pill-btn" style={{ flexShrink: 0 }}>
              {copiedInstall ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="logdy-terminal-body" style={{ fontSize: '0.82rem' }}>
            <div style={{ color: '#64748b', marginBottom: '4px' }}># 1-line universal global installer</div>
            <div style={{ wordBreak: 'break-all' }}>
              <span style={{ color: '#ff7a00', fontWeight: 'bold' }}>$ </span>
              <span style={{ color: '#00bcd4' }}>curl -sSL https://raw.githubusercontent.com/rajsingh1301/CortexOps/main/install.sh | bash</span>
            </div>
            <div style={{ color: '#64748b', margin: '8px 0 4px' }}># Launch CortexOps CLI operator console</div>
            <div>
              <span style={{ color: '#ff7a00', fontWeight: 'bold' }}>$ </span>
              <span style={{ color: '#ffffff', fontWeight: 'bold' }}>cortexops</span>
            </div>

            {/* Simulated Banner Output */}
            <div style={{ color: '#00bcd4', fontSize: 'clamp(0.62rem, 1.8vw, 0.74rem)', marginTop: '10px', lineHeight: '1.2', opacity: 0.95, overflowX: 'auto' }}>
              <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', whiteSpace: 'pre' }}>{`   ___               _                  ___             
  / __|  ___   _ _  | |_   ___  __ __  / _ \\   _ __   ___
 | (__  / _ \\ | '_| |  _| / -_) \\ \\ / | (_) | | '_ \\ (_-<
  \\___| \\___/ |_|    \\__| \\___| /_\\_\\  \\___/  | .__/ /__/
                                              |_|        `}</pre>
            </div>

            <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#10b981', overflowWrap: 'break-word' }}>
              ● Connected to cluster (http://localhost:4000) · v1.2.0
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflowWrap: 'break-word' }}>
              Autonomous, AI-assisted operations & self-healing agent for CockroachDB clusters.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PRODUCT PROOF: INTERACTIVE LIVE DEMO */}
      {/* ========================================================================= */}
      <div style={{ margin: '0 auto 48px', maxWidth: '820px' }}>
        <TerminalDemo />
      </div>

      {/* ========================================================================= */}
      {/* 4. VALUE PROP COMPARISON (LOGDY "IT'S LIKE X" STATEMENT) */}
      {/* ========================================================================= */}
      <p style={{
        fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
        fontWeight: '500',
        color: 'var(--logdy-text-heading)',
        maxWidth: '780px',
        margin: '0 auto 36px',
        lineHeight: '1.6',
        textWrap: 'balance'
      }}>
        It's like <span className="orange">an SRE</span>, <span className="orange">ccloud</span>, <span className="orange">Agent Skills</span>, and <span className="orange">vector memory</span> merged together and available in a clean CLI and UI.
      </p>

      {/* Action CTA Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '72px', flexWrap: 'wrap' }}>
        <Link to="/docs" className="logdy-btn-brand" style={{ whiteSpace: 'nowrap' }}>
          Quick start
        </Link>
        <Link to="/docs" className="logdy-btn-alt" style={{ whiteSpace: 'nowrap' }}>
          Read docs
        </Link>
        <Link to="/dashboard" className="logdy-btn-alt" style={{ whiteSpace: 'nowrap' }}>
          Live Dashboard
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 5. TEXT-ONLY FEATURE GRID (NO ICONS, NO ILLUSTRATIONS) */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: '80px' }}>
        <h2 style={{
          fontSize: '1.8rem',
          fontWeight: '800',
          marginBottom: '32px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--logdy-text-heading)'
        }}>
          <span className="orange">Features</span>
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '16px'
        }}>
          {/* Feature 1 */}
          <div className="feature-box">
            <h3>100% Safe & Whitelisted</h3>
            <p>Strict defense-in-depth safety gate on port 5005 ensures destructive commands never run without explicit operator sign-off.</p>
          </div>

          {/* Feature 2 */}
          <div className="feature-box">
            <h3>AI Decision Engine</h3>
            <p>Synthesizes live CockroachDB telemetry with official Agent Skills procedures and Claude 3.5 Sonnet to propose structured runbooks.</p>
          </div>

          {/* Feature 3 */}
          <div className="feature-box">
            <h3>Distributed Vector Memory</h3>
            <p>Automatically stores operational reasoning in CockroachDB vector storage so you can query "why did you do X?" anytime.</p>
          </div>

          {/* Feature 4 */}
          <div className="feature-box">
            <h3>Self-Healing Automation</h3>
            <p>Continuously monitors query contention, transaction retries, and replication lag to resolve cluster issues before outages occur.</p>
          </div>

          {/* Feature 5 */}
          <div className="feature-box">
            <h3>Dual Interface: CLI + Web</h3>
            <p>Operate seamlessly via keyboard-driven Go CLI (cortexops) or the real-time browser dashboard.</p>
          </div>

          {/* Feature 6 */}
          <div className="feature-box">
            <h3>Single Go Binary</h3>
            <p>Batteries included, compiled with Go 1.25. Zero heavy external daemons or runtime dependencies required.</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MINIMAL FOOTER */}
      {/* ========================================================================= */}
      <footer style={{
        borderTop: '1px solid var(--logdy-border)',
        paddingTop: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        color: 'var(--logdy-text-dim)',
        fontSize: '0.85rem',
        fontFamily: 'var(--font-mono)'
      }}>
        <div>
          CortexOps · Built for CockroachDB × AWS Hackathon 2026
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link to="/docs" style={{ color: 'var(--logdy-text-muted)', textDecoration: 'none' }}>Docs</Link>
          <Link to="/dashboard" style={{ color: 'var(--logdy-text-muted)', textDecoration: 'none' }}>Dashboard</Link>
          <a href="https://github.com/rajsingh1301/CortexOps" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--logdy-text-muted)', textDecoration: 'none' }}>
            GitHub
          </a>
        </div>
      </footer>

    </div>
  );
}
