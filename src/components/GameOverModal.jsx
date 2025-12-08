import { useState, useEffect, useMemo } from 'react';
import { Trophy, Skull, RotateCcw, RefreshCw, Home, X } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { pieces } from '../utils/pieces';

// ====== WIN ANIMATIONS ======

// 1. Neon Grid Surge - expanding grid with pulse
const NeonGridSurge = ({ color = 'cyan' }) => {
  const baseColor = color === 'pink' ? '#ec4899' : '#22d3ee';
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Expanding rings */}
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 animate-expand-ring"
          style={{
            width: 100,
            height: 100,
            borderColor: baseColor,
            animationDelay: `${i * 0.4}s`,
            boxShadow: `0 0 30px ${baseColor}, inset 0 0 30px ${baseColor}40`,
          }}
        />
      ))}
      {/* Center glow */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full animate-pulse"
        style={{ background: `radial-gradient(circle, ${baseColor}40 0%, transparent 70%)` }}
      />
      {/* Vertical scan line */}
      <div 
        className="absolute top-0 w-1 h-full animate-scan-vertical"
        style={{ background: `linear-gradient(to bottom, transparent, ${baseColor}, transparent)`, boxShadow: `0 0 20px ${baseColor}` }}
      />
    </div>
  );
};

// 2. Piece Explosion - pentominoes burst outward
const PieceExplosion = () => {
  const particles = useMemo(() => {
    const pieceNames = Object.keys(pieces);
    const colors = ['#22d3ee', '#ec4899', '#a855f7', '#22c55e', '#f59e0b'];
    
    return Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      piece: pieceNames[Math.floor(Math.random() * pieceNames.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: (i / 16) * 360,
      delay: Math.random() * 0.3,
      distance: 150 + Math.random() * 100,
    }));
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {particles.map(p => {
        const coords = pieces[p.piece];
        const minX = Math.min(...coords.map(([x]) => x));
        const minY = Math.min(...coords.map(([, y]) => y));
        const radians = (p.angle * Math.PI) / 180;
        
        return (
          <div
            key={p.id}
            className="absolute animate-explode-out"
            style={{
              '--angle': `${p.angle}deg`,
              '--distance': `${p.distance}px`,
              animationDelay: `${p.delay}s`,
            }}
          >
            <div className="relative" style={{ transform: `rotate(${p.angle}deg)` }}>
              {coords.map(([x, y], idx) => (
                <div
                  key={idx}
                  className="absolute rounded-sm"
                  style={{
                    width: 8,
                    height: 8,
                    left: (x - minX) * 9,
                    top: (y - minY) * 9,
                    backgroundColor: p.color,
                    boxShadow: `0 0 10px ${p.color}`,
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 3. Circuit Complete - connecting lines light up
const CircuitComplete = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Corner nodes */}
    {[[20, 20], [80, 20], [20, 80], [80, 80], [50, 50]].map(([x, y], i) => (
      <div
        key={i}
        className="absolute w-4 h-4 rounded-full animate-node-glow"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          background: '#22d3ee',
          boxShadow: '0 0 20px #22d3ee, 0 0 40px #22d3ee',
          animationDelay: `${i * 0.15}s`,
        }}
      />
    ))}
    {/* Connection lines */}
    {[
      { x1: 20, y1: 20, x2: 50, y2: 50 },
      { x1: 80, y1: 20, x2: 50, y2: 50 },
      { x1: 20, y1: 80, x2: 50, y2: 50 },
      { x1: 80, y1: 80, x2: 50, y2: 50 },
    ].map((line, i) => {
      const length = Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2));
      const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180 / Math.PI;
      return (
        <div
          key={i}
          className="absolute h-0.5 origin-left animate-line-draw"
          style={{
            left: `${line.x1}%`,
            top: `${line.y1}%`,
            width: `${length}%`,
            transform: `rotate(${angle}deg)`,
            background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
            boxShadow: '0 0 10px #22d3ee',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      );
    })}
  </div>
);

// ====== LOSS ANIMATIONS ======

// 1. Static Interference
const StaticInterference = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Noise overlay */}
    <div className="absolute inset-0 animate-static-noise opacity-20" />
    {/* Red scan lines */}
    <div className="absolute inset-0 animate-scan-down opacity-40"
      style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(239,68,68,0.1) 2px, rgba(239,68,68,0.1) 4px)' }}
    />
    {/* Glitch bars */}
    {[1, 2, 3].map(i => (
      <div
        key={i}
        className="absolute w-full h-8 animate-glitch-slice"
        style={{
          top: `${20 + i * 25}%`,
          background: `linear-gradient(90deg, transparent, rgba(239,68,68,0.3), rgba(236,72,153,0.3), transparent)`,
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
  </div>
);

// 2. System Crash
const SystemCrash = () => {
  const errors = ['FATAL ERROR', 'SYSTEM HALT', 'GAME OVER', 'NO MOVES'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden font-mono">
      {/* Falling error text */}
      {errors.map((text, i) => (
        <div
          key={i}
          className="absolute text-red-500 text-sm animate-fall-glitch whitespace-nowrap"
          style={{
            left: `${10 + i * 20}%`,
            animationDelay: `${i * 0.3}s`,
            textShadow: '0 0 10px #ef4444',
          }}
        >
          {text}
        </div>
      ))}
      {/* Blinking cursor */}
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 text-red-400 text-2xl animate-blink">_</div>
    </div>
  );
};

// 3. Grid Shatter
const GridShatter = () => {
  const shards = useMemo(() => 
    Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: (i % 5) * 20 + 10,
      y: Math.floor(i / 5) * 20 + 10,
      delay: Math.random() * 0.5,
      rotation: (Math.random() - 0.5) * 90,
      fallX: (Math.random() - 0.5) * 100,
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {shards.map(shard => (
        <div
          key={shard.id}
          className="absolute w-12 h-12 border border-red-500/50 rounded animate-shard-fall"
          style={{
            left: `${shard.x}%`,
            top: `${shard.y}%`,
            transform: 'translate(-50%, -50%)',
            '--fall-x': `${shard.fallX}px`,
            '--rotation': `${shard.rotation}deg`,
            animationDelay: `${shard.delay}s`,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.1), transparent)',
          }}
        />
      ))}
    </div>
  );
};

// ====== MAIN MODAL ======

const GameOverModal = ({ isWin, isPuzzle, gameMode, winner, onClose, onRetry, onNewGame, onMenu }) => {
  const [animationType, setAnimationType] = useState(0);

  useEffect(() => {
    setAnimationType(Math.floor(Math.random() * 3));
  }, []);

  const handleRetry = () => { soundManager.playButtonClick(); onClose(); onRetry(); };
  const handleNewGame = () => { soundManager.playButtonClick(); onClose(); onNewGame(); };
  const handleMenu = () => { soundManager.playButtonClick(); onClose(); onMenu(); };

  // Simple, clear messaging
  const is2Player = gameMode === '2player';
  
  const getTitle = () => {
    if (isPuzzle) return isWin ? 'COMPLETE!' : 'FAILED';
    if (is2Player) return winner === 1 ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!';
    return isWin ? 'YOU WIN!' : 'YOU LOSE';
  };

  const getSubtitle = () => {
    if (isPuzzle) return isWin ? 'Puzzle solved successfully' : 'No moves remaining';
    if (is2Player) return winner === 1 ? 'Player 1 dominated the board' : 'Player 2 dominated the board';
    return isWin ? 'You defeated the AI' : 'The AI wins this round';
  };

  // Colors
  const showVictory = is2Player || isWin;
  const accentColor = is2Player 
    ? (winner === 1 ? 'cyan' : 'pink')
    : (isWin ? 'cyan' : 'red');

  const colorConfig = {
    cyan: { border: 'border-cyan-500/50', shadow: 'shadow-[0_0_50px_rgba(34,211,238,0.4)]', text: 'text-cyan-400', glow: '#22d3ee', btn: 'bg-cyan-600 hover:bg-cyan-500' },
    pink: { border: 'border-pink-500/50', shadow: 'shadow-[0_0_50px_rgba(236,72,153,0.4)]', text: 'text-pink-400', glow: '#ec4899', btn: 'bg-pink-600 hover:bg-pink-500' },
    red: { border: 'border-red-500/50', shadow: 'shadow-[0_0_50px_rgba(239,68,68,0.4)]', text: 'text-red-400', glow: '#ef4444', btn: 'bg-red-600 hover:bg-red-500' },
  };
  const colors = colorConfig[accentColor];

  // Animations
  const winAnimations = [
    <NeonGridSurge key="grid" color={accentColor === 'pink' ? 'pink' : 'cyan'} />,
    <PieceExplosion key="explode" />,
    <CircuitComplete key="circuit" />
  ];
  const lossAnimations = [
    <StaticInterference key="static" />,
    <SystemCrash key="crash" />,
    <GridShatter key="shatter" />
  ];
  const currentAnimation = showVictory ? winAnimations[animationType] : lossAnimations[animationType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      {/* Animation layer */}
      {currentAnimation}
      
      {/* Modal */}
      <div className={`relative bg-slate-900/95 rounded-xl p-6 sm:p-8 max-w-sm w-full border-2 ${colors.border} ${colors.shadow} animate-modal-pop`}>
        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors z-10">
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          {showVictory ? (
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: `${colors.glow}40` }} />
              {is2Player ? (
                <div className={`relative w-16 h-16 rounded-full flex items-center justify-center animate-float ${winner === 1 ? 'bg-cyan-500' : 'bg-pink-500'}`}>
                  <span className="text-white font-bold text-2xl">P{winner}</span>
                </div>
              ) : (
                <Trophy size={64} className={`relative ${colors.text} animate-float`} />
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse" />
              <Skull size={64} className="relative text-red-400 animate-shake" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className={`text-center text-2xl sm:text-3xl font-bold mb-1 ${colors.text}`}
          style={{ textShadow: `0 0 20px ${colors.glow}` }}
        >
          {getTitle()}
        </h2>

        {/* Subtitle */}
        <p className="text-center text-slate-400 text-sm mb-6">{getSubtitle()}</p>

        {/* Buttons */}
        <div className="space-y-2">
          <button onClick={handleRetry}
            className={`w-full py-3 rounded-lg font-bold tracking-wide flex items-center justify-center gap-2 transition-all ${colors.btn} text-white border border-white/10`}
          >
            <RotateCcw size={16} />
            {isPuzzle ? 'RETRY' : 'PLAY AGAIN'}
          </button>

          <button onClick={handleNewGame}
            className="w-full py-3 rounded-lg font-bold tracking-wide flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600"
          >
            <RefreshCw size={16} />
            {isPuzzle ? 'NEW PUZZLE' : 'NEW GAME'}
          </button>

          <button onClick={handleMenu}
            className="w-full py-3 rounded-lg font-bold tracking-wide flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all border border-slate-700"
          >
            <Home size={16} />
            MAIN MENU
          </button>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }

        @keyframes modal-pop {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          70% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-pop { animation: modal-pop 0.4s ease-out; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 2s ease-in-out infinite; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out infinite; }

        @keyframes expand-ring {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        .animate-expand-ring { animation: expand-ring 2s ease-out infinite; }

        @keyframes scan-vertical {
          0% { left: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        .animate-scan-vertical { animation: scan-vertical 2s ease-in-out infinite; }

        @keyframes explode-out {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(calc(cos(var(--angle)) * var(--distance)), calc(sin(var(--angle)) * var(--distance))) scale(0.5); opacity: 0; }
        }
        .animate-explode-out { animation: explode-out 1.5s ease-out forwards; }

        @keyframes node-glow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
        }
        .animate-node-glow { animation: node-glow 1s ease-in-out infinite; }

        @keyframes line-draw {
          0% { transform-origin: left; transform: scaleX(0) rotate(var(--rotation, 0)); }
          100% { transform: scaleX(1) rotate(var(--rotation, 0)); }
        }
        .animate-line-draw { animation: line-draw 0.5s ease-out forwards; }

        @keyframes static-noise {
          0%, 100% { background-position: 0 0; }
          10% { background-position: -5% -10%; }
          30% { background-position: 3% 5%; }
          50% { background-position: -2% 8%; }
          70% { background-position: 5% -5%; }
          90% { background-position: -3% 2%; }
        }
        .animate-static-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          animation: static-noise 0.2s steps(5) infinite;
        }

        @keyframes scan-down {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan-down { animation: scan-down 1s linear infinite; }

        @keyframes glitch-slice {
          0%, 100% { transform: translateX(0); opacity: 0; }
          20% { transform: translateX(-20px); opacity: 1; }
          40% { transform: translateX(20px); opacity: 0.5; }
          60% { transform: translateX(-10px); opacity: 1; }
          80% { transform: translateX(10px); opacity: 0; }
        }
        .animate-glitch-slice { animation: glitch-slice 1.5s ease-in-out infinite; }

        @keyframes fall-glitch {
          0% { top: -20px; opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        .animate-fall-glitch { animation: fall-glitch 2s linear infinite; }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink { animation: blink 1s step-end infinite; }

        @keyframes shard-fall {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--fall-x)), calc(-50% + 200px)) rotate(var(--rotation)); opacity: 0; }
        }
        .animate-shard-fall { animation: shard-fall 1.5s ease-in forwards; }
      `}</style>
    </div>
  );
};

export default GameOverModal;
