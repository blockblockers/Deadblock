import { Bot, Users, Trophy, Settings, HelpCircle } from 'lucide-react';
import NeonTitle from './NeonTitle';
import HowToPlayModal from './HowToPlayModal';
import SettingsModal from './SettingsModal';
import { soundManager } from '../utils/soundManager';

// Custom pentomino shapes optimized for horizontal button layout
const buttonShapes = {
  T: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 0]],
};

// Clean pentomino button component
const PentominoButton = ({ onClick, shape, color, glowColor, icon: Icon, title, subtitle }) => {
  const coords = buttonShapes[shape] || buttonShapes.T;
  
  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  const normalizedCoords = coords.map(([x, y]) => [x - minX, y - minY]);
  
  const centerX = (maxX - minX) / 2;
  const centerY = (maxY - minY) / 2;
  let iconCell = normalizedCoords[0];
  let minDist = Infinity;
  for (const [x, y] of normalizedCoords) {
    const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
    if (dist < minDist) {
      minDist = dist;
      iconCell = [x, y];
    }
  }
  
  const handleClick = () => {
    soundManager.playButtonClick();
    onClick();
  };
  
  const cellSize = 28;
  const gap = 2;
  
  return (
    <button 
      onClick={handleClick}
      className="w-full group"
    >
      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-500/50 transition-all duration-200 group-active:scale-[0.98]"
        style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)` }}
      >
        <div 
          className="relative flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="relative" style={{ width: width * (cellSize + gap) - gap, height: height * (cellSize + gap) - gap }}>
            {normalizedCoords.map(([x, y], idx) => {
              const isIconCell = x === iconCell[0] && y === iconCell[1];
              return (
                <div
                  key={idx}
                  className={`absolute ${color} rounded-md border border-white/20`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    left: x * (cellSize + gap),
                    top: y * (cellSize + gap),
                    boxShadow: `0 0 15px ${glowColor}`,
                  }}
                >
                  {isIconCell && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon size={16} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex-1 text-left min-w-0">
          <div className="text-white font-bold text-base sm:text-lg tracking-wide group-hover:text-cyan-300 transition-colors truncate">
            {title}
          </div>
          <div className="text-slate-500 text-xs sm:text-sm group-hover:text-slate-400 transition-colors truncate">
            {subtitle}
          </div>
        </div>
        
        <div className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
};

const MenuScreen = ({ 
  onStartGame, 
  onPuzzleSelect, 
  showHowToPlay, 
  onToggleHowToPlay,
  showSettings,
  onToggleSettings
}) => {
  return (
    <>
      {/* Scrollable container - fixed position with overflow scroll */}
      <div 
        className="bg-slate-950"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowX: 'hidden',
          overflowY: 'scroll',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Grid background - fixed, non-interactive */}
        <div 
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.3,
            backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} 
        />
        
        {/* Glow effects - fixed, non-interactive */}
        <div className="pointer-events-none" style={{ position: 'fixed', top: '25%', left: '25%', width: 256, height: 256, background: 'rgba(236,72,153,0.2)', borderRadius: '50%', filter: 'blur(48px)' }} />
        <div className="pointer-events-none" style={{ position: 'fixed', bottom: '25%', right: '25%', width: 256, height: 256, background: 'rgba(34,211,238,0.2)', borderRadius: '50%', filter: 'blur(48px)' }} />
        
        {/* Scrollable content - natural document flow */}
        <div style={{ position: 'relative', paddingTop: 48, paddingBottom: 200, paddingLeft: 16, paddingRight: 16 }}>
          <div className="max-w-sm mx-auto">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-5 sm:p-6 border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)]">
              {/* Title */}
              <div className="text-center mb-6">
                <NeonTitle className="text-3xl sm:text-4xl mb-1">DEADBLOCK</NeonTitle>
                <p className="text-cyan-300/70 text-xs tracking-widest">PENTOMINO STRATEGY</p>
              </div>
              
              {/* Game Mode Buttons */}
              <div className="space-y-2 mb-5">
                <PentominoButton
                  onClick={() => onStartGame('ai')}
                  shape="T"
                  color="bg-gradient-to-br from-purple-500 to-pink-600"
                  glowColor="rgba(168,85,247,0.4)"
                  icon={Bot}
                  title="VS AI"
                  subtitle="Challenge the computer"
                />
                
                <PentominoButton
                  onClick={() => onStartGame('2player')}
                  shape="L"
                  color="bg-gradient-to-br from-cyan-500 to-blue-600"
                  glowColor="rgba(34,211,238,0.4)"
                  icon={Users}
                  title="2 PLAYER"
                  subtitle="Local multiplayer"
                />
                
                <PentominoButton
                  onClick={onPuzzleSelect}
                  shape="S"
                  color="bg-gradient-to-br from-green-500 to-emerald-600"
                  glowColor="rgba(34,197,94,0.4)"
                  icon={Trophy}
                  title="PUZZLE"
                  subtitle="Solve challenges"
                />
              </div>
              
              {/* Bottom Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    onToggleHowToPlay(true);
                  }}
                  className="flex-1 py-2.5 bg-slate-800/80 text-cyan-300 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-700 transition-all border border-cyan-500/30 flex items-center justify-center gap-2"
                >
                  <HelpCircle size={16} />
                  HOW TO PLAY
                </button>
                
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    onToggleSettings(true);
                  }}
                  className="py-2.5 px-3 bg-slate-800/80 text-slate-300 rounded-lg hover:bg-slate-700 transition-all border border-slate-600/50 flex items-center justify-center"
                >
                  <Settings size={18} />
                </button>
              </div>
              
              {/* Version */}
              <div className="text-center mt-4 text-slate-600 text-xs">
                v3.0 • Pentomino Edition
              </div>
            </div>
          </div>
          
          {/* Scroll indicator */}
          <div className="text-center mt-8 text-slate-600 text-xs animate-bounce">
            ↕ Scroll to navigate
          </div>
        </div>
      </div>

      {/* Modals */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => onToggleHowToPlay(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => onToggleSettings(false)} />
    </>
  );
};

export default MenuScreen;
