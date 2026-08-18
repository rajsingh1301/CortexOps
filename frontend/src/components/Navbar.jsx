import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function GithubIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function SunIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Navbar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--logdy-border)',
      background: 'var(--logdy-nav-bg)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '12px clamp(12px, 3vw, 24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px'
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🪲</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
            fontWeight: '700',
            color: 'var(--logdy-text-heading)',
            whiteSpace: 'nowrap'
          }}>
            CortexOps
          </span>
          <span style={{
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--logdy-orange)',
            background: 'rgba(255, 122, 0, 0.12)',
            padding: '1px 5px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 122, 0, 0.3)',
            whiteSpace: 'nowrap'
          }}>v1.2.0</span>
        </Link>

        {/* Navigation Links + Theme Toggle + GitHub */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 18px)', flexShrink: 0 }}>
          <Link
            to="/"
            style={{
              fontSize: '0.86rem',
              fontWeight: isActive('/') ? '700' : '500',
              color: isActive('/') ? 'var(--logdy-orange)' : 'var(--logdy-text-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Home
          </Link>

          <Link
            to="/docs"
            style={{
              fontSize: '0.86rem',
              fontWeight: isActive('/docs') ? '700' : '500',
              color: isActive('/docs') ? 'var(--logdy-orange)' : 'var(--logdy-text-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Docs
          </Link>

          <Link
            to="/dashboard"
            style={{
              fontSize: '0.86rem',
              fontWeight: isActive('/dashboard') ? '700' : '500',
              color: isActive('/dashboard') ? 'var(--logdy-orange)' : 'var(--logdy-text-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Dashboard
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
            style={{ padding: '5px 8px', flexShrink: 0 }}
          >
            {theme === 'dark' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
          </button>

          {/* GitHub Link */}
          <a
            href="https://github.com/rajsingh1301/CortexOps"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--logdy-text-muted)',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
              flexShrink: 0
            }}
            title="GitHub Repository"
          >
            <GithubIcon size={17} />
          </a>
        </div>
      </div>
    </header>
  );
}
