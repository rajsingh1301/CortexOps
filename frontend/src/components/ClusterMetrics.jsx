import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Activity, 
  ShieldCheck, 
  Database, 
  Zap, 
  Maximize2, 
  X, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';

// Generate 20 baseline points for the last 60 minutes
const generateInitialHistory = (baseCpu = 22.5, baseQueries = 5) => {
  const points = [];
  const now = Date.now();
  for (let i = 19; i >= 0; i--) {
    const t = new Date(now - i * 3 * 60 * 1000);
    const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const noiseCpu = (Math.sin(i * 0.8) * 6) + (Math.random() * 4 - 2);
    const noiseQueries = Math.max(1, Math.round(baseQueries + (Math.cos(i * 0.5) * 3) + (Math.random() * 2 - 1)));
    points.push({
      time: timeStr,
      cpu: Math.max(8, Math.min(95, parseFloat((baseCpu + noiseCpu).toFixed(1)))),
      queries: noiseQueries,
      contention: i === 5 ? 1 : 0,
      replication: 100
    });
  }
  return points;
};

export default function ClusterMetrics({ metrics, pendingCount = 0 }) {
  const [history, setHistory] = useState(() => generateInitialHistory(metrics?.cpu_percent, metrics?.active_queries));
  const [currentCpu, setCurrentCpu] = useState(metrics?.cpu_percent ?? 22.5);
  const [currentQueries, setCurrentQueries] = useState(metrics?.active_queries ?? 5);
  const [currentContention, setCurrentContention] = useState(metrics?.contention_events ?? 0);
  const [flashMetric, setFlashMetric] = useState(null); // 'cpu' | 'queries' | null
  const [expandedMetric, setExpandedMetric] = useState(null); // 'cpu' | 'queries' | 'replication' | 'safety' | null

  // Sync when parent metrics prop updates
  useEffect(() => {
    if (metrics) {
      if (typeof metrics.cpu_percent === 'number') {
        const val = parseFloat(Number(metrics.cpu_percent).toFixed(1));
        setCurrentCpu(val);
        setFlashMetric('cpu');
        setTimeout(() => setFlashMetric(null), 1000);
        setHistory(prev => {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return [...prev.slice(1), {
            time: timeStr,
            cpu: val,
            queries: metrics.active_queries || 5,
            contention: metrics.contention_events || 0,
            replication: 100
          }];
        });
      }
      if (metrics.active_queries !== undefined) setCurrentQueries(parseInt(metrics.active_queries, 10) || 5);
      if (metrics.contention_events !== undefined) setCurrentContention(parseInt(metrics.contention_events, 10) || 0);
    }
  }, [metrics]);

  // Simulate periodic live ticking update (every 3.5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const deltaCpu = (Math.random() * 3.2 - 1.5);
      const newCpu = Math.max(10, Math.min(92, parseFloat((currentCpu + deltaCpu).toFixed(1))));
      const deltaQueries = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      const newQueries = Math.max(1, currentQueries + deltaQueries);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setCurrentCpu(newCpu);
      setCurrentQueries(newQueries);
      setFlashMetric(Math.random() > 0.5 ? 'cpu' : 'queries');

      setTimeout(() => setFlashMetric(null), 800);

      setHistory(prev => {
        const next = [...prev.slice(1), {
          time: timeStr,
          cpu: newCpu,
          queries: newQueries,
          contention: currentContention,
          replication: 100
        }];
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [currentCpu, currentQueries, currentContention]);

  const getCpuStatus = () => {
    if (currentCpu > 80) {
      return { text: '● Critical CPU Spike', color: 'var(--logdy-coral)' };
    }
    if (currentCpu > 60) {
      return { text: '● Elevated CPU Load', color: 'var(--logdy-orange)' };
    }
    return { text: '● Normal Operating Range', color: 'var(--logdy-green)' };
  };

  const cpuStatus = getCpuStatus();

  return (
    <>
      {/* 4 Responsive Grid Metric Cards with Sparklines */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        {/* 1. CPU Load Card */}
        <div 
          onClick={() => setExpandedMetric('cpu')}
          className="feature-box metric-interactive-card"
          style={{ 
            padding: '18px 20px', 
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--logdy-text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              CLUSTER CPU LOAD
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={16} color="var(--logdy-orange)" />
              <Maximize2 size={12} color="var(--logdy-text-dim)" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
            <span 
              className={`metric-val ${flashMetric === 'cpu' ? 'metric-flash' : ''}`}
              style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--logdy-text-heading)', fontFamily: 'var(--font-mono)' }}
            >
              {typeof currentCpu === 'number' ? currentCpu.toFixed(1) : currentCpu}%
            </span>
            <span style={{ fontSize: '0.74rem', color: cpuStatus.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {cpuStatus.text}
            </span>
          </div>

          {/* Sparkline Chart */}
          <div style={{ width: '100%', height: '42px', marginTop: '6px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7a00" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff7a00" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="cpu" stroke="#ff7a00" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Active Queries Card */}
        <div 
          onClick={() => setExpandedMetric('queries')}
          className="feature-box metric-interactive-card"
          style={{ 
            padding: '18px 20px', 
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--logdy-text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              ACTIVE QUERIES & LOCKS
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} color="var(--logdy-cyan)" />
              <Maximize2 size={12} color="var(--logdy-text-dim)" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
            <span 
              className={`metric-val ${flashMetric === 'queries' ? 'metric-flash' : ''}`}
              style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--logdy-text-heading)', fontFamily: 'var(--font-mono)' }}
            >
              {currentQueries}
            </span>
            <span style={{ fontSize: '0.74rem', color: currentContention > 0 ? 'var(--logdy-coral)' : 'var(--logdy-text-dim)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              {currentContention} lock{currentContention !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Sparkline Chart */}
          <div style={{ width: '100%', height: '42px', marginTop: '6px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="queriesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00bcd4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00bcd4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="queries" stroke="#00bcd4" strokeWidth={2} fillOpacity={1} fill="url(#queriesGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Replication Health Card */}
        <div 
          onClick={() => setExpandedMetric('replication')}
          className="feature-box metric-interactive-card"
          style={{ 
            padding: '18px 20px', 
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--logdy-text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              REPLICATION QUORUM
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={16} color="var(--logdy-green)" />
              <Maximize2 size={12} color="var(--logdy-text-dim)" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--logdy-text-heading)', fontFamily: 'var(--font-mono)' }}>
              Healthy
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--logdy-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              100% Range Coverage
            </span>
          </div>

          {/* Sparkline Chart */}
          <div style={{ width: '100%', height: '42px', marginTop: '6px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="replGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="replication" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#replGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Safety Gate Card */}
        <div 
          onClick={() => setExpandedMetric('safety')}
          className="feature-box metric-interactive-card"
          style={{ 
            padding: '18px 20px', 
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--logdy-text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              SAFETY GATE (:5005)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="var(--logdy-green)" />
              <Maximize2 size={12} color="var(--logdy-text-dim)" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--logdy-text-heading)', fontFamily: 'var(--font-mono)' }}>
              Enforced
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--logdy-orange)', fontWeight: 700, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Zap size={11} /> {pendingCount} Pending
            </span>
          </div>

          {/* Activity Line */}
          <div style={{ marginTop: '14px', height: '34px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {history.slice(-16).map((item, idx) => (
              <div 
                key={idx}
                style={{
                  flex: 1,
                  height: item.cpu > 70 ? '24px' : '12px',
                  background: item.cpu > 70 ? 'var(--logdy-coral)' : 'rgba(16, 185, 129, 0.4)',
                  borderRadius: '2px',
                  transition: 'all 0.3s ease'
                }}
                title={`${item.time}: CPU ${item.cpu}%`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Expanded Detailed Time-Series Modal */}
      {expandedMetric && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="feature-box" style={{
            maxWidth: '720px',
            width: '100%',
            background: 'var(--logdy-card-bg)',
            border: '1px solid var(--logdy-orange)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {expandedMetric === 'cpu' && <Cpu size={22} color="var(--logdy-orange)" />}
                {expandedMetric === 'queries' && <Activity size={22} color="var(--logdy-cyan)" />}
                {expandedMetric === 'replication' && <Database size={22} color="var(--logdy-green)" />}
                {expandedMetric === 'safety' && <ShieldCheck size={22} color="var(--logdy-green)" />}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                    {expandedMetric === 'cpu' && 'CockroachDB Cluster CPU Telemetry'}
                    {expandedMetric === 'queries' && 'Active Statements & Transaction Contention'}
                    {expandedMetric === 'replication' && 'Raft Quorum & Range Distribution'}
                    {expandedMetric === 'safety' && 'Go-Agent Safety Whitelist Telemetry'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--logdy-text-muted)' }}>
                    Real-time 60-minute window with automated anomaly bounds
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setExpandedMetric(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--logdy-text-dim)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* High-Resolution Time-Series Chart */}
            <div style={{ width: '100%', height: '240px', margin: '20px 0 10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="time" stroke="var(--logdy-text-dim)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--logdy-text-dim)" fontSize={11} tickLine={false} domain={expandedMetric === 'cpu' ? [0, 100] : [0, 'auto']} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--logdy-code-header)', 
                      border: '1px solid var(--logdy-card-border)',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      color: '#ffffff'
                    }} 
                  />
                  {expandedMetric === 'cpu' && (
                    <>
                      <ReferenceLine y={80} stroke="var(--logdy-coral)" strokeDasharray="3 3" label={{ value: 'Scale Threshold (80%)', fill: 'var(--logdy-coral)', fontSize: 11 }} />
                      <Area type="monotone" dataKey="cpu" stroke="#ff7a00" strokeWidth={2} fill="url(#cpuGrad)" name="CPU %" />
                    </>
                  )}
                  {expandedMetric === 'queries' && (
                    <>
                      <Area type="monotone" dataKey="queries" stroke="#00bcd4" strokeWidth={2} fill="url(#queriesGrad)" name="Queries" />
                    </>
                  )}
                  {expandedMetric === 'replication' && (
                    <Area type="monotone" dataKey="replication" stroke="#10b981" strokeWidth={2} fill="url(#replGrad)" name="Quorum %" />
                  )}
                  {expandedMetric === 'safety' && (
                    <Area type="monotone" dataKey="cpu" stroke="#10b981" strokeWidth={2} fill="url(#replGrad)" name="Activity" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px' }}>
              <div style={{ background: 'var(--logdy-code-bg)', padding: '10px 14px', borderRadius: '6px', fontFamily: 'var(--font-mono)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--logdy-text-dim)' }}>CURRENT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--logdy-text-heading)' }}>
                  {expandedMetric === 'cpu' && `${currentCpu.toFixed(1)}%`}
                  {expandedMetric === 'queries' && `${currentQueries} Active`}
                  {expandedMetric === 'replication' && '100% Quorum'}
                  {expandedMetric === 'safety' && ':5005 Active'}
                </div>
              </div>

              <div style={{ background: 'var(--logdy-code-bg)', padding: '10px 14px', borderRadius: '6px', fontFamily: 'var(--font-mono)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--logdy-text-dim)' }}>PEAK (1 HR)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--logdy-orange)' }}>
                  {expandedMetric === 'cpu' && `${Math.max(...history.map(h => h.cpu)).toFixed(1)}%`}
                  {expandedMetric === 'queries' && `${Math.max(...history.map(h => h.queries))} Active`}
                  {expandedMetric === 'replication' && '100%'}
                  {expandedMetric === 'safety' && '4 Executions'}
                </div>
              </div>

              <div style={{ background: 'var(--logdy-code-bg)', padding: '10px 14px', borderRadius: '6px', fontFamily: 'var(--font-mono)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--logdy-text-dim)' }}>AI AGENT SKILL</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--logdy-cyan)' }}>
                  {expandedMetric === 'cpu' && 'performance-and-scaling'}
                  {expandedMetric === 'queries' && 'query-and-schema-design'}
                  {expandedMetric === 'replication' && 'operations-and-lifecycle'}
                  {expandedMetric === 'safety' && 'ccloud-whitelist-guard'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                onClick={() => setExpandedMetric(null)}
                className="logdy-btn-brand"
                style={{ padding: '8px 18px', fontSize: '0.82rem' }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
