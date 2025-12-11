// Settings Modal
import { useState } from 'react';
import { X, Volume2, VolumeX, Vibrate, RotateCcw, LogOut, AlertTriangle, Music } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { useAuth } from '../contexts/AuthContext';

const SettingsModal = ({ isOpen, onClose }) => {
  const { profile, isAuthenticated, signOut } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isSoundEnabled());
  const [musicEnabled, setMusicEnabled] = useState(soundManager.isMusicEnabled());
  const [vibrationEnabled, setVibrationEnabled] = useState(soundManager.isVibrationEnabled());
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundManager.setSoundEnabled(newState);
    if (newState) {
      soundManager.playButtonClick();
    }
  };

  const handleToggleMusic = () => {
    const newState = !musicEnabled;
    setMusicEnabled(newState);
    soundManager.setMusicEnabled(newState);
    soundManager.playButtonClick();
  };

  const handleToggleVibration = () => {
    const newState = !vibrationEnabled;
    setVibrationEnabled(newState);
    soundManager.setVibrationEnabled(newState);
    if (newState) {
      soundManager.vibrate(50);
    }
    soundManager.playButtonClick();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Clear local storage first
      localStorage.removeItem('deadblock_settings');
      
      // Also clear Supabase auth data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      // Sign out using context method
      const result = await signOut();
      
      if (result?.error) {
        console.error('Sign out error:', result.error);
      }
      
      // Force a full page reload after signing out
      // Use replace to prevent back button issues
      window.location.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload even on error
      window.location.replace('/');
    }
  };

  const handleResetLocalData = () => {
    // Clear all local storage
    localStorage.clear();
    // Reload the page
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-sm w-full overflow-hidden border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.3)]">
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800">
          <h2 className="text-xl font-black text-purple-300 tracking-wider">SETTINGS</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 size={20} className="text-purple-400" />
              ) : (
                <VolumeX size={20} className="text-slate-500" />
              )}
              <div>
                <div className="text-white font-medium text-sm">Sound Effects</div>
                <div className="text-slate-500 text-xs">Game sounds and feedback</div>
              </div>
            </div>
            <button
              onClick={handleToggleSound}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                soundEnabled ? 'bg-purple-600' : 'bg-slate-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                soundEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Music Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-3">
              <Music size={20} className={musicEnabled ? 'text-purple-400' : 'text-slate-500'} />
              <div>
                <div className="text-white font-medium text-sm">Background Music</div>
                <div className="text-slate-500 text-xs">Ambient game music</div>
              </div>
            </div>
            <button
              onClick={handleToggleMusic}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                musicEnabled ? 'bg-purple-600' : 'bg-slate-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                musicEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Vibration Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-3">
              <Vibrate size={20} className={vibrationEnabled ? 'text-purple-400' : 'text-slate-500'} />
              <div>
                <div className="text-white font-medium text-sm">Haptic Feedback</div>
                <div className="text-slate-500 text-xs">Vibration on mobile</div>
              </div>
            </div>
            <button
              onClick={handleToggleVibration}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                vibrationEnabled ? 'bg-purple-600' : 'bg-slate-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                vibrationEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700/50 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">DATA MANAGEMENT</h3>
            
            {/* Reset Local Data */}
            <button
              onClick={handleResetLocalData}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-amber-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="flex items-center gap-3">
                <RotateCcw size={20} className="text-amber-400" />
                <div className="text-left">
                  <div className="text-white font-medium text-sm group-hover:text-amber-300 transition-colors">Reset Local Data</div>
                  <div className="text-slate-500 text-xs">Clear settings and cache</div>
                </div>
              </div>
            </button>

            {/* Sign Out - Only show if authenticated */}
            {isAuthenticated && (
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full mt-2 flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-red-500/50 hover:bg-slate-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={20} className="text-red-400" />
                  <div className="text-left">
                    <div className="text-white font-medium text-sm group-hover:text-red-300 transition-colors">Sign Out</div>
                    <div className="text-slate-500 text-xs">Log out of your account</div>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-500/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            DONE
          </button>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-60 p-4">
          <div className="bg-slate-900 rounded-xl max-w-xs w-full overflow-hidden border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
            <div className="p-5 text-center">
              <AlertTriangle size={48} className="mx-auto text-red-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Sign Out?</h3>
              <p className="text-slate-400 text-sm mb-5">
                You'll need to sign in again to access online features and your stats.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                  disabled={signingOut}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
