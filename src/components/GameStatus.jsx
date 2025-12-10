import { Sparkles } from 'lucide-react';
import { AI_DIFFICULTY } from '../utils/aiLogic';

const GameStatus = ({ isAIThinking, gameOver, winner, gameMode, aiDifficulty }) => {
  // AI thinking status is now shown only via the player indicator glow
  // So we don't show a separate text box anymore
  
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
