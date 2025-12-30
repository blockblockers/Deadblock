// Settings Modal - Enhanced with notifications and app install options
// UPDATED: Added Push Notifications toggle and Install App button
import { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Vibrate, RotateCcw, LogOut, AlertTriangle, Music, Key, Lock, Eye, EyeOff, Check, Loader, Mail, Trash2, Bell, BellOff, Download, Smartphone, ExternalLink } from 'lucide-react';
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
  
  // Notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [requestingNotifications, setRequestingNotifications] = useState(false);
  
  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  
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
  
  // Initialize notification and PWA states
  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
    
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
    
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    setIsInstalled(isStandalone);
    
    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
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

  // Handle notification toggle
  const handleToggleNotifications = async () => {
    soundManager.playButtonClick();
    
    if (!('Notification' in window)) {
      alert('Notifications are not supported in this browser');
      return;
    }
    
    if (notificationsEnabled) {
      // Can't programmatically disable - user must do it in browser settings
      alert('To disable notifications, please update your browser settings for this site.');
      return;
    }
    
    setRequestingNotifications(true);
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        // Show test notification
        new Notification('Deadblock', {
          body: 'Notifications enabled! You\'ll receive game updates.',
          icon: '/icons/icon-192.png',
        });
      } else if (permission === 'denied') {
        alert('Notifications were blocked. You can enable them in your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setRequestingNotifications(false);
    }
  };

  // Handle app install
  const handleInstallApp = async () => {
    soundManager.playButtonClick();
    
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    
    if (!deferredPrompt) {
      // No install prompt available - might already be installed or not supported
      alert('App installation is not available. You may have already installed the app, or your browser doesn\'t support installation.');
      return;
    }
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing app:', error);
    }
  };

  const handleResetLocalData = () => {
    soundManager.playButtonClick();
    setShowResetConfirm(true);
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      // Clear ALL localStorage
      localStorage.clear();
      
      // Clear Supabase auth data specifically
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage too
      sessionStorage.clear();
      
      // Force full page reload to entry auth
      window.location.replace('/');
    } catch (error) {
      console.error('Error resetting data:', error);
      setResetting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      localStorage.removeItem('deadblock_settings');
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      const result = await signOut();
      
      if (result?.error) {
        console.error('Sign out error:', result.error);
      }
      
      window.location.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.replace('/');
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
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
        soundManager.playButtonClick();
        
        if (isPasswordRecovery) {
          clearPasswordRecovery?.();
        }
        
        setTimeout(() => {
          setShowPasswordReset(false);
          setPasswordSuccess('');
        }, 2000);
      }
    } catch (error) {
      setPasswordError(error.message || 'An error occurred');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      setResetEmailError('No email address found');
      return;
    }
    
    setSendingResetEmail(true);
    setResetEmailError('');
    
    try {
      const { error } = await resetPassword(user.email);
      
      if (error) {
        setResetEmailError(error.message || 'Failed to send reset email');
      } else {
        setResetEmailSent(true);
      }
    } catch (error) {
      setResetEmailError(error.message || 'An error occurred');
    } finally {
      setSendingResetEmail(false);
    }
  };

  const handleClose = () => {
    soundManager.playButtonClick();
    setShowPasswordReset(false);
    setShowSendResetEmail(false);
    setPasswordError('');
    setPasswordSuccess('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm max-h-[90vh] bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 rounded-2xl border border-purple-500/40 shadow-[0_0_60px_rgba(168,85,247,0.3)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Settings</h2>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Audio Settings */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">AUDIO</h3>
            <div className="space-y-2">
              {/* Sound Toggle */}
              <button
                onClick={handleToggleSound}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Volume2 size={20} className="text-purple-400" /> : <VolumeX size={20} className="text-slate-500" />}
                  <span className="text-white font-medium text-sm group-hover:text-purple-300 transition-colors">Sound Effects</span>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-purple-600' : 'bg-slate-600'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mt-0.5 ${soundEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {/* Music Toggle */}
              <button
                onClick={handleToggleMusic}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Music size={20} className={musicEnabled ? 'text-purple-400' : 'text-slate-500'} />
                  <span className="text-white font-medium text-sm group-hover:text-purple-300 transition-colors">Background Music</span>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${musicEnabled ? 'bg-purple-600' : 'bg-slate-600'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mt-0.5 ${musicEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {/* Vibration Toggle */}
              <button
                onClick={handleToggleVibration}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Vibrate size={20} className={vibrationEnabled ? 'text-purple-400' : 'text-slate-500'} />
                  <span className="text-white font-medium text-sm group-hover:text-purple-300 transition-colors">Haptic Feedback</span>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${vibrationEnabled ? 'bg-purple-600' : 'bg-slate-600'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mt-0.5 ${vibrationEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Notifications Section - NEW */}
          <div className="border-t border-slate-700/50 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">NOTIFICATIONS</h3>
            
            <button
              onClick={handleToggleNotifications}
              disabled={requestingNotifications}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="flex items-center gap-3">
                {notificationsEnabled ? (
                  <Bell size={20} className="text-cyan-400" />
                ) : (
                  <BellOff size={20} className="text-slate-500" />
                )}
                <div className="text-left">
                  <div className="text-white font-medium text-sm group-hover:text-cyan-300 transition-colors">
                    {requestingNotifications ? 'Requesting...' : 'Push Notifications'}
                  </div>
                  <div className="text-slate-500 text-xs">
                    {notificationPermission === 'denied' 
                      ? 'Blocked in browser settings'
                      : notificationsEnabled 
                        ? 'Receive game updates' 
                        : 'Get notified when it\'s your turn'}
                  </div>
                </div>
              </div>
              {requestingNotifications ? (
                <Loader size={20} className="text-cyan-400 animate-spin" />
              ) : (
                <div className={`w-10 h-6 rounded-full transition-colors ${notificationsEnabled ? 'bg-cyan-600' : 'bg-slate-600'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mt-0.5 ${notificationsEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              )}
            </button>
          </div>

          {/* App Installation Section - NEW */}
          <div className="border-t border-slate-700/50 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">APP INSTALLATION</h3>
            
            {isInstalled ? (
              <div className="flex items-center gap-3 p-3 bg-green-900/30 rounded-lg border border-green-500/30">
                <Check size={20} className="text-green-400" />
                <div>
                  <div className="text-green-300 font-medium text-sm">App Installed</div>
                  <div className="text-green-400/70 text-xs">Deadblock is installed on your device</div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleInstallApp}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-amber-500/50 hover:bg-slate-800 transition-all group"
              >
                <div className="flex items-center gap-3">
                  {isIOS ? (
                    <Smartphone size={20} className="text-amber-400" />
                  ) : (
                    <Download size={20} className="text-amber-400" />
                  )}
                  <div className="text-left">
                    <div className="text-white font-medium text-sm group-hover:text-amber-300 transition-colors">
                      Install Deadblock
                    </div>
                    <div className="text-slate-500 text-xs">
                      {isIOS 
                        ? 'Add to Home Screen for the best experience'
                        : 'Install as an app on your device'}
                    </div>
                  </div>
                </div>
                <ExternalLink size={18} className="text-slate-400 group-hover:text-amber-400 transition-colors" />
              </button>
            )}
            
            {/* iOS Instructions Modal */}
            {showIOSInstructions && (
              <div className="mt-3 p-3 bg-amber-900/30 rounded-lg border border-amber-500/30">
                <h4 className="text-amber-300 font-bold text-sm mb-2">To Install on iOS:</h4>
                <ol className="text-amber-100/80 text-xs space-y-1">
                  <li>1. Tap the <strong>Share</strong> button (□↑) in Safari</li>
                  <li>2. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>3. Tap <strong>"Add"</strong> in the top right</li>
                </ol>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="mt-2 text-xs text-amber-400 hover:text-amber-300"
                >
                  Got it
                </button>
              </div>
            )}
          </div>

          {/* Password Section - for email/password users only */}
          {isAuthenticated && !isGoogleUser && (
            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">SECURITY</h3>
              
              {!showPasswordReset && !showSendResetEmail ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowPasswordReset(true)}
                    className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Key size={20} className="text-purple-400" />
                      <div className="text-left">
                        <div className="text-white font-medium text-sm group-hover:text-purple-300 transition-colors">Change Password</div>
                        <div className="text-slate-500 text-xs">Update your account password</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowSendResetEmail(true)}
                    className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 hover:bg-slate-800 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Mail size={20} className="text-purple-400" />
                      <div className="text-left">
                        <div className="text-white font-medium text-sm group-hover:text-purple-300 transition-colors">Send Reset Email</div>
                        <div className="text-slate-500 text-xs">Get a password reset link</div>
                      </div>
                    </div>
                  </button>
                </div>
              ) : showPasswordReset ? (
                <div className="space-y-3 p-3 bg-slate-800/30 rounded-lg border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 font-medium text-sm">Change Password</span>
                    <button onClick={() => setShowPasswordReset(false)} className="text-slate-400 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  
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
                  
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                  
                  {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
                  {passwordSuccess && <p className="text-green-400 text-xs flex items-center gap-1"><Check size={14} /> {passwordSuccess}</p>}
                  
                  <button
                    onClick={handleUpdatePassword}
                    disabled={updatingPassword || !newPassword || !confirmPassword}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {updatingPassword ? <><Loader size={16} className="animate-spin" /> Updating...</> : 'Update Password'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-slate-800/30 rounded-lg border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 font-medium text-sm">Send Reset Email</span>
                    <button onClick={() => { setShowSendResetEmail(false); setResetEmailSent(false); setResetEmailError(''); }} className="text-slate-400 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  
                  {resetEmailSent ? (
                    <div className="text-green-400 text-sm flex items-center gap-2">
                      <Check size={16} />
                      Reset email sent to {user?.email}
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-400 text-xs">Send a password reset link to {user?.email}</p>
                      {resetEmailError && <p className="text-red-400 text-xs">{resetEmailError}</p>}
                      <button
                        onClick={handleSendResetEmail}
                        disabled={sendingResetEmail}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {sendingResetEmail ? <><Loader size={16} className="animate-spin" /> Sending...</> : 'Send Reset Email'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Account Info (if authenticated) */}
          {isAuthenticated && profile && (
            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">ACCOUNT</h3>
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                    {profile?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="text-white font-medium">{profile?.username || 'User'}</div>
                    <div className="text-slate-500 text-xs">{user?.email}</div>
                    {isGoogleUser && <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">via Google</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Management */}
          <div className="border-t border-slate-700/50 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider mb-3">DATA MANAGEMENT</h3>
            
            <button
              onClick={handleResetLocalData}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-amber-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="flex items-center gap-3">
                <RotateCcw size={20} className="text-amber-400" />
                <div className="text-left">
                  <div className="text-white font-medium text-sm group-hover:text-amber-300 transition-colors">Reset All Data</div>
                  <div className="text-slate-500 text-xs">Clear all local data and sign out</div>
                </div>
              </div>
            </button>

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

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-60 p-4">
          <div className="bg-slate-900 rounded-xl max-w-xs w-full overflow-hidden border border-amber-500/50 shadow-[0_0_40px_rgba(251,191,36,0.3)]">
            <div className="p-5 text-center">
              <Trash2 size={48} className="mx-auto text-amber-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Reset All Data?</h3>
              <p className="text-slate-400 text-sm mb-5">
                This will clear all local data, settings, and sign you out. This action cannot be undone.
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
                  onClick={handleConfirmReset}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={resetting}
                >
                  {resetting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Resetting...
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
                      <Loader size={16} className="animate-spin" />
                      Signing out...
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
