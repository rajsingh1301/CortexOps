import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  BrainCircuit, 
  Clock, 
  Loader2, 
  Zap, 
  AlertTriangle,
  BookOpen
} from 'lucide-react';

export default function DecisionCard({ decision, onApprove, onReject, isActionLoading }) {
  const {
    id,
    action_type,
    trigger_source,
    reasoning_text,
    confidence,
    ccloud_command,
    status,
    outcome,
    created_at,
    skills_consulted
  } = decision;

  const getStatusBadge = () => {
    switch (status) {
      case 'proposed':
        return <span className="badge badge-proposed"><Clock size={12} /> Proposed</span>;
      case 'executed':
        return <span className="badge badge-executed"><CheckCircle2 size={12} /> Executed</span>;
      case 'failed':
        return <span className="badge badge-failed"><AlertTriangle size={12} /> Failed</span>;
      case 'rejected':
        return <span className="badge badge-rejected"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="badge badge-proposed">{status}</span>;
    }
  };

  const confidencePct = confidence ? Math.round(confidence * 100) : 50;

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', position: 'relative' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {getStatusBadge()}
          <span style={{ 
            fontSize: '1rem', 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '0.04em',
            color: 'var(--text-main)'
          }}>
            {action_type?.replace('_', ' ')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {confidence && (
            <span style={{ 
              background: 'rgba(6, 182, 212, 0.1)', 
              color: 'var(--accent-cyan)', 
              padding: '2px 8px', 
              borderRadius: '6px',
              fontWeight: 600 
            }}>
              {confidencePct}% Confidence
            </span>
          )}
          {trigger_source && (
            <span>Trigger: <strong style={{ color: 'var(--text-main)' }}>{trigger_source}</strong></span>
          )}
          <span>{new Date(created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* AI Reasoning Text */}
      <div style={{ 
        background: 'rgba(2, 6, 23, 0.4)', 
        borderLeft: '3px solid var(--accent-cyan)',
        borderRadius: '0 8px 8px 0',
        padding: '14px 16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '6px' }}>
          <BrainCircuit size={14} /> AI AGENT REASONING LOG
        </div>
        <p style={{ fontSize: '0.925rem', lineHeight: '1.6', color: '#e2e8f0' }}>
          {reasoning_text}
        </p>
      </div>

      {/* Consulted Skills Tags */}
      {skills_consulted && skills_consulted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <BookOpen size={12} /> Skills Consulted:
          </span>
          {skills_consulted.map((skill, idx) => (
            <span key={idx} className="skill-tag">{skill}</span>
          ))}
        </div>
      )}

      {/* ccloud Command Terminal Block */}
      {ccloud_command && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }}>
            Proposed Gated CLI Action:
          </div>
          <div className="terminal-block">
            <Terminal size={16} color="var(--accent-cyan)" />
            <code>{ccloud_command}</code>
          </div>
        </div>
      )}

      {/* Execution Outcome Log (if executed or failed) */}
      {outcome && (
        <div style={{ 
          marginTop: '16px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: status === 'failed' ? 'var(--status-failed-bg)' : 'var(--status-executed-bg)',
          border: `1px solid ${status === 'failed' ? 'var(--status-failed-border)' : 'var(--status-executed-border)'}`,
          fontSize: '0.85rem'
        }}>
          <div style={{ 
            fontWeight: 600, 
            color: status === 'failed' ? 'var(--status-failed-text)' : 'var(--status-executed-text)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {status === 'failed' ? <XCircle size={14} /> : <CheckCircle2 size={14} />} 
            Execution Result Output:
          </div>
          <code style={{ 
            fontFamily: 'monospace', 
            color: '#cbd5e1', 
            display: 'block', 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {outcome}
          </code>
        </div>
      )}

      {/* Interactive Action Buttons for Proposed Status */}
      {status === 'proposed' && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px', 
          marginTop: '20px', 
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <button 
            className="btn-reject" 
            onClick={() => onReject(id)}
            disabled={isActionLoading}
          >
            <XCircle size={16} /> Reject
          </button>

          <button 
            className="btn-approve" 
            onClick={() => onApprove(id)}
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Executing via Go...
              </>
            ) : (
              <>
                <Zap size={16} /> Approve & Execute
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
