import { useState } from 'react';
import { Trophy, Loader, AlertCircle, Play } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { pieces } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';
import { getRandomPuzzle, PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Theme configurations (same as DifficultySelector)
const themes = {
  easy: {
    gridColor: 'rgba(34,197,94,0.3)',
    glow1: 'bg-green-500/25',
    glow2: 'bg-emerald-500/20',
    cardBorder: 'border-green-500/40',
    cardShadow: 'shadow-[0_0_50px_rgba(34,197,94,0.3)]',
  },
  medium: {
    gridColor: 'rgba(251,191,36,0.3)',
    glow1: 'bg-amber-500/25',
    glow2: 'bg-orange-500/20',
    cardBorder: 'border-amber-500/40',
    cardShadow: 'shadow-[0_0_50px_rgba(251,191,36,0.3)]',
  },
  hard: {
    gridColor: 'rgba(168,85,247,0.3)',
    glow1: 'bg-purple-500/25',
    glow2: 'bg-pink-500/20',
    cardBorder: 'border-purple-500/40',
    cardShadow: 'shadow-[0_0_50px_rgba(168,85,247,0.3)]',
  },
};

// Mini pentomino shape
const MiniPentomino = ({ pieceName, color, size = 8 }) => {
  const pieceCoords = pieces[pieceName] || pieces.T;
  const minX = Math.min(...pieceCoords.map(([x]) => x));
  const minY = Math.min(...pieceCoords.map(([, y]) => y));
  const normalizedCoords = pieceCoords.map(([x, y]) => [x - minX, y - minY]);
  
  return (
    <div className="relative" style={{ width: size * 4, height: size * 3 }}>
      {normalizedCoords.map(([x, y], idx) => (
        <div
          key={idx}
          className={`absolute ${color} rounded-sm`}
          style={{ width: size, height: size, left: x * (size + 1), top: y * (size + 1) }}
        />
      ))}
    </div>
  );
};

const PuzzleSelect = ({ onSelectPuzzle, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(PUZZLE_DIFFICULTY.EASY);
  const { needsScroll } = useResponsiveLayout(750);

  const difficulties = [
    { 
      id: PUZZLE_DIFFICULTY.EASY, 
      name: 'EASY', 
      moves: 3, 
      pieces: 9, 
      description: '9 pieces placed, finish the last 3', 
      pieceName: 'I', 
      color: 'from-green-500 to-emerald-600', 
      glowColor: 'rgba(34,197,94,0.5)',
      borderColor: 'border-green-500/40', 
      textColor: 'text-green-400', 
      bgColor: 'bg-green-900/20', 
      pieceColor: 'bg-green-400',
      icon: '🌱',
      theme: 'easy',
    },
    { 
      id: PUZZLE_DIFFICULTY.MEDIUM, 
      name: 'MEDIUM', 
      moves: 5, 
      pieces: 7, 
      description: '7 pieces placed, finish the last 5', 
      pieceName: 'T', 
      color: 'from-amber-500 to-orange-600', 
      glowColor: 'rgba(251,191,36,0.5)',
      borderColor: 'border-amber-500/40', 
      textColor: 'text-amber-400', 
      bgColor: 'bg-amber-900/20', 
      pieceColor: 'bg-amber-400',
      icon: '🔥',
      theme: 'medium',
    },
    { 
      id: PUZZLE_DIFFICULTY.HARD, 
      name: 'HARD', 
      moves: 7, 
      pieces: 5, 
      description: '5 pieces placed, finish the last 7', 
      pieceName: 'X', 
      color: 'from-purple-500 to-pink-600', 
      glowColor: 'rgba(168,85,247,0.5)',
      borderColor: 'border-purple-500/40', 
      textColor: 'text-purple-400', 
      bgColor: 'bg-purple-900/20', 
      pieceColor: 'bg-purple-400',
      icon: '✨',
      theme: 'hard',
    }
  ];

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
      <div className="fixed inset-0 opacity-30 pointer-events-none transition-all duration-500" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Themed glow effects */}
      <div className={`fixed top-1/4 left-1/4 w-72 h-72 ${theme.glow1} rounded-full blur-3xl pointer-events-none transition-all duration-500`} />
      <div className={`fixed bottom-1/4 right-1/4 w-72 h-72 ${theme.glow2} rounded-full blur-3xl pointer-events-none transition-all duration-500`} />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-md">
          {/* Title above card */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-1">
              <Trophy size={28} className={selectedDiff.textColor} />
              <NeonTitle size="default" />
            </div>
            <p className="text-slate-400 text-sm">Puzzle Mode - Choose Difficulty</p>
          </div>

          <div className={`bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow} transition-all duration-500`}>

            {/* Difficulty Selection */}
            <div className="space-y-3 mb-5">
              {difficulties.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <button key={diff.id} onClick={() => handleSelectDifficulty(diff.id)} disabled={isLoading}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      isSelected 
                        ? `bg-gradient-to-r ${diff.color} border-white/30 shadow-lg` 
                        : `${diff.bgColor} ${diff.borderColor} hover:bg-slate-700/50`
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={isSelected ? { boxShadow: `0 0 30px ${diff.glowColor}` } : {}}
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon + Pentomino */}
                      <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-700'} flex items-center justify-center`}>
                        <span className="text-xl mr-1">{diff.icon}</span>
                        <MiniPentomino pieceName={diff.pieceName} color={isSelected ? 'bg-white' : diff.pieceColor} size={6} />
                      </div>
                      
                      {/* Text */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold tracking-wide ${isSelected ? 'text-white' : diff.textColor}`}>{diff.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {diff.moves} moves
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{diff.description}</p>
                      </div>
                      
                      {/* Radio indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-white bg-white' : 'border-slate-600'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-slate-900" />}
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
                    <span className={`px-2 py-1 rounded ${i % 2 === 0 ? 'bg-cyan-900/50 text-cyan-400' : 'bg-purple-900/50 text-purple-400'}`}>
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
            <button onClick={handleGeneratePuzzle} disabled={isLoading}
              className={`w-full p-4 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-3 ${
                isLoading 
                  ? 'bg-slate-700 text-slate-400 cursor-wait' 
                  : `bg-gradient-to-r ${selectedDiff.color} text-white hover:opacity-90`
              }`}
              style={!isLoading ? { boxShadow: `0 0 25px ${selectedDiff.glowColor}` } : {}}
            >
              {isLoading ? (
                <>
                  <Loader size={24} className="animate-spin" />
                  <div>
                    <div className="text-sm">GENERATING...</div>
                    <div className="text-xs opacity-70">{progress}%</div>
                  </div>
                </>
              ) : (
                <>
                  <Play size={24} />
                  <span>START {selectedDiff.name} PUZZLE</span>
                </>
              )}
            </button>
            
            {/* Back button */}
            <button onClick={handleBack} disabled={isLoading}
              className="w-full mt-3 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors disabled:opacity-50"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>
    </div>
  );
};

export default PuzzleSelect;
