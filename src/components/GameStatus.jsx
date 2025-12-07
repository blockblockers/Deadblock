import { Sparkles } from 'lucide-react';
import { AI_DIFFICULTY } from '../utils/aiLogic';

const GameStatus = ({ isAIThinking, gameOver, winner, gameMode, aiDifficulty }) => {
  // Only show AI thinking status - game over is handled by modal
  if (isAIThinking) {
    const isProfessional = aiDifficulty === AI_DIFFICULTY.PROFESSIONAL;
    
    return (
      <div className={`mb-2 p-2 ${
        isProfessional 
          ? 'bg-purple-900/50 border-purple-500/50' 
          : 'bg-purple-900/50 border-purple-500/50'
      } border rounded-lg text-center shadow-[0_0_15px_rgba(168,85,247,0.4)]`}>
        <span className={`font-semibold text-xs tracking-widest ${
          isProfessional ? 'text-purple-300' : 'text-purple-300'
        }`}>
          {isProfessional ? (
            <>
              <Sparkles size={12} className="inline mr-1 animate-pulse" />
              CLAUDE AI ANALYZING...
            </>
          ) : (
            'AI PROCESSING...'
          )}
        </span>
      </div>
    );
  }

  // Small indicator when game is over (modal provides main feedback)
  if (gameOver) {
    return (
      <div className="mb-2 p-1.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-center">
        <span className="text-xs text-slate-400 tracking-wide">
          Game Complete
        </span>
      </div>
    );
  }

  return null;
};

export default GameStatus;
