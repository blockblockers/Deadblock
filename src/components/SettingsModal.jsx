// Settings Modal - Enhanced with password reset for local users
// FIXES:
// 1. Added password reset/change option for email/password users
// 2. Detect if user is using Google auth vs local auth
// 3. Auto-open password reset when arriving from recovery email
// 4. Show/hide appropriate options based on auth type
import { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Vibrate, RotateCcw, LogOut, AlertTriangle, Music, Key, Lock, Eye, EyeOff, Check, Loader, Mail } from 'lucide-react';
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

  const handleResetLocalData = () => {
    soundManager.playButtonClick();
    if (confirm('Reset all local game data? This will clear your local settings and preferences.')) {
      localStorage.removeItem('deadblock_settings');
      localStorage.removeItem('deadblock_puzzle_progress');
      window.location.reload();
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

          {/* Audio Settings */}
          <h3 className="text-xs font-semibold text-slate-500 tracking-wider">AUDIO</h3>
          
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
                <div className="text-slate-500 text-xs">Game sounds</div>
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
                <div className="text-slate-500 text-xs">Ambient soundtrack</div>
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

          {/* Account Settings - Only show if authenticated and NOT Google user */}
          {isAuthenticated && !isGoogleUser && (
            <>
              <div className="border-t border-slate-700/50 pt-4">
                <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">ACCOUNT SECURITY</h3>
                
                {/* Password Reset/Change Button */}
                {!showPasswordReset && !showSendResetEmail && (
                  <button
                    onClick={() => setShowPasswordReset(true)}
                    className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Key size={20} className="text-cyan-400" />
                      <div className="text-left">
                        <div className="text-white font-medium text-sm group-hover:text-cyan-300 transition-colors">
                          {isPasswordRecovery ? 'Set New Password' : 'Change Password'}
                        </div>
                        <div className="text-slate-500 text-xs">
                          {isPasswordRecovery ? 'Create a new password' : 'Update your account password'}
                        </div>
                      </div>
                    </div>
                  </button>
                )}
                
                {/* Password Reset Form */}
                {showPasswordReset && (
                  <div className="bg-slate-800/50 rounded-lg border border-cyan-500/30 p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-cyan-300 font-medium text-sm flex items-center gap-2">
                        <Lock size={16} />
                        {isPasswordRecovery ? 'Set New Password' : 'Change Password'}
                      </h4>
                      {!isPasswordRecovery && (
                        <button
                          onClick={() => {
                            setShowPasswordReset(false);
                            setPasswordError('');
                            setPasswordSuccess('');
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          className="text-slate-400 hover:text-white text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    
                    {/* New Password */}
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">New Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (6+ chars)"
                          className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                          autoFocus={isPasswordRecovery}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    
                    {/* Confirm Password */}
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Confirm Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    {/* Error/Success Messages */}
                    {passwordError && (
                      <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded-lg">{passwordError}</div>
                    )}
                    {passwordSuccess && (
                      <div className="text-green-400 text-sm flex items-center gap-2 bg-green-500/10 p-2 rounded-lg">
                        <Check size={16} />
                        {passwordSuccess}
                      </div>
                    )}
                    
                    {/* Update Button */}
                    <button
                      onClick={handleUpdatePassword}
                      disabled={updatingPassword || !newPassword || !confirmPassword}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {updatingPassword ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Update Password
                        </>
                      )}
                    </button>
                    
                    {/* Alternative: Send reset email */}
                    {!isPasswordRecovery && (
                      <button
                        onClick={() => {
                          setShowPasswordReset(false);
                          setShowSendResetEmail(true);
                        }}
                        className="w-full text-slate-400 text-xs hover:text-cyan-300 transition-colors"
                      >
                        Or send password reset email instead
                      </button>
                    )}
                  </div>
                )}
                
                {/* Send Reset Email Form */}
                {showSendResetEmail && (
                  <div className="bg-slate-800/50 rounded-lg border border-amber-500/30 p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-amber-300 font-medium text-sm flex items-center gap-2">
                        <Mail size={16} />
                        Reset via Email
                      </h4>
                      <button
                        onClick={() => {
                          setShowSendResetEmail(false);
                          setResetEmailSent(false);
                          setResetEmailError('');
                        }}
                        className="text-slate-400 hover:text-white text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    {!resetEmailSent ? (
                      <>
                        <p className="text-slate-400 text-sm">
                          We'll send a password reset link to: <span className="text-white">{user?.email}</span>
                        </p>
                        
                        {resetEmailError && (
                          <div className="text-red-400 text-sm">{resetEmailError}</div>
                        )}
                        
                        <button
                          onClick={handleSendResetEmail}
                          disabled={sendingResetEmail}
                          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {sendingResetEmail ? (
                            <>
                              <Loader size={16} className="animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail size={16} />
                              Send Reset Email
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Check size={32} className="mx-auto text-green-400 mb-2" />
                        <p className="text-green-400 font-medium">Reset email sent!</p>
                        <p className="text-slate-400 text-sm mt-1">
                          Check your inbox (and spam folder) for the reset link.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Google User Info */}
          {isAuthenticated && isGoogleUser && (
            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">ACCOUNT</h3>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Signed in with Google</div>
                    <div className="text-slate-500 text-xs">{user?.email}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Management */}
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
        <div className="p-4 border-t border-purple-500/20 flex-shrink-0">
          <button
            onClick={handleClose}
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
