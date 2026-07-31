import React, { useState } from 'react';
import { Search, Loader2, Sparkles, X, BrainCircuit, AlertCircle } from 'lucide-react';
import DecisionCard from './DecisionCard';

const API_BASE = 'http://localhost:4000';

const SUGGESTIONS = [
  "why did you take a backup?",
  "why did you scale up last week?",
  "cpu spike investigation",
  "user requested a new index"
];

export default function MemorySearch({ onApprove, onReject, actionLoadingId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);

  const executeSearch = async (searchQuery) => {
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} search failed`);
      }
      const data = await res.json();
      setResults(data.matches || []);
      setHasSearched(true);
    } catch (err) {
      console.error('Vector memory search error:', err);
      setError(err.message || 'Failed to connect to vector search API');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleChipClick = (suggestion) => {
    setQuery(suggestion);
    executeSearch(suggestion);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setError(null);
  };

  return (
    <div>
      {/* Search Header Banner */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-purple)', marginBottom: '8px' }}>
          <BrainCircuit size={22} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Semantic Vector Memory Search</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Ask natural language questions to query CockroachDB C-SPANN vector cosine distance index (`embedding &lt;-&gt; $1`) over past AI operational reasoning.
        </p>

        {/* Search Input Form */}
        <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: '16px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={20} color="var(--accent-purple)" style={{ position: 'absolute', left: '16px' }} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. why did you take a backup on Tuesday?"
              style={{
                width: '100%',
                padding: '14px 48px 14px 48px',
                background: 'rgba(2, 6, 23, 0.7)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '12px',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                outline: 'none',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)',
                transition: 'all 0.2s ease'
              }}
            />
            {query && (
              <button 
                type="button" 
                onClick={handleClear}
                style={{
                  position: 'absolute',
                  right: '100px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            )}
            <button 
              type="submit" 
              className="btn-glow" 
              disabled={isSearching || !query.trim()}
              style={{
                position: 'absolute',
                right: '8px',
                padding: '8px 16px',
                fontSize: '0.85rem'
              }}
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Search
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Sample Queries:
          </span>
          {SUGGESTIONS.map((chip, idx) => (
            <button 
              key={idx}
              onClick={() => handleChipClick(chip)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.currentTarget.style.color = '#c084fc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              "{chip}"
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
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

      {/* Results Header */}
      {hasSearched && !isSearching && (
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Vector Similarity Matches ({results.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Ordered by vector distance (<code style={{ color: 'var(--accent-purple)' }}>embedding &lt;-&gt; query</code>)
          </span>
        </div>
      )}

      {/* Results Feed */}
      {isSearching ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Loader2 size={36} color="var(--accent-purple)" className="animate-spin" style={{ marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
          <h3>Generating Cohere Embeddings & Vector Search...</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Querying CockroachDB 1024-dim index
          </p>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Search size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h3>No Vector Similarity Matches Found</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            Try rephrasing your question or selecting one of the sample query chips above.
          </p>
        </div>
      ) : (
        results.map((decision, idx) => (
          <div key={decision.id} style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 10,
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#c084fc',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              #{idx + 1} Vector Match
            </div>
            <DecisionCard 
              decision={decision} 
              onApprove={onApprove} 
              onReject={onReject} 
              isActionLoading={actionLoadingId === decision.id}
            />
          </div>
        ))
      )}
    </div>
  );
}
