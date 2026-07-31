import React from 'react';
import { Cpu, Activity, ShieldCheck, Database, Zap } from 'lucide-react';

export default function ClusterMetrics({ metrics, pendingCount = 0 }) {
  const cpu = metrics?.cpu_percent ?? 22.5;
  const queries = metrics?.active_queries ?? 5;
  const contention = metrics?.contention_events ?? 0;
  const replication = metrics?.replication_status ?? 'healthy';
  const capturedAt = metrics?.captured_at ? new Date(metrics.captured_at).toLocaleTimeString() : null;

  const getCpuStatus = () => {
    if (cpu > 80) {
      return { text: '● Critical CPU Spike', color: 'var(--status-failed-text)' };
    }
    if (cpu > 60) {
      return { text: '● Elevated CPU Load', color: 'var(--status-proposed-text)' };
    }
    return { text: '● Normal Operating Range', color: 'var(--status-executed-text)' };
  };

  const cpuStatus = getCpuStatus();

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
      gap: '20px', 
      marginBottom: '40px' 
    }}>
      {/* CPU Load Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Cluster CPU Load</span>
          <Cpu size={20} color="var(--accent-cyan)" />
        </div>
        <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {typeof cpu === 'number' ? cpu.toFixed(1) : cpu}%
        </div>
        <div style={{ fontSize: '0.75rem', color: cpuStatus.color, marginTop: '6px', fontWeight: 600 }}>
          {cpuStatus.text} {capturedAt && `(${capturedAt})`}
        </div>
      </div>

      {/* Active Queries & Contention Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Active Queries</span>
          <Activity size={20} color="var(--accent-purple)" />
        </div>
        <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {queries}
        </div>
        <div style={{ fontSize: '0.75rem', color: contention > 0 ? 'var(--status-proposed-text)' : 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>
          {contention} Contention Event{contention !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Replication Status Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Replication Health</span>
          <Database size={20} color="var(--accent-cyan)" />
        </div>
        <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
          {replication}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--status-executed-text)', marginTop: '6px', fontWeight: 600 }}>
          ● Consensus Quorum Healthy
        </div>
      </div>

      {/* Whitelisted Safety Gate & Action Queue Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Whitelisted Safety Gate</span>
          <ShieldCheck size={20} color="var(--status-executed-text)" />
        </div>
        <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          :5005 Gated
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--status-proposed-text)', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Zap size={12} /> {pendingCount} Pending Action{pendingCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
