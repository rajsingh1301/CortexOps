import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  BrainCircuit, 
  Clock, 
  Loader2, 
  Zap, 
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Check,
  X
} from 'lucide-react';

export default function DecisionCard({ 
  decision, 
  onApprove, 
  onReject, 
  isActionLoading,
  isExiting = false 
}) {
  const {
    id,
    action_type,
    trigger_source,
    reasoning_text = '',
    confidence,
    ccloud_command,
    status,
    outcome,
    created_at,
    skills_consulted
  } = decision;

  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmMode, setConfirmMode] = useState(null); // 'approve' | 'reject' | null

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
  const isLongReasoning = reasoning_text && (reasoning_text.length > 140 || reasoning_text.includes('\n'));

  const handleConfirmAction = () => {
    if (confirmMode === 'approve') {
      onApprove(id);
    } else if (confirmMode === 'reject') {
      onReject(id);
    }
    setConfirmMode(null);
  };

  return (
    <div 
      className={`feature-box decision-card ${isExiting ? 'card-exiting' : ''}`}
      style={{ 
        marginBottom: '18px', 
        position: 'relative',
        transition: 'all 0.25s ease',
        boxShadow: status === 'proposed' ? '0 4px 20px rgba(0,0,0,0.12)' : 'none'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px 14px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', minWidth: 0 }}>
          {getStatusBadge()}
          <span style={{ 
            fontSize: '0.98rem', 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '0.04em',
            fontFamily: 'var(--font-mono)',
            color: 'var(--logdy-text-heading)',
            whiteSpace: 'nowrap'
          }}>
            {action_type?.replace('_', ' ')}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--logdy-text-dim)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            ({id ? id.slice(0, 8) : 'id'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px 14px', fontSize: '0.78rem', color: 'var(--logdy-text-muted)', fontFamily: 'var(--font-mono)', flexWrap: 'wrap' }}>
          {confidence && (
            <span style={{ 
              background: 'rgba(0, 188, 212, 0.12)', 
              color: 'var(--logdy-cyan)', 
              border: '1px solid rgba(0, 188, 212, 0.3)',
              padding: '2px 8px', 
              borderRadius: '4px',
              fontWeight: 700,
              whiteSpace: 'nowrap'
            }}>
              {confidencePct}% Confidence
            </span>
          )}
          {trigger_source && (
            <span style={{ whiteSpace: 'nowrap' }}>Trigger: <strong style={{ color: 'var(--logdy-text-heading)' }}>{trigger_source}</strong></span>
          )}
          <span style={{ whiteSpace: 'nowrap' }}>{created_at ? new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        </div>
      </div>

      {/* AI Reasoning Block with Expand/Collapse */}
      <div style={{ 
        background: 'var(--logdy-code-bg)', 
        borderLeft: '3px solid var(--logdy-cyan)',
        borderRadius: '0 6px 6px 0',
        padding: '12px 16px',
        marginBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--logdy-cyan)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            <BrainCircuit size={14} /> AI AGENT REASONING LOG
          </div>
          {isLongReasoning && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--logdy-orange)',
                fontSize: '0.74rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px'
              }}
            >
              {isExpanded ? (
                <>Show less <ChevronUp size={13} /></>
              ) : (
                <>Show more <ChevronDown size={13} /></>
              )}
            </button>
          )}
        </div>

        <p style={{ 
          fontSize: '0.9rem', 
          lineHeight: '1.55', 
          color: '#e2e8f0',
          margin: 0,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          display: isLongReasoning && !isExpanded ? '-webkit-box' : 'block',
          WebkitLineClamp: isLongReasoning && !isExpanded ? 2 : 'unset',
          WebkitBoxOrient: 'vertical',
          overflow: isLongReasoning && !isExpanded ? 'hidden' : 'visible'
        }}>
          {reasoning_text}
        </p>
      </div>

      {/* Consulted Skills Tags */}
      {skills_consulted && skills_consulted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--logdy-text-dim)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)' }}>
            <BookOpen size={12} /> Skills:
          </span>
          {skills_consulted.map((skill, idx) => (
            <span 
              key={idx} 
              style={{
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--logdy-card-border)',
                color: 'var(--logdy-text-muted)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* ccloud Command Terminal Block */}
      {ccloud_command && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--logdy-text-dim)', marginBottom: '4px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            Proposed Gated CLI Action:
          </div>
          <div className="logdy-terminal-box" style={{ margin: 0, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflowX: 'auto' }}>
            <Terminal size={14} color="var(--logdy-orange)" style={{ flexShrink: 0 }} />
            <code style={{ fontSize: '0.8rem', color: 'var(--logdy-cyan)', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{ccloud_command}</code>
          </div>
        </div>
      )}

      {/* Execution Outcome Log (if executed or failed) */}
      {outcome && (
        <div style={{ 
          marginTop: '12px',
          padding: '12px 14px',
          borderRadius: '6px',
          background: status === 'failed' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${status === 'failed' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          fontSize: '0.84rem'
        }}>
          <div style={{ 
            fontWeight: 700, 
            fontFamily: 'var(--font-mono)',
            color: status === 'failed' ? 'var(--logdy-coral)' : 'var(--logdy-green)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {status === 'failed' ? <XCircle size={14} /> : <CheckCircle2 size={14} />} 
            Execution Result Output:
          </div>
          <code style={{ 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--logdy-text-main)', 
            display: 'block', 
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {outcome}
          </code>
        </div>
      )}

      {/* Confirmation Step (Inline Dialog before Execute/Reject) */}
      {status === 'proposed' && confirmMode && (
        <div style={{
          marginTop: '16px',
          padding: '14px 18px',
          borderRadius: '8px',
          background: confirmMode === 'approve' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(220, 38, 38, 0.08)',
          border: `1px solid ${confirmMode === 'approve' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={18} color={confirmMode === 'approve' ? 'var(--logdy-green)' : 'var(--logdy-coral)'} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--logdy-text-heading)', fontFamily: 'var(--font-mono)' }}>
                {confirmMode === 'approve' ? 'Confirm Safety-Gated Execution?' : 'Confirm Decision Rejection?'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--logdy-text-muted)' }}>
                {confirmMode === 'approve' 
                  ? `Authorizes decision ID ${id?.slice(0, 8)} to execute '${action_type}' via Go Agent safety whitelist.`
                  : `Records decision ID ${id?.slice(0, 8)} as rejected in CockroachDB decision journal without execution.`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setConfirmMode(null)}
              className="logdy-btn-alt"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleConfirmAction}
              style={{
                padding: '6px 16px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: confirmMode === 'approve' ? 'var(--logdy-green)' : 'var(--logdy-coral)',
                color: '#ffffff'
              }}
            >
              <Check size={14} /> {confirmMode === 'approve' ? 'Yes, Authorize & Run' : 'Yes, Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons for Proposed Status (When not in confirm mode) */}
      {status === 'proposed' && !confirmMode && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px', 
          marginTop: '16px', 
          paddingTop: '14px',
          borderTop: '1px solid var(--logdy-card-border)'
        }}>
          <button 
            className="logdy-btn-alt"
            onClick={() => setConfirmMode('reject')}
            disabled={isActionLoading}
            style={{ 
              color: 'var(--logdy-coral)', 
              borderColor: 'rgba(220, 38, 38, 0.3)',
              padding: '8px 16px',
              fontSize: '0.82rem'
            }}
          >
            <XCircle size={15} /> Reject
          </button>

          <button 
            className="logdy-btn-brand"
            onClick={() => setConfirmMode('approve')}
            disabled={isActionLoading}
            style={{ 
              padding: '8px 18px',
              fontSize: '0.82rem'
            }}
          >
            {isActionLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Executing via Go...
              </>
            ) : (
              <>
                <Zap size={15} /> Approve & Execute
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
