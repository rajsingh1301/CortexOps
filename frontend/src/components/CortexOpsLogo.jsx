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
      aria-label="CortexOps Cluster Sentinel Logo"
    >
      {/* Outer Hexagonal Distributed Cluster Mesh */}
      <path 
        d="M12 2.5L20.5 7.5V16.5L12 21.5L3.5 16.5V7.5L12 2.5Z" 
        stroke="var(--logdy-cyan)" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      {/* Internal Distributed Raft Synaptic Nodes */}
      <path 
        d="M12 2.5V8.5M20.5 16.5L15 13.5M3.5 16.5L9 13.5" 
        stroke="var(--logdy-cyan)" 
        strokeWidth="1.5" 
        strokeLinecap="round"
        strokeOpacity="0.8"
      />

      {/* Cluster Node Vertices */}
      <circle cx="12" cy="2.5" r="1.2" fill="var(--logdy-cyan)" />
      <circle cx="20.5" cy="16.5" r="1.2" fill="var(--logdy-cyan)" />
      <circle cx="3.5" cy="16.5" r="1.2" fill="var(--logdy-cyan)" />

      {/* Central AI Decision & Ops Sentinel Core */}
      <polygon 
        points="12,8.5 15.5,14 8.5,14" 
        fill="var(--logdy-orange)"
      />
      <circle cx="12" cy="12.2" r="1.2" fill="#ffffff" />
    </svg>
  );
}
