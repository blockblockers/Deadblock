// FloatingPieces.jsx - Animated floating pentomino pieces background
import { memo, useMemo } from 'react';

// Pentomino piece definitions
const PIECES = {
  F: [[0,1],[1,0],[1,1],[1,2],[2,2]],
  I: [[0,0],[1,0],[2,0],[3,0],[4,0]],
  L: [[0,0],[1,0],[2,0],[3,0],[3,1]],
  N: [[0,1],[1,0],[1,1],[2,0],[3,0]],
  P: [[0,0],[0,1],[1,0],[1,1],[2,0]],
  T: [[0,0],[0,1],[0,2],[1,1],[2,1]],
  U: [[0,0],[0,2],[1,0],[1,1],[1,2]],
  V: [[0,0],[1,0],[2,0],[2,1],[2,2]],
  W: [[0,2],[1,1],[1,2],[2,0],[2,1]],
  X: [[0,1],[1,0],[1,1],[1,2],[2,1]],
  Y: [[0,1],[1,0],[1,1],[2,1],[3,1]],
  Z: [[0,0],[0,1],[1,1],[2,1],[2,2]],
};

// Color palettes for different themes
const PALETTES = {
  cyan: ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75'],
  amber: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'],
  purple: ['#a855f7', '#9333ea', '#7c3aed', '#6d28d9', '#5b21b6'],
  pink: ['#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
  green: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  red: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  mixed: ['#22d3ee', '#a855f7', '#ec4899', '#fbbf24', '#22c55e'],
};

// Get a random piece name
const getRandomPiece = () => {
  const pieceNames = Object.keys(PIECES);
  return pieceNames[Math.floor(Math.random() * pieceNames.length)];
};

// Get random color from palette
const getRandomColor = (theme) => {
  const colors = PALETTES[theme] || PALETTES.mixed;
  return colors[Math.floor(Math.random() * colors.length)];
};

// Single floating piece component (internal only)
const SinglePiece = memo(function SinglePiece({ 
  pieceName, 
  size,
  color,
  initialX,
  initialY,
  duration,
  delay,
  rotation,
  opacity,
  uniqueKey,
}) {
  const coords = PIECES[pieceName];
  if (!coords) return null;

  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${initialX}%`,
        top: `${initialY}%`,
        width: `${width * size}px`,
        height: `${height * size}px`,
        transform: `rotate(${rotation}deg)`,
        opacity,
        animation: `floatAnim${uniqueKey} ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <style>
        {`
          @keyframes floatAnim${uniqueKey} {
            0%, 100% {
              transform: rotate(${rotation}deg) translateY(0px) translateX(0px);
              opacity: ${opacity};
            }
            25% {
              transform: rotate(${rotation + 5}deg) translateY(-20px) translateX(10px);
              opacity: ${opacity * 1.3};
            }
            50% {
              transform: rotate(${rotation}deg) translateY(-10px) translateX(-5px);
              opacity: ${opacity * 0.8};
            }
            75% {
              transform: rotate(${rotation - 5}deg) translateY(-30px) translateX(5px);
              opacity: ${opacity};
            }
          }
        `}
      </style>
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full"
        style={{ filter: `drop-shadow(0 0 ${size/2}px ${color}40)` }}
      >
        {coords.map(([x, y], idx) => (
          <rect
            key={idx}
            x={x - minX}
            y={y - minY}
            width={0.9}
            height={0.9}
            rx={0.1}
            fill={color}
            opacity={0.85}
          />
        ))}
      </svg>
    </div>
  );
});

/**
 * FloatingPieces - Animated background with floating pentomino pieces
 */
function FloatingPieces({ 
  count = 12,
  theme = 'cyan',
  minSize = 6,
  maxSize = 14,
  minOpacity = 0.06,
  maxOpacity = 0.18,
  minDuration = 15,
  maxDuration = 35,
  className = '',
}) {
  const floatingPieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pieceName: getRandomPiece(),
      size: minSize + Math.random() * (maxSize - minSize),
      color: getRandomColor(theme),
      initialX: Math.random() * 100,
      initialY: Math.random() * 100,
      duration: minDuration + Math.random() * (maxDuration - minDuration),
      delay: Math.random() * 10,
      rotation: Math.random() * 360,
      opacity: minOpacity + Math.random() * (maxOpacity - minOpacity),
      uniqueKey: `${i}_${Math.random().toString(36).substr(2, 5)}`,
    }));
  }, [count, theme, minSize, maxSize, minOpacity, maxOpacity, minDuration, maxDuration]);

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
      {floatingPieces.map((piece) => (
        <SinglePiece
          key={piece.id}
          pieceName={piece.pieceName}
          size={piece.size}
          color={piece.color}
          initialX={piece.initialX}
          initialY={piece.initialY}
          duration={piece.duration}
          delay={piece.delay}
          rotation={piece.rotation}
          opacity={piece.opacity}
          uniqueKey={piece.uniqueKey}
        />
      ))}
    </div>
  );
}

export default FloatingPieces;
