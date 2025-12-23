// PlacementAnimation - Visual effects when pieces are placed
// Player 1 (cyan): Ripple effect outward
// Player 2 (orange/pink): Burst effect with sparkles
// TIER-BASED VARIATIONS: Higher tiers get more exaggerated animations

import { useEffect, useState, useCallback } from 'react';

// Tier intensity mapping (1-4 scale)
const getTierIntensity = (tier) => {
  if (!tier) return 2; // Default to medium
  const tierLower = tier.toLowerCase();
  
  // Elite tier (intensity 4) - most exaggerated
  if (['grandmaster', 'legend', 'champion'].includes(tierLower)) return 4;
  
  // High tier (intensity 3)
  if (['master', 'diamond'].includes(tierLower)) return 3;
  
  // Medium tier (intensity 2)
  if (['platinum', 'gold'].includes(tierLower)) return 2;
  
  // Low tier (intensity 1) - basic
  return 1; // Bronze, Silver, Unranked
};

// CSS for the animations - now with intensity variations
const animationStyles = `
@keyframes placement-ripple {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes placement-ripple-intense {
  0% {
    transform: scale(0.6);
    opacity: 1;
  }
  30% {
    transform: scale(1.0);
    opacity: 0.8;
  }
  60% {
    transform: scale(1.5);
    opacity: 0.5;
  }
  100% {
    transform: scale(2.0);
    opacity: 0;
  }
}

@keyframes placement-ripple-elite {
  0% {
    transform: scale(0.4);
    opacity: 1;
    filter: brightness(1.5);
  }
  25% {
    transform: scale(0.8);
    opacity: 0.9;
    filter: brightness(1.3);
  }
  50% {
    transform: scale(1.4);
    opacity: 0.6;
    filter: brightness(1.1);
  }
  75% {
    transform: scale(2.0);
    opacity: 0.3;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes placement-burst {
  0% {
    transform: scale(0.5) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(1.3) rotate(180deg);
    opacity: 0.7;
  }
  100% {
    transform: scale(0.3) rotate(360deg);
    opacity: 0;
  }
}

@keyframes placement-burst-intense {
  0% {
    transform: scale(0.3) rotate(0deg);
    opacity: 1;
    filter: brightness(1.3);
  }
  40% {
    transform: scale(1.5) rotate(180deg);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.8) rotate(270deg);
    opacity: 0.4;
  }
  100% {
    transform: scale(0.2) rotate(360deg);
    opacity: 0;
  }
}

@keyframes placement-burst-elite {
  0% {
    transform: scale(0.2) rotate(0deg);
    opacity: 1;
    filter: brightness(1.5) saturate(1.3);
  }
  30% {
    transform: scale(1.2) rotate(120deg);
    opacity: 0.9;
    filter: brightness(1.4);
  }
  60% {
    transform: scale(2.0) rotate(240deg);
    opacity: 0.5;
    filter: brightness(1.2);
  }
  100% {
    transform: scale(0.1) rotate(360deg);
    opacity: 0;
  }
}

@keyframes sparkle-float {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-30px) scale(0);
    opacity: 0;
  }
}

@keyframes sparkle-float-intense {
  0% {
    transform: translate(0, 0) scale(1) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: translate(var(--tx), var(--ty)) scale(1.2) rotate(180deg);
    opacity: 0.8;
  }
  100% {
    transform: translate(calc(var(--tx) * 2), calc(var(--ty) * 2)) scale(0) rotate(360deg);
    opacity: 0;
  }
}

@keyframes sparkle-trail {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
    filter: blur(0px);
  }
  50% {
    transform: translate(var(--tx), var(--ty)) scale(0.8);
    opacity: 0.6;
    filter: blur(1px);
  }
  100% {
    transform: translate(calc(var(--tx) * 1.5), calc(var(--ty) * 1.5)) scale(0.3);
    opacity: 0;
    filter: blur(2px);
  }
}

@keyframes cell-glow-cyan {
  0% {
    box-shadow: inset 0 0 0 rgba(34, 211, 238, 0);
  }
  50% {
    box-shadow: inset 0 0 20px rgba(34, 211, 238, 0.8), 0 0 30px rgba(34, 211, 238, 0.6);
  }
  100% {
    box-shadow: inset 0 0 0 rgba(34, 211, 238, 0);
  }
}

@keyframes cell-glow-cyan-intense {
  0% {
    box-shadow: inset 0 0 0 rgba(34, 211, 238, 0);
    transform: scale(1);
  }
  30% {
    box-shadow: inset 0 0 30px rgba(34, 211, 238, 1), 0 0 50px rgba(34, 211, 238, 0.8);
    transform: scale(1.05);
  }
  60% {
    box-shadow: inset 0 0 20px rgba(34, 211, 238, 0.6), 0 0 30px rgba(34, 211, 238, 0.4);
    transform: scale(1.02);
  }
  100% {
    box-shadow: inset 0 0 0 rgba(34, 211, 238, 0);
    transform: scale(1);
  }
}

@keyframes cell-glow-orange {
  0% {
    box-shadow: inset 0 0 0 rgba(251, 146, 60, 0);
  }
  50% {
    box-shadow: inset 0 0 20px rgba(251, 146, 60, 0.8), 0 0 30px rgba(251, 146, 60, 0.6);
  }
  100% {
    box-shadow: inset 0 0 0 rgba(251, 146, 60, 0);
  }
}

@keyframes cell-glow-orange-intense {
  0% {
    box-shadow: inset 0 0 0 rgba(251, 146, 60, 0);
    transform: scale(1);
  }
  30% {
    box-shadow: inset 0 0 30px rgba(251, 146, 60, 1), 0 0 50px rgba(251, 146, 60, 0.8);
    transform: scale(1.05);
  }
  60% {
    box-shadow: inset 0 0 20px rgba(251, 146, 60, 0.6), 0 0 30px rgba(251, 146, 60, 0.4);
    transform: scale(1.02);
  }
  100% {
    box-shadow: inset 0 0 0 rgba(251, 146, 60, 0);
    transform: scale(1);
  }
}

@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes screen-flash {
  0% { opacity: 0; }
  15% { opacity: 0.3; }
  100% { opacity: 0; }
}

@keyframes elite-particle {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  20% {
    transform: translate(calc(var(--tx) * 0.3), calc(var(--ty) * 0.3)) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0);
    opacity: 0;
  }
}

@keyframes shockwave {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
    border-width: 4px;
  }
  100% {
    transform: scale(3);
    opacity: 0;
    border-width: 1px;
  }
}
`;

// Inject styles once
let stylesInjected = false;
const injectStyles = () => {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.textContent = animationStyles;
  document.head.appendChild(style);
  stylesInjected = true;
};

// Animation component for a single cell - with intensity
const CellAnimation = ({ x, y, color, delay, cellSize, intensity }) => {
  const isPlayer1 = color === 'cyan';
  const isIntense = intensity >= 3;
  
  const animationName = isPlayer1 
    ? (isIntense ? 'cell-glow-cyan-intense' : 'cell-glow-cyan')
    : (isIntense ? 'cell-glow-orange-intense' : 'cell-glow-orange');
  
  const duration = 0.6 + (intensity * 0.1); // Longer duration for higher tiers
  
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width: cellSize,
        height: cellSize,
        animation: `${animationName} ${duration}s ease-out forwards`,
        animationDelay: `${delay}ms`,
        borderRadius: '4px',
      }}
    />
  );
};

// Ripple effect for Player 1 (cyan) - with tier variations
const RippleEffect = ({ centerX, centerY, cellSize, intensity }) => {
  // More rings for higher tiers
  const ringCount = intensity + 1; // 2-5 rings based on intensity
  const maxScale = 1.2 + (intensity * 0.3); // Bigger ripples for higher tiers
  
  // Elite tier gets a shockwave
  const showShockwave = intensity >= 4;
  
  // Determine animation based on intensity
  const getAnimation = (ring) => {
    if (intensity >= 4) return 'placement-ripple-elite';
    if (intensity >= 3) return 'placement-ripple-intense';
    return 'placement-ripple';
  };
  
  return (
    <>
      {/* Shockwave for elite tier */}
      {showShockwave && (
        <div
          className="absolute pointer-events-none rounded-full border-cyan-300"
          style={{
            left: centerX - cellSize * 1.5,
            top: centerY - cellSize * 1.5,
            width: cellSize * 3,
            height: cellSize * 3,
            borderWidth: '3px',
            borderStyle: 'solid',
            animation: 'shockwave 0.8s ease-out forwards',
          }}
        />
      )}
      
      {/* Ripple rings */}
      {Array.from({ length: ringCount }).map((_, ring) => (
        <div
          key={ring}
          className="absolute pointer-events-none rounded-full border-2 border-cyan-400"
          style={{
            left: centerX - cellSize,
            top: centerY - cellSize,
            width: cellSize * 2,
            height: cellSize * 2,
            animation: `${getAnimation(ring)} ${0.6 + (intensity * 0.15)}s ease-out forwards`,
            animationDelay: `${ring * (120 - intensity * 15)}ms`,
            opacity: 0.8 - ring * 0.1,
            borderWidth: `${3 - ring * 0.5}px`,
          }}
        />
      ))}
      
      {/* Extra glow particles for high tiers */}
      {intensity >= 3 && Array.from({ length: intensity * 2 }).map((_, i) => {
        const angle = (i / (intensity * 2)) * Math.PI * 2;
        const dist = cellSize * (1 + Math.random() * 0.5);
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        
        return (
          <div
            key={`particle-${i}`}
            className="absolute pointer-events-none rounded-full bg-cyan-400"
            style={{
              left: centerX - 3,
              top: centerY - 3,
              width: 6,
              height: 6,
              boxShadow: '0 0 10px rgba(34, 211, 238, 0.8)',
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animation: `elite-particle ${0.5 + intensity * 0.1}s ease-out forwards`,
              animationDelay: `${i * 30}ms`,
            }}
          />
        );
      })}
    </>
  );
};

// Burst effect for Player 2 (orange) - with tier variations
const BurstEffect = ({ centerX, centerY, cellSize, intensity }) => {
  // More sparkles for higher tiers: 4, 8, 12, 16
  const sparkleCount = 4 * intensity;
  const burstSize = cellSize * (0.8 + intensity * 0.2);
  
  // Elite tier gets extra effects
  const showShockwave = intensity >= 4;
  
  // Determine animation based on intensity
  const getBurstAnimation = () => {
    if (intensity >= 4) return 'placement-burst-elite';
    if (intensity >= 3) return 'placement-burst-intense';
    return 'placement-burst';
  };
  
  const getSparkleAnimation = () => {
    if (intensity >= 3) return 'sparkle-float-intense';
    return 'sparkle-float';
  };

  // Generate sparkle positions with more variation for higher tiers
  const sparklePositions = Array.from({ length: sparkleCount }).map((_, i) => {
    const baseAngle = (i / sparkleCount) * 360;
    const angleVariation = intensity >= 3 ? (Math.random() - 0.5) * 20 : 0;
    const angle = baseAngle + angleVariation;
    const dist = 1 + (intensity >= 3 ? Math.random() * 0.5 : (i % 2) * 0.2);
    return { angle, dist };
  });

  return (
    <>
      {/* Shockwave for elite tier */}
      {showShockwave && (
        <div
          className="absolute pointer-events-none rounded-full border-orange-300"
          style={{
            left: centerX - cellSize * 1.5,
            top: centerY - cellSize * 1.5,
            width: cellSize * 3,
            height: cellSize * 3,
            borderWidth: '3px',
            borderStyle: 'solid',
            animation: 'shockwave 0.8s ease-out forwards',
          }}
        />
      )}
      
      {/* Central burst */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: centerX - burstSize * 0.5,
          top: centerY - burstSize * 0.5,
          width: burstSize,
          height: burstSize,
          background: `radial-gradient(circle, rgba(251,146,60,${0.6 + intensity * 0.1}) 0%, rgba(251,146,60,0) 70%)`,
          animation: `${getBurstAnimation()} ${0.5 + intensity * 0.1}s ease-out forwards`,
        }}
      />
      
      {/* Secondary burst for high tiers */}
      {intensity >= 3 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: centerX - burstSize * 0.7,
            top: centerY - burstSize * 0.7,
            width: burstSize * 1.4,
            height: burstSize * 1.4,
            background: `radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(251,191,36,0) 60%)`,
            animation: `${getBurstAnimation()} ${0.7 + intensity * 0.1}s ease-out forwards`,
            animationDelay: '50ms',
          }}
        />
      )}
      
      {/* Sparkles */}
      {sparklePositions.map((pos, i) => {
        const rad = (pos.angle * Math.PI) / 180;
        const distance = cellSize * pos.dist * (1 + intensity * 0.15);
        const tx = Math.cos(rad) * distance;
        const ty = Math.sin(rad) * distance;
        const x = centerX + Math.cos(rad) * cellSize * 0.3;
        const y = centerY + Math.sin(rad) * cellSize * 0.3;
        
        // Vary sparkle size based on tier
        const sparkleSize = 4 + intensity;
        
        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: x - sparkleSize / 2,
              top: y - sparkleSize / 2,
              width: sparkleSize,
              height: sparkleSize,
              borderRadius: '50%',
              background: i % 3 === 0 
                ? 'linear-gradient(135deg, #fbbf24, #f97316)' 
                : 'linear-gradient(135deg, #fb923c, #ea580c)',
              boxShadow: `0 0 ${6 + intensity * 2}px rgba(251, 191, 36, ${0.6 + intensity * 0.1})`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animation: `${getSparkleAnimation()} ${0.4 + intensity * 0.1}s ease-out forwards`,
              animationDelay: `${i * (40 - intensity * 5)}ms`,
            }}
          />
        );
      })}
      
      {/* Trail particles for elite tier */}
      {intensity >= 4 && Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const tx = Math.cos(angle) * cellSize * 2;
        const ty = Math.sin(angle) * cellSize * 2;
        
        return (
          <div
            key={`trail-${i}`}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: centerX - 2,
              top: centerY - 2,
              width: 4,
              height: 4,
              background: 'rgba(251, 191, 36, 0.8)',
              boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)',
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animation: `sparkle-trail 0.6s ease-out forwards`,
              animationDelay: `${100 + i * 25}ms`,
            }}
          />
        );
      })}
    </>
  );
};

// Screen flash for elite animations
const ScreenFlash = ({ color }) => {
  const flashColor = color === 'cyan' 
    ? 'rgba(34, 211, 238, 0.15)' 
    : 'rgba(251, 146, 60, 0.15)';
  
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        background: flashColor,
        animation: 'screen-flash 0.4s ease-out forwards',
        zIndex: 100,
      }}
    />
  );
};

// Main PlacementAnimation component
const PlacementAnimation = ({ 
  cells, // Array of { row, col } for each cell of the placed piece
  player, // 1 or 2
  boardRef, // Ref to the game board element
  cellSize, // Size of each cell in pixels
  tier, // Player's tier for intensity variation
  onComplete // Callback when animation finishes
}) => {
  const [show, setShow] = useState(true);

  // Calculate intensity from tier
  const intensity = getTierIntensity(tier);

  useEffect(() => {
    injectStyles();
    
    // Auto-hide after animation - longer for higher tiers
    const duration = 600 + (intensity * 150);
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [onComplete, intensity]);

  if (!show || !cells?.length || !boardRef?.current) return null;

  const color = player === 1 ? 'cyan' : 'orange';
  
  // Calculate center of piece
  const centerRow = cells.reduce((sum, c) => sum + c.row, 0) / cells.length;
  const centerCol = cells.reduce((sum, c) => sum + c.col, 0) / cells.length;
  const centerX = (centerCol + 0.5) * cellSize;
  const centerY = (centerRow + 0.5) * cellSize;

  // Elite tier gets screen flash
  const showScreenFlash = intensity >= 4;

  return (
    <>
      {/* Screen flash for elite tier */}
      {showScreenFlash && <ScreenFlash color={color} />}
      
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 50 }}
      >
        {/* Cell glow effects */}
        {cells.map((cell, i) => (
          <CellAnimation
            key={`${cell.row}-${cell.col}`}
            x={cell.col * cellSize}
            y={cell.row * cellSize}
            color={color}
            delay={i * (40 - intensity * 5)} // Faster stagger for higher tiers
            cellSize={cellSize}
            intensity={intensity}
          />
        ))}
        
        {/* Player-specific effect */}
        {player === 1 ? (
          <RippleEffect 
            centerX={centerX} 
            centerY={centerY} 
            cellSize={cellSize} 
            intensity={intensity}
          />
        ) : (
          <BurstEffect 
            centerX={centerX} 
            centerY={centerY} 
            cellSize={cellSize} 
            intensity={intensity}
          />
        )}
      </div>
    </>
  );
};

export default PlacementAnimation;

// Hook to manage placement animations
export const usePlacementAnimation = () => {
  const [animation, setAnimation] = useState(null);
  
  const triggerAnimation = useCallback((cells, player, boardRef, cellSize, tier) => {
    setAnimation({ cells, player, boardRef, cellSize, tier, key: Date.now() });
  }, []);
  
  const clearAnimation = useCallback(() => {
    setAnimation(null);
  }, []);
  
  return {
    animation,
    triggerAnimation,
    clearAnimation,
  };
};
