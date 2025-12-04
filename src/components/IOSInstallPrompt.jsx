import { useState, useEffect } from 'react';
import { X, Share, Plus, ArrowUp } from 'lucide-react';

const IOSInstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    // Debug function
    const debug = (msg) => {
      console.log('[iOS Prompt]', msg);
      setDebugInfo(prev => prev + '\n' + msg);
    };

    // Check conditions
    const ua = navigator.userAgent || '';
    debug('UA: ' + ua.substring(0, 50));

    // Detect iOS (iPhone, iPad, iPod)
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    debug('isIOS: ' + isIOS);

    // Detect if already installed (standalone mode)
    const isStandalone = window.navigator.standalone === true || 
                         window.matchMedia('(display-mode: standalone)').matches;
    debug('isStandalone: ' + isStandalone);

    // Detect Safari - must be Safari for PWA install
    // Chrome on iOS has "CriOS", Firefox has "FxiOS", etc.
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/.test(ua);
    debug('isSafari: ' + isSafari);

    // Check if dismissed recently
    let wasDismissed = false;
    try {
      const dismissedAt = localStorage.getItem('ios-pwa-dismissed');
      if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        wasDismissed = daysSince < 7;
        debug('dismissed ' + Math.round(daysSince) + ' days ago');
      }
    } catch (e) {
      debug('localStorage error: ' + e.message);
    }

    debug('wasDismissed: ' + wasDismissed);

    // Show if: iOS + Not standalone + Safari + Not recently dismissed
    const shouldShow = isIOS && !isStandalone && isSafari && !wasDismissed;
    debug('shouldShow: ' + shouldShow);

    if (shouldShow) {
      // Delay showing for better UX
      const timer = setTimeout(() => {
        debug('Showing prompt now');
        setShow(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // If iOS but not Safari, we could show a different message
    if (isIOS && !isStandalone && !isSafari && !wasDismissed) {
      debug('iOS but not Safari - showing Safari redirect');
      const timer = setTimeout(() => {
        setShow(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem('ios-pwa-dismissed', Date.now().toString());
    } catch (e) {}
  };

  const dismissForever = () => {
    setShow(false);
    try {
      // Set to 10 years from now
      localStorage.setItem('ios-pwa-dismissed', (Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toString());
    } catch (e) {}
  };

  if (!show) return null;

  // Check if Safari for message content
  const ua = navigator.userAgent || '';
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/.test(ua);

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-end justify-center z-[9999] p-4"
      onClick={dismiss}
    >
      <div 
        className="bg-slate-900 rounded-2xl p-5 max-w-sm w-full border border-cyan-500/40 shadow-[0_0_30px_rgba(34,211,238,0.4)] mb-4"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">🎮</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-cyan-300">Install Deadblock</h3>
              <p className="text-xs text-slate-400">Add to Home Screen</p>
            </div>
          </div>
          <button 
            onClick={dismiss}
            className="p-1 text-slate-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {!isSafari ? (
          // Not Safari - show redirect message
          <div className="mb-4">
            <p className="text-slate-300 text-sm">
              To install this app, please open this page in <span className="text-cyan-400 font-bold">Safari</span>.
            </p>
            <p className="text-slate-500 text-xs mt-2">
              PWA installation is only available in Safari on iOS.
            </p>
          </div>
        ) : (
          // Safari - show install steps
          <>
            {/* Step 1 */}
            <div className="flex items-center gap-3 mb-3 p-3 bg-slate-800/60 rounded-lg">
              <div className="w-7 h-7 bg-cyan-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">1</span>
              </div>
              <p className="text-slate-200 text-sm flex-1">
                Tap the <span className="text-cyan-400 font-semibold">Share</span> button
              </p>
              <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
                <ArrowUp size={18} className="text-cyan-400" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 mb-3 p-3 bg-slate-800/60 rounded-lg">
              <div className="w-7 h-7 bg-purple-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 font-bold text-sm">2</span>
              </div>
              <p className="text-slate-200 text-sm flex-1">
                Tap <span className="text-purple-400 font-semibold">"Add to Home Screen"</span>
              </p>
              <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
                <Plus size={18} className="text-purple-400" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800/60 rounded-lg">
              <div className="w-7 h-7 bg-green-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 font-bold text-sm">3</span>
              </div>
              <p className="text-slate-200 text-sm flex-1">
                Tap <span className="text-green-400 font-semibold">"Add"</span> to install
              </p>
            </div>

            {/* Arrow indicator */}
            <div className="text-center text-slate-500 text-xs mb-4">
              ↓ Share button is at the bottom of Safari ↓
            </div>
          </>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={dismissForever}
            className="flex-1 py-2.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold hover:bg-slate-700"
          >
            Don't show again
          </button>
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Got it!
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(50px); 
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
