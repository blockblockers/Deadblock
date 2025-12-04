import { useState } from 'react';
import { Trophy, Loader, AlertCircle, Play, Puzzle } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { getRandomPuzzle } from '../utils/puzzleGenerator';

const PuzzleSelect = ({ onSelectPuzzle, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleGeneratePuzzle = async () => {
    soundManager.playButtonClick();
    setIsLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      const puzzle = await getRandomPuzzle('easy', false, (current, total) => {
        setProgress(Math.round((current / total) * 100));
      });
      
      if (puzzle) {
        console.log('Puzzle generated:', puzzle.id);
        setProgress(100);
        
        // Brief pause to show 100%
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

        {/* Description */}
        <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Puzzle size={18} className="text-green-400" />
            <span className="text-green-400 font-bold tracking-wide">HOW IT WORKS</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            A random board is generated with <span className="text-cyan-400 font-semibold">9 pieces</span> already placed. 
            You complete the puzzle by placing the final <span className="text-green-400 font-semibold">3 pieces</span>, 
            taking turns with the AI!
          </p>
        </div>

        {/* Turn order explanation */}
        <div className="mb-6 p-3 bg-green-900/20 rounded-xl border border-green-500/20">
          <div className="flex items-center justify-around text-xs">
            <div className="text-center">
              <div className="text-cyan-400 font-bold">MOVE 1</div>
              <div className="text-slate-400">You</div>
            </div>
            <div className="text-slate-600">→</div>
            <div className="text-center">
              <div className="text-purple-400 font-bold">MOVE 2</div>
              <div className="text-slate-400">AI</div>
            </div>
            <div className="text-slate-600">→</div>
            <div className="text-center">
              <div className="text-green-400 font-bold">MOVE 3</div>
              <div className="text-slate-400">You Win!</div>
            </div>
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
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 shadow-[0_0_25px_rgba(74,222,128,0.5)]'
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
              <span>START PUZZLE</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PuzzleSelect;
