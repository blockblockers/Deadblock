import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

const IOSInstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [isSafariBrowser, setIsSafariBrowser] = useState(true);

  useEffect(() => {
    // Detect iOS/iPadOS (including iPad with desktop mode)
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    
    // Check for iOS devices
    const isIOS = /iPhone|iPad|iPod/.test(ua) || 
                  (platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad with desktop UA
    
    // Check for Safari on Mac (also show for Mac Safari users)
    const isMacSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua);
    
    // Detect if already installed (standalone mode) - multiple detection methods
    const isStandalone = window.navigator.standalone === true || // iOS Safari
                         window.matchMedia('(display-mode: standalone)').matches || // Standard PWA
                         window.matchMedia('(display-mode: fullscreen)').matches || // Fullscreen mode
                         window.matchMedia('(display-mode: minimal-ui)').matches || // Minimal UI mode
                         document.referrer.includes('android-app://') || // Android TWA
                         (window.matchMedia('(display-mode: window-controls-overlay)').matches); // Desktop PWA with overlay
    
    // Also check if launched from home screen on desktop (URL will be different)
    const isLaunchedFromHomeScreen = window.navigator.standalone || 
                                      (window.location.search.includes('utm_source=homescreen')) ||
                                      (sessionStorage.getItem('pwa-launched') === 'true');
    
    // Mark as launched if standalone
    if (isStandalone) {
      try {
        sessionStorage.setItem('pwa-launched', 'true');
      } catch (e) {}
    }
    
    // Detect Safari browser
    // Safari has "Safari" in UA but Chrome/Firefox/Edge on iOS have their own identifiers
    const isSafari = /Safari/.test(ua) && 
                     !/CriOS/.test(ua) &&  // Chrome on iOS
                     !/FxiOS/.test(ua) &&  // Firefox on iOS
                     !/OPiOS/.test(ua) &&  // Opera on iOS
                     !/EdgiOS/.test(ua) && // Edge on iOS
                     !/Chrome/.test(ua) && // Chrome
                     !/Chromium/.test(ua); // Chromium-based
    
    setIsSafariBrowser(isSafari || isMacSafari);
    
    // Check if dismissed recently
    let wasDismissed = false;
    try {
      const dismissedAt = localStorage.getItem('ios-pwa-dismissed');
      if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        wasDismissed = daysSince < 7;
      }
    } catch (e) {
      console.log('localStorage error:', e);
    }

    // Debug logging
    console.log('[PWA Install Prompt]', {
      isIOS,
      isMacSafari,
      isStandalone,
      isLaunchedFromHomeScreen,
      isSafari,
      wasDismissed,
      ua: ua.substring(0, 100),
      platform
    });

    // Show for:
    // 1. iOS Safari users who haven't installed
    // 2. iOS non-Safari users (to tell them to use Safari)
    // 3. Mac Safari users (Safari on Mac also supports PWA)
    // But NOT if already in standalone/installed mode
    const isAlreadyInstalled = isStandalone || isLaunchedFromHomeScreen;
    const shouldShow = ((isIOS || isMacSafari) && !isAlreadyInstalled && !wasDismissed);

    if (shouldShow) {
      // Delay showing for better UX
      const timer = setTimeout(() => {
        console.log('[PWA Install Prompt] Showing prompt');
        setShow(true);
      }, 3000); // 3 second delay
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

        {!isSafariBrowser ? (
          // Not Safari - show redirect message
          <div className="mb-4">
            <p className="text-slate-300 text-sm mb-3">
              To install this app, please open this page in <span className="text-cyan-400 font-bold">Safari</span>.
            </p>
            <div className="p-3 bg-slate-800/60 rounded-lg">
              <p className="text-slate-400 text-xs">
                📋 Copy this URL and paste it in Safari:
              </p>
              <p className="text-cyan-400 text-xs mt-1 break-all font-mono">
                {window.location.origin}
              </p>
            </div>
            <p className="text-slate-500 text-xs mt-3">
              PWA installation requires Safari on iOS devices.
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
                {/* Safari Share Icon */}
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 mb-3 p-3 bg-slate-800/60 rounded-lg">
              <div className="w-7 h-7 bg-purple-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 font-bold text-sm">2</span>
              </div>
              <p className="text-slate-200 text-sm flex-1">
                Scroll down and tap <span className="text-purple-400 font-semibold">"Add to Home Screen"</span>
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
                Tap <span className="text-green-400 font-semibold">"Add"</span> in the top right corner
              </p>
            </div>

            {/* Arrow indicator pointing down */}
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs mb-4">
              <span>↓</span>
              <span>Share button is at the bottom of Safari</span>
              <span>↓</span>
            </div>
          </>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={dismissForever}
            className="flex-1 py-2.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            Don't show again
          </button>
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
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
