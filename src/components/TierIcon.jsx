// TierIcon - Cyberpunk pentomino shapes for ELO tiers

// Pentomino shape definitions (each cell is 1 unit)
const shapes = {
  // X shape - Grandmaster (cross pattern)
  X: [[1,0], [0,1], [1,1], [2,1], [1,2]],
  // W shape - Master (stair pattern)
  W: [[0,0], [0,1], [1,1], [1,2], [2,2]],
  // T shape - Expert (T pattern)
  T: [[0,0], [1,0], [2,0], [1,1], [1,2]],
  // Y shape - Advanced (Y pattern)
  Y: [[0,1], [1,0], [1,1], [1,2], [1,3]],
  // L shape - Intermediate (L pattern)
  L: [[0,0], [0,1], [0,2], [0,3], [1,3]],
  // I shape - Beginner (line pattern)
  I: [[0,0], [0,1], [0,2], [0,3], [0,4]],
  // O shape - Novice (single block, represents starting point)
  O: [[0,0]],
};

const TierIcon = ({ shape, glowColor, size = 'default' }) => {
  const coords = shapes[shape] || shapes.O;
  
  // Find bounds
  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // Size configurations
  const sizeConfig = {
    small: { cell: 4, gap: 1 },
    default: { cell: 6, gap: 1 },
    large: { cell: 8, gap: 1 },
  };
  
  const { cell, gap } = sizeConfig[size] || sizeConfig.default;
  const containerWidth = width * (cell + gap);
  const containerHeight = height * (cell + gap);
  
  return (
    <div 
      className="relative inline-flex items-center justify-center"
      style={{ 
        width: containerWidth + 4, 
        height: containerHeight + 4,
        filter: `drop-shadow(0 0 4px ${glowColor}) drop-shadow(0 0 8px ${glowColor}50)`,
      }}
    >
      <div className="relative" style={{ width: containerWidth, height: containerHeight }}>
        {coords.map(([x, y], idx) => (
          <div
            key={idx}
            className="absolute rounded-sm"
            style={{
              width: cell,
              height: cell,
              left: (x - minX) * (cell + gap),
              top: (y - minY) * (cell + gap),
              backgroundColor: glowColor,
              boxShadow: `inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.3)`,
              border: `1px solid rgba(255,255,255,0.3)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Tier icon with animation for special display
export const AnimatedTierIcon = ({ shape, glowColor, size = 'default' }) => {
  return (
    <div className="relative animate-tier-pulse">
      <TierIcon shape={shape} glowColor={glowColor} size={size} />
      <style>{`
        @keyframes tier-pulse {
          0%, 100% { 
            filter: drop-shadow(0 0 4px ${glowColor}) drop-shadow(0 0 8px ${glowColor}50);
            transform: scale(1);
          }
          50% { 
            filter: drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor}80);
            transform: scale(1.05);
          }
        }
        .animate-tier-pulse {
          animation: tier-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TierIcon;
