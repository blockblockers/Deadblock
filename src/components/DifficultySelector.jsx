import { Bot, Sparkles } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { pieces } from '../utils/pieces';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { soundManager } from '../utils/soundManager';

// Mini pentomino shape component
const MiniPentomino = ({ pieceName, color, size = 8 }) => {
  const pieceCoords = pieces[pieceName] || pieces.T;
  const minX = Math.min(...pieceCoords.map(([x]) => x));
  const minY = Math.min(...pieceCoords.map(([, y]) => y));
  const normalizedCoords = pieceCoords.map(([x, y]) => [x - minX, y - minY]);
  
  return (
    <div className="relative" style={{ width: size * 4, height: size * 3 }}>
      {normalizedCoords.map(([x, y], idx) => (
        <div
          key={idx}
          className={`absolute ${color} rounded-sm`}
          style={{ width: size, height: size, left: x * (size + 1), top: y * (size + 1) }}
        />
      ))}
    </div>
  );
};

const DifficultySelector = ({ selectedDifficulty, onSelectDifficulty, onStartGame, onBack }) => {
  const difficulties = [
    {
      id: AI_DIFFICULTY.RANDOM,
      name: 'BEGINNER',
      subtitle: 'Random Moves',
      description: 'AI makes completely random valid moves. Perfect for learning.',
      pieceName: 'I',
      color: 'from-green-500 to-emerald-600',
      glowColor: 'rgba(74,222,128,0.5)',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-300',
      pieceColor: 'bg-green-400'
    },
    {
      id: AI_DIFFICULTY.AVERAGE,
      name: 'INTERMEDIATE',
      subtitle: 'Strategic Thinker',
      description: 'AI uses strategy: controls center, limits options, thinks ahead.',
      pieceName: 'T',
      color: 'from-amber-500 to-orange-600',
      glowColor: 'rgba(251,191,36,0.5)',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-300',
      pieceColor: 'bg-amber-400'
    },
    {
      id: AI_DIFFICULTY.PROFESSIONAL,
      name: 'EXPERT',
      subtitle: 'Claude AI Powered',
      description: 'Powered by Claude AI. Analyzes like a professional player.',
      pieceName: 'X',
      color: 'from-purple-500 to-pink-600',
      glowColor: 'rgba(168,85,247,0.5)',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-300',
      pieceColor: 'bg-purple-400',
      badge: 'AI'
    }
  ];

  const handleSelect = (diffId) => {
    soundManager.playClickSound('select');
    onSelectDifficulty(diffId);
  };

  const handleStart = () => {
    soundManager.playButtonClick();
    onStartGame();
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  return (
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
      {/* Grid background - fixed */}
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
      
      {/* Glow effects - fixed */}
      <div className="pointer-events-none" style={{ position: 'fixed', top: '25%', left: '25%', width: 256, height: 256, background: 'rgba(168,85,247,0.2)', borderRadius: '50%', filter: 'blur(48px)' }} />
      <div className="pointer-events-none" style={{ position: 'fixed', bottom: '25%', right: '25%', width: 256, height: 256, background: 'rgba(34,211,238,0.2)', borderRadius: '50%', filter: 'blur(48px)' }} />
      
      {/* Scrollable content */}
      <div style={{ position: 'relative', paddingTop: 48, paddingBottom: 200, paddingLeft: 16, paddingRight: 16 }}>
        <div className="max-w-lg mx-auto">
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bot size={28} className="text-purple-400" />
                <NeonTitle className="text-2xl sm:text-3xl">VS AI</NeonTitle>
              </div>
              <button 
                onClick={handleBack}
                className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs border border-cyan-500/30 hover:bg-slate-700"
              >
                BACK
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-6">Choose your opponent's skill level</p>
            
            {/* Difficulty Options */}
            <div className="space-y-3 mb-6">
              {difficulties.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                
                return (
                  <button
                    key={diff.id}
                    onClick={() => handleSelect(diff.id)}
                    className={`w-full p-4 rounded-xl border transition-all duration-300 text-left relative overflow-hidden ${
                      isSelected 
                        ? `bg-gradient-to-r ${diff.color} border-white/30`
                        : `bg-slate-800/80 ${diff.borderColor} hover:bg-slate-700/80`
                    }`}
                    style={isSelected ? { boxShadow: `0 0 30px ${diff.glowColor}` } : {}}
                  >
                    {diff.badge && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                        {diff.badge}
                      </span>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-700'} flex items-center justify-center`}>
                        <MiniPentomino 
                          pieceName={diff.pieceName} 
                          color={isSelected ? 'bg-white' : diff.pieceColor}
                          size={7}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold tracking-wide ${isSelected ? 'text-white' : diff.textColor}`}>
                            {diff.name}
                          </h3>
                          <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                            {diff.subtitle}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {diff.description}
                        </p>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-white bg-white' : 'border-slate-600'
                      }`}>
                        {isSelected && (
                          <div className={`w-2 h-2 rounded-full ${
                            diff.id === AI_DIFFICULTY.RANDOM ? 'bg-green-600' :
                            diff.id === AI_DIFFICULTY.AVERAGE ? 'bg-amber-600' : 'bg-purple-600'
                          }`} />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Expert note */}
            {selectedDifficulty === AI_DIFFICULTY.PROFESSIONAL && (
              <div className="mb-4 p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                <p className="text-xs text-purple-300">
                  <Sparkles size={12} className="inline mr-1" />
                  Requires internet connection. The AI will analyze board state and strategic positioning.
                </p>
              </div>
            )}
            
            {/* Start Button */}
            <button 
              onClick={handleStart}
              className="w-full p-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold tracking-wide hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_25px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2"
            >
              <Bot size={20} />
              START GAME
            </button>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="text-center mt-8 text-slate-600 text-xs animate-bounce">
          ↕ Scroll to navigate
        </div>
      </div>
    </div>
  );
};

export default DifficultySelector;
