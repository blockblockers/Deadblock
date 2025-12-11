// FloatingPiecesBackground - Reusable animated background with floating pentomino pieces
// Use this component on any menu screen to add the animated block background

import { useMemo, memo } from 'react';
import { pieces } from '../utils/pieces';

// Individual floating piece component
const FloatingPiece = memo(({ piece, startX, startY, delay, duration, color, glowColor, size, rotation }) => {
  const coords = pieces[piece] || pieces.T;
  const minX = Math.min(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  
  return (
    <div
      className="absolute pointer-events-none animate-float-piece"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        transform: `rotate(${rotation}deg)`,
        '--float-x': `${(Math.random() - 0.5) * 100}px`,
        '--float-y': `${(Math.random() - 0.5) * 100}px`,
      }}
    >
      <div className="relative" style={{ transform: `scale(${size})` }}>
        {coords.map(([x, y], idx) => (
          <div
            key={idx}
            className="absolute rounded-sm animate-sparkle"
            style={{
              width: 8,
              height: 8,
              left: (x - minX) * 10,
              top: (y - minY) * 10,
              backgroundColor: color,
              boxShadow: `0 0 12px ${glowColor}, 0 0 24px ${glowColor}50`,
              animationDelay: `${delay + idx * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
});

FloatingPiece.displayName = 'FloatingPiece';

// Default color sets - can be overridden via props
const DEFAULT_COLORS = [
  { color: '#22d3ee', glow: 'rgba(34,211,238,0.6)' },   // cyan
  { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },   // pink
  { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },   // purple
  { color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },    // green
  { color: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },   // amber
  { color: '#6366f1', glow: 'rgba(99,102,241,0.6)' },   // indigo
];

// Speed/puzzle mode themed colors
const SPEED_COLORS = [
  { color: '#ef4444', glow: 'rgba(239,68,68,0.6)' },    // red
  { color: '#f97316', glow: 'rgba(249,115,22,0.6)' },   // orange
  { color: '#fbbf24', glow: 'rgba(251,191,36,0.6)' },   // amber
  { color: '#ef4444', glow: 'rgba(239,68,68,0.6)' },    // red
  { color: '#f97316', glow: 'rgba(249,115,22,0.6)' },   // orange
  { color: '#fbbf24', glow: 'rgba(251,191,36,0.6)' },   // amber
];

const GREEN_COLORS = [
  { color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },    // green
  { color: '#10b981', glow: 'rgba(16,185,129,0.6)' },   // emerald
  { color: '#84cc16', glow: 'rgba(132,204,22,0.6)' },   // lime
  { color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },
  { color: '#10b981', glow: 'rgba(16,185,129,0.6)' },
  { color: '#84cc16', glow: 'rgba(132,204,22,0.6)' },
];

const PURPLE_COLORS = [
  { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },   // purple
  { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },   // pink
  { color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' },   // violet
  { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },
  { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },
  { color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' },
];

// Export color presets for convenience
export const COLOR_PRESETS = {
  default: DEFAULT_COLORS,
  speed: SPEED_COLORS,
  green: GREEN_COLORS,
  purple: PURPLE_COLORS,
};

/**
 * FloatingPiecesBackground - Animated pentomino pieces floating in the background
 * 
 * @param {number} count - Number of floating pieces (default: 12)
 * @param {Array} colors - Array of {color, glow} objects (default: DEFAULT_COLORS)
 * @param {string} colorPreset - Use a preset: 'default', 'speed', 'green', 'purple'
 * @param {number} minSize - Minimum piece scale (default: 0.6)
 * @param {number} maxSize - Maximum piece scale (default: 1.2)
 * @param {number} minDuration - Minimum animation duration in seconds (default: 15)
 * @param {number} maxDuration - Maximum animation duration in seconds (default: 25)
 */
const FloatingPiecesBackground = memo(({ 
  count = 12,
  colors = null,
  colorPreset = 'default',
  minSize = 0.6,
  maxSize = 1.2,
  minDuration = 15,
  maxDuration = 25,
}) => {
  const colorSet = colors || COLOR_PRESETS[colorPreset] || DEFAULT_COLORS;
  
  const floatingPieces = useMemo(() => {
    const pieceNames = Object.keys(pieces);
    
    return Array.from({ length: count }).map((_, i) => {
      const colorChoice = colorSet[i % colorSet.length];
      return {
        id: i,
        piece: pieceNames[Math.floor(Math.random() * pieceNames.length)],
        startX: Math.random() * 100,
        startY: Math.random() * 100,
        delay: Math.random() * 8,
        duration: minDuration + Math.random() * (maxDuration - minDuration),
        color: colorChoice.color,
        glowColor: colorChoice.glow,
        size: minSize + Math.random() * (maxSize - minSize),
        rotation: Math.random() * 360,
      };
    });
  }, [count, colorSet, minSize, maxSize, minDuration, maxDuration]);

  return (
    <>
      {/* Animation keyframes - only include once */}
      <style>{`
        @keyframes float-piece {
          0% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 0;
          }
          10% { opacity: 0.6; }
          50% { 
            transform: translate(var(--float-x), var(--float-y)) rotate(180deg);
            opacity: 0.8;
          }
          90% { opacity: 0.6; }
          100% { 
            transform: translate(calc(var(--float-x) * 2), calc(var(--float-y) * 2)) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes sparkle {
          0%, 100% { 
            opacity: 0.4; 
            box-shadow: 0 0 8px currentColor, 0 0 16px currentColor;
          }
          50% { 
            opacity: 1; 
            box-shadow: 0 0 16px currentColor, 0 0 32px currentColor, 0 0 48px currentColor;
          }
        }
        .animate-float-piece { 
          animation: float-piece var(--duration, 20s) ease-in-out infinite; 
        }
        .animate-sparkle { 
          animation: sparkle 2s ease-in-out infinite; 
        }
      `}</style>
      
      {/* Floating pieces container */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {floatingPieces.map((p) => (
          <FloatingPiece key={p.id} {...p} />
        ))}
      </div>
    </>
  );
});

FloatingPiecesBackground.displayName = 'FloatingPiecesBackground';

export default FloatingPiecesBackground;
