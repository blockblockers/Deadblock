// NotificationPrompt.jsx - Cyberpunk-themed push notification enablement banner
// Styled to match the PWA install prompt with neon glow effects

import { useState, useEffect } from 'react';
import { Bell, BellOff, X, Zap } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { soundManager } from '../utils/soundManager';

const NotificationPrompt = ({ onDismiss }) => {
  const [requesting, setRequesting] = useState(false);
  const [result, setResult] = useState(null);
  const [visible, setVisible] = useState(false);

  // Animate in after mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    soundManager.playClickSound?.('click');
    
    const permission = await notificationService.requestPermission();
    setResult(permission);
    setRequesting(false);
    
    if (permission === 'granted') {
      soundManager.playClickSound?.('success');
    }
    
    // Auto-dismiss after showing result
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 300);
    }, permission === 'granted' ? 1500 : 2500);
  };

  const handleDismiss = () => {
    soundManager.playClickSound?.('click');
    notificationService.dismissPrompt();
    setVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  const handleAlreadyEnabled = () => {
    soundManager.playClickSound?.('click');
    // Permanently dismiss
    try {
      localStorage.setItem('deadblock_notification_prompt_dismissed', 'true');
    } catch (e) {}
    setVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  // Success state
  if (result === 'granted') {
    return (
      <div 
        className={`fixed bottom-5 left-5 right-5 max-w-sm mx-auto z-[9999] transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div 
          className="relative p-4 rounded-xl border-2 border-green-400/60 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.5), 0 0 60px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
          }}
        >
          {/* Animated glow line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-green-300 to-transparent animate-shimmer" />
          
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 0 20px rgba(134, 239, 172, 0.5)'
              }}
            >
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-base" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                NOTIFICATIONS ENABLED
              </p>
              <p className="text-green-100 text-sm mt-0.5">
                You'll be notified when it's your turn
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Denied state
  if (result === 'denied') {
    return (
      <div 
        className={`fixed bottom-5 left-5 right-5 max-w-sm mx-auto z-[9999] transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div 
          className="relative p-4 rounded-xl border-2 border-red-500/60 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.95) 0%, rgba(153, 27, 27, 0.95) 100%)',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            >
              <BellOff className="w-6 h-6 text-red-300" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-base" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                NOTIFICATIONS BLOCKED
              </p>
              <p className="text-red-200 text-sm mt-0.5">
                Enable in browser settings to receive alerts
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default prompt state - Cyberpunk themed
  return (
    <div 
      className={`fixed bottom-5 left-5 right-5 max-w-sm mx-auto z-[9999] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div 
        className="relative p-4 rounded-xl border-2 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
          borderColor: 'rgba(34, 211, 238, 0.5)',
          boxShadow: '0 0 30px rgba(34, 211, 238, 0.3), 0 0 60px rgba(168, 85, 247, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        {/* Animated top border glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.8), rgba(168, 85, 247, 0.8), transparent)',
            animation: 'shimmer 2s ease-in-out infinite'
          }}
        />
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-purple-400/80" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-purple-400/80" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80" />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-cyan-400 transition-colors rounded-lg hover:bg-slate-800/50"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 pr-6">
          {/* Icon with glow */}
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)'
            }}
          >
            <Bell className="w-6 h-6 text-cyan-400" />
            {/* Pulse effect */}
            <div className="absolute inset-0 rounded-xl bg-cyan-400/20 animate-ping" style={{ animationDuration: '2s' }} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-cyan-400" />
              <h3 
                className="text-cyan-300 font-bold text-sm uppercase tracking-wider"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                Enable Notifications
              </h3>
            </div>

            {/* Description */}
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              Get notified when it's your turn or when you receive a challenge
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={requesting}
                className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.9) 0%, rgba(56, 189, 248, 0.9) 100%)',
                  boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)',
                  fontFamily: "'Orbitron', sans-serif",
                  color: '#0f172a'
                }}
              >
                {/* Button glow on hover */}
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative">
                  {requesting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                      Enabling...
                    </span>
                  ) : (
                    'Enable'
                  )}
                </span>
              </button>
              
              <button
                onClick={handleDismiss}
                className="py-2.5 px-4 text-slate-500 hover:text-cyan-400 transition-colors text-sm font-medium"
              >
                Later
              </button>
            </div>

            {/* Already enabled link */}
            <button
              onClick={handleAlreadyEnabled}
              className="mt-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Already enabled? Dismiss forever
            </button>
          </div>
        </div>

        {/* Scanline effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)'
          }}
        />
      </div>

      {/* Styles */}
      <style>{`
        @keyframes shimmer {
          0%, 100% {
            opacity: 0.5;
            transform: translateX(-100%);
          }
          50% {
            opacity: 1;
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationPrompt;
