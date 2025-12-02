import { Trophy } from 'lucide-react';

const GameStatus = ({ isAIThinking, gameOver, winner, gameMode }) => {
  if (isAIThinking) {
    return (
      <div className="mb-2 p-2 bg-purple-900/50 border border-purple-500/50 rounded-lg text-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
        <span className="font-semibold text-purple-300 text-xs tracking-widest">
          AI PROCESSING...
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