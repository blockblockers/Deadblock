import { Settings, HelpCircle, Wifi } from 'lucide-react';
import NeonTitle from './NeonTitle';
import HowToPlayModal from './HowToPlayModal';
import SettingsModal from './SettingsModal';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { isSupabaseConfigured } from '../utils/supabase';

// Custom pentomino shapes for buttons
const buttonShapes = {
  T: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 0]],
  W: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]], // W shape for online - stair pattern
};

// Pentomino shape component (no icons inside)
const PentominoShape = ({ shape, color, glowColor, cellSize = 24, gap = 2 }) => {
  const coords = buttonShapes[shape] || buttonShapes.T;
  
  const minX = Math.min(...coords.map(([x]) => x));
  const maxX = Math.max(...coords.map(([x]) => x));
  const minY = Math.min(...coords.map(([, y]) => y));
  const maxY = Math.max(...coords.map(([, y]) => y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  const normalizedCoords = coords.map(([x, y]) => [x - minX, y - minY]);
  
  return (
    <div 
      className="relative flex-shrink-0"
      style={{ 
        width: width * (cellSize + gap) - gap, 
        height: height * (cellSize + gap) - gap 
      }}
    >
      {normalizedCoords.map(([x, y], idx) => (
        <div
          key={idx}
          className={`absolute ${color} rounded-md border border-white/20`}
          style={{
            width: cellSize,
            height: cellSize,
            left: x * (cellSize + gap),
            top: y * (cellSize + gap),
            boxShadow: `0 0 12px ${glowColor}`,
          }}
        />
      ))}
    </div>
  );
};

// Button with pentomino shape and themed colors
const PentominoButton = ({ onClick, shape, color, glowColor, title, subtitle, textColor, hoverTextColor }) => {
  const handleClick = () => {
    soundManager.playButtonClick();
    onClick();
  };
  
  return (
    <button onClick={handleClick} className="w-full group">
      <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-500/50 transition-all duration-200 group-active:scale-[0.98]">
        {/* Fixed width container for pentomino alignment */}
        <div 
          className="flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{ width: 80, height: 80 }}
        >
          <PentominoShape shape={shape} color={color} glowColor={glowColor} />
        </div>
        
        {/* Text - left aligned */}
        <div className="flex-1 text-left">
          <div className={`font-bold text-base tracking-wide transition-colors ${textColor} ${hoverTextColor}`}>
            {title}
          </div>
          <div className="text-slate-500 text-sm group-hover:text-slate-400 transition-colors">
            {subtitle}
          </div>
        </div>
        
        {/* Arrow */}
        <div className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0">
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
  onToggleSettings,
  isOnlineEnabled = false,
  isAuthenticated = false
}) => {
  const { needsScroll } = useResponsiveLayout(700);
  const showOnline = isSupabaseConfigured();

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
          
          {/* TITLE - Above the box */}
          <div className="text-center mb-6">
            <NeonTitle size="large" />
          </div>
          
          {/* Menu Box */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 sm:p-5 border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)]">
            
            {/* Game Mode Buttons */}
            <div className="space-y-3 mb-4">
              {/* Online Button - Show if Supabase is configured */}
              {showOnline && (
                <PentominoButton
                  onClick={() => onStartGame('online')}
                  shape="W"
                  color="bg-gradient-to-br from-amber-500 to-orange-600"
                  glowColor="rgba(251,191,36,0.5)"
                  title="ONLINE"
                  subtitle={isAuthenticated ? "Play ranked matches" : "Sign in to play"}
                  textColor="text-amber-300"
                  hoverTextColor="group-hover:text-amber-200"
                />
              )}
              
              <PentominoButton
                onClick={() => onStartGame('ai')}
                shape="T"
                color="bg-gradient-to-br from-purple-500 to-pink-600"
                glowColor="rgba(168,85,247,0.5)"
                title="VS AI"
                subtitle="Challenge the computer"
                textColor="text-purple-300"
                hoverTextColor="group-hover:text-purple-200"
              />
              
              <PentominoButton
                onClick={() => onStartGame('2player')}
                shape="L"
                color="bg-gradient-to-br from-cyan-500 to-blue-600"
                glowColor="rgba(34,211,238,0.5)"
                title="2 PLAYER"
                subtitle="Local multiplayer"
                textColor="text-cyan-300"
                hoverTextColor="group-hover:text-cyan-200"
              />
              
              <PentominoButton
                onClick={onPuzzleSelect}
                shape="S"
                color="bg-gradient-to-br from-green-500 to-emerald-600"
                glowColor="rgba(34,197,94,0.5)"
                title="PUZZLE"
                subtitle="Solve challenges"
                textColor="text-green-300"
                hoverTextColor="group-hover:text-green-200"
              />
            </div>
            
            {/* Bottom Buttons */}
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
