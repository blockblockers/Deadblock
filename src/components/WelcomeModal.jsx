// Welcome Modal for new users
// v7.12: Added onComplete callback to chain to HowToPlayModal tutorial
import React, { useState } from 'react';
import { X, Sparkles, User, Gamepad2, Trophy, Puzzle, Users, Pencil, ChevronRight, Zap } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const WelcomeModal = ({ username, onClose, onEditUsername, onComplete }) => {
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
    }
  ];
  
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const IconComponent = currentStepData.icon;
  
  const handleNext = () => {
    soundManager.playButtonClick();
    if (isLastStep) {
      // v7.12: Call onComplete to chain to tutorial, or fallback to onClose
      if (onComplete) {
        onComplete();
      } else {
        onClose();
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handleSkip = () => {
    soundManager.playButtonClick();
    // Skip just closes without triggering the tutorial
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
            {isLastStep ? "Learn How to Play" : 'Next'}
            <ChevronRight size={18} />
          </button>
        </div>
        
        {/* v7.12: Skip tutorial option on last step */}
        {isLastStep && (
          <div className="text-center pb-4">
            <button
              onClick={handleSkip}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Skip tutorial, I know how to play
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeModal;
