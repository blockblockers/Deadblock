import { useState } from 'react';
import { Trophy, Zap, Brain, Sparkles, Loader, AlertCircle } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { getRandomPuzzle, PUZZLE_DIFFICULTY, getMovesForDifficulty } from '../utils/puzzleGenerator';

const PuzzleSelect = ({ onSelectPuzzle, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const difficulties = [
    {
      id: PUZZLE_DIFFICULTY.EASY,
      name: 'EASY',
      subtitle: `${getMovesForDifficulty(PUZZLE_DIFFICULTY.EASY)} Moves Left`,
      piecesPlaced: 12 - getMovesForDifficulty(PUZZLE_DIFFICULTY.EASY),
      description: 'Clear winning moves. Perfect for learning puzzle strategies.',
      icon: Zap,
      color: 'from-green-500 to-emerald-600',
      glowColor: 'rgba(74,222,128,0.5)',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-300'
    },
    {
      id: PUZZLE_DIFFICULTY.MEDIUM,
      name: 'MEDIUM',
      subtitle: `${getMovesForDifficulty(PUZZLE_DIFFICULTY.MEDIUM)} Moves Left`,
      piecesPlaced: 12 - getMovesForDifficulty(PUZZLE_DIFFICULTY.MEDIUM),
      description: 'Requires careful analysis. The winning move isn\'t obvious.',
      icon: Brain,
      color: 'from-amber-500 to-orange-600',
      glowColor: 'rgba(251,191,36,0.5)',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-300'
    },
    {
      id: PUZZLE_DIFFICULTY.HARD,
      name: 'HARD',
      subtitle: `${getMovesForDifficulty(PUZZLE_DIFFICULTY.HARD)} Moves Left`,
      piecesPlaced: 12 - getMovesForDifficulty(PUZZLE_DIFFICULTY.HARD),
      description: 'Subtle positioning required. Only for experienced players.',
      icon: Sparkles,
      color: 'from-red-500 to-pink-600',
      glowColor: 'rgba(239,68,68,0.5)',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-300',
      badge: 'PRO'
    }
  ];

  const handleSelectDifficulty = (difficultyId) => {
    soundManager.playClickSound('select');
    soundManager.vibrate('short');
    setSelectedDifficulty(difficultyId);
    setError(null);
  };

  const handleProgress = (current, total) => {
    setProgress({ current, total });
  };

  const handleStartPuzzle = async () => {
    if (!selectedDifficulty) return;
    
    soundManager.playButtonClick();
    setIsLoading(true);
    setProgress({ current: 0, total: 12 });
    setError(null);
    
    try {
      console.log('Starting puzzle generation for difficulty:', selectedDifficulty);
      
      // Generate puzzle using AI vs AI approach
      const puzzle = await getRandomPuzzle(selectedDifficulty, false, handleProgress);
      
      if (puzzle) {
        console.log('Puzzle generated, loading into game:', puzzle);
        // Ensure difficulty is stored in the puzzle
        puzzle.difficulty = selectedDifficulty;
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Call the parent handler to load the puzzle
        onSelectPuzzle(puzzle);
      } else {
        console.error('Puzzle generation returned null');
        setError('Failed to generate puzzle. Please try again.');
      }
    } catch (err) {
      console.error('Error generating puzzle:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  // Get the selected difficulty info for the progress display
  const selectedDiffInfo = difficulties.find(d => d.id === selectedDifficulty);

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
      
      <div className="relative bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full border border-green-500/30 shadow-[0_0_30px_rgba(74,222,128,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy size={28} className="text-green-400" />
            <NeonTitle className="text-2xl sm:text-3xl">PUZZLE MODE</NeonTitle>
          </div>
          <button 
            onClick={handleBack}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)] disabled:opacity-50"
          >
            BACK
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-6">Choose puzzle difficulty</p>
        
        {/* Difficulty Options */}
        <div className="space-y-3">
          {difficulties.map((diff) => {
            const Icon = diff.icon;
            const isSelected = selectedDifficulty === diff.id;
            
            return (
              <button
                key={diff.id}
                onClick={() => handleSelectDifficulty(diff.id)}
                disabled={isLoading}
                className={`w-full p-4 rounded-xl border transition-all duration-300 text-left relative overflow-hidden ${
                  isSelected 
                    ? `bg-gradient-to-r ${diff.color} border-white/30`
                    : `bg-slate-800/80 ${diff.borderColor} hover:bg-slate-700/80`
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={isSelected ? { boxShadow: `0 0 30px ${diff.glowColor}` } : {}}
              >
                {/* Badge */}
                {diff.badge && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    {diff.badge}
                  </span>
                )}
                
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-700'}`}>
                    <Icon size={24} className={isSelected ? 'text-white' : diff.textColor} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold tracking-wide ${isSelected ? 'text-white' : diff.textColor}`}>
                        {diff.name}
                      </h3>
                      <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                        {diff.subtitle}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {diff.description}
                    </p>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
                      {diff.piecesPlaced} pieces on board
                    </p>
                  </div>
                  
                  {/* Selection indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected 
                      ? 'border-white bg-white' 
                      : 'border-slate-600'
                  }`}>
                    {isSelected && (
                      <div className={`w-2 h-2 rounded-full ${
                        diff.id === PUZZLE_DIFFICULTY.EASY ? 'bg-green-600' :
                        diff.id === PUZZLE_DIFFICULTY.MEDIUM ? 'bg-amber-600' : 'bg-red-600'
                      }`} />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Puzzle info */}
        <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
          <p className="text-xs text-slate-400">
            <span className="text-cyan-400 font-semibold">How it works:</span> AI plays a complete game, then removes pieces to create your puzzle. Find the winning moves!
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}
        
        {/* Start Button */}
        <button 
          onClick={handleStartPuzzle}
          disabled={!selectedDifficulty || isLoading}
          className={`w-full mt-6 p-4 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
            selectedDifficulty && !isLoading
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 shadow-[0_0_25px_rgba(74,222,128,0.5)]'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader size={20} className="animate-spin" />
              {progress.total > 0 
                ? `AI PLAYING... MOVE ${progress.current}/${progress.total}`
                : 'GENERATING PUZZLE...'
              }
            </>
          ) : (
            <>
              <Trophy size={20} />
              {selectedDifficulty ? 'START PUZZLE' : 'SELECT DIFFICULTY'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PuzzleSelect;
