// Welcome Modal for new users
import React, { useState } from 'react';
import { X, Sparkles, User, Gamepad2, Trophy, Puzzle, Users, Pencil, ChevronRight, Zap } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const WelcomeModal = ({ username, onClose, onEditUsername }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      icon: Sparkles,
      iconColor: 'text-amber-400',
      iconBg: 'from-amber-500 to-orange-600',
      title: 'Welcome to Deadblock!',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            You've joined the ultimate <span className="text-cyan-400 font-bold">pentomino puzzle</span> battle arena!
          </p>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/20">
            <p className="text-sm text-slate-400">
              Your goal: <span className="text-white font-medium">Place pieces strategically to block your opponent</span> from making any moves.
            </p>
          </div>
        </div>
      )
    },
    {
      icon: User,
      iconColor: 'text-cyan-400',
      iconBg: 'from-cyan-500 to-blue-600',
      title: 'Your Profile',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Your username is currently: 
          </p>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/30 flex items-center justify-between">
            <span className="text-cyan-400 font-bold text-lg">{username}</span>
            <button
              onClick={() => {
                soundManager.playButtonClick();
                onEditUsername();
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-colors"
            >
              <Pencil size={14} />
              Change
            </button>
          </div>
          <p className="text-sm text-slate-500">
            You can change your username anytime by tapping your profile card on the main menu.
          </p>
        </div>
      )
    },
    {
      icon: Gamepad2,
      iconColor: 'text-purple-400',
      iconBg: 'from-purple-500 to-pink-600',
      title: 'Game Modes',
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">VS AI</h4>
              <p className="text-slate-400 text-xs">Practice against computer opponents</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
              <Users size={16} className="text-white" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Online</h4>
              <p className="text-slate-400 text-xs">Challenge friends & climb the leaderboard</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Puzzle size={16} className="text-white" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Puzzles</h4>
              <p className="text-slate-400 text-xs">Solve challenges & test your skills</p>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: Trophy,
      iconColor: 'text-amber-400',
      iconBg: 'from-amber-500 to-yellow-600',
      title: 'Earn & Progress',
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Win online matches to <span className="text-amber-400 font-bold">increase your ELO rating</span> and climb through the ranks!
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 text-center">
              <span className="text-slate-500">Novice</span>
              <div className="text-slate-400 font-bold">0+</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 text-center">
              <span className="text-green-400">Intermediate</span>
              <div className="text-green-400 font-bold">1400+</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 text-center">
              <span className="text-purple-400">Master</span>
              <div className="text-purple-400 font-bold">2000+</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 text-center">
              <span className="text-amber-400">Grandmaster</span>
              <div className="text-amber-400 font-bold">2200+</div>
            </div>
          </div>
          <p className="text-sm text-slate-500 text-center">
            Unlock achievements as you progress!
          </p>
        </div>
      )
    }
  ];
  
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const IconComponent = currentStepData.icon;
  
  const handleNext = () => {
    soundManager.playButtonClick();
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handleSkip = () => {
    soundManager.playButtonClick();
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-sm bg-slate-900 rounded-2xl border border-cyan-500/30 shadow-[0_0_60px_rgba(34,211,238,0.2)] overflow-hidden animate-scaleIn"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentStepData.iconBg} p-5 relative`}>
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 p-1.5 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10"
          >
            <X size={18} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-lg">
              <IconComponent size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-black text-white text-center">
              {currentStepData.title}
            </h2>
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {steps.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep 
                    ? 'w-6 bg-white' 
                    : idx < currentStep 
                      ? 'w-1.5 bg-white/60' 
                      : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-5">
          {currentStepData.content}
        </div>
        
        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700/50"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              isLastStep 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600'
            }`}
          >
            {isLastStep ? "Let's Play!" : 'Next'}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
