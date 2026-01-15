// IOSInstallPrompt.jsx - iOS/Safari PWA install prompt
// UPDATED: Better iOS 18+ detection, Safari 26+ support, debug logging
// Place in src/components/IOSInstallPrompt.jsx

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

const IOSInstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [isSafariBrowser, setIsSafariBrowser] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    
    // =========================================================================
    // iOS DETECTION - Updated for iOS 18+
    // =========================================================================
    // Check for iOS devices (iPhone, iPad, iPod)
    // Also check for iPad with desktop mode (reports as MacIntel but has touch)
    const isIPhone = /iPhone/.test(ua);
    const isIPad = /iPad/.test(ua) || 
                   (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isIPod = /iPod/.test(ua);
    const isIOS = isIPhone || isIPad || isIPod;
    
    // Check for Mac Safari (also supports PWA)
    const isMacSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua) && !isIPad;
    
    // =========================================================================
    // SAFARI DETECTION - Must be Safari, not Chrome/Firefox/Edge on iOS
    // =========================================================================
    // On iOS, ALL browsers use WebKit, but only Safari can install PWAs
    // Other browsers have identifiers: CriOS (Chrome), FxiOS (Firefox), etc.
    const isSafari = /Safari/.test(ua) && 
                     !/CriOS/.test(ua) &&    // Chrome on iOS
                     !/FxiOS/.test(ua) &&    // Firefox on iOS
                     !/OPiOS/.test(ua) &&    // Opera on iOS
                     !/EdgiOS/.test(ua) &&   // Edge on iOS
                     !/DuckDuckGo/.test(ua) && // DuckDuckGo
                     !/Ddg/.test(ua) &&      // DuckDuckGo (short form)
                     !/Chrome/.test(ua) &&   // Chrome (desktop)
                     !/Chromium/.test(ua) && // Chromium-based
                     !/Firefox/.test(ua) &&  // Firefox (desktop)
                     !/Focus/.test(ua);      // Firefox Focus
    
    setIsSafariBrowser(isSafari || isMacSafari);
    
    // =========================================================================
    // STANDALONE/INSTALLED DETECTION
    // =========================================================================
    const isStandalone = window.navigator.standalone === true || // iOS Safari standalone
                         window.matchMedia('(display-mode: standalone)').matches ||
                         window.matchMedia('(display-mode: fullscreen)').matches ||
                         window.matchMedia('(display-mode: minimal-ui)').matches ||
                         document.referrer.includes('android-app://');
    
    // Check localStorage for previous installation
    let wasInstalled = false;
    let wasDismissed = false;
    try {
      wasInstalled = localStorage.getItem('pwa-was-installed') === 'true';
      
      const dismissedAt = localStorage.getItem('ios-pwa-dismissed');
      if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        wasDismissed = daysSince < 7; // Only block for 7 days
      }
    } catch (e) {
      console.log('[IOSInstallPrompt] localStorage error:', e);
    }
    
    // Mark as launched if in standalone mode
    if (isStandalone) {
      try {
        sessionStorage.setItem('pwa-launched', 'true');
        localStorage.setItem('pwa-was-installed', 'true');
      } catch (e) {}
    }
    
    // =========================================================================
    // DEBUG INFO - Always log for troubleshooting
    // =========================================================================
    const debug = {
      ua: ua.substring(0, 150),
      platform,
      maxTouchPoints: navigator.maxTouchPoints,
      isIPhone,
      isIPad,
      isIOS,
      isMacSafari,
      isSafari,
      isStandalone,
      wasInstalled,
      wasDismissed,
      navigatorStandalone: window.navigator.standalone,
      displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches
    };
    
    setDebugInfo(debug);
    console.log('[IOSInstallPrompt] Detection:', debug);
    
    // =========================================================================
    // DECIDE WHETHER TO SHOW
    // =========================================================================
    const isAlreadyInstalled = isStandalone || wasInstalled;
    
    // Show for:
    // 1. iOS Safari users who haven't installed (show install steps)
    // 2. iOS non-Safari users (tell them to use Safari)
    // 3. Mac Safari users who haven't installed
    const shouldShow = (isIOS || isMacSafari) && !isAlreadyInstalled && !wasDismissed;
    
    console.log('[IOSInstallPrompt] shouldShow:', shouldShow, {
      isIOS,
      isMacSafari,
      isAlreadyInstalled,
      wasDismissed
    });

    if (shouldShow) {
      // Delay showing for better UX
      const timer = setTimeout(() => {
        console.log('[IOSInstallPrompt] Showing prompt now');
        setShow(true);
      }, 3000);
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
      localStorage.setItem('pwa-was-installed', 'true');
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
                Tap <span className="text-green-400 font-semibold">"Add"</span> to install
              </p>
              <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-xs">Add</span>
              </div>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={dismissForever}
            className="flex-1 py-2.5 px-4 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-xl text-sm font-medium transition-colors border border-cyan-500/30"
          >
            Already Installed
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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

// Debug helper - call from browser console: window.showIOSInstallDebug()
if (typeof window !== 'undefined') {
  window.showIOSInstallDebug = () => {
    const ua = navigator.userAgent;
    console.log('=== iOS Install Prompt Debug ===');
    console.log('User Agent:', ua);
    console.log('Platform:', navigator.platform);
    console.log('Max Touch Points:', navigator.maxTouchPoints);
    console.log('navigator.standalone:', window.navigator.standalone);
    console.log('display-mode standalone:', window.matchMedia('(display-mode: standalone)').matches);
    console.log('localStorage pwa-was-installed:', localStorage.getItem('pwa-was-installed'));
    console.log('localStorage ios-pwa-dismissed:', localStorage.getItem('ios-pwa-dismissed'));
    console.log('================================');
  };
  
  window.resetIOSInstallPrompt = () => {
    localStorage.removeItem('pwa-was-installed');
    localStorage.removeItem('ios-pwa-dismissed');
    console.log('iOS install prompt reset. Refresh the page to see the prompt.');
  };
}

export default IOSInstallPrompt;
