// Settings Modal - Enhanced with password reset for local users
// UPDATED: Reset Local Data now clears ALL data, logs out, and redirects to entry auth
import { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Vibrate, RotateCcw, LogOut, AlertTriangle, Music, Key, Lock, Eye, EyeOff, Check, Loader, Mail, Trash2 } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { useAuth } from '../contexts/AuthContext';

const SettingsModal = ({ isOpen, onClose }) => {
  const { 
    profile, 
    user, 
    isAuthenticated, 
    signOut, 
    updatePassword, 
    resetPassword,
    isPasswordRecovery,
    clearPasswordRecovery
  } = useAuth();
  
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isSoundEnabled());
  const [musicEnabled, setMusicEnabled] = useState(soundManager.isMusicEnabled());
  const [vibrationEnabled, setVibrationEnabled] = useState(soundManager.isVibrationEnabled());
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  // Send reset email states
  const [showSendResetEmail, setShowSendResetEmail] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmailError, setResetEmailError] = useState('');

  // Check if user is using Google OAuth (no password auth)
  const isGoogleUser = user?.app_metadata?.provider === 'google' || 
                       user?.identities?.some(i => i.provider === 'google');
  
  // Auto-open password reset if this is a recovery session
  useEffect(() => {
    if (isOpen && isPasswordRecovery) {
      console.log('[SettingsModal] Password recovery session detected, opening reset form');
      setShowPasswordReset(true);
    }
  }, [isOpen, isPasswordRecovery]);

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

  // UPDATED: Reset Local Data now clears everything and redirects to entry auth
  const handleResetLocalData = async () => {
    soundManager.playButtonClick();
    setResetting(true);
    
    try {
      // Stop any playing music/sounds
      soundManager.stopMusic?.();
      
      // Clear ALL localStorage
      localStorage.clear();
      
      // Clear sessionStorage too
      sessionStorage.clear();
      
      // Sign out if authenticated (this clears Supabase session)
      if (isAuthenticated && signOut) {
        try {
          await signOut();
        } catch (e) {
          console.log('Sign out during reset:', e);
          // Continue even if sign out fails
        }
      }
      
      // Force redirect to root/entry auth
      window.location.replace('/');
    } catch (error) {
      console.error('Error resetting data:', error);
      // Still try to redirect even on error
      window.location.replace('/');
    }
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
      window.location.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.replace('/');
    }
  };

  // Handle password update
  const handleUpdatePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validation
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setUpdatingPassword(true);
    
    try {
      const { error } = await updatePassword(newPassword);
      
      if (error) {
        setPasswordError(error.message || 'Failed to update password');
      } else {
        setPasswordSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        soundManager.playSound?.('success') || soundManager.playClickSound?.('confirm');
        
        // Clear recovery state if it was a recovery session
        if (isPasswordRecovery) {
          clearPasswordRecovery?.();
        }
        
        // Close the password reset section after 2 seconds
        setTimeout(() => {
          setShowPasswordReset(false);
          setPasswordSuccess('');
        }, 2000);
      }
    } catch (err) {
      setPasswordError('An error occurred. Please try again.');
    }
    
    setUpdatingPassword(false);
  };

  // Handle sending password reset email
  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    
    setResetEmailError('');
    setSendingResetEmail(true);
    
    try {
      const { error } = await resetPassword(user.email);
      
      if (error) {
        setResetEmailError(error.message || 'Failed to send reset email');
      } else {
        setResetEmailSent(true);
        soundManager.playClickSound?.('confirm');
      }
    } catch (err) {
      setResetEmailError('An error occurred. Please try again.');
    }
    
    setSendingResetEmail(false);
  };

  const handleClose = () => {
    // Clear recovery state when closing
    if (isPasswordRecovery) {
      clearPasswordRecovery?.();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.3)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20 flex items-center justify-between bg-gradient-to-r from-purple-900/50 to-slate-900 flex-shrink-0">
          <h2 className="text-lg font-bold text-purple-300">Settings</h2>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Password Recovery Banner */}
          {isPasswordRecovery && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg">
              <div className="flex items-center gap-2 text-amber-300">
                <Key size={18} />
                <span className="font-medium">Set Your New Password</span>
              </div>
              <p className="text-amber-200/70 text-sm mt-1">
                You clicked a password reset link. Enter your new password below.
              </p>
            </div>
          )}
          
          {/* Sound Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider">AUDIO</h3>
            
            {/* Sound Effects */}
            <button
              onClick={handleToggleSound}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                {soundEnabled ? <Volume2 size={20} className="text-purple-400" /> : <VolumeX size={20} className="text-slate-500" />}
                <span className="text-white font-medium text-sm">Sound Effects</span>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all ${soundEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all mt-0.5 ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {/* Music */}
            <button
              onClick={handleToggleMusic}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <Music size={20} className={musicEnabled ? 'text-purple-400' : 'text-slate-500'} />
                <span className="text-white font-medium text-sm">Music</span>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all ${musicEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all mt-0.5 ${musicEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {/* Vibration */}
            <button
              onClick={handleToggleVibration}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <Vibrate size={20} className={vibrationEnabled ? 'text-purple-400' : 'text-slate-500'} />
                <span className="text-white font-medium text-sm">Vibration</span>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all ${vibrationEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all mt-0.5 ${vibrationEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          {/* Account Section - Only show for authenticated non-Google users */}
          {isAuthenticated && !isGoogleUser && (
            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">ACCOUNT</h3>
              
              {/* Change Password Button */}
              {!showPasswordReset && !isPasswordRecovery && (
                <button
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Lock size={20} className="text-purple-400" />
                    <div className="text-left">
                      <div className="text-white font-medium text-sm group-hover:text-purple-300 transition-colors">Change Password</div>
                      <div className="text-slate-500 text-xs">Update your account password</div>
                    </div>
                  </div>
                </button>
              )}
              
              {/* Password Reset Form */}
              {(showPasswordReset || isPasswordRecovery) && (
                <div className="p-3 bg-slate-800/50 rounded-lg border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 font-medium text-sm">
                      {isPasswordRecovery ? 'Set New Password' : 'Change Password'}
                    </span>
                    {!isPasswordRecovery && (
                      <button
                        onClick={() => setShowPasswordReset(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  
                  {/* New Password Input */}
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Confirm Password Input */}
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                  
                  {/* Error/Success Messages */}
                  {passwordError && (
                    <p className="text-red-400 text-xs">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="text-green-400 text-xs flex items-center gap-1">
                      <Check size={14} /> {passwordSuccess}
                    </p>
                  )}
                  
                  {/* Update Button */}
                  <button
                    onClick={handleUpdatePassword}
                    disabled={updatingPassword || !newPassword || !confirmPassword}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {updatingPassword ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Key size={16} />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Google Account Info */}
          {isAuthenticated && isGoogleUser && (
            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">ACCOUNT</h3>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                  <div>
                    <div className="text-slate-300 text-sm font-medium">Signed in with Google</div>
                    <div className="text-slate-500 text-xs">{user?.email}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Management */}
          <div className="border-t border-slate-700/50 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">DATA MANAGEMENT</h3>
            
            {/* Reset Local Data - UPDATED: Now clears everything and logs out */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-red-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={20} className="text-red-400" />
                <div className="text-left">
                  <div className="text-white font-medium text-sm group-hover:text-red-300 transition-colors">Reset All Data</div>
                  <div className="text-slate-500 text-xs">Clear cache, settings, and sign out</div>
                </div>
              </div>
            </button>

            {/* Sign Out - Only show if authenticated */}
            {isAuthenticated && (
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full mt-2 flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-amber-500/50 hover:bg-slate-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={20} className="text-amber-400" />
                  <div className="text-left">
                    <div className="text-white font-medium text-sm group-hover:text-amber-300 transition-colors">Sign Out</div>
                    <div className="text-slate-500 text-xs">Log out of your account</div>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-500/20 flex-shrink-0">
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            DONE
          </button>
        </div>
      </div>

      {/* Reset All Data Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-60 p-4">
          <div className="bg-slate-900 rounded-xl max-w-xs w-full overflow-hidden border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
            <div className="p-5 text-center">
              <Trash2 size={48} className="mx-auto text-red-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Reset All Data?</h3>
              <p className="text-slate-400 text-sm mb-5">
                This will clear all local data, sign you out, and return to the start screen. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetLocalData}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={resetting}
                >
                  {resetting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    'Reset All'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-60 p-4">
          <div className="bg-slate-900 rounded-xl max-w-xs w-full overflow-hidden border border-amber-500/50 shadow-[0_0_40px_rgba(251,191,36,0.3)]">
            <div className="p-5 text-center">
              <AlertTriangle size={48} className="mx-auto text-amber-400 mb-3" />
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
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
