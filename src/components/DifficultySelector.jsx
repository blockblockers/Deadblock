import { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { pieces } from '../utils/pieces';

// Dramatically different themes for each difficulty
const themes = {
  beginner: {
    gridColor: 'rgba(34,197,94,0.5)',
    glow1: { color: 'bg-green-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-emerald-400/30', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-lime-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-green-950/50 to-slate-900/95',
    cardBorder: 'border-green-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(34,197,94,0.4),inset_0_0_30px_rgba(34,197,94,0.1)]',
    floatingColors: [
      { color: '#22c55e', glow: 'rgba(34,197,94,0.6)' },
      { color: '#10b981', glow: 'rgba(16,185,129,0.6)' },
      { color: '#84cc16', glow: 'rgba(132,204,22,0.6)' },
    ],
  },
  intermediate: {
    gridColor: 'rgba(251,191,36,0.5)',
    glow1: { color: 'bg-amber-500/40', pos: 'top-10 right-20' },
    glow2: { color: 'bg-orange-500/35', pos: 'bottom-20 left-10' },
    glow3: { color: 'bg-red-500/20', pos: 'top-1/3 left-1/3' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/50 to-slate-900/95',
    cardBorder: 'border-amber-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(251,191,36,0.4),inset_0_0_30px_rgba(251,191,36,0.1)]',
    floatingColors: [
      { color: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
      { color: '#f97316', glow: 'rgba(249,115,22,0.6)' },
      { color: '#fbbf24', glow: 'rgba(251,191,36,0.6)' },
    ],
  },
  expert: {
    gridColor: 'rgba(168,85,247,0.5)',
    glow1: { color: 'bg-purple-500/40', pos: 'top-16 left-20' },
    glow2: { color: 'bg-pink-500/35', pos: 'bottom-24 right-16' },
    glow3: { color: 'bg-violet-500/25', pos: 'top-2/3 right-1/3' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-purple-950/50 to-slate-900/95',
    cardBorder: 'border-purple-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(168,85,247,0.4),inset_0_0_30px_rgba(168,85,247,0.1)]',
    floatingColors: [
      { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },
      { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },
      { color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' },
    ],
  },
};

const difficulties = [
  { 
    id: AI_DIFFICULTY.RANDOM, 
    name: 'BEGINNER', 
    subtitle: 'Random Moves', 
    description: 'A.I. plays randomly. Perfect for learning the game.', 
    theme: 'beginner',
    colors: {
      gradient: 'from-green-600 to-emerald-600',
      glow: 'rgba(34,197,94,0.6)',
      text: 'text-green-300',
      ring: 'ring-green-500/50',
      bg: 'bg-green-900/30',
      border: 'border-green-500/40',
    }
  },
  { 
    id: AI_DIFFICULTY.AVERAGE, 
    name: 'INTERMEDIATE', 
    subtitle: 'Strategic', 
    description: 'A.I. uses strategy and thinks ahead.', 
    theme: 'intermediate',
    colors: {
      gradient: 'from-amber-500 to-orange-600',
      glow: 'rgba(251,191,36,0.6)',
      text: 'text-amber-300',
      ring: 'ring-amber-500/50',
      bg: 'bg-amber-900/30',
      border: 'border-amber-500/40',
    }
  },
  { 
    id: AI_DIFFICULTY.PROFESSIONAL, 
    name: 'EXPERT', 
    subtitle: 'Advanced A.I.', 
    description: 'A.I. analyzes deeply and plays to win.', 
    theme: 'expert',
    colors: {
      gradient: 'from-purple-500 to-pink-600',
      glow: 'rgba(168,85,247,0.6)',
      text: 'text-purple-300',
      ring: 'ring-purple-500/50',
      bg: 'bg-purple-900/30',
      border: 'border-purple-500/40',
    }
  }
];

// Floating pentomino piece component
const FloatingPiece = ({ piece, startX, startY, delay, duration, color, glowColor, size, rotation }) => {
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
};

// Floating pieces background - themed based on selected difficulty
const FloatingPiecesBackground = ({ colorSet }) => {
  const floatingPieces = useMemo(() => {
    const pieceNames = Object.keys(pieces);
    const colors = colorSet || [
      { color: '#22d3ee', glow: 'rgba(34,211,238,0.6)' },
      { color: '#ec4899', glow: 'rgba(236,72,153,0.6)' },
      { color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },
    ];
    
    return Array.from({ length: 10 }).map((_, i) => {
      const colorChoice = colors[i % colors.length];
      return {
        id: i,
        piece: pieceNames[Math.floor(Math.random() * pieceNames.length)],
        startX: Math.random() * 100,
        startY: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 15 + Math.random() * 10,
        color: colorChoice.color,
        glowColor: colorChoice.glow,
        size: 0.6 + Math.random() * 0.6,
        rotation: Math.random() * 360,
      };
    });
  }, [colorSet]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {floatingPieces.map((p) => (
        <FloatingPiece key={p.id} {...p} />
      ))}
    </div>
  );
};

const DifficultySelector = ({ selectedDifficulty, onSelectDifficulty, onStartGame, onBack }) => {
  const { needsScroll } = useResponsiveLayout(700);
  const [aiGoesFirst, setAiGoesFirst] = useState(false);

  const selectedDiff = difficulties.find(d => d.id === selectedDifficulty) || difficulties[0];
  const theme = themes[selectedDiff.theme];

  const handleSelect = (diffId) => {
    soundManager.playClickSound('select');
    onSelectDifficulty(diffId);
  };

  const handleStart = () => {
    soundManager.playButtonClick();
    onStartGame(aiGoesFirst);
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  const toggleAiFirst = () => {
    soundManager.playClickSound('select');
    setAiGoesFirst(!aiGoesFirst);
  };

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } : {}}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-40 pointer-events-none transition-all duration-700" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Multiple themed glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-80 h-80 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      <div className={`fixed ${theme.glow2.pos} w-72 h-72 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      <div className={`fixed ${theme.glow3.pos} w-64 h-64 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      
      {/* Floating pentomino pieces - themed */}
      <FloatingPiecesBackground colorSet={theme.floatingColors} />
      
      {/* Animation keyframes */}
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
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-md">
          {/* Title - Centered and Large */}
          <div className="text-center mb-6">
            <NeonTitle size="large" />
            <NeonSubtitle text="VS A.I. MODE" size="default" className="mt-2" />
          </div>

          {/* Card with dramatic theme */}
          <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow} transition-all duration-500`}>
            
            {/* Difficulty Options */}
            <div className="space-y-3 mb-5">
              {difficulties.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <button 
                    key={diff.id} 
                    onClick={() => handleSelect(diff.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden ${
                      isSelected 
                        ? `bg-gradient-to-r ${diff.colors.gradient} border-white/40 ring-4 ${diff.colors.ring}` 
                        : `${diff.colors.bg} ${diff.colors.border} hover:bg-opacity-50`
                    }`}
                    style={isSelected ? { boxShadow: `0 0 40px ${diff.colors.glow}` } : {}}
                  >
                    {/* Animated shine on selected */}
                    {isSelected && (
                      <div className="absolute inset-0 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine" />
                      </div>
                    )}
                    
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-black tracking-wide text-lg ${isSelected ? 'text-white' : diff.colors.text}`}>
                            {diff.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700/50 text-slate-400'}`}>
                            {diff.subtitle}
                          </span>
                        </div>
                        <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {diff.description}
                        </p>
                      </div>
                      
                      {/* Selection indicator */}
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 ${
                        isSelected ? 'border-white bg-white' : 'border-slate-600'
                      }`}>
                        {isSelected && <div className="w-3 h-3 rounded-full bg-slate-900" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* AI Goes First Toggle - Enhanced Cyberpunk Style */}
            <div className="mb-5 p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1),inset_0_0_30px_rgba(0,0,0,0.3)]">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="text-xs font-bold tracking-widest text-cyan-300/90">TURN ORDER</span>
                <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
              </div>
              
              <button
                onClick={toggleAiFirst}
                className="w-full flex items-center justify-between group"
              >
                <div className="text-left">
                  <div className={`text-sm font-semibold transition-colors ${aiGoesFirst ? 'text-purple-300' : 'text-cyan-300'}`}>
                    {aiGoesFirst ? 'A.I. Leads' : 'You Lead'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {aiGoesFirst ? 'A.I. makes the first move' : 'You make the first move'}
                  </div>
                </div>
                
                {/* Enhanced Toggle Switch */}
                <div className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                  aiGoesFirst 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-800 shadow-[0_0_15px_rgba(168,85,247,0.5),inset_0_2px_4px_rgba(0,0,0,0.3)]' 
                    : 'bg-gradient-to-r from-cyan-600 to-cyan-800 shadow-[0_0_15px_rgba(34,211,238,0.5),inset_0_2px_4px_rgba(0,0,0,0.3)]'
                }`}>
                  <div className={`absolute top-1 w-6 h-6 rounded-full transition-all duration-300 ${
                    aiGoesFirst 
                      ? 'translate-x-9 bg-gradient-to-br from-purple-300 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]' 
                      : 'translate-x-1 bg-gradient-to-br from-cyan-300 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]'
                  }`}>
                    <div className="absolute inset-0 rounded-full bg-white/30" />
                  </div>
                </div>
              </button>
              
              {/* Turn Order Visualization */}
              <div className="flex items-center justify-center gap-2 mt-4 p-2 bg-slate-900/50 rounded-lg">
                {/* First Player */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  !aiGoesFirst 
                    ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'bg-purple-500/20 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${!aiGoesFirst ? 'bg-cyan-400' : 'bg-purple-400'} animate-pulse`} />
                  <span className={`text-xs font-bold tracking-wide ${!aiGoesFirst ? 'text-cyan-300' : 'text-purple-300'}`}>
                    {aiGoesFirst ? 'A.I.' : 'YOU'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 font-medium">1ST</span>
                </div>
                
                {/* Arrow */}
                <div className="flex items-center">
                  <div className={`w-8 h-0.5 ${!aiGoesFirst ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'bg-gradient-to-r from-purple-500 to-cyan-500'}`} />
                  <div className={`w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent ${!aiGoesFirst ? 'border-l-purple-500' : 'border-l-cyan-500'}`} 
                       style={{ borderLeftWidth: '8px' }} />
                </div>
                
                {/* Second Player */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  aiGoesFirst 
                    ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'bg-purple-500/20 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${aiGoesFirst ? 'bg-cyan-400' : 'bg-purple-400'}`} />
                  <span className={`text-xs font-bold tracking-wide ${aiGoesFirst ? 'text-cyan-300' : 'text-purple-300'}`}>
                    {aiGoesFirst ? 'YOU' : 'A.I.'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 font-medium">2ND</span>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button 
              onClick={handleStart}
              className={`w-full p-4 rounded-xl font-black tracking-wider text-lg transition-all flex items-center justify-center gap-3 text-white bg-gradient-to-r ${selectedDiff.colors.gradient} hover:scale-[1.02] active:scale-[0.98]`}
              style={{ boxShadow: `0 0 30px ${selectedDiff.colors.glow}` }}
            >
              START {selectedDiff.name} GAME
            </button>
            
            {/* Back button - Themed */}
            <button 
              onClick={handleBack}
              className="w-full mt-4 py-3 px-4 rounded-xl font-bold text-base text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 hover:border-slate-500/50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(100,116,139,0.2)]"
            >
              <ArrowLeft size={18} />
              BACK TO MENU
            </button>
          </div>
        </div>
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>
      
      {/* Shine animation */}
      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shine {
          animation: shine 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default DifficultySelector;
