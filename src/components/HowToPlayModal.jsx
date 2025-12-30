// HowToPlayModal.jsx - Tutorial modal for new players
// v7.8: Shows game rules and how to play when new user joins via invite
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Gamepad2, Target, RotateCcw, Move, Trophy, Lightbulb } from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Deadblock!",
    icon: Gamepad2,
    color: "cyan",
    content: (
      <div className="space-y-3">
        <p>Deadblock is a strategic puzzle game where you compete to place pentomino pieces on the board.</p>
        <p className="text-cyan-300 font-semibold">Your goal: Block your opponent from making any more moves!</p>
      </div>
    )
  },
  {
    title: "Placing Pieces",
    icon: Target,
    color: "green",
    content: (
      <div className="space-y-3">
        <p>Each turn, select a piece from your tray and place it on the board.</p>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-green-400">•</span>
            <span><strong>Tap</strong> a piece to select it</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">•</span>
            <span><strong>Drag</strong> it onto the board</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">•</span>
            <span><strong>Tap</strong> a cell to place the piece there</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Rotating & Flipping",
    icon: RotateCcw,
    color: "purple",
    content: (
      <div className="space-y-3">
        <p>Adjust your piece orientation using the controls:</p>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-purple-400">↻</span>
            <span><strong>Rotate</strong> - Turn the piece 90°</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">↔</span>
            <span><strong>Flip</strong> - Mirror the piece</span>
          </div>
        </div>
        <p className="text-sm text-slate-400">Use the D-pad controls below the board to adjust before confirming.</p>
      </div>
    )
  },
  {
    title: "Valid Placements",
    icon: Move,
    color: "amber",
    content: (
      <div className="space-y-3">
        <p>Pieces must be placed in valid positions:</p>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>All cells must be empty</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Piece must fit entirely on the board</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400">✗</span>
            <span>Cannot overlap existing pieces</span>
          </div>
        </div>
        <p className="text-sm text-slate-400">A cyan glow means valid, red means invalid.</p>
      </div>
    )
  },
  {
    title: "Winning the Game",
    icon: Trophy,
    color: "amber",
    content: (
      <div className="space-y-3">
        <p className="text-amber-300 font-semibold">You win when your opponent cannot place any of their remaining pieces!</p>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <p>Strategy tips:</p>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">★</span>
            <span>Control the center early</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">★</span>
            <span>Leave awkward spaces for your opponent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">★</span>
            <span>Save flexible pieces for later</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Ready to Play!",
    icon: Lightbulb,
    color: "cyan",
    content: (
      <div className="space-y-3">
        <p>You're all set! Here are some final tips:</p>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">💬</span>
            <span>Use Quick Chat to communicate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">⏱️</span>
            <span>Watch the turn timer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">🔄</span>
            <span>Request a rematch after the game</span>
          </div>
        </div>
        <p className="text-cyan-300 font-semibold text-center mt-4">Good luck and have fun!</p>
      </div>
    )
  }
];

const HowToPlayModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  if (!isOpen) return null;
  
  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  
  const colorClasses = {
    cyan: {
      icon: 'text-cyan-400',
      iconBg: 'bg-cyan-500/20 border-cyan-500/50',
      glow: 'shadow-[0_0_30px_rgba(34,211,238,0.3)]',
      button: 'bg-cyan-500 hover:bg-cyan-400',
      dot: 'bg-cyan-400'
    },
    green: {
      icon: 'text-green-400',
      iconBg: 'bg-green-500/20 border-green-500/50',
      glow: 'shadow-[0_0_30px_rgba(34,197,94,0.3)]',
      button: 'bg-green-500 hover:bg-green-400',
      dot: 'bg-green-400'
    },
    purple: {
      icon: 'text-purple-400',
      iconBg: 'bg-purple-500/20 border-purple-500/50',
      glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
      button: 'bg-purple-500 hover:bg-purple-400',
      dot: 'bg-purple-400'
    },
    amber: {
      icon: 'text-amber-400',
      iconBg: 'bg-amber-500/20 border-amber-500/50',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
      button: 'bg-amber-500 hover:bg-amber-400',
      dot: 'bg-amber-400'
    }
  };
  
  const colors = colorClasses[step.color] || colorClasses.cyan;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl max-w-md w-full border border-slate-600/50 ${colors.glow} overflow-hidden`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-slate-500 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>
        
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl ${colors.iconBg} border flex items-center justify-center`}>
              <Icon size={28} className={colors.icon} />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Step {currentStep + 1} of {TUTORIAL_STEPS.length}
              </div>
              <h2 className="text-xl font-bold text-white">{step.title}</h2>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 pb-4 text-slate-300 text-sm leading-relaxed min-h-[180px]">
          {step.content}
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-4">
          {TUTORIAL_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep 
                  ? `${colors.dot} w-6` 
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
        
        {/* Navigation */}
        <div className="flex gap-3 p-4 pt-0">
          {!isFirstStep && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          )}
          
          {isLastStep ? (
            <button
              onClick={onClose}
              className={`flex-1 py-3 ${colors.button} text-white rounded-xl font-bold transition-all shadow-lg`}
            >
              Let's Play!
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className={`flex-1 py-3 ${colors.button} text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2`}
            >
              Next
              <ChevronRight size={18} />
            </button>
          )}
        </div>
        
        {/* Skip link */}
        {!isLastStep && (
          <div className="text-center pb-4">
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Skip tutorial
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HowToPlayModal;
