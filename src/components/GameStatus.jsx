import { Sparkles, Trophy, Skull } from 'lucide-react';
import { AI_DIFFICULTY } from '../utils/aiLogic';

const GameStatus = ({ isAIThinking, gameOver, winner, gameMode, aiDifficulty }) => {
  // AI thinking status is now shown only via the player indicator glow
  // So we don't show a separate text box anymore
  
  // Themed indicator when game is over (modal provides main feedback)
  if (gameOver) {
    const isWin = winner === 1;
    const is2Player = gameMode === '2player';
    
    // Determine colors based on winner/mode
    let gradientClass, glowColor, borderClass, Icon, statusText;
    
    if (is2Player) {
      if (winner === 1) {
        gradientClass = 'from-cyan-400 via-blue-400 to-cyan-400';
        glowColor = 'rgba(34,211,238,0.6)';
        borderClass = 'border-cyan-500/50';
        statusText = 'PLAYER 1 WINS';
      } else {
        gradientClass = 'from-pink-400 via-rose-400 to-pink-400';
        glowColor = 'rgba(236,72,153,0.6)';
        borderClass = 'border-pink-500/50';
        statusText = 'PLAYER 2 WINS';
      }
      Icon = Trophy;
    } else if (isWin) {
      gradientClass = 'from-cyan-400 via-purple-400 to-pink-400';
      glowColor = 'rgba(168,85,247,0.6)';
      borderClass = 'border-purple-500/50';
      Icon = Trophy;
      statusText = gameMode === 'puzzle' ? 'PUZZLE COMPLETE' : 'VICTORY';
    } else {
      gradientClass = 'from-red-400 via-orange-400 to-red-400';
      glowColor = 'rgba(239,68,68,0.6)';
      borderClass = 'border-red-500/50';
      Icon = Skull;
      statusText = gameMode === 'puzzle' ? 'NO MOVES LEFT' : 'GAME OVER';
    }
    
    return (
      <div className={`mb-2 p-2 bg-slate-900/80 border ${borderClass} rounded-lg text-center relative overflow-hidden`}
        style={{ boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px ${glowColor}20` }}
      >
        {/* Animated shimmer background */}
        <div className="absolute inset-0 opacity-30 animate-shimmer-bg"
          style={{
            background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
            backgroundSize: '200% 100%',
          }}
        />
        
        <div className="relative flex items-center justify-center gap-2">
          <Icon size={14} className="animate-pulse" style={{ color: glowColor.replace('0.6', '1') }} />
          <span className={`text-xs font-bold tracking-[0.2em] bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}
            style={{ textShadow: `0 0 10px ${glowColor}` }}
          >
            {statusText}
          </span>
          <Icon size={14} className="animate-pulse" style={{ color: glowColor.replace('0.6', '1') }} />
        </div>
        
        <style>{`
          @keyframes shimmer-bg {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .animate-shimmer-bg { animation: shimmer-bg 3s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  return null;
};

export default GameStatus;
