import { Bot, Users, Trophy, Settings, HelpCircle } from 'lucide-react';
import NeonTitle from './NeonTitle';
import HowToPlayModal from './HowToPlayModal';
import SettingsModal from './SettingsModal';
import { pieces } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';

// Pentomino-shaped button component - renders actual game pieces as button shape
const PentominoButton = ({ onClick, pieceName, color, glowColor, icon: Icon, title, subtitle }) => {
  // Get the actual piece coordinates
  const pieceCoords = pieces[pieceName] || pieces.T;
  
  // Calculate bounds
  const minX = Math.min(...pieceCoords.map(([x]) => x));
  const maxX = Math.max(...pieceCoords.map(([x]) => x));
  const minY = Math.min(...pieceCoords.map(([, y]) => y));
  const maxY = Math.max(...pieceCoords.map(([, y]) => y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // Normalize coordinates
  const normalizedCoords = pieceCoords.map(([x, y]) => [x - minX, y - minY]);
  
  const handleClick = () => {
    soundManager.playButtonClick();
    onClick();
  };
  
  // Cell size for the pentomino shape
  const cellSize = 48;
  const gap = 4;
  
  return (
    <button 
      onClick={handleClick}
      className="relative group transition-transform duration-300 hover:scale-105 active:scale-95"
      style={{ 
        width: '100%',
        height: height * (cellSize + gap) + 16,
      }}
    >
      {/* Pentomino shape container */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: width * (cellSize + gap),
          height: height * (cellSize + gap),
        }}
      >
        {/* Render each cell of the pentomino */}
        {normalizedCoords.map(([x, y], idx) => (
          <div
            key={idx}
            className={`absolute ${color} rounded-lg border-2 border-white/20 transition-all duration-300`}
            style={{
              width: cellSize,
              height: cellSize,
              left: x * (cellSize + gap),
              top: y * (cellSize + gap),
              boxShadow: `0 0 20px ${glowColor}, inset 0 0 15px rgba(255,255,255,0.1)`,
            }}
          >
            {/* Content only in center cell (approximately) */}
            {idx === Math.floor(normalizedCoords.length / 2) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon size={24} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              </div>
            )}
          </div>
        ))}
        
        {/* Text overlay - positioned below shape */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
          style={{ top: height * (cellSize + gap) + 8 }}
        >
          <div className="text-white font-bold text-sm tracking-wider drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
            {title}
          </div>
          <div className="text-white/60 text-xs">
            {subtitle}
          </div>
        </div>
      </div>
    </button>
  );
};

// Alternative: Card-style button with pentomino decoration
const PentominoCard = ({ onClick, pieceName, color, glowColor, borderColor, icon: Icon, title, subtitle }) => {
  const pieceCoords = pieces[pieceName] || pieces.T;
  const minX = Math.min(...pieceCoords.map(([x]) => x));
  const minY = Math.min(...pieceCoords.map(([, y]) => y));
  const normalizedCoords = pieceCoords.map(([x, y]) => [x - minX, y - minY]);
  
  const handleClick = () => {
    soundManager.playButtonClick();
    onClick();
  };
  
  return (
    <button 
      onClick={handleClick}
      className={`relative w-full p-4 rounded-xl border-2 ${borderColor} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden group`}
      style={{ 
        background: `linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.9) 100%)`,
        boxShadow: `0 0 30px ${glowColor}40, inset 0 0 30px ${glowColor}10`,
      }}
    >
      {/* Animated pentomino background decoration */}
      <div className="absolute -right-4 -top-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
        <div className="relative" style={{ transform: 'rotate(15deg) scale(1.5)' }}>
          {normalizedCoords.map(([x, y], idx) => (
            <div
              key={idx}
              className={`absolute ${color} rounded-sm`}
              style={{
                width: 20,
                height: 20,
                left: x * 22,
                top: y * 22,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Glow effect on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${glowColor}20 0%, transparent 70%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative flex items-center gap-4">
        {/* Icon with pentomino mini shape */}
        <div className="relative">
          <div 
            className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center border border-white/20`}
            style={{ boxShadow: `0 0 20px ${glowColor}` }}
          >
            <Icon size={28} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          </div>
          {/* Mini pentomino accent */}
          <div className="absolute -bottom-1 -right-1 opacity-60">
            {normalizedCoords.slice(0, 3).map(([x, y], idx) => (
              <div
                key={idx}
                className={`absolute ${color} rounded-sm`}
                style={{
                  width: 6,
                  height: 6,
                  left: x * 7,
                  top: y * 7,
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Text */}
        <div className="text-left flex-1">
          <div className="text-white font-bold text-lg tracking-wide">{title}</div>
          <div className="text-slate-400 text-xs">{subtitle}</div>
        </div>
        
        {/* Arrow indicator */}
        <div className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all duration-300">
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
      {/* Main scrollable container */}
      <div 
        className="fixed inset-0 bg-slate-950 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Animated grid background - fixed */}
        <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        {/* Glow effects - fixed */}
        <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Content wrapper */}
        <div className="relative w-full min-h-full flex items-center justify-center p-4 py-8">
          <div className="w-full max-w-md">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)]">
              {/* Title */}
              <div className="text-center mb-8">
                <NeonTitle className="text-4xl sm:text-5xl mb-2">DEADBLOCK</NeonTitle>
                <p className="text-cyan-300/70 text-sm tracking-widest">PENTOMINO STRATEGY</p>
              </div>
              
              {/* Game Mode Buttons - Pentomino themed */}
              <div className="space-y-3 mb-6">
                <PentominoCard
                  onClick={() => onStartGame('ai')}
                  pieceName="T"
                  color="bg-gradient-to-br from-purple-500 to-pink-600"
                  glowColor="#a855f7"
                  borderColor="border-purple-500/40"
                  icon={Bot}
                  title="VS AI"
                  subtitle="Challenge the computer"
                />
                
                <PentominoCard
                  onClick={() => onStartGame('2player')}
                  pieceName="L"
                  color="bg-gradient-to-br from-cyan-500 to-blue-600"
                  glowColor="#22d3ee"
                  borderColor="border-cyan-500/40"
                  icon={Users}
                  title="2 PLAYER"
                  subtitle="Local multiplayer"
                />
                
                <PentominoCard
                  onClick={onPuzzleSelect}
                  pieceName="Z"
                  color="bg-gradient-to-br from-green-500 to-emerald-600"
                  glowColor="#22c55e"
                  borderColor="border-green-500/40"
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
                  className="flex-1 py-3 bg-slate-800/80 text-cyan-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all border border-cyan-500/30 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                >
                  <HelpCircle size={18} />
                  HOW TO PLAY
                </button>
                
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    onToggleSettings(true);
                  }}
                  className="py-3 px-4 bg-slate-800/80 text-slate-300 rounded-xl hover:bg-slate-700 transition-all border border-slate-600/50 flex items-center justify-center"
                >
                  <Settings size={20} />
                </button>
              </div>
              
              {/* Version */}
              <div className="text-center mt-6 text-slate-600 text-xs">
                v3.0 • Pentomino Edition
              </div>
            </div>
            
            {/* Bottom safe area */}
            <div className="h-8" />
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
