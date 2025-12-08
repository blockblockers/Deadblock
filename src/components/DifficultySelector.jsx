import { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { pieces } from '../utils/pieces';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Theme configurations
const themes = {
  beginner: {
    gridColor: 'rgba(34,197,94,0.3)',
    glow1: 'bg-green-500/25',
    glow2: 'bg-emerald-500/20',
    cardBorder: 'border-green-500/40',
    cardShadow: 'shadow-[0_0_50px_rgba(34,197,94,0.3)]',
  },
  intermediate: {
    gridColor: 'rgba(251,191,36,0.3)',
    glow1: 'bg-amber-500/25',
    glow2: 'bg-orange-500/20',
    cardBorder: 'border-amber-500/40',
    cardShadow: 'shadow-[0_0_50px_rgba(251,191,36,0.3)]',
  },
  expert: {
    gridColor: 'rgba(168,85,247,0.3)',
    glow1: 'bg-purple-500/25',
    glow2: 'bg-pink-500/20',
    cardBorder: 'border-purple-500/40',
    cardShadow: 'shadow-[0_0_50px_rgba(168,85,247,0.3)]',
  },
};

// Mini pentomino shape
const MiniPentomino = ({ pieceName, color, size = 8 }) => {
  const pieceCoords = pieces[pieceName] || pieces.T;
  const minX = Math.min(...pieceCoords.map(([x]) => x));
  const minY = Math.min(...pieceCoords.map(([, y]) => y));
  const normalizedCoords = pieceCoords.map(([x, y]) => [x - minX, y - minY]);
  
  return (
    <div className="relative" style={{ width: size * 4, height: size * 3 }}>
      {normalizedCoords.map(([x, y], idx) => (
        <div key={idx} className={`absolute ${color} rounded-sm`}
          style={{ width: size, height: size, left: x * (size + 1), top: y * (size + 1) }}
        />
      ))}
    </div>
  );
};

const DifficultySelector = ({ selectedDifficulty, onSelectDifficulty, onStartGame, onBack }) => {
  const { needsScroll } = useResponsiveLayout(700);

  const difficulties = [
    { 
      id: AI_DIFFICULTY.RANDOM, 
      name: 'BEGINNER', 
      subtitle: 'Random Moves', 
      description: 'AI makes completely random valid moves. Perfect for learning.', 
      pieceName: 'I', 
      color: 'from-green-500 to-emerald-600', 
      glowColor: 'rgba(74,222,128,0.5)', 
      borderColor: 'border-green-500/40', 
      textColor: 'text-green-300', 
      pieceColor: 'bg-green-400',
      icon: '🌱',
      theme: 'beginner',
    },
    { 
      id: AI_DIFFICULTY.AVERAGE, 
      name: 'INTERMEDIATE', 
      subtitle: 'Strategic', 
      description: 'AI uses basic strategy and thinks ahead.', 
      pieceName: 'T', 
      color: 'from-amber-500 to-orange-600', 
      glowColor: 'rgba(251,191,36,0.5)', 
      borderColor: 'border-amber-500/40', 
      textColor: 'text-amber-300', 
      pieceColor: 'bg-amber-400',
      icon: '🔥',
      theme: 'intermediate',
    },
    { 
      id: AI_DIFFICULTY.PROFESSIONAL, 
      name: 'EXPERT', 
      subtitle: 'Advanced AI', 
      description: 'AI analyzes deeply and plays to win.', 
      pieceName: 'X', 
      color: 'from-purple-500 to-pink-600', 
      glowColor: 'rgba(168,85,247,0.5)', 
      borderColor: 'border-purple-500/40', 
      textColor: 'text-purple-300', 
      pieceColor: 'bg-purple-400',
      icon: '✨',
      theme: 'expert',
    }
  ];

  const selectedDiff = difficulties.find(d => d.id === selectedDifficulty) || difficulties[0];
  const theme = themes[selectedDiff.theme];

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
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
    >
      {/* Themed Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none transition-all duration-500" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Themed glow effects */}
      <div className={`fixed top-1/4 left-1/4 w-72 h-72 ${theme.glow1} rounded-full blur-3xl pointer-events-none transition-all duration-500`} />
      <div className={`fixed bottom-1/4 right-1/4 w-72 h-72 ${theme.glow2} rounded-full blur-3xl pointer-events-none transition-all duration-500`} />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-md">
          {/* Title above card */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-1">
              <Bot size={28} className={selectedDiff.textColor} />
              <NeonTitle size="default" />
            </div>
            <p className="text-slate-400 text-sm">VS AI - Choose Difficulty</p>
          </div>

          <div className={`bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow} transition-all duration-500`}>
            
            {/* Difficulty Options */}
            <div className="space-y-3 mb-5">
              {difficulties.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <button key={diff.id} onClick={() => handleSelect(diff.id)}
                    className={`w-full p-4 rounded-xl border transition-all text-left relative overflow-hidden ${
                      isSelected 
                        ? `bg-gradient-to-r ${diff.color} border-white/30 shadow-lg` 
                        : `bg-slate-800/80 ${diff.borderColor} hover:bg-slate-700/80`
                    }`}
                    style={isSelected ? { boxShadow: `0 0 30px ${diff.glowColor}` } : {}}
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon + Pentomino */}
                      <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-700'} flex items-center justify-center`}>
                        <span className="text-xl mr-1">{diff.icon}</span>
                        <MiniPentomino pieceName={diff.pieceName} color={isSelected ? 'bg-white' : diff.pieceColor} size={6} />
                      </div>
                      
                      {/* Text */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold tracking-wide ${isSelected ? 'text-white' : diff.textColor}`}>{diff.name}</h3>
                          <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>{diff.subtitle}</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{diff.description}</p>
                      </div>
                      
                      {/* Radio indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-white bg-white' : 'border-slate-600'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-slate-900" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Start Button */}
            <button onClick={handleStart}
              className={`w-full p-4 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-2 text-white bg-gradient-to-r ${selectedDiff.color}`}
              style={{ boxShadow: `0 0 25px ${selectedDiff.glowColor}` }}
            >
              <Bot size={20} />
              START GAME
            </button>
            
            {/* Back button */}
            <button onClick={handleBack}
              className="w-full mt-3 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>
    </div>
  );
};

export default DifficultySelector;
