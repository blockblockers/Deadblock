import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, ChevronDown } from 'lucide-react';

const IOSInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Already installed as PWA?
    const standalone = window.navigator.standalone === true || 
                       window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Is Safari? (PWA install only works in Safari on iOS)
    const safari = /^((?!chrome|android|CriOS|FxiOS|EdgiOS).)*safari/i.test(navigator.userAgent);
    setIsSafari(safari);

    // Check dismissal
    const dismissed = localStorage.getItem('ios-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSince = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    if (iOS && !standalone && safari && daysSince > 7) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-dismissed', Date.now().toString());
  };

  const neverShow = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-dismissed', (Date.now() + 365 * 24 * 60 * 60 * 1000 * 10).toString());
  };

  if (!showPrompt || !isIOS || isStandalone) return null;

  // Not Safari - show different message
  if (!isSafari) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50 p-4">
        <div className="bg-slate-900/95 rounded-2xl p-6 max-w-md w-full border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)] mb-4">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-cyan-300">OPEN IN SAFARI</h3>
                <p className="text-xs text-slate-400">To install DEADBLOCK</p>
              </div>
            </div>
            <button onClick={dismiss} className="text-slate-400 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
          <p className="text-slate-300 text-sm mb-4">
            Open this page in <span className="text-cyan-400 font-semibold">Safari</span> to install the app.
          </p>
          <button onClick={dismiss} className="w-full py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold">
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50 p-4">
      <div className="bg-slate-900/95 rounded-2xl p-6 max-w-md w-full border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)] mb-4 animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)]">
              <span className="text-2xl">🎮</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-cyan-300 tracking-wide">INSTALL DEADBLOCK</h3>
              <p className="text-xs text-slate-400">Add to home screen</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span className="text-cyan-400 font-bold text-sm">1</span>
            </div>
            <p className="text-slate-200 text-sm flex-1">Tap <span className="text-cyan-400 font-semibold">Share</span></p>
            <Share size={20} className="text-cyan-400" />
          </div>

          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-purple-400 font-bold text-sm">2</span>
            </div>
            <p className="text-slate-200 text-sm flex-1">Tap <span className="text-purple-400 font-semibold">"Add to Home Screen"</span></p>
            <PlusSquare size={20} className="text-purple-400" />
          </div>

          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-green-400 font-bold text-sm">3</span>
            </div>
            <p className="text-slate-200 text-sm flex-1">Tap <span className="text-green-400 font-semibold">"Add"</span></p>
          </div>
        </div>

        <div className="flex justify-center mb-4 text-slate-400 text-xs">
          <ChevronDown size={16} className="animate-bounce" />
          <span className="mx-2">Share button is at bottom of Safari</span>
          <ChevronDown size={16} className="animate-bounce" />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button onClick={neverShow} className="flex-1 py-2 bg-slate-700 text-slate-400 rounded-lg text-xs font-semibold hover:bg-slate-600">
            DON'T SHOW AGAIN
          </button>
          <button onClick={dismiss} className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-cyan-400 hover:to-purple-500 shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            GOT IT!
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default IOSInstallPrompt;
