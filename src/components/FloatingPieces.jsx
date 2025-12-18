// FloatingPieces.jsx - Animated floating pentomino pieces background
// Reusable component with theme support - matches original MenuScreen quality
import { useMemo, useEffect, useState } from 'react';
import { pieces } from '../utils/pieces';

// Color themes for different screens - enhanced visibility
const THEMES = {
  mixed: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.8)' },   // cyan
    { color: '#ec4899', glow: 'rgba(236,72,153,0.8)' },   // pink
    { color: '#a855f7', glow: 'rgba(168,85,247,0.8)' },   // purple
    { color: '#22c55e', glow: 'rgba(34,197,94,0.8)' },    // green
    { color: '#f59e0b', glow: 'rgba(245,158,11,0.8)' },   // amber
    { color: '#6366f1', glow: 'rgba(99,102,241,0.8)' },   // indigo
  ],
  online: [
    { color: '#fbbf24', glow: 'rgba(251,191,36,0.85)' },  // amber (primary)
    { color: '#f97316', glow: 'rgba(249,115,22,0.8)' },   // orange
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.7)' },   // cyan accent
    { color: '#a855f7', glow: 'rgba(168,85,247,0.7)' },   // purple accent
    { color: '#fcd34d', glow: 'rgba(252,211,77,0.75)' },  // yellow
  ],
  weekly: [
    { color: '#a855f7', glow: 'rgba(168,85,247,0.85)' },  // purple (primary)
    { color: '#ec4899', glow: 'rgba(236,72,153,0.8)' },   // pink
    { color: '#8b5cf6', glow: 'rgba(139,92,246,0.8)' },   // violet
    { color: '#c084fc', glow: 'rgba(192,132,252,0.75)' }, // light purple
    { color: '#f472b6', glow: 'rgba(244,114,182,0.7)' },  // light pink
  ],
  puzzle: [
    { color: '#22c55e', glow: 'rgba(34,197,94,0.85)' },   // green (primary)
    { color: '#10b981', glow: 'rgba(16,185,129,0.8)' },   // emerald
    { color: '#14b8a6', glow: 'rgba(20,184,166,0.75)' },  // teal
    { color: '#4ade80', glow: 'rgba(74,222,128,0.7)' },   // light green
    { color: '#34d399', glow: 'rgba(52,211,153,0.75)' },  // emerald light
  ],
  ai: [
    { color: '#3b82f6', glow: 'rgba(59,130,246,0.85)' },  // blue (primary)
    { color: '#6366f1', glow: 'rgba(99,102,241,0.8)' },   // indigo
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.75)' },  // cyan
    { color: '#60a5fa', glow: 'rgba(96,165,250,0.7)' },   // light blue
    { color: '#818cf8', glow: 'rgba(129,140,248,0.75)' }, // indigo light
  ],
  game: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.85)' },  // cyan (primary)
    { color: '#06b6d4', glow: 'rgba(6,182,212,0.8)' },    // cyan dark
    { color: '#a855f7', glow: 'rgba(168,85,247,0.7)' },   // purple accent
    { color: '#67e8f9', glow: 'rgba(103,232,249,0.75)' }, // cyan light
    { color: '#38bdf8', glow: 'rgba(56,189,248,0.75)' },  // sky
  ],
  cyan: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.8)' },
    { color: '#06b6d4', glow: 'rgba(6,182,212,0.8)' },
    { color: '#0891b2', glow: 'rgba(8,145,178,0.8)' },
    { color: '#67e8f9', glow: 'rgba(103,232,249,0.8)' },
  ],
  amber: [
    { color: '#fbbf24', glow: 'rgba(251,191,36,0.8)' },
    { color: '#f59e0b', glow: 'rgba(245,158,11,0.8)' },
    { color: '#d97706', glow: 'rgba(217,119,6,0.8)' },
    { color: '#fcd34d', glow: 'rgba(252,211,77,0.8)' },
  ],
  purple: [
    { color: '#a855f7', glow: 'rgba(168,85,247,0.8)' },
    { color: '#9333ea', glow: 'rgba(147,51,234,0.8)' },
    { color: '#7c3aed', glow: 'rgba(124,58,237,0.8)' },
    { color: '#c084fc', glow: 'rgba(192,132,252,0.8)' },
  ],
  green: [
    { color: '#22c55e', glow: 'rgba(34,197,94,0.8)' },
    { color: '#16a34a', glow: 'rgba(22,163,74,0.8)' },
    { color: '#4ade80', glow: 'rgba(74,222,128,0.8)' },
    { color: '#86efac', glow: 'rgba(134,239,172,0.8)' },
  ],
  pink: [
    { color: '#ec4899', glow: 'rgba(236,72,153,0.8)' },
    { color: '#db2777', glow: 'rgba(219,39,119,0.8)' },
    { color: '#f472b6', glow: 'rgba(244,114,182,0.8)' },
    { color: '#f9a8d4', glow: 'rgba(249,168,212,0.8)' },
  ],
  red: [
    { color: '#ef4444', glow: 'rgba(239,68,68,0.8)' },
    { color: '#dc2626', glow: 'rgba(220,38,38,0.8)' },
    { color: '#f87171', glow: 'rgba(248,113,113,0.8)' },
    { color: '#fca5a5', glow: 'rgba(252,165,165,0.8)' },
  ],
};

// Single floating piece component with smoother animation
const FloatingPiece = ({ piece, startX, startY, delay, duration, color, glowColor, size, rotation, opacity, floatX, floatY }) => {
  const coords = pieces[piece] || pieces.T;
  const minX = Math.min(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  
  // Create unique keyframe name
  const keyframeName = `float-${Math.abs(Math.round(floatX * 10))}-${Math.abs(Math.round(floatY * 10))}-${Math.round(rotation)}`;
  
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        animation: `${keyframeName} ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        opacity: opacity,
        willChange: 'transform, opacity',
        filter: `drop-shadow(0 0 8px ${glowColor})`,
      }}
    >
      <style>{`
        @keyframes ${keyframeName} {
          0%, 100% {
            transform: translate(0, 0) rotate(${rotation}deg) scale(1);
          }
          25% {
            transform: translate(${floatX * 0.6}px, ${floatY * 0.4}px) rotate(${rotation + 45}deg) scale(1.05);
          }
          50% {
            transform: translate(${floatX}px, ${floatY}px) rotate(${rotation + 90}deg) scale(1.1);
          }
          75% {
            transform: translate(${floatX * 0.4}px, ${floatY * 0.8}px) rotate(${rotation + 135}deg) scale(1.05);
          }
        }
      `}</style>
      <div className="relative" style={{ transform: `scale(${size})` }}>
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
              boxShadow: `0 0 15px ${glowColor}, 0 0 30px ${glowColor}60, inset 0 0 6px rgba(255,255,255,0.4)`,
              animation: `sparkle-piece ${1.5 + (idx * 0.2)}s ease-in-out infinite`,
              animationDelay: `${delay + idx * 0.15}s`,
              border: `1px solid rgba(255,255,255,0.3)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * FloatingPieces - Animated background with floating pentomino pieces
 * @param {string} theme - Color theme: 'mixed', 'online', 'weekly', 'puzzle', 'ai', 'game', 'cyan', 'amber', 'purple', 'green', 'pink', 'red'
 * @param {number} count - Number of floating pieces (default: 15)
 * @param {number} minOpacity - Minimum opacity (default: 0.25)
 * @param {number} maxOpacity - Maximum opacity (default: 0.55)
 */
function FloatingPieces({ 
  theme = 'mixed',
  count = 15,
  minOpacity = 0.25,
  maxOpacity = 0.55,
}) {
  // Add a small delay before rendering to prevent hydration issues
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const floatingPieces = useMemo(() => {
    const pieceNames = Object.keys(pieces);
    const colors = THEMES[theme] || THEMES.mixed;
    
    return Array.from({ length: count }).map((_, i) => {
      const colorSet = colors[i % colors.length];
      // Use seeded random for consistent positions
      const seed = i * 1.618033988749895; // Golden ratio for distribution
      const pseudoRandom = (n) => ((Math.sin(seed * n) + 1) / 2);
      
      return {
        id: i,
        piece: pieceNames[Math.floor(pseudoRandom(1) * pieceNames.length)],
        startX: pseudoRandom(2) * 95 + 2.5, // Keep away from edges
        startY: pseudoRandom(3) * 90 + 5,
        delay: pseudoRandom(4) * 6,
        duration: 20 + pseudoRandom(5) * 15, // Slower, smoother animation
        color: colorSet.color,
        glowColor: colorSet.glow,
        size: 0.7 + pseudoRandom(6) * 0.5, // Larger pieces
        rotation: pseudoRandom(7) * 360,
        opacity: minOpacity + pseudoRandom(8) * (maxOpacity - minOpacity),
        floatX: (pseudoRandom(9) - 0.5) * 60, // Movement range
        floatY: (pseudoRandom(10) - 0.5) * 60,
      };
    });
  }, [theme, count, minOpacity, maxOpacity]);

  if (!isReady) return null;

  return (
    <>
      {/* Global sparkle animation */}
      <style>{`
        @keyframes sparkle-piece {
          0%, 100% { 
            opacity: 0.8; 
            transform: scale(1);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.15);
          }
        }
      `}</style>
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {floatingPieces.map((p) => (
          <FloatingPiece key={p.id} {...p} />
        ))}
      </div>
    </>
  );
}

export default FloatingPieces;
