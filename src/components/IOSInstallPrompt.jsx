import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, ChevronDown } from 'lucide-react';

const IOSInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Detect if already installed as PWA (standalone mode)
    const standalone = window.navigator.standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
    setIsInStandaloneMode(standalone);

    // Detect Safari (PWA install only works in Safari on iOS)
    const safari = /^((?!chrome|android|CriOS|FxiOS|EdgiOS).)*safari/i.test(navigator.userAgent);
    setIsSafari(safari);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('ios-install-prompt-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show prompt if:
    // - User is on iOS
    // - Not already in standalone mode
    // - Using Safari
    // - Haven't dismissed in the last 7 days
    if (iOS && !standalone && safari && daysSinceDismissed > 7) {
      // Delay showing the prompt for better UX
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-prompt-dismissed', Date.now().toString());
  };

  const handleNeverShow = () => {
    setShowPrompt(false);
    // Set to far future to never show again
    localStorage.setItem('ios-install-prompt-dismissed', (Date.now() + 365 * 24 * 60 * 60 * 1000 * 10).toString());
  };

  // Don't render if conditions aren't met
  if (!showPrompt || !isIOS || isInStandaloneMode) {
    return null;
  }

  // Show different message if not using Safari
  if (!isSafari) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50 p-4">
        <div 
          className="bg-slate-900/95 rounded-2xl p-6 max-w-md w-full border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)] mb-4 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                <span className="text-2xl">🎮</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-cyan-300 tracking-wide">OPEN IN SAFARI</h3>
                <p className="text-xs text-slate-400">To install DEADBLOCK</p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-slate-300 text-sm mb-4">
            To install this app on your iPhone, please open this page in <span className="text-cyan-400 font-semibold">Safari</span> browser.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 px-4 bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-600 transition-colors"
            >
              MAYBE LATER
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50 p-4">
      <div 
        className="bg-slate-900/95 rounded-2xl p-6 max-w-md w-full border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)] mb-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)]">
              <span className="text-2xl">🎮</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-cyan-300 tracking-wide">INSTALL DEADBLOCK</h3>
              <p className="text-xs text-slate-400">Add to your home screen</p>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-3 mb-5">
          {/* Step 1 */}
          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-cyan-400 font-bold text-sm">1</span>
            </div>
            <div className="flex-1">
              <p className="text-slate-200 text-sm">
                Tap the <span className="text-cyan-400 font-semibold">Share</span> button
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
              <Share size={20} className="text-cyan-400" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-purple-400 font-bold text-sm">2</span>
            </div>
            <div className="flex-1">
              <p className="text-slate-200 text-sm">
                Scroll down and tap <span className="text-purple-400 font-semibold">"Add to Home Screen"</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
              <PlusSquare size={20} className="text-purple-400" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 font-bold text-sm">3</span>
            </div>
            <div className="flex-1">
              <p className="text-slate-200 text-sm">
                Tap <span className="text-green-400 font-semibold">"Add"</span> in the top right
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-green-400 font-semibold text-xs">Add</span>
            </div>
          </div>
        </div>

        {/* Arrow pointing to share button location */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <ChevronDown size={16} className="animate-bounce" />
            <span>Share button is at the bottom of Safari</span>
            <ChevronDown size={16} className="animate-bounce" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleNeverShow}
            className="flex-1 py-2 px-4 bg-slate-700 text-slate-400 rounded-lg text-xs font-semibold hover:bg-slate-600 transition-colors"
          >
            DON'T SHOW AGAIN
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-cyan-400 hover:to-purple-500 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.4)]"
          >
            GOT IT!
          </button>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default IOSInstallPrompt;
