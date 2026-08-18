import React from 'react';

export default function CortexOpsLogo({ size = 22, className = '', style = {} }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="CortexOps Logo"
    >
      {/* Terminal Command Chevron & Prompt Base */}
      <path 
        d="M4.5 5.5L10.5 11.5L4.5 17.5" 
        stroke="var(--logdy-orange)" 
        strokeWidth="2.2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M11 18.5H19" 
        stroke="var(--logdy-orange)" 
        strokeWidth="2.2" 
        strokeLinecap="round"
      />
      
      {/* Synaptic Neural Vector Lines */}
      <line 
        x1="10.5" 
        y1="11.5" 
        x2="14" 
        y2="6.5" 
        stroke="var(--logdy-cyan)" 
        strokeWidth="1.4" 
        strokeDasharray="2 2"
        strokeOpacity="0.9"
      />
      <line 
        x1="14" 
        y1="6.5" 
        x2="19.5" 
        y2="10.5" 
        stroke="var(--logdy-cyan)" 
        strokeWidth="1.4"
        strokeOpacity="0.8"
      />

      {/* Neural Synaptic Nodes */}
      <circle cx="14" cy="6.5" r="2.2" fill="var(--logdy-cyan)" />
      <circle cx="19.5" cy="10.5" r="1.6" fill="var(--logdy-cyan)" />
      <circle cx="14" cy="6.5" r="0.9" fill="#ffffff" />
    </svg>
  );
}
