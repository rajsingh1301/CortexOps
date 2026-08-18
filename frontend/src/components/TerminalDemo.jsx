import React, { useState, useEffect } from 'react';
import { Copy, Check, Terminal as TermIcon, Play } from 'lucide-react';

const DEMO_COMMANDS = [
  {
    key: 'status',
    label: 'cortexops status',
    cmd: 'cortexops status',
    render: () => (
      <div>
        <div style={{ color: 'var(--logdy-cyan)', fontWeight: 'bold', marginBottom: '8px' }}>
          &gt; CortexOps Cluster Health · http://localhost:4000
        </div>
        <div style={{ color: '#334155' }}>┌───────────────────┬────────────────────────────────────────┐</div>
        <div>│ <span style={{ color: '#ffffff', fontWeight: 'bold' }}>METRIC</span>            │ <span style={{ color: '#ffffff', fontWeight: 'bold' }}>CURRENT STATUS / VALUE</span>                 │</div>
        <div style={{ color: '#334155' }}>├───────────────────┼────────────────────────────────────────┤</div>
        <div>│ CPU Load          │ <span style={{ color: '#00e676' }}>████████░░░░░░░░░░░░</span> <span style={{ color: '#00e676', fontWeight: 'bold' }}>42.0%</span>               │</div>
        <div>│ Active Queries    │ 12 queries active                      │</div>
        <div>│ Contention Events │ 0 lock contention events               │</div>
        <div>│ Replication Status│ <span style={{ color: '#00e676', fontWeight: 'bold' }}>✓ HEALTHY (3/3 Nodes Synced)</span>          │</div>
        <div>│ Safety Gate       │ <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>✓ ACTIVE (Port 5005 Whitelist)</span>          │</div>
        <div style={{ color: '#334155' }}>└───────────────────┴────────────────────────────────────────┘</div>
      </div>
    )
  },
  {
    key: 'queue',
    label: 'cortexops queue',
    cmd: 'cortexops queue',
    render: () => (
      <div>
        <div style={{ color: '#ff5252', fontWeight: 'bold', marginBottom: '8px' }}>
          📋 Decision Approval Queue (status: proposed, count: 1)
        </div>
        <div style={{ color: '#00f0ff' }}>┌──────────┬──────────┬──────┬────────────┬────────────────────────────────────────────────────┐</div>
        <div style={{ color: '#00f0ff' }}>│ <span style={{ color: '#ffffff', fontWeight: 'bold' }}>ID</span>       │ <span style={{ color: '#ffffff', fontWeight: 'bold' }}>ACTION</span>   │ <span style={{ color: '#ffffff', fontWeight: 'bold' }}>CONF</span> │ <span style={{ color: '#ffffff', fontWeight: 'bold' }}>STATUS</span>     │ <span style={{ color: '#ffffff', fontWeight: 'bold' }}>REASONING & EXECUTION COMMAND</span>                      │</div>
        <div style={{ color: '#00f0ff' }}>├──────────┼──────────┼──────┼────────────┼────────────────────────────────────────────────────┤</div>
        <div>│ a625baf7 │ <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>SCALE_UP</span> │ 95%  │ <span style={{ color: '#ffb300', fontWeight: 'bold' }}>⚠ PROPOSED</span> │ High query volume detected. Scale node pool to 4. │</div>
        <div>│          │          │      │            │ <span style={{ color: '#00f0ff' }}>⚡ ccloud cluster scale --nodes=4</span>                  │</div>
        <div style={{ color: '#00f0ff' }}>└──────────┴──────────┴──────┴────────────┴────────────────────────────────────────────────────┘</div>
        <div style={{ marginTop: '10px', color: '#64748b', fontSize: '0.8rem' }}>
          Interactive TUI Hotkeys: Press <span style={{ color: '#00e676', fontWeight: 'bold' }}>[a] Approve</span> · <span style={{ color: '#ff5252', fontWeight: 'bold' }}>[r] Reject</span> · <span style={{ color: '#ffffff' }}>[q] Quit</span>
        </div>
      </div>
    )
  },
  {
    key: 'approve',
    label: 'cortexops approve a625baf7',
    cmd: 'cortexops approve a625baf7',
    render: () => (
      <div>
        <div style={{ color: '#00e676', fontWeight: 'bold', marginBottom: '6px' }}>
          ✓ Decision Approved and Executed Successfully!
        </div>
        <div style={{ marginLeft: '12px', borderLeft: '2px solid #00e676', paddingLeft: '10px' }}>
          <div><strong style={{ color: '#94a3b8' }}>Status:  </strong> <span style={{ color: '#00e676', fontWeight: 'bold' }}>EXECUTED</span></div>
          <div><strong style={{ color: '#94a3b8' }}>Action:  </strong> <span style={{ color: '#00f0ff' }}>SCALE_UP</span></div>
          <div><strong style={{ color: '#94a3b8' }}>Outcome: </strong> <span style={{ color: '#ffffff' }}>Cluster scaled to 4 nodes via ccloud whitelist safety gate</span></div>
        </div>
      </div>
    )
  },
  {
    key: 'ask',
    label: 'cortexops ask "why did you scale?"',
    cmd: 'cortexops ask "why did you scale up?"',
    render: () => (
      <div>
        <div style={{ color: '#ff5252', fontWeight: 'bold', marginBottom: '8px' }}>
          🔍 Vector Memory Similarity Search (1 matches for "why did you scale up?")
        </div>
        <div style={{
          border: '1px solid #1e293b',
          borderRadius: '4px',
          padding: '12px 14px',
          background: 'rgba(15, 23, 36, 0.8)'
        }}>
          <div style={{ color: '#00f0ff', fontWeight: 'bold', marginBottom: '4px' }}>
            → #1 Vector Match | Action: <span style={{ color: '#ffb300' }}>SCALE_UP</span> | Status: <span style={{ color: '#00e676' }}>EXECUTED</span> | Conf: 95%
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.84rem', marginBottom: '6px', lineHeight: '1.4' }}>
            Reasoning: Peak load reached 84% CPU for 5m. Autonomous Agent Skill rule recommended node scaling.
          </div>
          <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
            Embeddings: Cohere embed-english-v3 in CockroachDB Distributed Vector Store
          </div>
        </div>
      </div>
    )
  }
];

export default function TerminalDemo() {
  const [activeCmdIdx, setActiveCmdIdx] = useState(0);
  const [typedChars, setTypedChars] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showOutput, setShowOutput] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeDemo = DEMO_COMMANDS[activeCmdIdx];

  useEffect(() => {
    let timer;
    let i = 0;
    setTypedChars('');
    setShowOutput(false);
    setIsTyping(true);

    const fullCmd = activeDemo.cmd;

    const tick = () => {
      if (i <= fullCmd.length) {
        setTypedChars(fullCmd.slice(0, i));
        i++;
        timer = setTimeout(tick, 35 + Math.random() * 20);
      } else {
        setIsTyping(false);
        timer = setTimeout(() => setShowOutput(true), 150);
      }
    };

    timer = setTimeout(tick, 200);
    return () => clearTimeout(timer);
  }, [activeCmdIdx]);

  const copyCommand = () => {
    navigator.clipboard.writeText(activeDemo.cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Terminal Mode Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '10px',
        flexWrap: 'wrap'
      }}>
        {DEMO_COMMANDS.map((cmd, idx) => (
          <button
            key={cmd.key}
            onClick={() => setActiveCmdIdx(idx)}
            className="mono"
            style={{
              background: activeCmdIdx === idx ? 'var(--crdb-cyan-glow)' : 'rgba(15, 23, 36, 0.6)',
              border: activeCmdIdx === idx ? '1px solid var(--crdb-cyan)' : '1px solid var(--crdb-border)',
              color: activeCmdIdx === idx ? 'var(--crdb-cyan)' : 'var(--text-slate)',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {activeCmdIdx === idx ? `▸ ${cmd.key}` : cmd.key}
          </button>
        ))}
      </div>

      {/* Terminal Screen Chassis */}
      <div className="terminal-window">
        {/* Title Bar */}
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="terminal-title mono">
            cortexops@node-1 ~ zsh (interactive live session)
          </div>
          <button
            onClick={copyCommand}
            className="mono"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-slate)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem'
            }}
          >
            {copied ? <Check size={12} color="#00e676" /> : <Copy size={12} />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>

        {/* Terminal Screen Body */}
        <div className="terminal-body" style={{ overflowX: 'auto' }}>
          {/* Prompt line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ color: '#00e676', fontWeight: 'bold' }}>➜</span>
            <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>cortexops</span>
            <span style={{ color: '#64748b' }}>git:(main)</span>
            <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{typedChars}</span>
            {isTyping && <span className="cursor-blink" />}
          </div>

          {/* Rendered Output */}
          {showOutput && (
            <div style={{ overflowX: 'auto', whiteSpace: 'pre', fontFamily: 'var(--font-mono)' }}>
              {activeDemo.render()}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                <span style={{ color: '#00e676' }}>➜</span>
                <span style={{ color: '#00f0ff' }}>cortexops</span>
                <span className="cursor-blink" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
