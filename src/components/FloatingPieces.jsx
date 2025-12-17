// FloatingPieces.jsx - Animated floating pentomino pieces background
// Reusable component with theme support - matches original MenuScreen quality
import { useMemo, useEffect, useState } from 'react';
import { pieces } from '../utils/pieces';

// Color themes for different screens
const THEMES = {
  mixed: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.6)' },   // cyan
    { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },   // pink
    { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },   // purple
    { color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },    // green
    { color: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },   // amber
    { color: '#6366f1', glow: 'rgba(99,102,241,0.6)' },   // indigo
  ],
  online: [
    { color: '#fbbf24', glow: 'rgba(251,191,36,0.7)' },   // amber (primary)
    { color: '#f97316', glow: 'rgba(249,115,22,0.6)' },   // orange
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },   // cyan accent
    { color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },   // purple accent
  ],
  weekly: [
    { color: '#a855f7', glow: 'rgba(168,85,247,0.7)' },   // purple (primary)
    { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },   // pink
    { color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' },   // violet
    { color: '#c084fc', glow: 'rgba(192,132,252,0.5)' },  // light purple
  ],
  puzzle: [
    { color: '#22c55e', glow: 'rgba(34,197,94,0.7)' },    // green (primary)
    { color: '#10b981', glow: 'rgba(16,185,129,0.6)' },   // emerald
    { color: '#14b8a6', glow: 'rgba(20,184,166,0.5)' },   // teal
    { color: '#4ade80', glow: 'rgba(74,222,128,0.5)' },   // light green
  ],
  ai: [
    { color: '#3b82f6', glow: 'rgba(59,130,246,0.7)' },   // blue (primary)
    { color: '#6366f1', glow: 'rgba(99,102,241,0.6)' },   // indigo
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },   // cyan
    { color: '#60a5fa', glow: 'rgba(96,165,250,0.5)' },   // light blue
  ],
  cyan: [
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.6)' },
    { color: '#06b6d4', glow: 'rgba(6,182,212,0.6)' },
    { color: '#0891b2', glow: 'rgba(8,145,178,0.6)' },
    { color: '#67e8f9', glow: 'rgba(103,232,249,0.6)' },
  ],
  amber: [
    { color: '#fbbf24', glow: 'rgba(251,191,36,0.6)' },
    { color: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
    { color: '#d97706', glow: 'rgba(217,119,6,0.6)' },
    { color: '#fcd34d', glow: 'rgba(252,211,77,0.6)' },
  ],
  purple: [
    { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },
    { color: '#9333ea', glow: 'rgba(147,51,234,0.6)' },
    { color: '#7c3aed', glow: 'rgba(124,58,237,0.6)' },
    { color: '#c084fc', glow: 'rgba(192,132,252,0.6)' },
  ],
  green: [
    { color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },
    { color: '#16a34a', glow: 'rgba(22,163,74,0.6)' },
    { color: '#4ade80', glow: 'rgba(74,222,128,0.6)' },
    { color: '#86efac', glow: 'rgba(134,239,172,0.6)' },
  ],
  pink: [
    { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },
    { color: '#db2777', glow: 'rgba(219,39,119,0.6)' },
    { color: '#f472b6', glow: 'rgba(244,114,182,0.6)' },
    { color: '#f9a8d4', glow: 'rgba(249,168,212,0.6)' },
  ],
  red: [
    { color: '#ef4444', glow: 'rgba(239,68,68,0.6)' },
    { color: '#dc2626', glow: 'rgba(220,38,38,0.6)' },
    { color: '#f87171', glow: 'rgba(248,113,113,0.6)' },
    { color: '#fca5a5', glow: 'rgba(252,165,165,0.6)' },
  ],
};

// Single floating piece component with smoother animation
const FloatingPiece = ({ piece, startX, startY, delay, duration, color, glowColor, size, rotation, opacity, floatX, floatY }) => {
  const coords = pieces[piece] || pieces.T;
  const minX = Math.min(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        animation: `float-piece-${Math.round(floatX)}-${Math.round(floatY)} ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transform: `rotate(${rotation}deg)`,
        opacity: opacity,
        willChange: 'transform, opacity',
      }}
    >
      <style>{`
        @keyframes float-piece-${Math.round(floatX)}-${Math.round(floatY)} {
          0%, 100% {
            transform: translate(0, 0) rotate(${rotation}deg);
            opacity: ${opacity};
          }
          25% {
            transform: translate(${floatX * 0.5}px, ${floatY * 0.5}px) rotate(${rotation + 90}deg);
            opacity: ${opacity * 1.2};
          }
          50% {
            transform: translate(${floatX}px, ${floatY}px) rotate(${rotation + 180}deg);
            opacity: ${opacity * 1.3};
          }
          75% {
            transform: translate(${floatX * 0.5}px, ${floatY * 1.5}px) rotate(${rotation + 270}deg);
            opacity: ${opacity * 1.1};
          }
        }
      `}</style>
      <div className="relative" style={{ transform: `scale(${size})` }}>
        {coords.map(([x, y], idx) => (
          <div
            key={idx}
            className="absolute rounded-sm"
            style={{
              width: 8,
              height: 8,
              left: (x - minX) * 10,
              top: (y - minY) * 10,
              backgroundColor: color,
              boxShadow: `0 0 12px ${glowColor}, 0 0 24px ${glowColor}50, inset 0 0 4px rgba(255,255,255,0.3)`,
              animation: `sparkle ${1.5 + Math.random()}s ease-in-out infinite`,
              animationDelay: `${delay + idx * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * FloatingPieces - Animated background with floating pentomino pieces
 * @param {string} theme - Color theme: 'mixed', 'online', 'weekly', 'puzzle', 'ai', 'cyan', 'amber', 'purple', 'green', 'pink', 'red'
 * @param {number} count - Number of floating pieces (default: 12)
 * @param {number} minOpacity - Minimum opacity (default: 0.15)
 * @param {number} maxOpacity - Maximum opacity (default: 0.4)
 */
function FloatingPieces({ 
  theme = 'mixed',
  count = 12,
  minOpacity = 0.15,
  maxOpacity = 0.4,
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
        startX: pseudoRandom(2) * 100,
        startY: pseudoRandom(3) * 100,
        delay: pseudoRandom(4) * 8,
        duration: 18 + pseudoRandom(5) * 12, // Slower, smoother animation
        color: colorSet.color,
        glowColor: colorSet.glow,
        size: 0.6 + pseudoRandom(6) * 0.6,
        rotation: pseudoRandom(7) * 360,
        opacity: minOpacity + pseudoRandom(8) * (maxOpacity - minOpacity),
        floatX: (pseudoRandom(9) - 0.5) * 80, // Reduced movement range
        floatY: (pseudoRandom(10) - 0.5) * 80,
      };
    });
  }, [theme, count, minOpacity, maxOpacity]);

  if (!isReady) return null;

  return (
    <>
      {/* Global sparkle animation */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { 
            opacity: 0.7; 
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
