import { Bot, Users, Puzzle, Settings, HelpCircle } from 'lucide-react';
import NeonTitle from './NeonTitle';
import HowToPlayModal from './HowToPlayModal';
import SettingsModal from './SettingsModal';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Custom pentomino shapes for buttons
const buttonShapes = {
  T: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 0]],
};

// Pentomino button component
const PentominoButton = ({ onClick, shape, color, glowColor, iconColor, icon: Icon, title, subtitle }) => {
  const coords = buttonShapes[shape] || buttonShapes.T;
  
  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  const normalizedCoords = coords.map(([x, y]) => [x - minX, y - minY]);
  
  const handleClick = () => {
    soundManager.playButtonClick();
    onClick();
  };
  
  const cellSize = 28;
  const gap = 2;
  
  return (
    <button onClick={handleClick} className="w-full group">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-500/50 transition-all duration-200 group-active:scale-[0.98]">
        {/* Pentomino shape - no icon inside */}
        <div 
          className="relative flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="relative" style={{ width: width * (cellSize + gap) - gap, height: height * (cellSize + gap) - gap }}>
            {normalizedCoords.map(([x, y], idx) => (
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
              />
            ))}
          </div>
        </div>
        
        {/* Icon and text - icon left of text with matching color */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <Icon size={24} className={`${iconColor} group-hover:brightness-125 transition-all flex-shrink-0`} style={{ filter: 'drop-shadow(0 0 6px currentColor)' }} />
          <div className="min-w-0">
            <div className="text-white font-bold text-base sm:text-lg tracking-wide group-hover:text-cyan-300 transition-colors truncate">
              {title}
            </div>
            <div className="text-slate-500 text-xs sm:text-sm group-hover:text-slate-400 transition-colors truncate">
              {subtitle}
            </div>
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
  const { needsScroll } = useResponsiveLayout(700);

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? {
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      } : {}}
    >
      {/* Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow effects */}
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-sm">
          
          {/* TITLE - Above the box, larger */}
          <div className="text-center mb-6">
            <NeonTitle size="large" />
          </div>
          
          {/* Menu Box */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-5 sm:p-6 border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)]">
            
            {/* Game Mode Buttons */}
            <div className="space-y-2 mb-5">
              <PentominoButton
                onClick={() => onStartGame('ai')}
                shape="T"
                color="bg-gradient-to-br from-purple-500 to-pink-600"
                glowColor="rgba(168,85,247,0.4)"
                iconColor="text-purple-400"
                icon={Bot}
                title="VS AI"
                subtitle="Challenge the computer"
              />
              
              <PentominoButton
                onClick={() => onStartGame('2player')}
                shape="L"
                color="bg-gradient-to-br from-cyan-500 to-blue-600"
                glowColor="rgba(34,211,238,0.4)"
                iconColor="text-cyan-400"
                icon={Users}
                title="2 PLAYER"
                subtitle="Local multiplayer"
              />
              
              <PentominoButton
                onClick={onPuzzleSelect}
                shape="S"
                color="bg-gradient-to-br from-green-500 to-emerald-600"
                glowColor="rgba(34,197,94,0.4)"
                iconColor="text-green-400"
                icon={Puzzle}
                title="PUZZLE"
                subtitle="Solve challenges"
              />
            </div>
            
            {/* Themed Bottom Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  onToggleHowToPlay(true);
                }}
                className="flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-slate-700 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:text-cyan-200 group"
              >
                <HelpCircle size={16} className="group-hover:rotate-12 transition-transform" />
                <span>HOW TO PLAY</span>
              </button>
              
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  onToggleSettings(true);
                }}
                className="py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center bg-gradient-to-r from-slate-800 to-slate-700 text-slate-400 border border-slate-600/50 hover:border-purple-500/50 hover:text-purple-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] group"
              >
                <Settings size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottom padding */}
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>

      {/* Modals */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => onToggleHowToPlay(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => onToggleSettings(false)} />
    </div>
  );
};

export default MenuScreen;
