// GlobalBackground.jsx - Animated floating pieces background
// v7.12: Fixed initial animation stutter with preloading
// 
// FIXES:
// 1. Pre-generate ALL keyframes at module load (not in component)
// 2. Inject styles synchronously before first paint
// 3. Use CSS animation-delay with negative values for instant start
// 4. Add will-change hints for GPU acceleration
// 5. Fade in the container to hide any remaining jank

import { memo, useRef, useEffect, useState } from 'react';
import { pieces } from '../utils/pieces';

// ============================================================================
// PRE-GENERATE ALL DATA AT MODULE LOAD (runs once when JS is parsed)
// ============================================================================

const NUM_PIECES = 16;
const PIECE_NAMES = Object.keys(pieces);

// Pre-generate piece data with grid-based distribution
const generatePiecesData = () => {
  const gridCols = 4;
  const gridRows = 4;
  const cellWidth = 100 / gridCols;
  const cellHeight = 100 / gridRows;
  
  const result = [];
  
  for (let i = 0; i < NUM_PIECES; i++) {
    const gridCol = i % gridCols;
    const gridRow = Math.floor(i / gridCols) % gridRows;
    
    const baseX = gridCol * cellWidth;
    const baseY = gridRow * cellHeight;
    // Use seeded pseudo-random for consistent results
    const seed = i * 1.618033988749895;
    const rand = (n) => ((Math.sin(seed * n) + 1) / 2);
    
    const offsetX = rand(1) * cellWidth * 0.8;
    const offsetY = rand(2) * cellHeight * 0.8;
    
    result.push({
      id: i,
      piece: PIECE_NAMES[Math.floor(rand(3) * PIECE_NAMES.length)],
      startX: baseX + offsetX,
      startY: baseY + offsetY,
      // Negative delays = start mid-animation (no waiting)
      delay: (rand(4) * 15) - 7.5,
      duration: 12 + rand(5) * 18,
      floatX: (rand(6) - 0.5) * 100,
      floatY: (rand(7) - 0.5) * 80,
      rotation: rand(8) * 360,
      rotationSpeed: (rand(9) - 0.5) * 180,
      scale: 0.5 + rand(10) * 0.6,
      fadeOffset: rand(11) * 0.4,
    });
  }
  
  return result;
};

// Static data - generated ONCE at module load
const PIECES_DATA = generatePiecesData();

// Theme configurations
const THEMES = {
  menu: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },
    { color: '#ec4899', glow: 'rgba(236,72,153,0.5)' },
    { color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
  ],
  online: [
    { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
    { color: '#f97316', glow: 'rgba(249,115,22,0.5)' },
    { color: '#eab308', glow: 'rgba(234,179,8,0.5)' },
  ],
  game: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },
    { color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
    { color: '#6366f1', glow: 'rgba(99,102,241,0.5)' },
  ],
  puzzle: [
    { color: '#10b981', glow: 'rgba(16,185,129,0.5)' },
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },
    { color: '#14b8a6', glow: 'rgba(20,184,166,0.5)' },
  ],
  auth: [
    { color: '#6366f1', glow: 'rgba(99,102,241,0.5)' },
    { color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' },
    { color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
  ],
};

// ============================================================================
// PRE-GENERATE ALL KEYFRAMES (runs once at module load)
// ============================================================================

const generateAllKeyframes = () => {
  let keyframes = '';
  
  PIECES_DATA.forEach((data) => {
    const { id, floatX, floatY, rotation, rotationSpeed, scale, fadeOffset } = data;
    
    keyframes += `
      @keyframes gb-float-${id} {
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
    `;
  });
  
  return keyframes;
};

// Pre-generate ALL keyframes at module load
const ALL_KEYFRAMES = generateAllKeyframes();

// Complete global styles including all keyframes
const GLOBAL_STYLES = `
  .gb-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
    background-color: #020617;
    /* Fade in to hide any remaining initialization jank */
    animation: gb-fade-in 0.3s ease-out forwards;
  }
  
  @keyframes gb-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .gb-grid {
    position: absolute;
    inset: 0;
    opacity: 0.25;
    animation: gb-grid-drift 30s ease-in-out infinite;
    /* GPU acceleration */
    will-change: transform;
    transform: translateZ(0);
  }
  
  @keyframes gb-grid-drift {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(10px, 10px); }
  }
  
  .gb-piece {
    position: absolute;
    pointer-events: none;
    /* GPU acceleration - critical for smooth animation */
    will-change: transform, opacity;
    transform: translateZ(0);
    backface-visibility: hidden;
  }
  
  .gb-piece-inner {
    /* GPU acceleration */
    will-change: transform, opacity;
    transform: translateZ(0);
  }
  
  .gb-cell {
    position: absolute;
    border-radius: 2px;
    /* GPU acceleration */
    transform: translateZ(0);
  }
  
  /* All piece keyframes */
  ${ALL_KEYFRAMES}
`;

// ============================================================================
// INJECT STYLES IMMEDIATELY (synchronous, before any render)
// ============================================================================

const STYLE_ID = 'gb-preload-styles';

// This runs synchronously when the module is imported
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = GLOBAL_STYLES;
  // Append to head immediately
  if (document.head) {
    document.head.appendChild(styleEl);
  } else {
    // Fallback: wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
      document.head.appendChild(styleEl);
    }, { once: true });
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Individual floating piece - memoized for performance
const FloatingPiece = memo(({ data, colors }) => {
  const { 
    id, piece, startX, startY, delay, duration, scale 
  } = data;
  
  const coords = pieces[piece] || pieces.T;
  const minX = Math.min(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  
  const colorIndex = id % colors.length;
  const { color, glow } = colors[colorIndex];
  
  return (
    <div
      className="gb-piece"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        filter: `drop-shadow(0 0 10px ${glow})`,
      }}
    >
      <div
        className="gb-piece-inner"
        style={{
          animation: `gb-float-${id} ${duration}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
          transform: `scale(${scale})`,
        }}
      >
        {coords.map(([x, y], idx) => (
          <div
            key={idx}
            className="gb-cell"
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
  );
});

FloatingPiece.displayName = 'FloatingPiece';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GlobalBackground = memo(({ theme = 'menu' }) => {
  // Small delay to ensure everything is ready (prevents any remaining jank)
  const [isReady, setIsReady] = useState(false);
  const hasRenderedRef = useRef(false);
  
  useEffect(() => {
    // Use requestAnimationFrame to wait for next paint
    // This ensures styles are fully parsed before we show content
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReady(true);
        });
      });
    }
  }, []);
  
  const colors = THEMES[theme] || THEMES.menu;
  const gridColor = colors[0]?.glow || 'rgba(34,211,238,0.3)';
  
  // Render container immediately (with fade-in animation)
  // but only show pieces after styles are ready
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
      
      {/* Floating pieces - render after ready */}
      {isReady && PIECES_DATA.map(data => (
        <FloatingPiece key={data.id} data={data} colors={colors} />
      ))}
    </div>
  );
});

GlobalBackground.displayName = 'GlobalBackground';

export default GlobalBackground;
