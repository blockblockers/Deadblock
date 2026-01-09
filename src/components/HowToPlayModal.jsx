// HowToPlayModal.jsx - Comprehensive tutorial modal
// v7.11: Enhanced with all game modes, control methods, online features, and notifications
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Gamepad2, Target, RotateCcw, Move, Trophy, Lightbulb, Users, Globe, Bell, Zap, Bot, Calendar, Hand, MousePointer, Smartphone } from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Deadblock!",
    icon: Gamepad2,
    color: "cyan",
    content: (
      <div className="space-y-3">
        <p>Deadblock is a strategic puzzle game where you compete to place pentomino pieces on an 8×8 board.</p>
        <p className="text-cyan-300 font-semibold">Your goal: Block your opponent from making any more moves!</p>
        <div className="bg-slate-800/50 rounded-lg p-3 mt-3">
          <div className="text-slate-400 text-xs mb-2">Game Modes:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-purple-400" />
              <span>vs AI (3 difficulties)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-green-400" />
              <span>Local 2-Player</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-amber-400" />
              <span>Online Multiplayer</span>
            </div>
            <div className="flex items-center gap-2">
              <Target size={14} className="text-red-400" />
              <span>Puzzles & Speed Run</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Control Methods",
    icon: Hand,
    color: "green",
    content: (
      <div className="space-y-3">
        <p>Choose how you want to place pieces:</p>
        
        <div className="space-y-2">
          {/* Drag & Drop */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
              <MousePointer size={16} />
              <span>Drag & Drop</span>
            </div>
            <p className="text-xs text-slate-300">Tap and hold a piece, drag it onto the board, and release to place.</p>
          </div>
          
          {/* Tap to Place */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-cyan-400 font-medium mb-1">
              <Smartphone size={16} />
              <span>Tap to Place</span>
            </div>
            <p className="text-xs text-slate-300">Tap a piece to select it, then tap a cell on the board to place it there.</p>
          </div>
          
          {/* D-Pad Controls */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-400 font-medium mb-1">
              <Gamepad2 size={16} />
              <span>D-Pad Controls</span>
            </div>
            <p className="text-xs text-slate-300">Use the on-screen D-pad to move your piece position, then confirm placement.</p>
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
        <p>Adjust your piece orientation using the controls below the board:</p>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-lg">↻</span>
            <span><strong>Rotate</strong> - Turn the piece 90° clockwise</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-lg">↺</span>
            <span><strong>Counter-Rotate</strong> - Turn 90° counter-clockwise</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-lg">↔</span>
            <span><strong>Flip</strong> - Mirror the piece horizontally</span>
          </div>
        </div>
        <p className="text-sm text-slate-400">Tip: Use the D-pad arrows or tap the rotate/flip buttons in the control panel.</p>
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
        <div className="bg-slate-800/50 rounded-lg p-3 mt-2">
          <p className="text-sm"><span className="text-cyan-400 font-bold">Cyan glow</span> = Valid placement</p>
          <p className="text-sm"><span className="text-red-400 font-bold">Red glow</span> = Invalid placement</p>
        </div>
      </div>
    )
  },
  {
    title: "Online Play",
    icon: Globe,
    color: "amber",
    content: (
      <div className="space-y-3">
        <p className="font-medium text-amber-300">Compete against players worldwide!</p>
        
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="text-slate-400 text-xs mb-1">How to play online:</div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400">1.</span>
            <span className="text-sm">Tap <strong>"Play Online"</strong> from the main menu</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400">2.</span>
            <span className="text-sm">Find opponents via <strong>Search</strong>, <strong>Friends</strong>, or <strong>Invite Link</strong></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400">3.</span>
            <span className="text-sm">Send a game invite and wait for acceptance</span>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <Trophy size={14} className="text-amber-400" />
            <span><strong>Rankings:</strong> View leaderboards in your profile</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Users size={14} className="text-cyan-400" />
            <span><strong>Friends:</strong> Add friends to easily send invites</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Inviting Friends",
    icon: Users,
    color: "cyan",
    content: (
      <div className="space-y-3">
        <p>Multiple ways to challenge friends:</p>
        
        <div className="space-y-2">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="font-medium text-cyan-400 mb-1">🔗 Share Invite Link</div>
            <p className="text-xs text-slate-300">Tap "Invite Link" to copy a unique URL. Share it anywhere - they'll join your game when they click it!</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="font-medium text-green-400 mb-1">👥 Friends List</div>
            <p className="text-xs text-slate-300">Add friends by username. Once connected, invite them directly from your friends list.</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="font-medium text-amber-400 mb-1">🔍 Search Players</div>
            <p className="text-xs text-slate-300">Search for any player by username and send a game invite.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Push Notifications",
    icon: Bell,
    color: "green",
    content: (
      <div className="space-y-3">
        <p>Never miss a game! Enable notifications to get alerts for:</p>
        
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-green-400">🎮</span>
            <span className="text-sm">Your turn in an active game</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">📩</span>
            <span className="text-sm">New game invites</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">👥</span>
            <span className="text-sm">Friend requests</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">🔄</span>
            <span className="text-sm">Rematch requests</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-pink-400">💬</span>
            <span className="text-sm">Chat messages</span>
          </div>
        </div>
        
        <p className="text-xs text-slate-400 mt-2">
          💡 Enable notifications in <strong>Settings</strong> and customize which alerts you receive.
        </p>
      </div>
    )
  },
  {
    title: "Special Modes",
    icon: Zap,
    color: "red",
    content: (
      <div className="space-y-3">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-400 font-medium mb-1">
            <Target size={16} />
            <span>Puzzles</span>
          </div>
          <p className="text-xs text-slate-300">Solve pre-set board positions. Find the winning sequence of moves!</p>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-400 font-medium mb-1">
            <Zap size={16} />
            <span>Speed Puzzles</span>
          </div>
          <p className="text-xs text-slate-300">Solve as many puzzles as you can before time runs out. Build your streak!</p>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-400 font-medium mb-1">
            <Calendar size={16} />
            <span>Weekly Challenge</span>
          </div>
          <p className="text-xs text-slate-300">Same puzzle for everyone all week. Your first attempt time counts for the leaderboard!</p>
        </div>
      </div>
    )
  },
  {
    title: "Winning Strategy",
    icon: Trophy,
    color: "amber",
    content: (
      <div className="space-y-3">
        <p className="text-amber-300 font-semibold">You win when your opponent cannot place any of their remaining pieces!</p>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium">Pro Tips:</p>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">★</span>
            <span className="text-sm">Control the center early</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">★</span>
            <span className="text-sm">Leave awkward spaces for your opponent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">★</span>
            <span className="text-sm">Save flexible pieces for later</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">★</span>
            <span className="text-sm">Watch for pieces that only fit in one spot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">★</span>
            <span className="text-sm">Block large open areas your opponent needs</span>
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
        <p>You're all set! Quick reference:</p>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">💬</span>
            <span className="text-sm">Use Quick Chat to communicate in online games</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">⏱️</span>
            <span className="text-sm">Watch the turn timer in timed modes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">🔄</span>
            <span className="text-sm">Request a rematch after online games</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">👁️</span>
            <span className="text-sm">Spectate ongoing games to learn strategies</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">🏆</span>
            <span className="text-sm">Earn achievements as you play</span>
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
    },
    red: {
      icon: 'text-red-400',
      iconBg: 'bg-red-500/20 border-red-500/50',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]',
      button: 'bg-red-500 hover:bg-red-400',
      dot: 'bg-red-400'
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
      <div className={`relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl max-w-md w-full border border-slate-600/50 ${colors.glow} overflow-hidden max-h-[90vh] flex flex-col`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-slate-500 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>
        
        {/* Header */}
        <div className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl ${colors.iconBg} border flex items-center justify-center flex-shrink-0`}>
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
        
        {/* Content - scrollable */}
        <div 
          className="px-6 pb-4 text-slate-300 text-sm leading-relaxed min-h-[180px] max-h-[40vh] overflow-y-auto flex-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {step.content}
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-4 flex-shrink-0 px-4 flex-wrap">
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
        <div className="flex gap-3 p-4 pt-0 flex-shrink-0">
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
          <div className="text-center pb-4 flex-shrink-0">
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
