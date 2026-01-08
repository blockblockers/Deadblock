// GlobalBackground.jsx - Persistent animated background that doesn't remount between screens
// Uses CSS custom properties to avoid re-parsing keyframes on navigation
// This component renders ONCE at the App level and persists across all screen changes
// FIX: Added bg-slate-950 base color so screens can be transparent

import { memo, useEffect, useRef } from 'react';
import { pieces } from '../utils/pieces';

// Piece types to use - FIXED: Only valid pentomino pieces (removed O, S, J which are Tetris pieces)
const PIECE_TYPES = ['I', 'T', 'L', 'P', 'F', 'N', 'U', 'V', 'W', 'X', 'Y', 'Z'];

// Color themes for different screens
const THEMES = {
  menu: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },   // cyan
    { color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },   // purple
    { color: '#ec4899', glow: 'rgba(236,72,153,0.5)' },   // pink
  ],
  online: [
    { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },   // amber
    { color: '#f97316', glow: 'rgba(249,115,22,0.5)' },   // orange
    { color: '#eab308', glow: 'rgba(234,179,8,0.5)' },    // yellow
  ],
  game: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },   // cyan
    { color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },   // purple
    { color: '#6366f1', glow: 'rgba(99,102,241,0.5)' },   // indigo
  ],
  puzzle: [
    { color: '#10b981', glow: 'rgba(16,185,129,0.5)' },   // green
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },   // cyan
    { color: '#14b8a6', glow: 'rgba(20,184,166,0.5)' },   // teal
  ],
  auth: [
    { color: '#6366f1', glow: 'rgba(99,102,241,0.5)' },   // indigo
    { color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' },   // violet
    { color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },   // purple
  ],
};

// Global CSS - injected once into document head
// Using CSS custom properties allows animation to continue without re-parsing
const GLOBAL_STYLES = `
  @keyframes gbFloat {
    0%, 100% {
      transform: translate(0, 0) rotate(var(--gb-rot)) scale(1);
      opacity: 0.4;
    }
    25% {
      transform: translate(calc(var(--gb-fx) * 0.6), calc(var(--gb-fy) * 0.4)) rotate(calc(var(--gb-rot) + 45deg)) scale(1.05);
      opacity: 0.6;
    }
    50% {
      transform: translate(var(--gb-fx), var(--gb-fy)) rotate(calc(var(--gb-rot) + 90deg)) scale(1.1);
      opacity: 0.7;
    }
    75% {
      transform: translate(calc(var(--gb-fx) * 0.4), calc(var(--gb-fy) * 0.8)) rotate(calc(var(--gb-rot) + 135deg)) scale(1.05);
      opacity: 0.6;
    }
  }
  
  .gb-piece {
    position: absolute;
    pointer-events: none;
    animation: gbFloat var(--gb-dur) ease-in-out infinite;
    animation-delay: var(--gb-delay);
    will-change: transform, opacity;
  }
  
  .gb-cell {
    position: absolute;
    border-radius: 2px;
    transition: background-color 0.8s ease, box-shadow 0.8s ease;
  }
  
  .gb-grid {
    position: absolute;
    inset: 0;
    opacity: 0.25;
    transition: background-image 0.8s ease;
  }
  
  .gb-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
    background-color: #020617; /* bg-slate-950 - provides dark base */
  }
`;

// Generate stable pieces data once - uses deterministic "randomness"
const generatePiecesData = (count) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 7919; // Prime for distribution
    const rand = (offset) => ((seed + offset * 13) % 1000) / 1000;
    
    data.push({
      id: i,
      piece: PIECE_TYPES[i % PIECE_TYPES.length],
      startX: rand(1) * 100,
      startY: rand(2) * 100,
      size: 0.6 + rand(3) * 0.8,
      duration: 20 + rand(4) * 25,
      delay: -rand(5) * 30, // Negative = start mid-animation
      rotation: rand(6) * 360,
      floatX: (rand(7) - 0.5) * 60,
      floatY: (rand(8) - 0.5) * 60,
      colorIndex: i % 3,
    });
  }
  return data;
};

// Pre-generate pieces data at module level (truly static)
const PIECES_DATA = generatePiecesData(15);

// Single floating piece - uses CSS custom properties for animation
const FloatingPiece = memo(({ data, colors }) => {
  const { piece, startX, startY, size, duration, delay, rotation, floatX, floatY, colorIndex } = data;
  const coords = pieces[piece] || pieces.T;
  const minX = Math.min(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  
  const color = colors[colorIndex]?.color || '#22d3ee';
  const glow = colors[colorIndex]?.glow || 'rgba(34,211,238,0.5)';
  
  return (
    <div
      className="gb-piece"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        '--gb-rot': `${rotation}deg`,
        '--gb-fx': `${floatX}px`,
        '--gb-fy': `${floatY}px`,
        '--gb-dur': `${duration}s`,
        '--gb-delay': `${delay}s`,
        filter: `drop-shadow(0 0 8px ${glow})`,
      }}
    >
      <div style={{ transform: `scale(${size})`, position: 'relative' }}>
        {coords.map(([x, y], idx) => (
          <div
            key={idx}
            className="gb-cell"
            style={{
              width: 8,
              height: 8,
              left: (x - minX) * 10,
              top: (y - minY) * 10,
              backgroundColor: color,
              boxShadow: `0 0 12px ${glow}`,
            }}
          />
        ))}
      </div>
    </div>
  );
});

FloatingPiece.displayName = 'FloatingPiece';

// Main background component - renders once, updates colors via props
const GlobalBackground = memo(({ theme = 'menu' }) => {
  const stylesInjectedRef = useRef(false);
  
  // Inject global styles exactly once (survives across renders)
  useEffect(() => {
    if (stylesInjectedRef.current) return;
    if (document.getElementById('gb-styles')) {
      stylesInjectedRef.current = true;
      return;
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'gb-styles';
    styleEl.textContent = GLOBAL_STYLES;
    document.head.appendChild(styleEl);
    stylesInjectedRef.current = true;
  }, []);
  
  // Get colors for current theme
  const colors = THEMES[theme] || THEMES.menu;
  const gridColor = colors[0]?.glow || 'rgba(34,211,238,0.3)';
  
  return (
    <div className="gb-container">
      {/* Grid background */}
      <div 
        className="gb-grid"
        style={{
          backgroundImage: `
            linear-gradient(${gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* Floating pieces - use pre-generated static data */}
      {PIECES_DATA.map(piece => (
        <FloatingPiece key={piece.id} data={piece} colors={colors} />
      ))}
    </div>
  );
});

GlobalBackground.displayName = 'GlobalBackground';

export default GlobalBackground;
