import NeonTitle from './NeonTitle';
import { AI_DIFFICULTY } from '../utils/aiLogic';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Dramatically different themes for each difficulty
const themes = {
  beginner: {
    gridColor: 'rgba(34,197,94,0.5)',
    glow1: { color: 'bg-green-500/40', pos: 'top-20 left-10' },
    glow2: { color: 'bg-emerald-400/30', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-lime-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-green-950/50 to-slate-900/95',
    cardBorder: 'border-green-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(34,197,94,0.4),inset_0_0_30px_rgba(34,197,94,0.1)]',
  },
  intermediate: {
    gridColor: 'rgba(251,191,36,0.5)',
    glow1: { color: 'bg-amber-500/40', pos: 'top-10 right-20' },
    glow2: { color: 'bg-orange-500/35', pos: 'bottom-20 left-10' },
    glow3: { color: 'bg-red-500/20', pos: 'top-1/3 left-1/3' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/50 to-slate-900/95',
    cardBorder: 'border-amber-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(251,191,36,0.4),inset_0_0_30px_rgba(251,191,36,0.1)]',
  },
  expert: {
    gridColor: 'rgba(168,85,247,0.5)',
    glow1: { color: 'bg-purple-500/40', pos: 'top-16 left-20' },
    glow2: { color: 'bg-pink-500/35', pos: 'bottom-24 right-16' },
    glow3: { color: 'bg-violet-500/25', pos: 'top-2/3 right-1/3' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-purple-950/50 to-slate-900/95',
    cardBorder: 'border-purple-500/50',
    cardShadow: 'shadow-[0_0_60px_rgba(168,85,247,0.4),inset_0_0_30px_rgba(168,85,247,0.1)]',
  },
};

const difficulties = [
  { 
    id: AI_DIFFICULTY.RANDOM, 
    name: 'BEGINNER', 
    subtitle: 'Random Moves', 
    description: 'AI plays randomly. Perfect for learning the game.', 
    theme: 'beginner',
    colors: {
      gradient: 'from-green-600 to-emerald-600',
      glow: 'rgba(34,197,94,0.6)',
      text: 'text-green-300',
      ring: 'ring-green-500/50',
      bg: 'bg-green-900/30',
      border: 'border-green-500/40',
    }
  },
  { 
    id: AI_DIFFICULTY.AVERAGE, 
    name: 'INTERMEDIATE', 
    subtitle: 'Strategic', 
    description: 'AI uses strategy and thinks ahead.', 
    theme: 'intermediate',
    colors: {
      gradient: 'from-amber-500 to-orange-600',
      glow: 'rgba(251,191,36,0.6)',
      text: 'text-amber-300',
      ring: 'ring-amber-500/50',
      bg: 'bg-amber-900/30',
      border: 'border-amber-500/40',
    }
  },
  { 
    id: AI_DIFFICULTY.PROFESSIONAL, 
    name: 'EXPERT', 
    subtitle: 'Advanced AI', 
    description: 'AI analyzes deeply and plays to win.', 
    theme: 'expert',
    colors: {
      gradient: 'from-purple-500 to-pink-600',
      glow: 'rgba(168,85,247,0.6)',
      text: 'text-purple-300',
      ring: 'ring-purple-500/50',
      bg: 'bg-purple-900/30',
      border: 'border-purple-500/40',
    }
  }
];

const DifficultySelector = ({ selectedDifficulty, onSelectDifficulty, onStartGame, onBack }) => {
  const { needsScroll } = useResponsiveLayout(700);

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
      <div className="fixed inset-0 opacity-40 pointer-events-none transition-all duration-700" style={{
        backgroundImage: `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Multiple themed glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-80 h-80 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      <div className={`fixed ${theme.glow2.pos} w-72 h-72 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      <div className={`fixed ${theme.glow3.pos} w-64 h-64 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      
      {/* Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4 ${needsScroll ? 'py-8' : 'py-4'}`}>
        <div className="w-full max-w-md">
          {/* Title - Centered and Large */}
          <div className="text-center mb-6">
            <NeonTitle size="large" />
            <p className="text-slate-400 text-sm mt-2">VS AI - Choose Difficulty</p>
          </div>

          {/* Card with dramatic theme */}
          <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow} transition-all duration-500`}>
            
            {/* Difficulty Options */}
            <div className="space-y-3 mb-5">
              {difficulties.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <button 
                    key={diff.id} 
                    onClick={() => handleSelect(diff.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden ${
                      isSelected 
                        ? `bg-gradient-to-r ${diff.colors.gradient} border-white/40 ring-4 ${diff.colors.ring}` 
                        : `${diff.colors.bg} ${diff.colors.border} hover:bg-opacity-50`
                    }`}
                    style={isSelected ? { boxShadow: `0 0 40px ${diff.colors.glow}` } : {}}
                  >
                    {/* Animated shine on selected */}
                    {isSelected && (
                      <div className="absolute inset-0 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine" />
                      </div>
                    )}
                    
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-black tracking-wide text-lg ${isSelected ? 'text-white' : diff.colors.text}`}>
                            {diff.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700/50 text-slate-400'}`}>
                            {diff.subtitle}
                          </span>
                        </div>
                        <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {diff.description}
                        </p>
                      </div>
                      
                      {/* Selection indicator */}
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 ${
                        isSelected ? 'border-white bg-white' : 'border-slate-600'
                      }`}>
                        {isSelected && <div className="w-3 h-3 rounded-full bg-slate-900" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Start Button */}
            <button 
              onClick={handleStart}
              className={`w-full p-4 rounded-xl font-black tracking-wider text-lg transition-all flex items-center justify-center gap-3 text-white bg-gradient-to-r ${selectedDiff.colors.gradient} hover:scale-[1.02] active:scale-[0.98]`}
              style={{ boxShadow: `0 0 30px ${selectedDiff.colors.glow}` }}
            >
              START GAME
            </button>
            
            {/* Back button */}
            <button 
              onClick={handleBack}
              className="w-full mt-3 py-2.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
        {needsScroll && <div className="h-8 flex-shrink-0" />}
      </div>
      
      {/* Shine animation */}
      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shine {
          animation: shine 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default DifficultySelector;
