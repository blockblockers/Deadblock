// PuzzleTypeSelect.jsx - Choose between Creator Puzzles and Generated Puzzles
// v1.0: Initial release - puzzle type selection screen
import { useState } from 'react';
import { ArrowLeft, Sparkles, Cpu, Trophy, Check, Lock } from 'lucide-react';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import FloatingPieces from './FloatingPieces';

// Theme for this screen - cyan/purple gradient for puzzle vibe
const theme = {
  gridColor: 'rgba(139, 92, 246, 0.3)',
  glow1: { color: 'bg-purple-500/30', pos: 'top-20 right-10' },
  glow2: { color: 'bg-cyan-500/25', pos: 'bottom-32 left-10' },
  glow3: { color: 'bg-pink-500/20', pos: 'top-1/2 left-1/3' },
};

const PuzzleTypeSelect = ({ 
  onSelectCreator, 
  onSelectGenerated, 
  onBack,
  creatorPuzzlesCompleted = 0,
  creatorPuzzlesTotal = 0,
}) => {
  const { needsScroll } = useResponsiveLayout(700);
  const [hoveredType, setHoveredType] = useState(null);

  const handleSelectCreator = () => {
    soundManager.playButtonClick();
    onSelectCreator?.();
  };

  const handleSelectGenerated = () => {
    soundManager.playButtonClick();
    onSelectGenerated?.();
  };

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack?.();
  };

  const completionPercent = creatorPuzzlesTotal > 0 
    ? Math.round((creatorPuzzlesCompleted / creatorPuzzlesTotal) * 100) 
    : 0;

  return (
    <div 
      className={`min-h-screen flex flex-col ${needsScroll ? 'overflow-y-auto' : 'overflow-hidden'}`}
      style={{
        background: `
          linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.98)),
          repeating-linear-gradient(0deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px),
          repeating-linear-gradient(90deg, transparent, transparent 40px, ${theme.gridColor} 40px, ${theme.gridColor} 41px)
        `,
        minHeight: '100vh',
        minHeight: '100dvh',
      }}
    >
      {/* Floating pieces background */}
      <FloatingPieces />

      {/* Animated glow orbs */}
      <div className={`fixed ${theme.glow1.pos} w-72 h-72 ${theme.glow1.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '4s' }} />
      <div className={`fixed ${theme.glow2.pos} w-64 h-64 ${theme.glow2.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '6s' }} />
      <div className={`fixed ${theme.glow3.pos} w-56 h-56 ${theme.glow3.color} rounded-full blur-3xl pointer-events-none animate-pulse`} style={{ animationDuration: '5s' }} />

      {/* Safe area top padding */}
      <div className="flex-shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* Header */}
      <div className="relative z-10 px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 relative z-10">
        {/* Title */}
        <div className="mb-8 text-center">
          <NeonTitle text="PUZZLES" size="large" />
          <p className="text-slate-400 text-sm mt-2">Choose your challenge</p>
        </div>

        {/* Puzzle Type Cards */}
        <div className="w-full max-w-md space-y-4">
          
          {/* Creator Puzzles Card */}
          <button
            onClick={handleSelectCreator}
            onMouseEnter={() => setHoveredType('creator')}
            onMouseLeave={() => setHoveredType(null)}
            className={`w-full p-5 rounded-2xl border transition-all duration-300 text-left group
              bg-gradient-to-br from-slate-900/95 via-amber-950/30 to-slate-900/95
              border-amber-500/40 hover:border-amber-400/60
              shadow-[0_0_30px_rgba(251,191,36,0.2)] hover:shadow-[0_0_50px_rgba(251,191,36,0.4)]
              ${hoveredType === 'creator' ? 'scale-[1.02]' : ''}
            `}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                <Sparkles size={28} className="text-white" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white">Creator Puzzles</h3>
                  {creatorPuzzlesTotal > 0 && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full">
                      {creatorPuzzlesCompleted}/{creatorPuzzlesTotal}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Puzzles developed by Deadblock creators with only one true path to play.
                </p>
                
                {/* Progress bar */}
                {creatorPuzzlesTotal > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-amber-400 font-bold">{completionPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Arrow indicator */}
              <div className="text-amber-500/50 group-hover:text-amber-400 group-hover:translate-x-1 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>
          </button>

          {/* Generated Puzzles Card */}
          <button
            onClick={handleSelectGenerated}
            onMouseEnter={() => setHoveredType('generated')}
            onMouseLeave={() => setHoveredType(null)}
            className={`w-full p-5 rounded-2xl border transition-all duration-300 text-left group
              bg-gradient-to-br from-slate-900/95 via-cyan-950/30 to-slate-900/95
              border-cyan-500/40 hover:border-cyan-400/60
              shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:shadow-[0_0_50px_rgba(34,211,238,0.4)]
              ${hoveredType === 'generated' ? 'scale-[1.02]' : ''}
            `}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                <Cpu size={28} className="text-white" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white">Generated Puzzles</h3>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded-full">
                    ∞
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Various puzzle difficulties randomly generated by the Deadblock application.
                </p>
                
                {/* Feature tags */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-lg flex items-center gap-1">
                    Easy
                  </span>
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-lg flex items-center gap-1">
                    Medium
                  </span>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-lg flex items-center gap-1">
                    Hard
                  </span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-lg flex items-center gap-1">
                    Speed
                  </span>
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="text-cyan-500/50 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>
          </button>

        </div>
      </div>

      {/* Safe area bottom padding */}
      <div className="flex-shrink-0" style={{ height: 'max(16px, env(safe-area-inset-bottom))' }} />
    </div>
  );
};

export default PuzzleTypeSelect;
