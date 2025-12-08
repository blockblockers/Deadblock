import { useState } from 'react';
import { Trophy, Loader, AlertCircle, Play } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { getRandomPuzzle, PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Dramatically different themes for each difficulty
const themes = {
  easy: {
    gridColor: 'rgba(34,197,94,0.5)',
    glow1: { color: 'bg-green-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-emerald-400/30', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-lime-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-green-950/50 to-slate-900/95',
    cardBorder: 'border-green-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(34,197,94,0.4),inset_0_0_30px_rgba(34,197,94,0.1)]',
  },
  medium: {
    gridColor: 'rgba(251,191,36,0.5)',
    glow1: { color: 'bg-amber-500/40', pos: 'top-10 right-20' },
    glow2: { color: 'bg-orange-500/35', pos: 'bottom-20 left-10' },
    glow3: { color: 'bg-red-500/20', pos: 'top-1/3 left-1/3' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/50 to-slate-900/95',
    cardBorder: 'border-amber-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(251,191,36,0.4),inset_0_0_30px_rgba(251,191,36,0.1)]',
  },
  hard: {
    gridColor: 'rgba(168,85,247,0.5)',
    glow1: { color: 'bg-purple-500/40', pos: 'top-16 left-20' },
    glow2: { color: 'bg-pink-500/35', pos: 'bottom-24 right-16' },
    glow3: { color: 'bg-violet-500/25', pos: 'top-2/3 right-1/3' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-purple-950/50 to-slate-900/95',
    cardBorder: 'border-purple-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(168,85,247,0.4),inset_0_0_30px_rgba(168,85,247,0.1)]',
  },
};

const difficulties = [
  { 
    id: PUZZLE_DIFFICULTY.EASY, 
    name: 'EASY', 
    moves: 3, 
    description: '3 moves to solve. Great for warming up.', 
    theme: 'easy',
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
    id: PUZZLE_DIFFICULTY.MEDIUM, 
    name: 'MEDIUM', 
    moves: 5, 
    description: '5 moves to solve. A solid challenge.', 
    theme: 'medium',
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
    id: PUZZLE_DIFFICULTY.HARD, 
    name: 'HARD', 
    moves: 7, 
    description: '7 moves to solve. For puzzle masters.', 
    theme: 'hard',
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

const PuzzleSelect = ({ onSelectPuzzle, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(PUZZLE_DIFFICULTY.EASY);
  const { needsScroll } = useResponsiveLayout(750);

  const selectedDiff = difficulties.find(d => d.id === selectedDifficulty) || difficulties[0];
  const theme = themes[selectedDiff.theme];

  const handleSelectDifficulty = (diffId) => {
    soundManager.playClickSound('select');
    setSelectedDifficulty(diffId);
  };

  const handleGeneratePuzzle = async () => {
    soundManager.playButtonClick();
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      const puzzle = await getRandomPuzzle(selectedDifficulty, false, (current, total) => {
        setProgress(Math.round((current / total) * 100));
      });
      
      if (puzzle) {
        setProgress(100);
        await new Promise(r => setTimeout(r, 200));
        onSelectPuzzle(puzzle);
      } else {
        setError('Could not generate puzzle. Try again.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Something went wrong. Try again.');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
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
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-1">
              <Trophy size={28} className={selectedDiff.colors.text} />
              <NeonTitle size="default" />
            </div>
            <p className="text-slate-400 text-sm">Puzzle Mode - Choose Difficulty</p>
          </div>

          {/* Card with dramatic theme */}
          <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow} transition-all duration-500`}>

            {/* Difficulty Selection */}
            <div className="space-y-3 mb-5">
              {difficulties.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <button 
                    key={diff.id} 
                    onClick={() => handleSelectDifficulty(diff.id)} 
                    disabled={isLoading}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden ${
                      isSelected 
                        ? `bg-gradient-to-r ${diff.colors.gradient} border-white/40 ring-4 ${diff.colors.ring}` 
                        : `${diff.colors.bg} ${diff.colors.border} hover:bg-opacity-50`
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={isSelected ? { boxShadow: `0 0 40px ${diff.colors.glow}` } : {}}
                  >
                    {/* Animated shine on selected */}
                    {isSelected && !isLoading && (
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
                            {diff.moves} moves
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

            {/* Turn order info */}
            <div className="mb-5 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-2 text-center">Turn Order</div>
              <div className="flex items-center justify-center gap-1 text-xs flex-wrap">
                {Array.from({ length: selectedDiff.moves }).map((_, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className={`px-2 py-1 rounded font-medium ${i % 2 === 0 ? 'bg-cyan-900/50 text-cyan-400' : 'bg-purple-900/50 text-purple-400'}`}>
                      {i % 2 === 0 ? 'You' : 'AI'}
                    </span>
                    {i < selectedDiff.moves - 1 && <span className="text-slate-600">→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Start Button */}
            <button 
              onClick={handleGeneratePuzzle} 
              disabled={isLoading}
              className={`w-full p-4 rounded-xl font-black tracking-wider text-lg transition-all flex items-center justify-center gap-3 ${
                isLoading 
                  ? 'bg-slate-700 text-slate-400 cursor-wait' 
                  : `bg-gradient-to-r ${selectedDiff.colors.gradient} text-white hover:scale-[1.02] active:scale-[0.98]`
              }`}
              style={!isLoading ? { boxShadow: `0 0 30px ${selectedDiff.colors.glow}` } : {}}
            >
              {isLoading ? (
                <>
                  <Loader size={22} className="animate-spin" />
                  <div className="text-left">
                    <div className="text-sm">GENERATING...</div>
                    <div className="text-xs opacity-70">{progress}%</div>
                  </div>
                </>
              ) : (
                <>
                  <Play size={22} />
                  START {selectedDiff.name} PUZZLE
                </>
              )}
            </button>
            
            {/* Back button */}
            <button 
              onClick={handleBack} 
              disabled={isLoading}
              className="w-full mt-3 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors disabled:opacity-50"
            >
              ← Back to Menu
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

export default PuzzleSelect;
