import React from 'react';
import { Database, BrainCircuit, ShieldCheck, Terminal, Layers, ArrowRight } from 'lucide-react';

export default function ArchitectureDiagram() {
  const stages = [
    {
      id: '01',
      name: 'OBSERVE',
      tech: 'CockroachDB MCP',
      icon: <Database size={20} color="#00f0ff" />,
      detail: 'Read-only cluster inspection: CPU load %, active queries, contention events, replication status.'
    },
    {
      id: '02',
      name: 'REASON',
      tech: 'AWS Bedrock / Claude 3.5',
      icon: <BrainCircuit size={20} color="#ffb300" />,
      detail: 'Synthesizes CockroachDB Agent Skills YAML procedures into structured, confidence-scored actions.'
    },
    {
      id: '03',
      name: 'REMEMBER',
      tech: 'Distributed Vector Store',
      icon: <Layers size={20} color="#00f0ff" />,
      detail: 'Embeds reasoning via Cohere embed-v3 for semantic natural-language operational auditability.'
    },
    {
      id: '04',
      name: 'SAFETY GATE',
      tech: 'Go-Agent :5005 Whitelist',
      icon: <ShieldCheck size={20} color="#00e676" />,
      detail: 'Requires explicit human authorization. Rejects arbitrary shell scripts and unknown verbs.'
    },
    {
      id: '05',
      name: 'EXECUTE',
      tech: 'ccloud CLI Runtime',
      icon: <Terminal size={20} color="#ff5252" />,
      detail: 'Executes whitelisted ccloud cluster actions (backup, scale_up, schema_review) safely.'
    }
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* ASCII Stage Pipeline */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        {stages.map((st, i) => (
          <div
            key={st.id}
            className="chassis-panel cyan-glow"
            style={{
              padding: '16px 14px',
              border: '1px solid var(--crdb-border)',
              background: '#090e17'
            }}
          >
            {/* Header / ID */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--crdb-cyan)', fontWeight: '700' }}>
                STAGE_{st.id}
              </div>
              {st.icon}
            </div>

            {/* Title */}
            <div className="mono" style={{ fontSize: '0.92rem', fontWeight: '800', color: '#ffffff', marginBottom: '2px' }}>
              {st.name}
            </div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-slate)', marginBottom: '8px' }}>
              {st.tech}
            </div>

            {/* Detail */}
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.45' }}>
              {st.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
