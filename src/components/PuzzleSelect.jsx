import { useState, useCallback, useEffect } from 'react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { PUZZLE_DIFFICULTY, getRandomPuzzle } from '../utils/puzzleGenerator';
import { soundManager } from '../utils/soundManager';

const PuzzleSelect = ({ onSelectPuzzle, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);

  // Handle difficulty selection
  const handleSelectDifficulty = useCallback(async (difficulty) => {
    if (isGenerating) return;
    
    soundManager.playButtonClick();
    setSelectedDifficulty(difficulty);
    setIsGenerating(true);
    
    try {
      const puzzle = await getRandomPuzzle(difficulty);
      if (puzzle) {
        onSelectPuzzle(puzzle);
      } else {
        console.error('Failed to generate puzzle');
        setIsGenerating(false);
        setSelectedDifficulty(null);
      }
    } catch (error) {
      console.error('Puzzle generation error:', error);
      setIsGenerating(false);
      setSelectedDifficulty(null);
    }
  }, [isGenerating, onSelectPuzzle]);

  // Handle back button
  const handleBack = useCallback(() => {
    if (isGenerating) return;
    soundManager.playButtonClick();
    onBack();
  }, [isGenerating, onBack]);

  // Difficulty button component
  const DifficultyButton = ({ difficulty, label, description, color, isSpeed = false }) => {
    const isSelected = selectedDifficulty === difficulty;
    const isDisabled = isGenerating && !isSelected;
    
    const colorClasses = {
      green: 'border-green-500/50 hover:border-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] text-green-400',
      amber: 'border-amber-500/50 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] text-amber-400',
      red: 'border-red-500/50 hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] text-red-400',
      purple: 'border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] text-purple-400',
    };

    return (
      <button
        onClick={() => handleSelectDifficulty(difficulty)}
        disabled={isDisabled}
        className={`w-full py-4 px-4 rounded-xl border-2 transition-all duration-300 ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed border-slate-600/30'
            : isSelected
              ? `${colorClasses[color]} animate-pulse`
              : `bg-slate-800/60 ${colorClasses[color]}`
        }`}
      >
        <div className="text-lg font-bold tracking-wider">{label}</div>
        <div className="text-xs text-slate-400 mt-1">{description}</div>
        {isSelected && isGenerating && (
          <div className="text-xs text-cyan-300 mt-2 animate-pulse">
            Generating puzzle...
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pt-6 pb-4">
        <div className="text-center">
          <NeonTitle text="PUZZLE" size="small" />
          <NeonSubtitle text="SELECT DIFFICULTY" size="small" color="cyan" className="mt-1" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto scroll-fix">
        <div className="max-w-md mx-auto space-y-3">
          {/* UPDATED: Removed turn order visualization section for Easy/Medium/Hard */}
          {/* Only Speed mode shows the "HOW IT WORKS" section below */}
          
          {/* Difficulty Buttons - UPDATED: Enlarged with py-4 and text-lg */}
          <DifficultyButton
            difficulty={PUZZLE_DIFFICULTY.EASY}
            label="EASY"
            description="3 moves remaining - forgiving margin for error"
            color="green"
          />
          
          <DifficultyButton
            difficulty={PUZZLE_DIFFICULTY.MEDIUM}
            label="MEDIUM"
            description="2 moves remaining - requires careful planning"
            color="amber"
          />
          
          <DifficultyButton
            difficulty={PUZZLE_DIFFICULTY.HARD}
            label="HARD"
            description="1 move remaining - one shot to win"
            color="red"
          />
          
          {/* Speed Puzzle - UPDATED: New description */}
          <div className="pt-4 border-t border-slate-700/50">
            <DifficultyButton
              difficulty={PUZZLE_DIFFICULTY.SPEED}
              label="⚡ SPEED"
              description="Beat the clock. 10 seconds to place the one piece that wins."
              color="purple"
              isSpeed={true}
            />
            
            {/* Speed mode explanation - only shown for Speed mode */}
            <div className="mt-3 p-3 bg-slate-800/40 rounded-lg border border-purple-500/20">
              <div className="text-xs text-purple-300 font-semibold mb-1">HOW IT WORKS</div>
              <div className="text-xs text-slate-400 space-y-1">
                <p>• Random puzzles with exactly one winning move</p>
                <p>• 10 seconds to find and place the winning piece</p>
                <p>• Track your speed puzzle streak!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="flex-shrink-0 p-4">
        <button
          onClick={handleBack}
          disabled={isGenerating}
          className={`w-full max-w-md mx-auto block py-3 px-6 rounded-xl border-2 border-slate-600/50 text-slate-400 font-semibold tracking-wider transition-all ${
            isGenerating
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-slate-500 hover:text-slate-300'
          }`}
        >
          ← BACK
        </button>
      </div>
    </div>
  );
};

export default PuzzleSelect;
