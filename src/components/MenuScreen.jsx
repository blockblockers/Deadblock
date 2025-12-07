import { Bot, Users, Trophy, Settings, HelpCircle } from 'lucide-react';
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
      
      {/* Button content */}
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

const MenuScreen = ({ 
  onStartGame, 
  onPuzzleSelect, 
  showHowToPlay, 
  onToggleHowToPlay,
  showSettings,
  onToggleSettings
}) => {
  return (
    <div className="min-h-screen relative overflow-y-auto overflow-x-hidden bg-slate-950">
      {/* Animated grid background - fixed */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow effects - fixed */}
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Scrollable content */}
      <div className="relative min-h-screen flex items-center justify-center p-4 py-8">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)]">
          {/* Title */}
          <div className="text-center mb-6">
            <NeonTitle className="text-4xl sm:text-5xl mb-2">DEADBLOCK</NeonTitle>
            <p className="text-cyan-300/70 text-sm tracking-widest">BLOCK PUZZLE STRATEGY</p>
          </div>
          
          {/* Game Mode Buttons */}
          <div className="space-y-3 mb-6">
            <PolyominoButton
              onClick={() => onStartGame('ai')}
              shape="T"
              color="bg-gradient-to-r from-purple-600 to-pink-600"
              glowColor="rgba(168,85,247,0.5)"
              icon={Bot}
              title="1 VS AI"
              subtitle="Challenge the computer"
            />
            
            <PolyominoButton
              onClick={() => onStartGame('2player')}
              shape="L"
              color="bg-gradient-to-r from-cyan-600 to-blue-600"
              glowColor="rgba(34,211,238,0.5)"
              icon={Users}
              title="2 PLAYER"
              subtitle="Play with a friend"
            />
            
            <PolyominoButton
              onClick={onPuzzleSelect}
              shape="Z"
              color="bg-gradient-to-r from-green-600 to-emerald-600"
              glowColor="rgba(74,222,128,0.5)"
              icon={Trophy}
              title="PUZZLE"
              subtitle="Solve challenges"
            />
          </div>
          
          {/* Bottom Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onToggleHowToPlay(true);
              }}
              className="flex-1 py-3 bg-slate-800 text-cyan-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all border border-cyan-500/30 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            >
              <HelpCircle size={18} />
              HOW TO PLAY
            </button>
            
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onToggleSettings(true);
              }}
              className="py-3 px-4 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all border border-slate-600/50 flex items-center justify-center"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => onToggleHowToPlay(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => onToggleSettings(false)} />
    </div>
  );
};

export default MenuScreen;
