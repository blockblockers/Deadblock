// SettingsMenu.jsx - Settings modal with audio, notifications, and app install options
// NEW: Added notification enablement and PWA install options
import { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Music, Bell, BellOff, Download, Smartphone, Check, AlertCircle } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

/**
 * SettingsMenu Component
 * 
 * Settings modal with:
 * - Sound effects toggle
 * - Music toggle  
 * - Volume controls
 * - Notification enablement (NEW)
 * - App install / Add to home screen (NEW)
 * - Haptic feedback toggle
 */
const SettingsMenu = ({ isOpen, onClose }) => {
  // Audio settings
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isSoundEnabled());
  const [musicEnabled, setMusicEnabled] = useState(() => soundManager.isMusicEnabled());
  const [soundVolume, setSoundVolume] = useState(() => soundManager.getSoundVolume() * 100);
  const [musicVolume, setMusicVolume] = useState(() => soundManager.getMusicVolume() * 100);
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return localStorage.getItem('deadblock_haptic_enabled') !== 'false';
  });
  
  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [notificationError, setNotificationError] = useState(null);
  
  // PWA install
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
    
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true;
    setIsInstalled(isStandalone);
    
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
  }, []);
  
  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if already stored
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setCanInstall(true);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  // Sound toggle
  const handleSoundToggle = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    soundManager.setSoundEnabled(newEnabled);
    if (newEnabled) soundManager.playButtonClick();
  };
  
  // Music toggle
  const handleMusicToggle = () => {
    const newEnabled = !musicEnabled;
    setMusicEnabled(newEnabled);
    soundManager.setMusicEnabled(newEnabled);
    soundManager.playButtonClick();
  };
  
  // Sound volume
  const handleSoundVolumeChange = (e) => {
    const vol = parseInt(e.target.value);
    setSoundVolume(vol);
    soundManager.setSoundVolume(vol / 100);
  };
  
  // Music volume
  const handleMusicVolumeChange = (e) => {
    const vol = parseInt(e.target.value);
    setMusicVolume(vol);
    soundManager.setMusicVolume(vol / 100);
  };
  
  // Haptic toggle
  const handleHapticToggle = () => {
    const newEnabled = !hapticEnabled;
    setHapticEnabled(newEnabled);
    localStorage.setItem('deadblock_haptic_enabled', newEnabled.toString());
    soundManager.playButtonClick();
  };
  
  // Request notification permission
  const handleEnableNotifications = async () => {
    setNotificationError(null);
    
    if (!('Notification' in window)) {
      setNotificationError('Notifications not supported in this browser');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        // Show a test notification
        new Notification('Deadblock Notifications Enabled! 🎮', {
          body: 'You\'ll now receive game notifications',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-72.png',
        });
        soundManager.playButtonClick();
      } else if (permission === 'denied') {
        setNotificationError('Notifications blocked. Enable in browser settings.');
      }
    } catch (err) {
      console.error('Notification error:', err);
      setNotificationError('Failed to enable notifications');
    }
  };
  
  // Install PWA
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setCanInstall(false);
          setDeferredPrompt(null);
          soundManager.playButtonClick();
        }
      } catch (err) {
        console.error('Install error:', err);
      }
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => { soundManager.playButtonClick(); onClose(); }}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900/95 rounded-2xl p-6 max-w-sm w-full border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-cyan-400">SETTINGS</h2>
          <button 
            onClick={() => { soundManager.playButtonClick(); onClose(); }}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Settings List */}
        <div className="space-y-4">
          
          {/* === AUDIO SECTION === */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Audio</h3>
            
            {/* Sound Effects Toggle */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 size={18} className="text-cyan-400" />
                ) : (
                  <VolumeX size={18} className="text-slate-500" />
                )}
                <span className="text-white text-sm">Sound Effects</span>
              </div>
              <button
                onClick={handleSoundToggle}
                className={`w-12 h-6 rounded-full transition-all ${
                  soundEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            {/* Sound Volume */}
            {soundEnabled && (
              <div className="mb-3 pl-6">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundVolume}
                  onChange={handleSoundVolumeChange}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="text-xs text-slate-500 mt-1">{soundVolume}%</div>
              </div>
            )}
            
            {/* Music Toggle */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Music size={18} className={musicEnabled ? 'text-purple-400' : 'text-slate-500'} />
                <span className="text-white text-sm">Background Music</span>
              </div>
              <button
                onClick={handleMusicToggle}
                className={`w-12 h-6 rounded-full transition-all ${
                  musicEnabled ? 'bg-purple-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${
                  musicEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            {/* Music Volume */}
            {musicEnabled && (
              <div className="mb-3 pl-6">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={handleMusicVolumeChange}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="text-xs text-slate-500 mt-1">{musicVolume}%</div>
              </div>
            )}
            
            {/* Haptic Feedback */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className={hapticEnabled ? 'text-green-400' : 'text-slate-500'} />
                <span className="text-white text-sm">Haptic Feedback</span>
              </div>
              <button
                onClick={handleHapticToggle}
                className={`w-12 h-6 rounded-full transition-all ${
                  hapticEnabled ? 'bg-green-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${
                  hapticEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
          
          {/* === NOTIFICATIONS SECTION === */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Notifications</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {notificationsEnabled ? (
                  <Bell size={18} className="text-amber-400" />
                ) : (
                  <BellOff size={18} className="text-slate-500" />
                )}
                <span className="text-white text-sm">Push Notifications</span>
              </div>
              
              {notificationsEnabled ? (
                <div className="flex items-center gap-1 text-green-400 text-xs">
                  <Check size={14} />
                  Enabled
                </div>
              ) : (
                <button
                  onClick={handleEnableNotifications}
                  className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-bold hover:bg-amber-500/30 transition-all border border-amber-500/30"
                >
                  Enable
                </button>
              )}
            </div>
            
            {notificationError && (
              <div className="mt-2 flex items-center gap-1 text-red-400 text-xs">
                <AlertCircle size={12} />
                {notificationError}
              </div>
            )}
            
            {notificationPermission === 'denied' && (
              <div className="mt-2 text-xs text-slate-500">
                To enable, allow notifications in your browser settings.
              </div>
            )}
          </div>
          
          {/* === APP INSTALL SECTION === */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Install App</h3>
            
            {isInstalled ? (
              <div className="flex items-center gap-2 text-green-400">
                <Check size={18} />
                <span className="text-sm">App installed!</span>
              </div>
            ) : isIOS ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <Smartphone size={18} className="text-cyan-400" />
                  <span className="text-sm">Add to Home Screen</span>
                </div>
                <div className="text-xs text-slate-500 pl-6">
                  Tap the <span className="text-cyan-300">Share</span> button in Safari, then select <span className="text-cyan-300">"Add to Home Screen"</span>
                </div>
              </div>
            ) : canInstall ? (
              <button
                onClick={handleInstallApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              >
                <Download size={18} />
                INSTALL DEADBLOCK
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Download size={18} />
                  <span className="text-sm">Install as app</span>
                </div>
                <div className="text-xs text-slate-500 pl-6">
                  Use Chrome, Edge, or Safari to install as an app
                </div>
              </div>
            )}
          </div>
          
        </div>
        
        {/* Close Button */}
        <button
          onClick={() => { soundManager.playButtonClick(); onClose(); }}
          className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};

export default SettingsMenu;
