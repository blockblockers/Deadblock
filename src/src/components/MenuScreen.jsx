import { Bot, User, Trophy } from 'lucide-react';
import NeonTitle from './NeonTitle';
import HowToPlayModal from './HowToPlayModal';
import { menuButtonShapes } from '../utils/pieces';

// Polyomino-shaped button component
const PolyominoButton = ({ onClick, shape, color, glowColor, children }) => {
  const cells = menuButtonShapes[shape] || menuButtonShapes.T;
  
  return (
    <button 
      onClick={onClick}
      className={`relative w-full p-4 ${color} rounded-xl hover:scale-105 transition-all duration-300 border border-white/20`}
      style={{ boxShadow: `0 0 25px ${glowColor}, inset 0 0 20px rgba(255,255,255,0.1)` }}
    >
      {/* Mini polyomino shape in corner */}
      <div className="absolute top-2 left-2 opacity-30">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(3, 8px)' }}>
          {[0,1,2].map(row => [0,1,2].map(col => (
            <div 
              key={`${row}-${col}`}
              className={`w-2 h-2 rounded-sm ${
                cells.some(([r,c]) => r === col && c === row) ? 'bg-white' : 'bg-transparent'
              }`}
            />
          )))}
        </div>
      </div>
      {children}
    </button>
  );
};

const MenuScreen = ({ 
  onStartGame, 
  onPuzzleSelect, 
  showHowToPlay, 
  onToggleHowToPlay 
}) => {
  return (
    <div className="min-h-screen relative p-4 flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
      
      <div className="relative bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
        <NeonTitle className="text-4xl sm:text-5xl text-center mb-2">DEADBLOCK</NeonTitle>
        <p className="text-center text-cyan-300/70 mb-6 tracking-widest text-xs sm:text-sm">CHOOSE YOUR MODE</p>
        
        <div className="space-y-3">
          {/* Play vs AI */}
          <PolyominoButton 
            onClick={() => onStartGame('ai')}
            shape="T"
            color="bg-gradient-to-r from-purple-600/90 to-pink-600/90"
            glowColor="rgba(168,85,247,0.5)"
          >
            <div className="flex items-center justify-center gap-3">
              <Bot size={26} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              <div className="text-left text-white">
                <div className="text-lg font-bold tracking-wide">PLAY vs AI</div>
                <div className="text-xs opacity-70">Challenge the machine</div>
              </div>
            </div>
          </PolyominoButton>
          
          {/* 2 Player */}
          <PolyominoButton
            onClick={() => onStartGame('2player')}
            shape="L"
            color="bg-gradient-to-r from-cyan-600/90 to-blue-600/90"
            glowColor="rgba(34,211,238,0.5)"
          >
            <div className="flex items-center justify-center gap-3">
              <User size={26} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              <div className="text-left text-white">
                <div className="text-lg font-bold tracking-wide">2 PLAYER</div>
                <div className="text-xs opacity-70">Local multiplayer</div>
              </div>
            </div>
          </PolyominoButton>

          {/* Puzzle Mode */}
          <PolyominoButton
            onClick={onPuzzleSelect}
            shape="Z"
            color="bg-gradient-to-r from-green-600/90 to-emerald-600/90"
            glowColor="rgba(74,222,128,0.5)"
          >
            <div className="flex items-center justify-center gap-3">
              <Trophy size={26} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              <div className="text-left text-white">
                <div className="text-lg font-bold tracking-wide">PUZZLE MODE</div>
                <div className="text-xs opacity-70">Tactical challenges</div>
              </div>
            </div>
          </PolyominoButton>

          {/* How to Play */}
          <PolyominoButton
            onClick={() => onToggleHowToPlay(true)}
            shape="P"
            color="bg-gradient-to-r from-amber-600/90 to-orange-600/90"
            glowColor="rgba(251,191,36,0.5)"
          >
            <div className="flex items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <path d="M12 17h.01"/>
              </svg>
              <div className="text-left text-white">
                <div className="text-lg font-bold tracking-wide">HOW TO PLAY</div>
                <div className="text-xs opacity-70">Learn the rules</div>
              </div>
            </div>
          </PolyominoButton>
        </div>
      </div>

      {/* How to Play Modal */}
      <HowToPlayModal 
        isOpen={showHowToPlay}
        onClose={() => onToggleHowToPlay(false)}
      />
    </div>
  );
};

export default MenuScreen;