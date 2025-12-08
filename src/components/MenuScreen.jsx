import { Bot, Users, Trophy, Settings, HelpCircle } from 'lucide-react';
import NeonTitle from './NeonTitle';
import HowToPlayModal from './HowToPlayModal';
import SettingsModal from './SettingsModal';
import { pieces } from '../utils/pieces';
import { soundManager } from '../utils/soundManager';

// True Pentomino-shaped button - renders actual 5-block game piece as clickable button
const PentominoShapeButton = ({ onClick, pieceName, color, glowColor, icon: Icon, title, subtitle }) => {
  // Get the actual piece coordinates from the game
  const pieceCoords = pieces[pieceName] || pieces.T;
  
  // Calculate bounds to normalize
  const minX = Math.min(...pieceCoords.map(([x]) => x));
  const maxX = Math.max(...pieceCoords.map(([x]) => x));
  const minY = Math.min(...pieceCoords.map(([, y]) => y));
  const maxY = Math.max(...pieceCoords.map(([, y]) => y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  
  // Normalize coordinates to start from 0
  const normalizedCoords = pieceCoords.map(([x, y]) => [x - minX, y - minY]);
  
  const handleClick = () => {
    soundManager.playButtonClick();
    onClick();
  };
  
  // Cell size and gap
  const cellSize = 52;
  const gap = 3;
  
  // Create a Set for quick lookup of which cells are filled
  const filledCells = new Set(normalizedCoords.map(([x, y]) => `${x},${y}`));
  
  // Find the center cell for icon placement (use middle of piece)
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  // Find closest filled cell to center
  let iconCell = normalizedCoords[0];
  let minDist = Infinity;
  for (const [x, y] of normalizedCoords) {
    const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
    if (dist < minDist) {
      minDist = dist;
      iconCell = [x, y];
    }
  }
  
  return (
    <div className="flex items-center gap-4 w-full">
      {/* Pentomino shape button */}
      <button 
        onClick={handleClick}
        className="relative group flex-shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{
          width: width * (cellSize + gap) - gap,
          height: height * (cellSize + gap) - gap,
        }}
      >
        {/* Render each cell of the pentomino */}
        {normalizedCoords.map(([x, y], idx) => {
          const isIconCell = x === iconCell[0] && y === iconCell[1];
          
          return (
            <div
              key={idx}
              className={`absolute ${color} rounded-lg border-2 border-white/30 transition-all duration-200 group-hover:border-white/50`}
              style={{
                width: cellSize,
                height: cellSize,
                left: x * (cellSize + gap),
                top: y * (cellSize + gap),
                boxShadow: `0 0 15px ${glowColor}, inset 0 0 20px rgba(255,255,255,0.15)`,
              }}
            >
              {/* Icon in center cell */}
              {isIconCell && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon size={26} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                </div>
              )}
            </div>
          );
        })}
      </button>
      
      {/* Text label beside the shape */}
      <button 
        onClick={handleClick}
        className="flex-1 text-left group"
      >
        <div className="text-white font-bold text-lg tracking-wide group-hover:text-cyan-300 transition-colors">
          {title}
        </div>
        <div className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">
          {subtitle}
        </div>
      </button>
    </div>
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
    <div 
      className="min-h-screen bg-slate-950 overflow-x-hidden"
      style={{ 
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
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
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)]">
            {/* Title */}
            <div className="text-center mb-8">
              <NeonTitle className="text-4xl sm:text-5xl mb-2">DEADBLOCK</NeonTitle>
              <p className="text-cyan-300/70 text-sm tracking-widest">PENTOMINO STRATEGY</p>
            </div>
            
            {/* Game Mode Buttons - True Pentomino Shapes */}
            <div className="space-y-6 mb-8">
              {/* VS AI - T piece */}
              <PentominoShapeButton
                onClick={() => onStartGame('ai')}
                pieceName="T"
                color="bg-gradient-to-br from-purple-500 to-pink-600"
                glowColor="rgba(168,85,247,0.6)"
                icon={Bot}
                title="VS AI"
                subtitle="Challenge the computer"
              />
              
              {/* 2 Player - L piece */}
              <PentominoShapeButton
                onClick={() => onStartGame('2player')}
                pieceName="L"
                color="bg-gradient-to-br from-cyan-500 to-blue-600"
                glowColor="rgba(34,211,238,0.6)"
                icon={Users}
                title="2 PLAYER"
                subtitle="Local multiplayer"
              />
              
              {/* Puzzle - W piece (interesting shape) */}
              <PentominoShapeButton
                onClick={onPuzzleSelect}
                pieceName="W"
                color="bg-gradient-to-br from-green-500 to-emerald-600"
                glowColor="rgba(34,197,94,0.6)"
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
                className="flex-1 py-3 bg-slate-800/80 text-cyan-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all border border-cyan-500/30 flex items-center justify-center gap-2"
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
        </div>
        
        {/* Bottom padding for safe area */}
        <div className="h-12 flex-shrink-0" />
      </div>

      {/* Modals */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => onToggleHowToPlay(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => onToggleSettings(false)} />
    </div>
  );
};

export default MenuScreen;
