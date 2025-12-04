import { useState } from 'react';
import { Trophy, Loader, AlertCircle, Play } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { getRandomPuzzle } from '../utils/puzzleGenerator';

const PuzzleSelect = ({ onSelectPuzzle, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const handleProgress = (current, total) => {
    setProgress({ current, total });
  };

  const handleGeneratePuzzle = async () => {
    soundManager.playButtonClick();
    setIsLoading(true);
    setError(null);
    setProgress({ current: 0, total: 12 });
    
    try {
      console.log('Starting puzzle generation from PuzzleSelect...');
      
      // Generate puzzle using AI vs AI approach
      const puzzle = await getRandomPuzzle('easy', false, handleProgress);
      
      if (puzzle) {
        console.log('Puzzle generated, passing to game:', puzzle);
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Pass puzzle to parent
        onSelectPuzzle(puzzle);
      } else {
        setError('Failed to generate puzzle. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error generating puzzle:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

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
        <div className="flex items-center justify-between mb-4">
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

        {/* Description */}
        <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <h3 className="text-green-400 font-bold mb-2 tracking-wide">HOW IT WORKS</h3>
          <ul className="text-slate-300 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">1.</span>
              <span>AI plays a complete game against itself</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">2.</span>
              <span>The last 3 moves are removed from the board</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">3.</span>
              <span>You take over and play the final 3 moves!</span>
            </li>
          </ul>
        </div>

        {/* Puzzle info */}
        <div className="mb-6 p-4 bg-green-900/30 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(74,222,128,0.5)]">
              <span className="text-white font-bold text-lg">3</span>
            </div>
            <div>
              <h4 className="text-green-300 font-bold tracking-wide">MOVES REMAINING</h4>
              <p className="text-slate-400 text-xs">You play → AI plays → You play to win!</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}
        
        {/* Generate Button */}
        <button 
          onClick={handleGeneratePuzzle}
          disabled={isLoading}
          className={`w-full p-4 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-3 ${
            isLoading
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 shadow-[0_0_25px_rgba(74,222,128,0.5)]'
          }`}
        >
          {isLoading ? (
            <>
              <Loader size={24} className="animate-spin" />
              <div className="text-left">
                <div className="text-sm">GENERATING PUZZLE...</div>
                <div className="text-xs opacity-70">
                  {progress.total > 0 
                    ? `AI playing move ${progress.current}/${progress.total}`
                    : 'Starting AI game...'
                  }
                </div>
              </div>
            </>
          ) : (
            <>
              <Play size={24} />
              <span>GENERATE PUZZLE</span>
            </>
          )}
        </button>

        {/* Footer note */}
        <p className="text-center text-slate-500 text-xs mt-4">
          Each puzzle is randomly generated - every game is unique!
        </p>
      </div>
    </div>
  );
};

export default PuzzleSelect;
