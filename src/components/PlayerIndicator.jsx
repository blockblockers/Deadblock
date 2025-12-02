import { User, Bot } from 'lucide-react';

const PlayerIndicator = ({ currentPlayer, gameMode }) => {
  const isVsAI = gameMode === 'ai' || gameMode === 'puzzle';
  
  return (
    <div className="flex items-center justify-between mb-3">
      {/* Player 1 */}
      <div className="flex items-center gap-2">
        <User 
          className={currentPlayer === 1 
            ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" 
            : "text-slate-600"
          } 
          size={16} 
        />
        <span className={`font-semibold text-xs sm:text-sm tracking-wide ${
          currentPlayer === 1 ? 'text-cyan-300' : 'text-slate-500'
        }`}>
          PLAYER 1
        </span>
      </div>

      {/* Player 2 / AI */}
      <div className="flex items-center gap-2">
        <span className={`font-semibold text-xs sm:text-sm tracking-wide ${
          currentPlayer === 2 ? 'text-pink-300' : 'text-slate-500'
        }`}>
          {isVsAI ? 'AI' : 'PLAYER 2'}
        </span>
        {isVsAI ? (
          <Bot 
            className={currentPlayer === 2 
              ? "text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" 
              : "text-slate-600"
            } 
            size={16} 
          />
        ) : (
          <User 
            className={currentPlayer === 2 
              ? "text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" 
              : "text-slate-600"
            } 
            size={16} 
          />
        )}
      </div>
    </div>
  );
};

export default PlayerIndicator;