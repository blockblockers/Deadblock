// NotificationPrompt.jsx - Prompt user to enable browser notifications
// Shows a non-intrusive banner asking for notification permission

import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { notificationService } from '../services/notificationService';

const NotificationPrompt = ({ onDismiss }) => {
  const [requesting, setRequesting] = useState(false);
  const [result, setResult] = useState(null);

  const handleEnable = async () => {
    setRequesting(true);
    const permission = await notificationService.requestPermission();
    setResult(permission);
    setRequesting(false);
    
    // Auto-dismiss after showing result
    setTimeout(() => {
      onDismiss?.();
    }, permission === 'granted' ? 1500 : 2500);
  };

  const handleDismiss = () => {
    notificationService.dismissPrompt();
    onDismiss?.();
  };

  // Don't render if result is showing success
  if (result === 'granted') {
    return (
      <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-50 animate-fade-in">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 shadow-lg border border-green-400/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-200" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">Notifications Enabled!</p>
              <p className="text-green-200 text-sm">You'll be notified when it's your turn</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result === 'denied') {
    return (
      <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-50 animate-fade-in">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-4 shadow-lg border border-slate-600/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-600/50 flex items-center justify-center">
              <BellOff className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">Notifications Blocked</p>
              <p className="text-slate-400 text-sm">You can enable them in browser settings</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-amber-600/95 to-orange-600/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-amber-400/30">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-amber-200/60 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-amber-200" />
          </div>
          
          <div className="flex-1 pr-4">
            <p className="text-white font-bold">Enable Notifications?</p>
            <p className="text-amber-100/80 text-sm mt-1">
              Get notified when it's your turn or when you receive a challenge
            </p>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={requesting}
                className="flex-1 py-2 px-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg transition-all text-sm disabled:opacity-50"
              >
                {requesting ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="py-2 px-3 text-amber-200/80 hover:text-white transition-colors text-sm"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default NotificationPrompt;
