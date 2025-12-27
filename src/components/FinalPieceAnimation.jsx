// FinalPieceAnimation.jsx - Exciting animations when final piece is placed
// Shows one of 5 random animations before the game over modal appears
import { useState, useEffect, useMemo } from 'react';
import { pieces } from '../utils/pieces';

// Animation 1: Cyber Shockwave - expanding rings with glitch effect
const CyberShockwave = ({ color, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const baseColor = color === 2 ? '#ec4899' : '#22d3ee';
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Multiple expanding shockwaves */}
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4"
          style={{
            borderColor: baseColor,
            animation: `shockwave-expand 1.5s ease-out ${i * 0.15}s forwards`,
            boxShadow: `0 0 60px ${baseColor}, inset 0 0 60px ${baseColor}40`,
            width: 50,
            height: 50,
          }}
        />
      ))}
      
      {/* Center flash */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full animate-flash-burst"
        style={{ 
          background: `radial-gradient(circle, ${baseColor} 0%, transparent 70%)`,
        }}
      />
      
      {/* Glitch lines */}
      {[1, 2, 3].map(i => (
        <div
          key={`glitch-${i}`}
          className="absolute w-full h-2 animate-glitch-line"
          style={{
            top: `${20 + i * 25}%`,
            background: `linear-gradient(90deg, transparent, ${baseColor}80, transparent)`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      
      <style>{`
        @keyframes shockwave-expand {
          0% { 
            transform: translate(-50%, -50%) scale(1); 
            opacity: 1;
            border-width: 4px;
          }
          100% { 
            transform: translate(-50%, -50%) scale(15); 
            opacity: 0;
            border-width: 1px;
          }
        }
        @keyframes flash-burst {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(3); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(5); opacity: 0; }
        }
        @keyframes glitch-line {
          0%, 100% { transform: translateX(-100%); opacity: 0; }
          20% { transform: translateX(0); opacity: 1; }
          40% { transform: translateX(20px); opacity: 0.5; }
          60% { transform: translateX(-10px); opacity: 1; }
          80% { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// Animation 2: Piece Explosion - pentomino pieces fly out from center
const PieceExplosion = ({ color, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const baseColor = color === 2 ? '#ec4899' : '#22d3ee';
  const pieceNames = Object.keys(pieces).slice(0, 12);
  
  const flyingPieces = useMemo(() => 
    pieceNames.map((name, i) => ({
      name,
      angle: (i / pieceNames.length) * 360,
      distance: 200 + Math.random() * 150,
      rotation: Math.random() * 1080 - 540,
      delay: Math.random() * 0.3,
      scale: 0.8 + Math.random() * 0.6,
    })), [pieceNames]
  );
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Initial flash */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full animate-initial-flash"
        style={{ background: `radial-gradient(circle, white 0%, ${baseColor} 30%, transparent 70%)` }}
      />
      
      {/* Flying pieces */}
      {flyingPieces.map((piece, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 w-8 h-8"
          style={{
            '--fly-x': `${Math.cos(piece.angle * Math.PI / 180) * piece.distance}px`,
            '--fly-y': `${Math.sin(piece.angle * Math.PI / 180) * piece.distance}px`,
            '--rotation': `${piece.rotation}deg`,
            animation: `piece-fly-out 1.8s ease-out ${piece.delay}s forwards`,
            transform: `translate(-50%, -50%) scale(${piece.scale})`,
          }}
        >
          <div 
            className="w-full h-full rounded shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${baseColor}, ${color === 2 ? '#f472b6' : '#67e8f9'})`,
              boxShadow: `0 0 20px ${baseColor}`,
            }}
          />
        </div>
      ))}
      
      {/* Particle trail */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={`particle-${i}`}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
          style={{
            background: baseColor,
            '--angle': `${(i / 30) * 360}deg`,
            '--distance': `${100 + Math.random() * 200}px`,
            animation: `particle-burst 1.5s ease-out ${Math.random() * 0.2}s forwards`,
            boxShadow: `0 0 10px ${baseColor}`,
          }}
        />
      ))}
      
      <style>{`
        @keyframes initial-flash {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          30% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        @keyframes piece-fly-out {
          0% { 
            transform: translate(-50%, -50%) rotate(0deg) scale(0.3);
            opacity: 1;
          }
          30% {
            transform: translate(-50%, -50%) rotate(90deg) scale(1);
            opacity: 1;
          }
          100% { 
            transform: translate(calc(-50% + var(--fly-x)), calc(-50% + var(--fly-y))) rotate(var(--rotation));
            opacity: 0;
          }
        }
        @keyframes particle-burst {
          0% { 
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0);
            opacity: 1;
          }
          100% { 
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Animation 3: Neon Grid Pulse - grid pattern lights up and pulses
const NeonGridPulse = ({ color, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const baseColor = color === 2 ? '#ec4899' : '#22d3ee';
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Grid background */}
      <div 
        className="absolute inset-0 animate-grid-appear"
        style={{
          backgroundImage: `
            linear-gradient(${baseColor}40 1px, transparent 1px),
            linear-gradient(90deg, ${baseColor}40 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Horizontal scan lines */}
      {[0, 1, 2].map(i => (
        <div
          key={`h-${i}`}
          className="absolute w-full h-1"
          style={{
            top: `${30 + i * 20}%`,
            background: `linear-gradient(90deg, transparent, ${baseColor}, transparent)`,
            boxShadow: `0 0 20px ${baseColor}`,
            animation: `scan-horizontal 1s ease-in-out ${i * 0.2}s`,
          }}
        />
      ))}
      
      {/* Vertical scan lines */}
      {[0, 1, 2].map(i => (
        <div
          key={`v-${i}`}
          className="absolute w-1 h-full"
          style={{
            left: `${30 + i * 20}%`,
            background: `linear-gradient(to bottom, transparent, ${baseColor}, transparent)`,
            boxShadow: `0 0 20px ${baseColor}`,
            animation: `scan-vertical 1s ease-in-out ${0.3 + i * 0.2}s`,
          }}
        />
      ))}
      
      {/* Center glow */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full animate-center-pulse"
        style={{ 
          background: `radial-gradient(circle, ${baseColor}60 0%, ${baseColor}20 40%, transparent 70%)`,
        }}
      />
      
      {/* Corner accents */}
      {[[0, 0], [100, 0], [0, 100], [100, 100]].map(([x, y], i) => (
        <div
          key={`corner-${i}`}
          className="absolute w-16 h-16"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
            border: `2px solid ${baseColor}`,
            animation: `corner-flash 0.8s ease-out ${i * 0.1}s forwards`,
            boxShadow: `0 0 30px ${baseColor}`,
          }}
        />
      ))}
      
      <style>{`
        @keyframes grid-appear {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes scan-horizontal {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes scan-vertical {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes center-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
        }
        @keyframes corner-flash {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
        }
      `}</style>
    </div>
  );
};

// Animation 4: Victory Fireworks - colorful firework bursts
const VictoryFireworks = ({ color, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const baseColor = color === 2 ? '#ec4899' : '#22d3ee';
  const colors = color === 2 
    ? ['#ec4899', '#f472b6', '#fbbf24', '#a855f7', '#f43f5e']
    : ['#22d3ee', '#67e8f9', '#fbbf24', '#a855f7', '#34d399'];
  
  const fireworks = useMemo(() => 
    Array.from({ length: 6 }).map((_, i) => ({
      x: 15 + (i % 3) * 35,
      y: 25 + Math.floor(i / 3) * 40,
      delay: i * 0.3,
      color: colors[i % colors.length],
      particles: 16,
    })), [colors]
  );
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden bg-black/30">
      {fireworks.map((fw, fwIndex) => (
        <div key={fwIndex}>
          {/* Launch trail */}
          <div
            className="absolute w-1 bg-white"
            style={{
              left: `${fw.x}%`,
              bottom: 0,
              height: '40%',
              animation: `firework-launch 0.4s ease-out ${fw.delay}s forwards`,
              boxShadow: `0 0 10px ${fw.color}`,
            }}
          />
          
          {/* Explosion particles */}
          {Array.from({ length: fw.particles }).map((_, i) => (
            <div
              key={`${fwIndex}-${i}`}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${fw.x}%`,
                top: `${fw.y}%`,
                background: fw.color,
                '--angle': `${(i / fw.particles) * 360}deg`,
                '--distance': `${80 + Math.random() * 60}px`,
                animation: `firework-burst 1.2s ease-out ${fw.delay + 0.4}s forwards`,
                boxShadow: `0 0 15px ${fw.color}`,
                opacity: 0,
              }}
            />
          ))}
          
          {/* Sparkle trails */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`sparkle-${fwIndex}-${i}`}
              className="absolute w-1 h-1 rounded-full bg-white"
              style={{
                left: `${fw.x}%`,
                top: `${fw.y}%`,
                '--angle': `${(i / 8) * 360 + 22.5}deg`,
                '--distance': `${40 + Math.random() * 30}px`,
                animation: `sparkle-fall 1.5s ease-out ${fw.delay + 0.5}s forwards`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      ))}
      
      <style>{`
        @keyframes firework-launch {
          0% { height: 0; opacity: 1; }
          100% { height: 40%; opacity: 0; }
        }
        @keyframes firework-burst {
          0% { 
            transform: rotate(var(--angle)) translateX(0) scale(0);
            opacity: 1;
          }
          20% {
            transform: rotate(var(--angle)) translateX(20px) scale(1);
            opacity: 1;
          }
          100% { 
            transform: rotate(var(--angle)) translateX(var(--distance)) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes sparkle-fall {
          0% { 
            transform: rotate(var(--angle)) translateX(0);
            opacity: 1;
          }
          100% { 
            transform: rotate(var(--angle)) translateX(var(--distance)) translateY(50px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Animation 5: Digital Disintegration - pieces break apart into pixels
const DigitalDisintegration = ({ color, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const baseColor = color === 2 ? '#ec4899' : '#22d3ee';
  
  const pixels = useMemo(() => 
    Array.from({ length: 100 }).map((_, i) => ({
      startX: 35 + (i % 10) * 3,
      startY: 35 + Math.floor(i / 10) * 3,
      endX: Math.random() * 100,
      endY: Math.random() * 100,
      delay: Math.random() * 0.8,
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 720 - 360,
    })), []
  );
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Initial board shape flash */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 animate-board-flash"
        style={{
          background: `linear-gradient(135deg, ${baseColor}80, ${baseColor}40)`,
          borderRadius: '8px',
          boxShadow: `0 0 50px ${baseColor}`,
        }}
      />
      
      {/* Flying pixels */}
      {pixels.map((pixel, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${pixel.startX}%`,
            top: `${pixel.startY}%`,
            width: pixel.size,
            height: pixel.size,
            background: baseColor,
            '--end-x': `${pixel.endX - pixel.startX}vw`,
            '--end-y': `${pixel.endY - pixel.startY}vh`,
            '--rotation': `${pixel.rotation}deg`,
            animation: `pixel-fly 1.5s ease-out ${pixel.delay}s forwards`,
            boxShadow: `0 0 ${pixel.size}px ${baseColor}`,
            borderRadius: '2px',
          }}
        />
      ))}
      
      {/* Glowing center aftermath */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full animate-aftermath-glow"
        style={{ 
          background: `radial-gradient(circle, ${baseColor}80 0%, transparent 70%)`,
        }}
      />
      
      <style>{`
        @keyframes board-flash {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          30% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        }
        @keyframes pixel-fly {
          0% { 
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% { 
            transform: translate(var(--end-x), var(--end-y)) rotate(var(--rotation));
            opacity: 0;
          }
        }
        @keyframes aftermath-glow {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          30% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(3); }
        }
      `}</style>
    </div>
  );
};

// Array of all animations
const ANIMATIONS = [
  CyberShockwave,
  PieceExplosion,
  NeonGridPulse,
  VictoryFireworks,
  DigitalDisintegration,
];

/**
 * FinalPieceAnimation - Shows a random exciting animation when the final piece is placed
 * 
 * @param {number} winner - Player number who won (1 or 2)
 * @param {Function} onComplete - Callback when animation finishes
 * @param {number} animationIndex - Optional: force a specific animation (0-4)
 */
const FinalPieceAnimation = ({ winner = 1, onComplete, animationIndex = null }) => {
  const [selectedIndex] = useState(() => 
    animationIndex !== null ? animationIndex : Math.floor(Math.random() * ANIMATIONS.length)
  );
  
  const AnimationComponent = ANIMATIONS[selectedIndex];
  
  return <AnimationComponent color={winner} onComplete={onComplete} />;
};

// Export animation names for debugging/testing
export const ANIMATION_NAMES = [
  'Cyber Shockwave',
  'Piece Explosion',
  'Neon Grid Pulse',
  'Victory Fireworks',
  'Digital Disintegration',
];

export default FinalPieceAnimation;
