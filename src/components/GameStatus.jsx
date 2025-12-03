import { Trophy, Sparkles } from 'lucide-react';
import { AI_DIFFICULTY } from '../utils/aiLogic';

const GameStatus = ({ isAIThinking, gameOver, winner, gameMode, aiDifficulty }) => {
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

  if (gameOver) {
    const isVsAI = gameMode === 'ai' || gameMode === 'puzzle';
    let winnerText;
    
    if (winner === 1) {
      winnerText = gameMode === 'puzzle' ? 'PUZZLE SOLVED!' : 'PLAYER 1 WINS!';
    } else {
      winnerText = isVsAI ? 'AI WINS!' : 'PLAYER 2 WINS!';
    }

    return (
      <div className="mb-2 p-2 bg-yellow-900/50 border border-yellow-500/50 rounded-lg text-center shadow-[0_0_20px_rgba(253,224,71,0.5)]">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="text-yellow-400 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]" size={16} />
          <span className="font-bold text-sm text-yellow-300 tracking-wide">
            {winnerText}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default GameStatus;