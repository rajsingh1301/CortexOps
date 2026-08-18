import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cpu, 
  Search, 
  Activity, 
  ShieldCheck, 
  BrainCircuit, 
  Zap, 
  RefreshCw, 
  Clock, 
  History, 
  AlertCircle,
  Filter,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Info,
  X,
  Database,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import DecisionCard from '../components/DecisionCard';
import MemorySearch from '../components/MemorySearch';
import ClusterMetrics from '../components/ClusterMetrics';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('feed');
  const [subTab, setSubTab] = useState('proposed'); // 'proposed' | 'history'

  const [proposedDecisions, setProposedDecisions] = useState([]);
  const [historyDecisions, setHistoryDecisions] = useState([]);
  const [clusterMetrics, setClusterMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [exitingIds, setExitingIds] = useState(new Set());

  // Toast Notifications State
  const [toasts, setToasts] = useState([]);

  // Filter & Sort State
  const [confidenceFilter, setConfidenceFilter] = useState('all'); // 'all' | 'high' | 'med' | 'low'
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'scale_up' | 'backup' | 'schema_review' | 'no_action'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest' | 'confidence_desc'

  // Connect Modal State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const addToast = (type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchDecisions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch cluster health metrics
      const healthRes = await fetch(`${API_BASE}/cluster/health`).catch(() => null);
      if (healthRes && healthRes.ok) {
        const healthData = await healthRes.json();
        setClusterMetrics(healthData);
      }

      // Fetch proposed decisions
      const proposedRes = await fetch(`${API_BASE}/decisions?status=proposed`);
      if (!proposedRes.ok) throw new Error(`HTTP ${proposedRes.status} fetching proposed decisions`);
      const proposedData = await proposedRes.json();
      setProposedDecisions(proposedData);

      // Fetch all decisions for history
      const allRes = await fetch(`${API_BASE}/decisions`);
      if (!allRes.ok) throw new Error(`HTTP ${allRes.status} fetching history`);
      const allData = await allRes.json();
      setHistoryDecisions(allData.filter(d => d.status !== 'proposed'));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to connect to orchestrator API (port 4000)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
    const interval = setInterval(() => {
      fetchDecisions();
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id) => {
    setActionLoadingId(id);
    setExitingIds(prev => new Set(prev).add(id));

    try {
      const res = await fetch(`${API_BASE}/decisions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute command via go-agent');
      }

      // Find the decision to show in toast and migrate to history
      const targetDecision = proposedDecisions.find(d => d.id === id);
      addToast(
        'success', 
        'Decision Approved & Executed', 
        `Action '${targetDecision?.action_type || 'command'}' successfully executed via Go safety gate.`
      );

      // Wait 300ms for exit animation
      setTimeout(() => {
        setProposedDecisions(prev => prev.filter(d => d.id !== id));
        if (targetDecision) {
          setHistoryDecisions(prev => [
            { ...targetDecision, status: 'executed', outcome: data.output || 'Executed successfully via safety gate.' },
            ...prev
          ]);
        }
        setExitingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);

    } catch (err) {
      console.error('Approval failed:', err);
      addToast('error', 'Execution Failed', err.message);
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoadingId(id);
    setExitingIds(prev => new Set(prev).add(id));

    try {
      const res = await fetch(`${API_BASE}/decisions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to reject decision');

      const targetDecision = proposedDecisions.find(d => d.id === id);
      addToast(
        'info', 
        'Decision Rejected', 
        `Decision ID ${id.slice(0, 8)} recorded as rejected in CockroachDB decision journal.`
      );

      setTimeout(() => {
        setProposedDecisions(prev => prev.filter(d => d.id !== id));
        if (targetDecision) {
          setHistoryDecisions(prev => [
            { ...targetDecision, status: 'rejected' },
            ...prev
          ]);
        }
        setExitingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);

    } catch (err) {
      console.error('Rejection failed:', err);
      addToast('error', 'Rejection Failed', err.message);
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter & Sort Logic for Proposed & History
  const filteredProposed = useMemo(() => {
    return proposedDecisions.filter(d => {
      if (actionFilter !== 'all' && d.action_type !== actionFilter) return false;
      if (confidenceFilter === 'high' && (d.confidence || 0) < 0.9) return false;
      if (confidenceFilter === 'med' && (d.confidence || 0) < 0.75) return false;
      if (confidenceFilter === 'low' && (d.confidence || 0) < 0.5) return false;
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortOrder === 'confidence_desc') return (b.confidence || 0) - (a.confidence || 0);
      return 0;
    });
  }, [proposedDecisions, actionFilter, confidenceFilter, sortOrder]);

  const filteredHistory = useMemo(() => {
    return historyDecisions.filter(d => {
      if (actionFilter !== 'all' && d.action_type !== actionFilter) return false;
      if (confidenceFilter === 'high' && (d.confidence || 0) < 0.9) return false;
      if (confidenceFilter === 'med' && (d.confidence || 0) < 0.75) return false;
      if (confidenceFilter === 'low' && (d.confidence || 0) < 0.5) return false;
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortOrder === 'confidence_desc') return (b.confidence || 0) - (a.confidence || 0);
      return 0;
    });
  }, [historyDecisions, actionFilter, confidenceFilter, sortOrder]);

  const handleCopyInstallCmd = () => {
    navigator.clipboard.writeText('cortexops init');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 24px 80px' }}>
      
      {/* Toast Notification Container */}
      <div className="toast-hud">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              {toast.type === 'success' && <CheckCircle2 size={18} color="var(--logdy-green)" style={{ flexShrink: 0, marginTop: '2px' }} />}
              {toast.type === 'error' && <XCircle size={18} color="var(--logdy-coral)" style={{ flexShrink: 0, marginTop: '2px' }} />}
              {toast.type === 'info' && <Info size={18} color="var(--logdy-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--logdy-text-heading)', fontFamily: 'var(--font-mono)' }}>
                  {toast.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--logdy-text-muted)', marginTop: '2px' }}>
                  {toast.message}
                </div>
              </div>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              style={{ background: 'transparent', border: 'none', color: 'var(--logdy-text-dim)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Top Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '36px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--logdy-border)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            background: 'rgba(255, 122, 0, 0.12)',
            border: '1px solid rgba(255, 122, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BrainCircuit size={24} color="var(--logdy-orange)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--logdy-text-heading)', margin: 0 }}>
              Live Operator Dashboard
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--logdy-text-muted)', margin: 0 }}>
              Self-managing CockroachDB agent with vector semantic decision memory
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={fetchDecisions}
            className="logdy-btn-alt"
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {/* Connect Cluster Pill / Button */}
          <button 
            onClick={() => setIsConnectModalOpen(true)}
            className="logdy-btn-brand"
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.82rem',
              gap: '8px'
            }}
          >
            <Database size={14} />
            <span>Connect Cluster</span>
          </button>
        </div>
      </header>

      {/* Live Cluster Health Metrics Bar */}
      <ClusterMetrics metrics={clusterMetrics} pendingCount={proposedDecisions.length} />

      {/* Main Section Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '24px',
        borderBottom: '1px solid var(--logdy-border)',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={() => setActiveTab('feed')}
          style={{
            background: activeTab === 'feed' ? 'rgba(255, 122, 0, 0.12)' : 'transparent',
            color: activeTab === 'feed' ? 'var(--logdy-orange)' : 'var(--logdy-text-muted)',
            border: activeTab === 'feed' ? '1px solid rgba(255, 122, 0, 0.4)' : '1px solid transparent',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Zap size={15} /> Decision Feed ({proposedDecisions.length})
        </button>

        <button 
          onClick={() => setActiveTab('search')}
          style={{
            background: activeTab === 'search' ? 'rgba(0, 188, 212, 0.12)' : 'transparent',
            color: activeTab === 'search' ? 'var(--logdy-cyan)' : 'var(--logdy-text-muted)',
            border: activeTab === 'search' ? '1px solid rgba(0, 188, 212, 0.4)' : '1px solid transparent',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Search size={15} /> Vector Memory Search
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ 
          background: 'rgba(220, 38, 38, 0.1)', 
          border: '1px solid rgba(220, 38, 38, 0.3)', 
          padding: '12px 16px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          color: 'var(--logdy-coral)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Dashboard Section Content */}
      {activeTab === 'feed' ? (
        <div>
          {/* Sub-tab Toggle & Filter/Sort Control Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '14px', 
            marginBottom: '18px' 
          }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setSubTab('proposed')}
                style={{
                  background: subTab === 'proposed' ? 'rgba(255, 122, 0, 0.15)' : 'transparent',
                  color: subTab === 'proposed' ? 'var(--logdy-orange)' : 'var(--logdy-text-muted)',
                  border: subTab === 'proposed' ? '1px solid var(--logdy-orange)' : '1px solid var(--logdy-card-border)',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={13} /> Pending Approvals ({proposedDecisions.length})
              </button>

              <button 
                onClick={() => setSubTab('history')}
                style={{
                  background: subTab === 'history' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: subTab === 'history' ? 'var(--logdy-green)' : 'var(--logdy-text-muted)',
                  border: subTab === 'history' ? '1px solid var(--logdy-green)' : '1px solid var(--logdy-card-border)',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <History size={13} /> History Log ({historyDecisions.length})
              </button>
            </div>

            {/* Filter & Sort Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--logdy-text-dim)', fontFamily: 'var(--font-mono)' }}>
                <Filter size={13} /> Filter:
              </div>

              {/* Action Filter */}
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={{
                  background: 'var(--logdy-card-bg)',
                  border: '1px solid var(--logdy-card-border)',
                  color: 'var(--logdy-text-main)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All Actions</option>
                <option value="scale_up">Scale Up</option>
                <option value="backup">Backup</option>
                <option value="schema_review">Schema Review</option>
                <option value="no_action">No Action</option>
              </select>

              {/* Confidence Filter */}
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                style={{
                  background: 'var(--logdy-card-bg)',
                  border: '1px solid var(--logdy-card-border)',
                  color: 'var(--logdy-text-main)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All Confidence</option>
                <option value="high">&gt;90% High Confidence</option>
                <option value="med">&gt;75% Medium</option>
                <option value="low">&gt;50% Standard</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  background: 'var(--logdy-card-bg)',
                  border: '1px solid var(--logdy-card-border)',
                  color: 'var(--logdy-text-main)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="confidence_desc">Highest Confidence</option>
              </select>
            </div>
          </div>

          {/* Tab Content Body */}
          {subTab === 'proposed' ? (
            filteredProposed.length === 0 ? (
              <div className="feature-box" style={{ padding: '40px', textAlign: 'center', color: 'var(--logdy-text-muted)' }}>
                <Clock size={36} color="var(--logdy-orange)" style={{ marginBottom: '12px' }} />
                <h3 style={{ color: 'var(--logdy-text-heading)' }}>No Pending Approval Requests</h3>
                <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                  {proposedDecisions.length > 0 ? 'No decisions match the current filter criteria.' : 'All proposed AI agent decisions have been processed.'}
                </p>
              </div>
            ) : (
              filteredProposed.map(d => (
                <DecisionCard 
                  key={d.id} 
                  decision={d} 
                  onApprove={handleApprove} 
                  onReject={handleReject} 
                  isActionLoading={actionLoadingId === d.id}
                  isExiting={exitingIds.has(d.id)}
                />
              ))
            )
          ) : (
            filteredHistory.length === 0 ? (
              <div className="feature-box" style={{ padding: '40px', textAlign: 'center', color: 'var(--logdy-text-muted)' }}>
                <History size={36} color="var(--logdy-cyan)" style={{ marginBottom: '12px' }} />
                <h3 style={{ color: 'var(--logdy-text-heading)' }}>No History Logs Yet</h3>
                <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                  Executed and rejected decisions will appear here.
                </p>
              </div>
            ) : (
              filteredHistory.map(d => (
                <DecisionCard 
                  key={d.id} 
                  decision={d} 
                  onApprove={handleApprove} 
                  onReject={handleReject} 
                  isActionLoading={actionLoadingId === d.id}
                  isExiting={exitingIds.has(d.id)}
                />
              ))
            )
          )}
        </div>
      ) : (
        <MemorySearch 
          onApprove={handleApprove} 
          onReject={handleReject} 
          actionLoadingId={actionLoadingId} 
        />
      )}

      {/* Connect Cluster Modal */}
      {isConnectModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="feature-box" style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--logdy-card-bg)',
            border: '1px solid var(--logdy-orange)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={20} color="var(--logdy-orange)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Connect CockroachDB Cluster</h3>
              </div>
              <button 
                onClick={() => setIsConnectModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--logdy-text-dim)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.88rem', marginBottom: '16px', lineHeight: '1.5' }}>
              Connect your CockroachDB Serverless or Dedicated cluster to enable live telemetry, Bedrock AI synthesis, and vector memory.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--logdy-text-dim)', fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                Option 1: Quick CLI Onboarding Wizard
              </div>
              <div className="logdy-terminal-box" style={{ margin: 0, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <code style={{ color: 'var(--logdy-cyan)', fontSize: '0.85rem' }}>cortexops init</code>
                <button onClick={handleCopyInstallCmd} className="copy-pill-btn">
                  {copiedCmd ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px', fontSize: '0.82rem', color: 'var(--logdy-text-muted)', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--logdy-green)', fontWeight: 600, marginBottom: '4px' }}>
                <CheckCircle2 size={14} /> Active Cluster Endpoint:
              </div>
              <div className="mono" style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '4px', wordBreak: 'break-all', fontSize: '0.78rem' }}>
                http://localhost:4000 (node-orchestrator)
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsConnectModalOpen(false)}
                className="logdy-btn-brand"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
