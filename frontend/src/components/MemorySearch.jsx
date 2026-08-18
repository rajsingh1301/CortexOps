import React, { useState } from 'react';
import { Search, Loader2, Sparkles, X, BrainCircuit, AlertCircle, Sparkle } from 'lucide-react';
import DecisionCard from './DecisionCard';

const API_BASE = 'http://localhost:4000';

const SUGGESTIONS = [
  "why did you take a backup?",
  "why did you scale up last time?",
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
      <div className="feature-box" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--logdy-cyan)', marginBottom: '8px' }}>
          <BrainCircuit size={22} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--logdy-text-heading)' }}>
            Semantic Vector Memory Search
          </h2>
        </div>
        <p style={{ color: 'var(--logdy-text-muted)', fontSize: '0.88rem', marginBottom: '18px', lineHeight: '1.5' }}>
          Ask natural language questions to query CockroachDB C-SPANN vector cosine distance index (<code className="mono cyan">embedding &lt;-&gt; $1</code>) over past AI operational reasoning.
        </p>

        {/* Search Input Form */}
        <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: '14px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <Search size={18} color="var(--logdy-cyan)" style={{ position: 'absolute', left: '14px', pointerEvents: 'none', flexShrink: 0 }} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask why the agent made a decision (e.g. why did you scale up?)..."
              style={{
                width: '100%',
                padding: '12px 100px 12px 42px',
                background: 'var(--logdy-code-bg)',
                border: '1px solid var(--logdy-card-border)',
                borderRadius: '8px',
                color: 'var(--logdy-text-main)',
                fontSize: '0.88rem',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                transition: 'all 0.2s ease',
                minWidth: 0
              }}
            />
            {query && (
              <button 
                type="button" 
                onClick={handleClear}
                style={{
                  position: 'absolute',
                  right: '84px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--logdy-text-dim)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={15} />
              </button>
            )}
            <button 
              type="submit" 
              className="logdy-btn-brand"
              disabled={isSearching || !query.trim()}
              style={{
                position: 'absolute',
                right: '5px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                gap: '5px',
                whiteSpace: 'nowrap'
              }}
            >
              {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Search
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--logdy-text-dim)', fontWeight: 600, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            Try asking:
          </span>
          {SUGGESTIONS.map((chip, idx) => (
            <button 
              key={idx} 
              onClick={() => handleChipClick(chip)}
              className="copy-pill-btn"
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '4px',
                whiteSpace: 'normal',
                textAlign: 'left'
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
          background: 'rgba(220, 38, 38, 0.1)', 
          border: '1px solid rgba(220, 38, 38, 0.3)', 
          padding: '12px 16px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          color: 'var(--logdy-coral)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowWrap: 'break-word'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* Results Header */}
      {hasSearched && !isSearching && (
        <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--logdy-text-heading)', fontFamily: 'var(--font-mono)' }}>
            Vector Similarity Matches ({results.length})
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--logdy-text-dim)', fontFamily: 'var(--font-mono)' }}>
            Ranked by vector cosine distance (<code className="cyan">embedding &lt;-&gt; query</code>)
          </span>
        </div>
      )}

      {/* Results Feed */}
      {isSearching ? (
        <div className="feature-box" style={{ padding: '40px', textAlign: 'center' }}>
          <Loader2 size={32} color="var(--logdy-cyan)" className="animate-spin" style={{ marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ color: 'var(--logdy-text-heading)', fontSize: '1rem' }}>Generating Cohere Embeddings & Vector Search...</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--logdy-text-muted)', marginTop: '4px' }}>
            Querying CockroachDB 1024-dim C-SPANN index
          </p>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="feature-box" style={{ padding: '40px', textAlign: 'center', color: 'var(--logdy-text-muted)' }}>
          <Search size={32} color="var(--logdy-text-dim)" style={{ marginBottom: '12px' }} />
          <h3 style={{ color: 'var(--logdy-text-heading)', fontSize: '1rem' }}>No Vector Similarity Matches Found</h3>
          <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
            Try rephrasing your question or selecting one of the sample query chips above.
          </p>
        </div>
      ) : (
        results.map((decision, idx) => (
          <div key={decision.id} style={{ marginBottom: '18px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              background: 'rgba(0, 188, 212, 0.12)',
              border: '1px solid rgba(0, 188, 212, 0.3)',
              color: 'var(--logdy-cyan)',
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700
            }}>
              <Sparkles size={12} /> #{idx + 1} Vector Semantic Match
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
