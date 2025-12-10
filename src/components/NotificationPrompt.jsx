// Notification Prompt - Ask users to enable notifications
import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { notificationService } from '../services/notificationService';

const NotificationPrompt = ({ onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const checkPrompt = async () => {
      await notificationService.init();
      if (notificationService.shouldPrompt()) {
        // Delay showing prompt slightly
        setTimeout(() => setVisible(true), 2000);
      }
    };
    checkPrompt();
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    const { granted } = await notificationService.requestPermission();
    setRequesting(false);
    
    if (granted) {
      // Show a test notification
      notificationService.notify('Notifications Enabled!', {
        body: 'You\'ll be notified when it\'s your turn to play.',
        tag: 'welcome'
      });
    }
    
    handleDismiss();
  };

  const handleDismiss = () => {
    notificationService.dismissPrompt();
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 animate-slide-up">
      <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-md rounded-xl p-4 border border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Bell size={20} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm mb-1">Enable Notifications?</h3>
            <p className="text-slate-400 text-xs mb-3">
              Get notified when it's your turn, when you receive game invites, and more.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={requesting}
                className="px-4 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {requesting ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 text-slate-500 text-sm hover:text-slate-300 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
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
      `}</style>
    </div>
  );
};

export default NotificationPrompt;
