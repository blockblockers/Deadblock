// GlobalBackground.jsx - Fixed with improved sporadic floating pieces animation
// CHANGES:
// 1. Better random distribution of pieces across the grid (not diagonal)
// 2. Pieces appear, move around, and fade in/out sporadically
// 3. Uses staggered animation delays and varied movement patterns
// FIX: Restored original dark background color (#020617 / slate-950)

import { memo, useRef, useEffect, useMemo } from 'react';
import { pieces } from '../utils/pieces';

// Pre-generate piece data with TRULY random positions (not diagonal)
const generatePiecesData = () => {
  const pieceNames = Object.keys(pieces);
  const numPieces = 16; // More pieces for better coverage
  
  // Create a grid-based distribution to ensure good spread
  const gridCols = 4;
  const gridRows = 4;
  const cellWidth = 100 / gridCols;
  const cellHeight = 100 / gridRows;
  
  const result = [];
  
  for (let i = 0; i < numPieces; i++) {
    // Distribute across grid cells with random offset within each cell
    const gridCol = i % gridCols;
    const gridRow = Math.floor(i / gridCols) % gridRows;
    
    // Random position within the grid cell (with some overlap allowed)
    const baseX = gridCol * cellWidth;
    const baseY = gridRow * cellHeight;
    const offsetX = Math.random() * cellWidth * 0.8;
    const offsetY = Math.random() * cellHeight * 0.8;
    
    result.push({
      id: i,
      piece: pieceNames[Math.floor(Math.random() * pieceNames.length)],
      // Position with grid-based distribution + random offset
      startX: baseX + offsetX,
      startY: baseY + offsetY,
      // Longer, staggered delays so pieces appear at different times
      delay: (Math.random() * 15) - (15 / 2), // Negative delays start mid-animation
      // Varied durations for more organic movement
      duration: 12 + Math.random() * 18,
      // Movement pattern - random direction and distance
      floatX: (Math.random() - 0.5) * 100,
      floatY: (Math.random() - 0.5) * 80,
      // Random rotation
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 180,
      // Size variation
      scale: 0.5 + Math.random() * 0.6,
      // Fade timing (staggered appearance)
      fadeOffset: Math.random() * 0.4,
    });
  }
  
  return result;
};

// Static data - generated once
const PIECES_DATA = generatePiecesData();

// Theme color configurations
const THEMES = {
  menu: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },   // cyan
    { color: '#ec4899', glow: 'rgba(236,72,153,0.5)' },   // pink
    { color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },   // purple
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

// Global styles - injected once
// FIX: Restored original solid dark background (#020617 = slate-950)
const GLOBAL_STYLES = `
  .gb-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
    background-color: #020617;
  }
  
  .gb-grid {
    position: absolute;
    inset: 0;
    opacity: 0.25;
    animation: gb-grid-drift 30s ease-in-out infinite;
  }
  
  @keyframes gb-grid-drift {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(10px, 10px); }
  }
  
  .gb-piece {
    position: absolute;
    pointer-events: none;
    will-change: transform, opacity;
  }
`;

// Individual floating piece component with improved animation
const FloatingPiece = memo(({ data, colors }) => {
  const { 
    piece, startX, startY, delay, duration, 
    floatX, floatY, rotation, rotationSpeed, scale, fadeOffset 
  } = data;
  
  const coords = pieces[piece] || pieces.T;
  const minX = Math.min(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  
  // Pick color based on piece index for variety
  const colorIndex = data.id % colors.length;
  const { color, glow } = colors[colorIndex];
  
  // Unique keyframe name for this piece's animation
  const keyframeName = `gb-float-${data.id}`;
  
  return (
    <div
      className="gb-piece"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        filter: `drop-shadow(0 0 10px ${glow})`,
      }}
    >
      <style>{`
        @keyframes ${keyframeName} {
          0% {
            transform: translate(0, 0) rotate(${rotation}deg) scale(${scale});
            opacity: 0;
          }
          ${10 + fadeOffset * 20}% {
            opacity: 0.6;
          }
          25% {
            transform: translate(${floatX * 0.4}px, ${floatY * 0.3}px) rotate(${rotation + rotationSpeed * 0.25}deg) scale(${scale * 1.05});
            opacity: 0.7;
          }
          50% {
            transform: translate(${floatX}px, ${floatY}px) rotate(${rotation + rotationSpeed * 0.5}deg) scale(${scale * 1.1});
            opacity: 0.8;
          }
          75% {
            transform: translate(${floatX * 0.6}px, ${floatY * 1.2}px) rotate(${rotation + rotationSpeed * 0.75}deg) scale(${scale * 1.05});
            opacity: 0.6;
          }
          ${90 - fadeOffset * 10}% {
            opacity: 0.4;
          }
          100% {
            transform: translate(0, 0) rotate(${rotation + rotationSpeed}deg) scale(${scale});
            opacity: 0;
          }
        }
      `}</style>
      <div
        style={{
          animation: `${keyframeName} ${duration}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <div style={{ transform: `scale(${scale})` }}>
          {coords.map(([x, y], idx) => (
            <div
              key={idx}
              className="absolute rounded-sm"
              style={{
                width: 10,
                height: 10,
                left: (x - minX) * 12,
                top: (y - minY) * 12,
                backgroundColor: color,
                boxShadow: `0 0 12px ${glow}`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

FloatingPiece.displayName = 'FloatingPiece';

// Main background component
const GlobalBackground = memo(({ theme = 'menu' }) => {
  const stylesInjectedRef = useRef(false);
  
  // Inject global styles exactly once
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
      
      {/* Floating pieces with sporadic animation */}
      {PIECES_DATA.map(piece => (
        <FloatingPiece key={piece.id} data={piece} colors={colors} />
      ))}
    </div>
  );
});

GlobalBackground.displayName = 'GlobalBackground';

export default GlobalBackground;
