import { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Music, Smartphone, AlertTriangle, LogOut } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { useAuth } from '../contexts/AuthContext';

const SettingsModal = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('deadblock_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setMusicEnabled(settings.musicEnabled ?? true);
        setSfxEnabled(settings.sfxEnabled ?? true);
        setVibrationEnabled(settings.vibrationEnabled ?? true);
        
        // Apply to sound manager
        soundManager.setMusicEnabled(settings.musicEnabled ?? true);
        soundManager.setSfxEnabled(settings.sfxEnabled ?? true);
        soundManager.setVibrationEnabled(settings.vibrationEnabled ?? true);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  const saveSettings = (updates) => {
    const currentSettings = {
      musicEnabled,
      sfxEnabled,
      vibrationEnabled,
      ...updates
    };
    localStorage.setItem('deadblock_settings', JSON.stringify(currentSettings));
  };

  const handleMusicToggle = () => {
    const newValue = !musicEnabled;
    setMusicEnabled(newValue);
    soundManager.setMusicEnabled(newValue);
    saveSettings({ musicEnabled: newValue });
  };

  const handleSfxToggle = () => {
    const newValue = !sfxEnabled;
    setSfxEnabled(newValue);
    soundManager.setSfxEnabled(newValue);
    saveSettings({ sfxEnabled: newValue });
    
    // Play test sound if enabling
    if (newValue) {
      setTimeout(() => soundManager.playClickSound('select'), 100);
    }
  };

  const handleVibrationToggle = () => {
    const newValue = !vibrationEnabled;
    setVibrationEnabled(newValue);
    soundManager.setVibrationEnabled(newValue);
    saveSettings({ vibrationEnabled: newValue });
    
    // Test vibration if enabling
    if (newValue) {
      soundManager.vibrate('short');
    }
  };

  const handleClose = () => {
    soundManager.playButtonClick();
    onClose();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setShowSignOutConfirm(false);
      onClose();
      // Force reload to clear all state
      window.location.reload();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setSigningOut(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleClose}
    >
      <div 
        className="bg-slate-900/95 rounded-2xl w-full max-w-md border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.3)]"
        style={{
          maxHeight: '85vh',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header - fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-2xl font-bold text-purple-300 tracking-wide">SETTINGS</h2>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-2 -m-2 touch-manipulation active:scale-90"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Scrollable content */}
        <div 
          className="flex-1 overflow-auto px-6 py-4"
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}
        >
          <div className="space-y-6">
            {/* Music Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music size={20} className="text-cyan-400" />
                  <span className="text-cyan-300 font-semibold tracking-wide">MUSIC</span>
                </div>
                <button
                  onClick={handleMusicToggle}
                  className={`w-14 h-8 rounded-full transition-all duration-300 touch-manipulation ${
                    musicEnabled 
                      ? 'bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                      : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                    musicEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* SFX Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {sfxEnabled ? (
                    <Volume2 size={20} className="text-green-400" />
                  ) : (
                    <VolumeX size={20} className="text-slate-500" />
                  )}
                  <span className="text-green-300 font-semibold tracking-wide">SOUND EFFECTS</span>
                </div>
                <button
                  onClick={handleSfxToggle}
                  className={`w-14 h-8 rounded-full transition-all duration-300 touch-manipulation ${
                    sfxEnabled 
                      ? 'bg-green-500 shadow-[0_0_15px_rgba(74,222,128,0.5)]' 
                      : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                    sfxEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Vibration Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone size={20} className="text-amber-400" />
                  <span className="text-amber-300 font-semibold tracking-wide">VIBRATION</span>
                </div>
                <button
                  onClick={handleVibrationToggle}
                  className={`w-14 h-8 rounded-full transition-all duration-300 touch-manipulation ${
                    vibrationEnabled 
                      ? 'bg-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.5)]' 
                      : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                    vibrationEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <p className="text-slate-500 text-xs">Haptic feedback on supported devices</p>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50 my-4" />

            {/* Account Section */}
            {user && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-slate-300 font-semibold tracking-wide">ACCOUNT</span>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-slate-400 text-sm truncate">{user.email}</p>
                </div>
                
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full py-3 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-300 border border-red-500/30 touch-manipulation active:scale-[0.98]"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            )}

            {/* Version info */}
            <div className="pt-4 text-center">
              <p className="text-slate-600 text-xs">DEADBLOCK v1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div 
            className="bg-slate-900 rounded-xl max-w-xs w-full overflow-hidden border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.3)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              <AlertTriangle size={48} className="mx-auto text-red-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Sign Out?</h3>
              <p className="text-slate-400 text-sm mb-5">
                You'll need to sign in again to access online features.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors touch-manipulation"
                  disabled={signingOut}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation"
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing out...</span>
                    </>
                  ) : (
                    'Sign Out'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;
