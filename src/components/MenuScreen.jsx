import { Bot, User, Trophy, Settings } from 'lucide-react';
import NeonTitle from './NeonTitle';
import HowToPlayModal from './HowToPlayModal';
import SettingsModal from './SettingsModal';
import { menuButtonShapes } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';

// Polyomino-shaped button component
const PolyominoButton = ({ onClick, shape, color, glowColor, icon: Icon, iconSvg, title, subtitle }) => {
  const cells = menuButtonShapes[shape] || menuButtonShapes.T;
  
  const handleClick = () => {
    soundManager.playButtonClick();
    onClick();
  };
  
  return (
    <button 
      onClick={handleClick}
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
      
      {/* Button content - fixed alignment */}
      <div className="flex items-center gap-3 ml-8">
        {Icon && <Icon size={26} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] flex-shrink-0" />}
        {iconSvg}
        <div className="text-left text-white">
          <div className="text-lg font-bold tracking-wide">{title}</div>
          <div className="text-xs opacity-70">{subtitle}</div>
        </div>
      </div>
    </button>
  );
};

// Footer component with privacy and terms links
const Footer = () => (
  <div className="text-center pt-6 pb-4">
    <p className="text-slate-600 text-xs mb-2">© 2024 Deadblock</p>
    <div className="flex items-center justify-center gap-3 text-xs">
      <a 
        href="/privacy.html" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-slate-500 hover:text-cyan-400 transition-colors underline underline-offset-2"
      >
        Privacy Policy
      </a>
      <span className="text-slate-700">•</span>
      <a 
        href="/terms.html" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-slate-500 hover:text-cyan-400 transition-colors underline underline-offset-2"
      >
        Terms of Service
      </a>
    </div>
  </div>
);

const MenuScreen = ({ 
  onStartGame, 
  onPuzzleSelect, 
  showHowToPlay, 
  onToggleHowToPlay,
  showSettings,
  onToggleSettings
}) => {
  return (
    <div 
      className="fixed inset-0 bg-slate-950"
      style={{
        overflow: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y pinch-zoom',
      }}
    >
      {/* Fixed backgrounds - pointer-events-none so they don't block scroll */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>
      
      {/* Scrollable content */}
      <div 
        className="relative min-h-full flex flex-col items-center justify-center px-4 py-8"
        style={{
          minHeight: '100%',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
          <NeonTitle className="text-4xl sm:text-5xl text-center mb-2">DEADBLOCK</NeonTitle>
          <p className="text-center text-cyan-300/70 mb-6 tracking-widest text-xs sm:text-sm">CHOOSE YOUR MODE</p>
          
          <div className="space-y-3">
            {/* Play vs AI */}
            <PolyominoButton 
              onClick={() => onStartGame('ai')}
              shape="T"
              color="bg-gradient-to-r from-purple-600/90 to-pink-600/90"
              glowColor="rgba(168,85,247,0.5)"
              icon={Bot}
              title="PLAY vs AI"
              subtitle="Challenge the machine"
            />
            
            {/* 2 Player */}
            <PolyominoButton
              onClick={() => onStartGame('2player')}
              shape="L"
              color="bg-gradient-to-r from-cyan-600/90 to-blue-600/90"
              glowColor="rgba(34,211,238,0.5)"
              icon={User}
              title="2 PLAYER"
              subtitle="Local multiplayer"
            />

            {/* Puzzle Mode */}
            <PolyominoButton
              onClick={onPuzzleSelect}
              shape="Z"
              color="bg-gradient-to-r from-green-600/90 to-emerald-600/90"
              glowColor="rgba(74,222,128,0.5)"
              icon={Trophy}
              title="PUZZLE MODE"
              subtitle="Tactical challenges"
            />

            {/* How to Play */}
            <PolyominoButton
              onClick={() => onToggleHowToPlay(true)}
              shape="P"
              color="bg-gradient-to-r from-amber-600/90 to-orange-600/90"
              glowColor="rgba(251,191,36,0.5)"
              iconSvg={
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <path d="M12 17h.01"/>
                </svg>
              }
              title="HOW TO PLAY"
              subtitle="Learn the rules"
            />

            {/* Settings */}
            <PolyominoButton
              onClick={() => onToggleSettings(true)}
              shape="T"
              color="bg-gradient-to-r from-slate-600/90 to-slate-700/90"
              glowColor="rgba(148,163,184,0.4)"
              icon={Settings}
              title="SETTINGS"
              subtitle="Sound & vibration"
            />
          </div>
        </div>
        
        {/* Footer with Privacy & Terms */}
        <Footer />
      </div>

      {/* How to Play Modal */}
      <HowToPlayModal 
        isOpen={showHowToPlay}
        onClose={() => onToggleHowToPlay(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => onToggleSettings(false)}
      />
    </div>
  );
};

export default MenuScreen;
