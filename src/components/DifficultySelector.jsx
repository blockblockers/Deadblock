import { Bot, Sparkles, Brain, Zap } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { soundManager } from '../utils/soundManager';

const DifficultySelector = ({ selectedDifficulty, onSelectDifficulty, onStartGame, onBack }) => {
  const difficulties = [
    {
      id: AI_DIFFICULTY.RANDOM,
      name: 'BEGINNER',
      subtitle: 'Random Moves',
      description: 'AI makes completely random valid moves. Perfect for learning the game.',
      icon: Zap,
      color: 'from-green-500 to-emerald-600',
      glowColor: 'rgba(74,222,128,0.5)',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-300'
    },
    {
      id: AI_DIFFICULTY.AVERAGE,
      name: 'INTERMEDIATE',
      subtitle: 'Strategic Thinker',
      description: 'AI uses basic strategy: controls center, limits your options, thinks ahead.',
      icon: Brain,
      color: 'from-amber-500 to-orange-600',
      glowColor: 'rgba(251,191,36,0.5)',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-300'
    },
    {
      id: AI_DIFFICULTY.PROFESSIONAL,
      name: 'EXPERT',
      subtitle: 'Claude AI Powered',
      description: 'Powered by Claude AI. Analyzes the board like a professional player.',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-600',
      glowColor: 'rgba(168,85,247,0.5)',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-300',
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
    <div className="min-h-screen relative overflow-y-auto overflow-x-hidden bg-slate-950">
      {/* Grid background - fixed */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow effects - fixed */}
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Scrollable content */}
      <div className="relative min-h-screen flex items-center justify-center p-4 py-8">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bot size={28} className="text-purple-400" />
              <NeonTitle className="text-2xl sm:text-3xl">VS AI</NeonTitle>
            </div>
            <button 
              onClick={handleBack}
              className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg text-xs border border-cyan-500/30 hover:bg-slate-700 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            >
              BACK
            </button>
          </div>
          <p className="text-slate-400 text-sm mb-6">Choose your opponent's skill level</p>
          
          {/* Difficulty Options */}
          <div className="space-y-3 mb-6">
            {difficulties.map((diff) => {
              const Icon = diff.icon;
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
                  {/* Badge */}
                  {diff.badge && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                      {diff.badge}
                    </span>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-700'}`}>
                      <Icon size={24} className={isSelected ? 'text-white' : diff.textColor} />
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
                    
                    {/* Selection indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected 
                        ? 'border-white bg-white' 
                        : 'border-slate-600'
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
                Requires internet connection.
                The AI will consider board state, available pieces, and strategic positioning.
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
    </div>
  );
};

export default DifficultySelector;
