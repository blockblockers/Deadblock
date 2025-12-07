import { useState, useEffect, useMemo } from 'react';
import { Trophy, Skull, RotateCcw, RefreshCw, Home, X } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { pieces, pieceColors } from '../utils/pieces';

// ====== WIN ANIMATIONS ======

// 1. Neon Pulse - Expanding rings of light
const NeonPulse = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
    {[0, 1, 2, 3, 4].map(i => (
      <div
        key={i}
        className="absolute rounded-full border-2 animate-neon-pulse"
        style={{
          width: '100px',
          height: '100px',
          borderColor: i % 2 === 0 ? '#22d3ee' : '#ec4899',
          animationDelay: `${i * 0.3}s`,
          boxShadow: `0 0 20px ${i % 2 === 0 ? '#22d3ee' : '#ec4899'}`,
        }}
      />
    ))}
    {/* Center glow */}
    <div className="absolute w-32 h-32 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full blur-3xl opacity-50 animate-pulse" />
  </div>
);

// 2. Falling Pentomino Pieces
const PieceCascade = () => {
  const fallingPieces = useMemo(() => {
    const pieceNames = Object.keys(pieces);
    const colors = ['bg-cyan-400', 'bg-pink-500', 'bg-purple-500', 'bg-green-400', 'bg-amber-400'];
    
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      piece: pieceNames[Math.floor(Math.random() * pieceNames.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 4
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {fallingPieces.map(p => {
        const coords = pieces[p.piece];
        const minX = Math.min(...coords.map(([x]) => x));
        const minY = Math.min(...coords.map(([, y]) => y));
        
        return (
          <div
            key={p.id}
            className="absolute animate-piece-fall"
            style={{
              left: `${p.left}%`,
              top: '-50px',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `rotate(${p.rotation}deg)`,
            }}
          >
            <div className="relative" style={{ filter: `drop-shadow(0 0 ${p.size}px currentColor)` }}>
              {coords.map(([x, y], idx) => (
                <div
                  key={idx}
                  className={`absolute ${p.color} rounded-sm opacity-80`}
                  style={{
                    width: p.size,
                    height: p.size,
                    left: (x - minX) * (p.size + 1),
                    top: (y - minY) * (p.size + 1),
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

// 3. Circuit Victory - Lines lighting up
const CircuitVictory = () => {
  const lines = useMemo(() => 
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      startX: Math.random() * 100,
      startY: Math.random() * 100,
      angle: Math.random() * 360,
      length: 50 + Math.random() * 100,
      delay: Math.random() * 1.5,
      color: ['#22d3ee', '#a855f7', '#22c55e'][Math.floor(Math.random() * 3)]
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-20 animate-grid-pulse"
        style={{
          backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}
      />
      
      {/* Glowing lines */}
      {lines.map(line => (
        <div
          key={line.id}
          className="absolute animate-circuit-trace"
          style={{
            left: `${line.startX}%`,
            top: `${line.startY}%`,
            width: line.length,
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${line.color}, transparent)`,
            transform: `rotate(${line.angle}deg)`,
            animationDelay: `${line.delay}s`,
            boxShadow: `0 0 10px ${line.color}`,
          }}
        />
      ))}
      
      {/* Corner nodes */}
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="absolute w-3 h-3 bg-cyan-400 rounded-full animate-node-pulse"
          style={{
            left: i % 2 === 0 ? '20%' : '80%',
            top: i < 2 ? '20%' : '80%',
            animationDelay: `${i * 0.2}s`,
            boxShadow: '0 0 15px #22d3ee',
          }}
        />
      ))}
    </div>
  );
};

// ====== LOSS ANIMATIONS ======

// 1. Glitch Effect - Screen corruption
const GlitchEffect = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Scan lines */}
    <div 
      className="absolute inset-0 opacity-30 animate-scanlines"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
      }}
    />
    
    {/* RGB Split glitch bars */}
    {[0, 1, 2, 3, 4].map(i => (
      <div
        key={i}
        className="absolute w-full animate-glitch-bar"
        style={{
          height: 20 + Math.random() * 40,
          top: `${i * 20 + Math.random() * 10}%`,
          background: `linear-gradient(90deg, 
            rgba(255,0,0,0.3) 0%, 
            rgba(0,255,255,0.3) 33%, 
            rgba(255,0,255,0.3) 66%, 
            transparent 100%)`,
          animationDelay: `${i * 0.15}s`,
        }}
      />
    ))}
    
    {/* Flicker overlay */}
    <div className="absolute inset-0 bg-red-500/10 animate-flicker" />
  </div>
);

// 2. System Error - Cascading errors
const SystemError = () => {
  const errors = useMemo(() => [
    'ERROR 0x4E4F4D4F5645',
    'BLOCK_PLACEMENT_FAILED',
    'SYSTEM.DEFEAT.CRITICAL',
    'OPPONENT.ADVANTAGE++',
    'RETRY? [Y/N]',
    'GAME_STATE: TERMINATED',
    'AI.VICTORY.CONFIRMED',
  ], []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden font-mono">
      {/* Static noise */}
      <div className="absolute inset-0 opacity-10 animate-static" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Error messages */}
      {errors.map((error, i) => (
        <div
          key={i}
          className="absolute text-red-500 text-xs sm:text-sm animate-error-cascade whitespace-nowrap"
          style={{
            left: `${5 + Math.random() * 60}%`,
            top: `${10 + i * 12}%`,
            animationDelay: `${i * 0.2}s`,
            textShadow: '0 0 10px #ef4444',
          }}
        >
          {'>'} {error}
        </div>
      ))}
      
      {/* Blinking cursor */}
      <div 
        className="absolute bottom-1/4 left-1/4 text-red-400 animate-blink text-lg"
        style={{ textShadow: '0 0 10px #ef4444' }}
      >
        _
      </div>
    </div>
  );
};

// 3. Grid Collapse - Board breaking apart
const GridCollapse = () => {
  const cells = useMemo(() => 
    Array.from({ length: 64 }).map((_, i) => ({
      id: i,
      row: Math.floor(i / 8),
      col: i % 8,
      delay: Math.random() * 0.8,
      fallDirection: Math.random() > 0.5 ? 1 : -1,
      rotation: (Math.random() - 0.5) * 180,
    })), []
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative" style={{ width: 160, height: 160 }}>
        {cells.map(cell => (
          <div
            key={cell.id}
            className="absolute bg-slate-700 border border-red-500/50 animate-cell-fall"
            style={{
              width: 18,
              height: 18,
              left: cell.col * 20,
              top: cell.row * 20,
              animationDelay: `${cell.delay}s`,
              '--fall-direction': cell.fallDirection,
              '--rotation': `${cell.rotation}deg`,
              boxShadow: '0 0 5px rgba(239,68,68,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ====== MAIN MODAL COMPONENT ======

const GameOverModal = ({ isWin, isPuzzle, gameMode, onClose, onRetry, onNewGame, onMenu }) => {
  const [animationType, setAnimationType] = useState(0);

  useEffect(() => {
    setAnimationType(Math.floor(Math.random() * 3));
  }, []);

  const handleRetry = () => {
    soundManager.playButtonClick();
    onClose();
    onRetry();
  };

  const handleNewGame = () => {
    soundManager.playButtonClick();
    onClose();
    onNewGame();
  };

  const handleMenu = () => {
    soundManager.playButtonClick();
    onClose();
    onMenu();
  };

  // Themed win animations
  const winAnimations = [
    <NeonPulse key="pulse" />,
    <PieceCascade key="pieces" />,
    <CircuitVictory key="circuit" />
  ];

  // Themed loss animations  
  const lossAnimations = [
    <GlitchEffect key="glitch" />,
    <SystemError key="error" />,
    <GridCollapse key="collapse" />
  ];

  const currentAnimation = isWin ? winAnimations[animationType] : lossAnimations[animationType];

  // Cyberpunk themed titles
  const winTitles = [
    'VICTORY.EXE',
    'SYSTEM.WIN',
    isPuzzle ? 'PUZZLE.SOLVED' : 'DOMINATION'
  ];

  const lossTitles = [
    'DEFEAT.ERR',
    'SYSTEM.FAIL',
    isPuzzle ? 'BLOCKED.OUT' : 'AI.SUPERIOR'
  ];

  const title = isWin ? winTitles[animationType] : lossTitles[animationType];

  const subtitle = isWin
    ? isPuzzle ? 'Sequence completed successfully' : 'Opponent has been neutralized'
    : isPuzzle ? 'No valid moves remaining' : 'Connection terminated by opponent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Animation layer */}
      {currentAnimation}
      
      {/* Modal */}
      <div className={`relative bg-slate-900/95 rounded-xl p-6 sm:p-8 max-w-sm w-full border-2 
        ${isWin 
          ? 'border-cyan-500/50 shadow-[0_0_50px_rgba(34,211,238,0.4)]' 
          : 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)]'
        } animate-modal-pop`}
      >
        {/* Scanline overlay on modal */}
        <div 
          className="absolute inset-0 rounded-xl opacity-10 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          {isWin ? (
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-xl animate-pulse" />
              <Trophy size={64} className="relative text-cyan-400 animate-float" />
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse" />
              <Skull size={64} className="relative text-red-400 animate-shake" />
            </div>
          )}
        </div>

        {/* Title - Cyberpunk style */}
        <h2 className={`text-center text-2xl sm:text-3xl font-bold mb-1 tracking-widest font-mono
          ${isWin 
            ? 'text-cyan-400' 
            : 'text-red-400'
          }`}
          style={{ 
            textShadow: isWin 
              ? '0 0 20px #22d3ee, 0 0 40px #22d3ee' 
              : '0 0 20px #ef4444, 0 0 40px #ef4444'
          }}
        >
          {title}
        </h2>

        {/* Subtitle */}
        <p className="text-center text-slate-500 text-xs mb-6 font-mono tracking-wide">
          {'>'} {subtitle}
        </p>

        {/* Buttons */}
        <div className="space-y-2 relative z-10">
          {/* Retry / Play Again */}
          <button
            onClick={handleRetry}
            className={`w-full py-3 rounded-lg font-bold tracking-wider flex items-center justify-center gap-2 transition-all font-mono text-sm
              ${isWin
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              } border border-white/10`}
          >
            <RotateCcw size={16} />
            {isPuzzle ? 'RETRY.PUZZLE' : 'REMATCH'}
          </button>

          {/* New Game / New Puzzle */}
          <button
            onClick={handleNewGame}
            className="w-full py-3 rounded-lg font-bold tracking-wider flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all border border-slate-600 font-mono text-sm"
          >
            <RefreshCw size={16} />
            {isPuzzle ? 'NEW.PUZZLE' : 'NEW.GAME'}
          </button>

          {/* Menu */}
          <button
            onClick={handleMenu}
            className="w-full py-3 rounded-lg font-bold tracking-wider flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all border border-slate-700 font-mono text-sm"
          >
            <Home size={16} />
            MAIN.MENU
          </button>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        @keyframes modal-pop {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          70% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-pop {
          animation: modal-pop 0.4s ease-out;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          20% { transform: translateX(-3px) rotate(-2deg); }
          40% { transform: translateX(3px) rotate(2deg); }
          60% { transform: translateX(-3px) rotate(-2deg); }
          80% { transform: translateX(3px) rotate(2deg); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }

        /* WIN: Neon Pulse */
        @keyframes neon-pulse {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(8); opacity: 0; }
        }
        .animate-neon-pulse {
          animation: neon-pulse 2s ease-out infinite;
        }

        /* WIN: Piece Cascade */
        @keyframes piece-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .animate-piece-fall {
          animation: piece-fall 3s ease-in forwards;
        }

        /* WIN: Circuit Victory */
        @keyframes circuit-trace {
          0% { opacity: 0; transform: scaleX(0); }
          50% { opacity: 1; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(1); }
        }
        .animate-circuit-trace {
          animation: circuit-trace 1.5s ease-out infinite;
          transform-origin: left center;
        }

        @keyframes grid-pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        .animate-grid-pulse {
          animation: grid-pulse 1.5s ease-in-out infinite;
        }

        @keyframes node-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        .animate-node-pulse {
          animation: node-pulse 1s ease-in-out infinite;
        }

        /* LOSS: Glitch Effect */
        @keyframes glitch-bar {
          0%, 100% { transform: translateX(0); opacity: 0; }
          10%, 30% { transform: translateX(-10px); opacity: 0.7; }
          20% { transform: translateX(10px); opacity: 0.5; }
          40%, 60% { transform: translateX(5px); opacity: 0; }
          70%, 90% { transform: translateX(-5px); opacity: 0.3; }
        }
        .animate-glitch-bar {
          animation: glitch-bar 2s ease-in-out infinite;
        }

        @keyframes flicker {
          0%, 100% { opacity: 0; }
          5%, 15%, 25%, 35% { opacity: 0.1; }
          10%, 20%, 30% { opacity: 0; }
        }
        .animate-flicker {
          animation: flicker 0.5s ease-in-out infinite;
        }

        @keyframes scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        .animate-scanlines {
          animation: scanlines 0.1s linear infinite;
        }

        /* LOSS: System Error */
        @keyframes error-cascade {
          0% { opacity: 0; transform: translateX(-20px); }
          20% { opacity: 1; transform: translateX(0); }
          80% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0.3; transform: translateX(10px); }
        }
        .animate-error-cascade {
          animation: error-cascade 2s ease-out infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }

        @keyframes static {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2px, 2px); }
          20% { transform: translate(2px, -2px); }
          30% { transform: translate(-2px, -2px); }
          40% { transform: translate(2px, 2px); }
        }
        .animate-static {
          animation: static 0.2s linear infinite;
        }

        /* LOSS: Grid Collapse */
        @keyframes cell-fall {
          0% { 
            transform: translateY(0) translateX(0) rotate(0deg); 
            opacity: 1; 
          }
          100% { 
            transform: 
              translateY(200px) 
              translateX(calc(var(--fall-direction) * 50px)) 
              rotate(var(--rotation)); 
            opacity: 0; 
          }
        }
        .animate-cell-fall {
          animation: cell-fall 1.5s ease-in forwards;
        }
      `}</style>
    </div>
  );
};

export default GameOverModal;
