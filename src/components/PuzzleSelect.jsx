import { useState } from 'react';
import { Trophy, Loader, AlertCircle, Play, Zap, Brain, Flame } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { getRandomPuzzle, PUZZLE_DIFFICULTY } from '../utils/puzzleGenerator';

const PuzzleSelect = ({ onSelectPuzzle, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(PUZZLE_DIFFICULTY.EASY);

  const difficulties = [
    {
      id: PUZZLE_DIFFICULTY.EASY,
      name: 'EASY',
      moves: 3,
      pieces: 9,
      description: '9 pieces placed, finish the last 3',
      icon: Zap,
      color: 'from-green-500 to-emerald-600',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      bgColor: 'bg-green-900/20'
    },
    {
      id: PUZZLE_DIFFICULTY.MEDIUM,
      name: 'MEDIUM',
      moves: 5,
      pieces: 7,
      description: '7 pieces placed, finish the last 5',
      icon: Brain,
      color: 'from-amber-500 to-orange-600',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-900/20'
    },
    {
      id: PUZZLE_DIFFICULTY.HARD,
      name: 'HARD',
      moves: 7,
      pieces: 5,
      description: '5 pieces placed, finish the last 7',
      icon: Flame,
      color: 'from-red-500 to-pink-600',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      bgColor: 'bg-red-900/20'
    }
  ];

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
        console.log('Puzzle generated:', puzzle.id, puzzle.difficulty);
        setProgress(100);
        await new Promise(r => setTimeout(r, 200));
        onSelectPuzzle(puzzle);
      } else {
        setError('Could not generate puzzle. Try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Puzzle error:', err);
      setError('Something went wrong. Try again.');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  const selectedDiff = difficulties.find(d => d.id === selectedDifficulty);

  return (
    <div className="min-h-screen relative p-4 flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
      
      <div className="relative bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-green-500/30 shadow-[0_0_30px_rgba(74,222,128,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy size={28} className="text-green-400" />
            <NeonTitle className="text-2xl sm:text-3xl">PUZZLE</NeonTitle>
          </div>
          <button 
            onClick={handleBack}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs border border-cyan-500/30 hover:bg-slate-700 disabled:opacity-50"
          >
            BACK
          </button>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-6 space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Select Difficulty</p>
          
          {difficulties.map((diff) => {
            const Icon = diff.icon;
            const isSelected = selectedDifficulty === diff.id;
            
            return (
              <button
                key={diff.id}
                onClick={() => handleSelectDifficulty(diff.id)}
                disabled={isLoading}
                className={`w-full p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${
                  isSelected 
                    ? `bg-gradient-to-r ${diff.color} border-white/30 shadow-lg`
                    : `${diff.bgColor} ${diff.borderColor} hover:bg-slate-700/50`
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-700'}`}>
                  <Icon size={20} className={isSelected ? 'text-white' : diff.textColor} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold tracking-wide ${isSelected ? 'text-white' : diff.textColor}`}>
                      {diff.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {diff.moves} moves
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                    {diff.description}
                  </p>
                </div>
                
                {/* Selection indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-white bg-white' : 'border-slate-600'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-green-600" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Turn order for selected difficulty */}
        <div className="mb-6 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="text-xs text-slate-400 mb-2 text-center">Turn Order</div>
          <div className="flex items-center justify-center gap-1 text-xs flex-wrap">
            {Array.from({ length: selectedDiff.moves }).map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`px-2 py-1 rounded ${
                  i % 2 === 0 ? 'bg-cyan-900/50 text-cyan-400' : 'bg-purple-900/50 text-purple-400'
                }`}>
                  {i % 2 === 0 ? 'You' : 'AI'}
                </span>
                {i < selectedDiff.moves - 1 && <span className="text-slate-600">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* Generate Button */}
        <button 
          onClick={handleGeneratePuzzle}
          disabled={isLoading}
          className={`w-full p-4 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-3 ${
            isLoading
              ? 'bg-slate-700 text-slate-400 cursor-wait'
              : `bg-gradient-to-r ${selectedDiff.color} text-white hover:opacity-90 shadow-lg`
          }`}
        >
          {isLoading ? (
            <>
              <Loader size={24} className="animate-spin" />
              <div>
                <div className="text-sm">GENERATING...</div>
                <div className="text-xs opacity-70">{progress}% complete</div>
              </div>
            </>
          ) : (
            <>
              <Play size={24} />
              <span>START {selectedDiff.name} PUZZLE</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PuzzleSelect;
