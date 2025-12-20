// FloatingPiecesBackground - Reusable animated background with floating pentomino pieces
// Use this component on any game/menu screen to add the animated block background

import { useMemo, memo, useState, useEffect } from 'react';
import { pieces } from '../utils/pieces';

// Individual floating piece component
const FloatingPiece = memo(({ piece, startX, startY, delay, duration, color, glowColor, size, rotation, floatX, floatY }) => {
  const coords = pieces[piece] || pieces.T;
  const minX = Math.min(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  
  // Create unique keyframe name based on movement parameters
  const keyframeName = `float-${Math.abs(Math.round(floatX * 10))}-${Math.abs(Math.round(floatY * 10))}-${Math.round(rotation)}`;
  
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        animation: `${keyframeName} ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        opacity: 0.6,
        willChange: 'transform, opacity',
        filter: `drop-shadow(0 0 8px ${glowColor})`,
      }}
    >
      <style>{`
        @keyframes ${keyframeName} {
          0%, 100% {
            transform: translate(0, 0) rotate(${rotation}deg) scale(1);
            opacity: 0.5;
          }
          25% {
            transform: translate(${floatX * 0.6}px, ${floatY * 0.4}px) rotate(${rotation + 45}deg) scale(1.05);
            opacity: 0.7;
          }
          50% {
            transform: translate(${floatX}px, ${floatY}px) rotate(${rotation + 90}deg) scale(1.1);
            opacity: 0.8;
          }
          75% {
            transform: translate(${floatX * 0.4}px, ${floatY * 0.8}px) rotate(${rotation + 135}deg) scale(1.05);
            opacity: 0.7;
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
              animation: `sparkle-bg ${1.5 + (idx * 0.2)}s ease-in-out infinite`,
              animationDelay: `${delay + idx * 0.1}s`,
              border: `1px solid rgba(255,255,255,0.2)`,
            }}
          />
        ))}
      </div>
    </div>
  );
});

FloatingPiece.displayName = 'FloatingPiece';

// Default color sets
const DEFAULT_COLORS = [
  { color: '#22d3ee', glow: 'rgba(34,211,238,0.6)' },   // cyan
  { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },   // pink
  { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },   // purple
  { color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },    // green
  { color: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },   // amber
  { color: '#6366f1', glow: 'rgba(99,102,241,0.6)' },   // indigo
];

// Online/amber themed colors
const ONLINE_COLORS = [
  { color: '#fbbf24', glow: 'rgba(251,191,36,0.7)' },   // amber (primary)
  { color: '#f97316', glow: 'rgba(249,115,22,0.65)' },  // orange
  { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },   // cyan accent
  { color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },   // purple accent
  { color: '#fcd34d', glow: 'rgba(252,211,77,0.6)' },   // yellow
  { color: '#fb923c', glow: 'rgba(251,146,60,0.6)' },   // orange light
];

// Speed/puzzle mode themed colors
const SPEED_COLORS = [
  { color: '#ef4444', glow: 'rgba(239,68,68,0.6)' },    // red
  { color: '#f97316', glow: 'rgba(249,115,22,0.6)' },   // orange
  { color: '#fbbf24', glow: 'rgba(251,191,36,0.6)' },   // amber
];

const GREEN_COLORS = [
  { color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },    // green
  { color: '#10b981', glow: 'rgba(16,185,129,0.6)' },   // emerald
  { color: '#84cc16', glow: 'rgba(132,204,22,0.6)' },   // lime
];

const PURPLE_COLORS = [
  { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },   // purple
  { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },   // pink
  { color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' },   // violet
];

// Export color presets for convenience
export const COLOR_PRESETS = {
  default: DEFAULT_COLORS,
  online: ONLINE_COLORS,
  speed: SPEED_COLORS,
  green: GREEN_COLORS,
  purple: PURPLE_COLORS,
};

/**
 * FloatingPiecesBackground - Animated pentomino pieces floating in the background
 * 
 * @param {number} count - Number of floating pieces (default: 12)
 * @param {Array} colors - Array of {color, glow} objects (default: DEFAULT_COLORS)
 * @param {string} colorPreset - Use a preset: 'default', 'online', 'speed', 'green', 'purple'
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
  // Delay rendering slightly to prevent hydration issues
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const colorSet = colors || COLOR_PRESETS[colorPreset] || DEFAULT_COLORS;
  
  const floatingPieces = useMemo(() => {
    const pieceNames = Object.keys(pieces);
    
    return Array.from({ length: count }).map((_, i) => {
      const colorChoice = colorSet[i % colorSet.length];
      // Use seeded pseudo-random for consistent positions
      const seed = i * 1.618033988749895; // Golden ratio
      const pseudoRandom = (n) => ((Math.sin(seed * n) + 1) / 2);
      
      return {
        id: i,
        piece: pieceNames[Math.floor(pseudoRandom(1) * pieceNames.length)],
        startX: pseudoRandom(2) * 95 + 2.5, // Keep away from edges
        startY: pseudoRandom(3) * 90 + 5,
        delay: pseudoRandom(4) * 8,
        duration: minDuration + pseudoRandom(5) * (maxDuration - minDuration),
        color: colorChoice.color,
        glowColor: colorChoice.glow,
        size: minSize + pseudoRandom(6) * (maxSize - minSize),
        rotation: pseudoRandom(7) * 360,
        floatX: (pseudoRandom(8) - 0.5) * 60, // Movement range
        floatY: (pseudoRandom(9) - 0.5) * 60,
      };
    });
  }, [count, colorSet, minSize, maxSize, minDuration, maxDuration]);

  if (!isReady) return null;

  return (
    <>
      {/* Animation keyframes */}
      <style>{`
        @keyframes sparkle-bg {
          0%, 100% { 
            opacity: 0.6; 
            transform: scale(1);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.1);
          }
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
