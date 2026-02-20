// PuzzleTypeSelect.jsx - Choose between Creator Puzzles and Generated Puzzles
// v2.0: Animated pentomino showcase + expanded mode comparison cards
import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Cpu, Trophy, Zap, Target, Infinity } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import FloatingPieces from './FloatingPieces';

// Pentomino piece definitions (5x5 grid representations)
const PENTOMINO_PIECES = [
  { 
    name: 'F', 
    shape: [[0,1,1],[1,1,0],[0,1,0]],
    color: '#f87171' // red
  },
  { 
    name: 'I', 
    shape: [[1],[1],[1],[1],[1]],
    color: '#60a5fa' // blue
  },
  { 
    name: 'L', 
    shape: [[1,0],[1,0],[1,0],[1,1]],
    color: '#fbbf24' // amber
  },
  { 
    name: 'N', 
    shape: [[0,1],[1,1],[1,0],[1,0]],
    color: '#a78bfa' // purple
  },
  { 
    name: 'P', 
    shape: [[1,1],[1,1],[1,0]],
    color: '#f472b6' // pink
  },
  { 
    name: 'T', 
    shape: [[1,1,1],[0,1,0],[0,1,0]],
    color: '#2dd4bf' // teal
  },
  { 
    name: 'U', 
    shape: [[1,0,1],[1,1,1]],
    color: '#fb923c' // orange
  },
  { 
    name: 'V', 
    shape: [[1,0,0],[1,0,0],[1,1,1]],
    color: '#4ade80' // green
  },
  { 
    name: 'W', 
    shape: [[1,0,0],[1,1,0],[0,1,1]],
    color: '#c084fc' // violet
  },
  { 
    name: 'X', 
    shape: [[0,1,0],[1,1,1],[0,1,0]],
    color: '#f43f5e' // rose
  },
  { 
    name: 'Y', 
    shape: [[0,1],[1,1],[0,1],[0,1]],
    color: '#38bdf8' // sky
  },
  { 
    name: 'Z', 
    shape: [[1,1,0],[0,1,0],[0,1,1]],
    color: '#a3e635' // lime
  },
];

// Animated Pentomino Showcase Component
const PentominoShowcase = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % PENTOMINO_PIECES.length);
        setIsTransitioning(false);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const piece = PENTOMINO_PIECES[currentIndex];
  const cellSize = 12;

  // Calculate piece dimensions
  const rows = piece.shape.length;
  const cols = Math.max(...piece.shape.map(row => row.length));

  return (
    <div className="flex flex-col items-center mb-4">
      {/* Piece display area */}
      <div 
        className={`relative p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 transition-all duration-300 ${
          isTransitioning ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
        }`}
        style={{
          boxShadow: `0 0 30px ${piece.color}40, inset 0 0 20px ${piece.color}20`
        }}
      >
        {/* Piece grid */}
        <div 
          className="grid gap-0.5"
          style={{ 
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`
          }}
        >
          {piece.shape.flatMap((row, rowIdx) => 
            row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="rounded-sm transition-all"
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: cell ? piece.color : 'transparent',
                  boxShadow: cell ? `0 0 8px ${piece.color}, inset 0 0 4px rgba(255,255,255,0.3)` : 'none',
                }}
              />
            ))
          )}
        </div>

        {/* Glowing ring animation */}
        <div 
          className="absolute inset-0 rounded-xl animate-pulse"
          style={{ 
            boxShadow: `0 0 20px ${piece.color}60`,
            animationDuration: '2s'
          }}
        />
      </div>

      {/* Piece name */}
      <div className="mt-2 flex items-center gap-2">
        <span 
          className="text-lg font-black tracking-widest"
          style={{ 
            color: piece.color,
            textShadow: `0 0 10px ${piece.color}`
          }}
        >
          {piece.name}-PIECE
        </span>
      </div>

      {/* Piece indicators */}
      <div className="flex gap-1 mt-2">
        {PENTOMINO_PIECES.map((_, idx) => (
          <div
            key={idx}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-4' : ''
            }`}
            style={{
              backgroundColor: idx === currentIndex ? piece.color : 'rgba(100,116,139,0.5)'
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Cyan theme for puzzle type screen
const theme = {
  gridColor: 'rgba(34, 211, 238, 0.25)',
  glow1: { color: 'bg-cyan-500/30', pos: 'top-20 right-10' },
  glow2: { color: 'bg-purple-500/25', pos: 'bottom-32 left-10' },
  glow3: { color: 'bg-pink-500/20', pos: 'top-1/2 left-1/4' },
};

// Enhanced puzzle type options with more details
const puzzleTypes = [
  {
    id: 'creator',
    name: 'CREATOR',
    tagline: 'Hand-Crafted Challenges',
    description: 'Carefully designed puzzles with a single winning path',
    features: [
      { icon: Trophy, text: '100 unique puzzles' },
      { icon: Target, text: '4 difficulty tiers' },
      { icon: Sparkles, text: 'Find the winning move' },
    ],
    colors: {
      gradient: 'from-cyan-500 to-sky-600',
      glow: 'rgba(34,211,238,0.6)',
      text: 'text-cyan-300',
      bg: 'bg-cyan-950/40',
      border: 'border-cyan-500/40',
      featureText: 'text-cyan-400',
    }
  },
  {
    id: 'generated',
    name: 'GENERATED',
    tagline: 'Infinite Possibilities',
    description: 'AI-generated puzzles for endless practice',
    features: [
      { icon: Infinity, text: 'Unlimited puzzles' },
      { icon: Cpu, text: '3 difficulty levels' },
      { icon: Zap, text: 'Speed mode challenge' },
    ],
    colors: {
      gradient: 'from-purple-500 to-pink-600',
      glow: 'rgba(168,85,247,0.6)',
      text: 'text-purple-300',
      bg: 'bg-purple-950/40',
      border: 'border-purple-500/40',
      featureText: 'text-purple-400',
    }
  },
];

const PuzzleTypeSelect = ({ 
  onSelectCreator, 
  onSelectGenerated, 
  onBack,
}) => {
  const { needsScroll } = useResponsiveLayout(750);
  const [selectedType, setSelectedType] = useState('creator');

  const handleSelectType = (typeId) => {
    soundManager.playClickSound('select');
    setSelectedType(typeId);
  };

  const handleStart = () => {
    soundManager.playButtonClick();
    if (selectedType === 'creator') {
      onSelectCreator?.();
    } else {
      onSelectGenerated?.();
    }
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack?.();
  };

  const selectedTypeData = puzzleTypes.find(t => t.id === selectedType) || puzzleTypes[0];

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
    >
      {/* Themed Grid background */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.98)),
            repeating-linear-gradient(0deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px),
            repeating-linear-gradient(90deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px)
          `,
        }}
      />
      
      {/* Floating pieces background */}
      <FloatingPieces />

      {/* Animated glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-64 h-64 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '4s' }} />
      <div className={`fixed ${theme.glow2.pos} w-56 h-56 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '6s' }} />
      <div className={`fixed ${theme.glow3.pos} w-48 h-48 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '5s' }} />

      {/* Main Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 py-6`}>
        <div className="w-full max-w-md">
          
          {/* Title */}
          <div className="text-center mb-3">
            <NeonTitle size="large" />
            <NeonSubtitle text="PUZZLE MODE" size="small" className="mt-1" />
          </div>

          {/* Animated Pentomino Showcase */}
          <PentominoShowcase />

          {/* Mode Selection Cards */}
          <div className="space-y-3 mb-4">
            {puzzleTypes.map(type => {
              const isSelected = selectedType === type.id;
              
              return (
                <button
                  key={type.id}
                  onClick={() => handleSelectType(type.id)}
                  className={`w-full p-4 rounded-xl transition-all relative overflow-hidden text-left ${
                    isSelected 
                      ? `${type.colors.bg} border-2 ${type.colors.border}` 
                      : 'bg-slate-900/60 border border-slate-700/50 hover:border-slate-600'
                  }`}
                  style={isSelected ? { boxShadow: `0 0 25px ${type.colors.glow}, inset 0 0 30px ${type.colors.glow}20` } : {}}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className={`font-black tracking-wide text-lg ${isSelected ? type.colors.text : 'text-slate-300'}`}>
                        {type.name}
                      </h3>
                      <p className={`text-xs font-medium ${isSelected ? type.colors.featureText : 'text-slate-500'}`}>
                        {type.tagline}
                      </p>
                    </div>
                    
                    {/* Selection indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? `border-current ${type.colors.text}` : 'border-slate-600'
                    }`}>
                      {isSelected && (
                        <div 
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: type.colors.glow.replace('0.6', '1') }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className={`text-sm mb-3 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {type.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {type.features.map((feature, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                          isSelected 
                            ? `bg-slate-900/50 ${type.colors.featureText}` 
                            : 'bg-slate-800/50 text-slate-500'
                        }`}
                      >
                        <feature.icon size={12} />
                        <span>{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Selected glow effect */}
                  {isSelected && (
                    <div 
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, ${type.colors.glow}10, transparent 50%, ${type.colors.glow}05)`
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Start Button */}
          <button 
            onClick={handleStart}
            className={`w-full p-3 rounded-xl font-black tracking-wider text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${selectedTypeData.colors.gradient} text-white hover:scale-[1.02] active:scale-[0.98]`}
            style={{ boxShadow: `0 0 25px ${selectedTypeData.colors.glow}` }}
          >
            START {selectedTypeData.name} PUZZLES
          </button>
          
          {/* Back button */}
          <button 
            onClick={handleBack}
            className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-sm text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 transition-all border border-slate-700/50 hover:border-slate-600/50 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};

export default PuzzleTypeSelect;
