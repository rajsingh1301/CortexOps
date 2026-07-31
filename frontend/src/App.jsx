import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import DecisionCard from './components/DecisionCard';
import MemorySearch from './components/MemorySearch';
import ClusterMetrics from './components/ClusterMetrics';
import './index.css';

const API_BASE = 'http://localhost:4000';

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [subTab, setSubTab] = useState('proposed'); // 'proposed' | 'history'

  const [proposedDecisions, setProposedDecisions] = useState([]);
  const [historyDecisions, setHistoryDecisions] = useState([]);
  const [clusterMetrics, setClusterMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

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
  }, []);

  const handleApprove = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_BASE}/decisions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Execution Error: ${data.error || 'Failed to execute command via go-agent'}`);
      }
      await fetchDecisions();
    } catch (err) {
      console.error('Approval failed:', err);
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_BASE}/decisions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to reject decision');
      await fetchDecisions();
    } catch (err) {
      console.error('Rejection failed:', err);
      alert(`Rejection error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Top Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '40px',
        paddingBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
          }}>
            <BrainCircuit size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              CortexOps <span style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>Historian</span>
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Self-managing CockroachDB agent with vector semantic decision memory
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={fetchDecisions}
            className="glass-panel"
            style={{ 
              padding: '8px 14px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <div className="glass-panel" style={{ 
            padding: '8px 16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            borderRadius: '9999px' 
          }}>
            <div className="pulse-indicator" />
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)' }}>
              CockroachDB Cluster Active
            </span>
          </div>
        </div>
      </header>

      {/* Live Cluster Health Metrics Bar */}
      <ClusterMetrics metrics={clusterMetrics} pendingCount={proposedDecisions.length} />

      {/* Main Section Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px'
      }}>
        <button 
          onClick={() => setActiveTab('feed')}
          style={{
            background: activeTab === 'feed' ? 'var(--accent-cyan-glow)' : 'transparent',
            color: activeTab === 'feed' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            border: activeTab === 'feed' ? '1px solid var(--border-glow)' : '1px solid transparent',
            padding: '8px 18px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Zap size={16} /> Decision Feed & Approvals
        </button>

        <button 
          onClick={() => setActiveTab('search')}
          style={{
            background: activeTab === 'search' ? 'var(--accent-purple-glow)' : 'transparent',
            color: activeTab === 'search' ? 'var(--accent-purple)' : 'var(--text-muted)',
            border: activeTab === 'search' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
            padding: '8px 18px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Search size={16} /> Vector Memory Search
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ 
          background: 'var(--status-failed-bg)', 
          border: '1px solid var(--status-failed-border)', 
          padding: '12px 16px', 
          borderRadius: '10px', 
          marginBottom: '24px',
          color: 'var(--status-failed-text)',
          fontSize: '0.875rem',
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
          {/* Sub-tab Toggle */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button 
              onClick={() => setSubTab('proposed')}
              style={{
                background: subTab === 'proposed' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: subTab === 'proposed' ? '#fbbf24' : 'var(--text-muted)',
                border: subTab === 'proposed' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Clock size={14} /> Pending Approvals ({proposedDecisions.length})
            </button>

            <button 
              onClick={() => setSubTab('history')}
              style={{
                background: subTab === 'history' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: subTab === 'history' ? '#34d399' : 'var(--text-muted)',
                border: subTab === 'history' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <History size={14} /> History Log ({historyDecisions.length})
            </button>
          </div>

          {subTab === 'proposed' ? (
            proposedDecisions.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={36} color="var(--accent-cyan)" style={{ marginBottom: '12px' }} />
                <h3>No Pending Approval Requests</h3>
                <p style={{ fontSize: '0.875rem', marginTop: '6px' }}>
                  All proposed agent decisions have been processed.
                </p>
              </div>
            ) : (
              proposedDecisions.map(d => (
                <DecisionCard 
                  key={d.id} 
                  decision={d} 
                  onApprove={handleApprove} 
                  onReject={handleReject} 
                  isActionLoading={actionLoadingId === d.id}
                />
              ))
            )
          ) : (
            historyDecisions.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <History size={36} color="var(--accent-purple)" style={{ marginBottom: '12px' }} />
                <h3>No History Logs Yet</h3>
                <p style={{ fontSize: '0.875rem', marginTop: '6px' }}>
                  Executed and rejected decisions will appear here.
                </p>
              </div>
            ) : (
              historyDecisions.map(d => (
                <DecisionCard 
                  key={d.id} 
                  decision={d} 
                  onApprove={handleApprove} 
                  onReject={handleReject} 
                  isActionLoading={actionLoadingId === d.id}
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
    </div>
  );
}
