// PuzzleTypeSelect.jsx - Choose between Creator Puzzles and Generated Puzzles
// v1.1: Updated styling to match PuzzleSelect - cyan theme for creator puzzles
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import NeonTitle from './NeonTitle';
import NeonSubtitle from './NeonSubtitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import FloatingPieces from './FloatingPieces';

// Cyan theme for creator puzzles screen
const theme = {
  gridColor: 'rgba(34, 211, 238, 0.3)',
  glow1: { color: 'bg-cyan-500/35', pos: 'top-20 right-10' },
  glow2: { color: 'bg-sky-500/30', pos: 'bottom-32 left-10' },
  glow3: { color: 'bg-teal-500/25', pos: 'top-1/2 left-1/3' },
  cardBg: 'bg-gradient-to-br from-slate-900/95 via-cyan-950/40 to-slate-900/95',
  cardBorder: 'border-cyan-500/40',
  cardShadow: 'shadow-[0_0_60px_rgba(34,211,238,0.3),inset_0_0_30px_rgba(34,211,238,0.1)]',
};

// Puzzle type options
const puzzleTypes = [
  {
    id: 'creator',
    name: 'CREATOR',
    description: 'Hand-crafted puzzles. Find the one winning move!',
    colors: {
      gradient: 'from-cyan-500 to-sky-600',
      glow: 'rgba(34,211,238,0.6)',
      text: 'text-cyan-300',
      ring: 'ring-cyan-500/50',
      bg: 'bg-cyan-900/30',
      border: 'border-cyan-500/40',
    }
  },
  {
    id: 'generated',
    name: 'GENERATED',
    description: 'AI-generated puzzles with varying difficulty.',
    colors: {
      gradient: 'from-purple-500 to-pink-600',
      glow: 'rgba(168,85,247,0.6)',
      text: 'text-purple-300',
      ring: 'ring-purple-500/50',
      bg: 'bg-purple-900/30',
      border: 'border-purple-500/40',
    }
  },
];

const PuzzleTypeSelect = ({ 
  onSelectCreator, 
  onSelectGenerated, 
  onBack,
}) => {
  const { needsScroll } = useResponsiveLayout(700);
  const [selectedType, setSelectedType] = useState('creator');

  const handleSelectType = (typeId) => {
    soundManager.playClickSound('select');
    setSelectedType(typeId);
  };

  const handleStart = () => {
    soundManager.playButtonClick();
    if (selectedType === 'creator') {
      onSelectCreator?.();
    } else {
      onSelectGenerated?.();
    }
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack?.();
  };

  const selectedTypeData = puzzleTypes.find(t => t.id === selectedType) || puzzleTypes[0];

  return (
    <div 
      className={needsScroll ? 'min-h-screen bg-slate-950' : 'h-screen bg-slate-950 overflow-hidden'}
      style={needsScroll ? { overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } : {}}
    >
      {/* Themed Grid background */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.98)),
            repeating-linear-gradient(0deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px),
            repeating-linear-gradient(90deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px)
          `,
        }}
      />
      
      {/* Floating pieces background */}
      <FloatingPieces />

      {/* Animated glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-72 h-72 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '4s' }} />
      <div className={`fixed ${theme.glow2.pos} w-64 h-64 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '6s' }} />
      <div className={`fixed ${theme.glow3.pos} w-56 h-56 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '5s' }} />

      {/* Main Content */}
      <div className={`relative ${needsScroll ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-4`}>
        <div className="w-full max-w-md">
          
          {/* Title - Centered and Large */}
          <div className="text-center mb-4">
            <NeonTitle size="large" />
            <NeonSubtitle text="PUZZLE MODE" size="small" className="mt-1" />
          </div>

          {/* Card with theme */}
          <div className={`${theme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${theme.cardBorder} ${theme.cardShadow} transition-all duration-700`}>
            
            {/* Puzzle Type Selection */}
            <div className="space-y-2 mb-4">
              {puzzleTypes.map(type => {
                const isSelected = selectedType === type.id;
                
                return (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className={`w-full p-4 rounded-xl transition-all relative overflow-hidden ${
                      isSelected 
                        ? `bg-gradient-to-r ${type.colors.gradient} text-white shadow-lg` 
                        : `${type.colors.bg} ${type.colors.border} border hover:scale-[1.02]`
                    }`}
                    style={isSelected ? { boxShadow: `0 0 25px ${type.colors.glow}` } : {}}
                  >
                    {/* Shine effect for selected */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
                    )}
                    
                    <div className="relative flex items-center justify-between">
                      <div className="text-left">
                        <h3 className={`font-black tracking-wide text-lg ${isSelected ? 'text-white' : type.colors.text}`}>
                          {type.name}
                        </h3>
                        <p className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {type.description}
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
              className={`w-full p-3 rounded-xl font-black tracking-wider text-base transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${selectedTypeData.colors.gradient} text-white hover:scale-[1.02] active:scale-[0.98]`}
              style={{ boxShadow: `0 0 30px ${selectedTypeData.colors.glow}` }}
            >
              START {selectedTypeData.name} PUZZLES
            </button>
            
            {/* Back button - Themed */}
            <button 
              onClick={handleBack}
              className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-sm text-slate-300 bg-slate-800/70 hover:bg-slate-700/70 transition-all border border-slate-600/50 hover:border-slate-500/50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(100,116,139,0.2)]"
            >
              <ArrowLeft size={16} />
              BACK TO MENU
            </button>
          </div>
        </div>
        {needsScroll && <div className="h-6 flex-shrink-0" />}
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

export default PuzzleTypeSelect;
