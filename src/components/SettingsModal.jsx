// SettingsModal.jsx - Enhanced with TRUE Push Notifications support
// UPDATED: Added push notification subscription management
// Place in src/components/SettingsModal.jsx

import { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Vibrate, RotateCcw, LogOut, AlertTriangle, Music, Key, Lock, Eye, EyeOff, Check, Loader, Mail, Trash2, Bell, BellOff, Download, Smartphone, ExternalLink } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { useAuth } from '../contexts/AuthContext';
import { pushNotificationService } from '../services/pushNotificationService';

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
  
  // Push Notification states
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState(null);
  
  // Browser Notification states (fallback)
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
  
  // Initialize push notifications and other states
  useEffect(() => {
    const initPushNotifications = async () => {
      // Initialize push service
      const supported = await pushNotificationService.init();
      setPushSupported(supported);
      
      if (supported) {
        setPushPermission(pushNotificationService.getPermissionStatus());
        setPushSubscribed(pushNotificationService.isSubscribed());
      }
    };
    
    initPushNotifications();
    
    // Check basic notification permission
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

  // Handle push notification subscription toggle
  const handlePushToggle = async () => {
    if (!pushSupported || !user?.id) return;
    
    setPushLoading(true);
    setPushError(null);
    
    try {
      if (pushSubscribed) {
        // Unsubscribe
        await pushNotificationService.unsubscribe(user.id);
        setPushSubscribed(false);
        soundManager.playClickSound?.('click');
      } else {
        // Subscribe
        const result = await pushNotificationService.subscribe(user.id);
        
        if (result.success) {
          setPushSubscribed(true);
          setPushPermission('granted');
          soundManager.playClickSound?.('success');
          
          // Show test notification
          setTimeout(() => {
            pushNotificationService.sendTestNotification();
          }, 500);
        } else {
          if (result.reason === 'permission_denied') {
            setPushPermission('denied');
            setPushError('Notification permission was denied. Please enable in browser settings.');
          } else {
            setPushError('Failed to enable notifications. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('[SettingsModal] Push toggle error:', error);
      setPushError('An error occurred. Please try again.');
    } finally {
      setPushLoading(false);
    }
  };
  
  // Handle basic notification toggle (fallback)
  const handleNotificationToggle = async () => {
    if (notificationPermission === 'denied') {
      return;
    }
    
    if (notificationPermission === 'default') {
      setRequestingNotifications(true);
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        setNotificationsEnabled(permission === 'granted');
        
        if (permission === 'granted') {
          // Show test notification
          new Notification('Notifications Enabled!', {
            body: 'You will now receive notifications when it\'s your turn.',
            icon: '/pwa-192x192.png'
          });
        }
      } catch (err) {
        console.error('Notification permission error:', err);
      } finally {
        setRequestingNotifications(false);
      }
    }
  };

  // Handle PWA install
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };
  
  // Toggle handlers for audio
  const toggleSound = () => {
    soundManager.toggleSound();
    setSoundEnabled(soundManager.isSoundEnabled());
    soundManager.playClickSound?.('click');
  };
  
  const toggleMusic = () => {
    soundManager.toggleMusic();
    setMusicEnabled(soundManager.isMusicEnabled());
    soundManager.playClickSound?.('click');
  };
  
  const toggleVibration = () => {
    soundManager.toggleVibration();
    setVibrationEnabled(soundManager.isVibrationEnabled());
    if (soundManager.isVibrationEnabled()) {
      soundManager.vibrate([50]);
    }
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Unsubscribe from push notifications before signing out
      if (pushSubscribed && user?.id) {
        await pushNotificationService.unsubscribe(user.id);
      }
      await signOut();
      onClose();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };
  
  // Handle password update (when in recovery mode)
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
        // Clear the recovery state
        if (clearPasswordRecovery) {
          clearPasswordRecovery();
        }
        setTimeout(() => {
          setShowPasswordReset(false);
          setPasswordSuccess('');
        }, 2000);
      }
    } catch (err) {
      setPasswordError('An error occurred');
    } finally {
      setUpdatingPassword(false);
    }
  };
  
  // Handle sending password reset email
  const handleSendResetEmail = async () => {
    setResetEmailError('');
    setSendingResetEmail(true);
    
    try {
      const { error } = await resetPassword(user?.email);
      if (error) {
        setResetEmailError(error.message || 'Failed to send reset email');
      } else {
        setResetEmailSent(true);
      }
    } catch (err) {
      setResetEmailError('An error occurred');
    } finally {
      setSendingResetEmail(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.2)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 flex-shrink-0">
          <h2 className="text-lg font-bold text-cyan-300">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Sound Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Audio</h3>
            
            <button
              onClick={toggleSound}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                soundEnabled 
                  ? 'bg-cyan-600/20 border border-cyan-500/30' 
                  : 'bg-slate-700/50 border border-slate-600/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {soundEnabled ? <Volume2 size={20} className="text-cyan-400" /> : <VolumeX size={20} className="text-slate-500" />}
                <span className={soundEnabled ? 'text-white' : 'text-slate-400'}>Sound Effects</span>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${soundEnabled ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
            
            <button
              onClick={toggleMusic}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                musicEnabled 
                  ? 'bg-cyan-600/20 border border-cyan-500/30' 
                  : 'bg-slate-700/50 border border-slate-600/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Music size={20} className={musicEnabled ? 'text-cyan-400' : 'text-slate-500'} />
                <span className={musicEnabled ? 'text-white' : 'text-slate-400'}>Background Music</span>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${musicEnabled ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${musicEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
            
            <button
              onClick={toggleVibration}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                vibrationEnabled 
                  ? 'bg-cyan-600/20 border border-cyan-500/30' 
                  : 'bg-slate-700/50 border border-slate-600/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Vibrate size={20} className={vibrationEnabled ? 'text-cyan-400' : 'text-slate-500'} />
                <span className={vibrationEnabled ? 'text-white' : 'text-slate-400'}>Haptic Feedback</span>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${vibrationEnabled ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${vibrationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
          
          {/* Push Notifications Section */}
          {isAuthenticated && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Notifications</h3>
              
              {pushSupported ? (
                <>
                  <button
                    onClick={handlePushToggle}
                    disabled={pushLoading || pushPermission === 'denied'}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      pushSubscribed 
                        ? 'bg-green-600/20 border border-green-500/30' 
                        : pushPermission === 'denied'
                          ? 'bg-red-900/20 border border-red-500/30'
                          : 'bg-slate-700/50 border border-slate-600/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {pushLoading ? (
                        <Loader size={20} className="text-cyan-400 animate-spin" />
                      ) : pushSubscribed ? (
                        <Bell size={20} className="text-green-400" />
                      ) : (
                        <BellOff size={20} className={pushPermission === 'denied' ? 'text-red-400' : 'text-slate-500'} />
                      )}
                      <div className="text-left">
                        <span className={pushSubscribed ? 'text-white' : pushPermission === 'denied' ? 'text-red-300' : 'text-slate-400'}>
                          Push Notifications
                        </span>
                        <p className="text-xs text-slate-500">
                          {pushSubscribed 
                            ? 'Enabled - even when app is closed' 
                            : pushPermission === 'denied'
                              ? 'Blocked - enable in browser settings'
                              : 'Get notified when it\'s your turn'}
                        </p>
                      </div>
                    </div>
                    {!pushLoading && pushPermission !== 'denied' && (
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${pushSubscribed ? 'bg-green-500' : 'bg-slate-600'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${pushSubscribed ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    )}
                    {pushPermission === 'denied' && (
                      <span className="text-xs text-red-400">Blocked</span>
                    )}
                  </button>
                  
                  {pushError && (
                    <p className="text-xs text-red-400 px-3">{pushError}</p>
                  )}
                </>
              ) : (
                // Fallback to basic browser notifications
                <button
                  onClick={handleNotificationToggle}
                  disabled={requestingNotifications || notificationPermission === 'denied'}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    notificationsEnabled 
                      ? 'bg-green-600/20 border border-green-500/30' 
                      : notificationPermission === 'denied'
                        ? 'bg-red-900/20 border border-red-500/30'
                        : 'bg-slate-700/50 border border-slate-600/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {requestingNotifications ? (
                      <Loader size={20} className="text-cyan-400 animate-spin" />
                    ) : notificationsEnabled ? (
                      <Bell size={20} className="text-green-400" />
                    ) : (
                      <BellOff size={20} className={notificationPermission === 'denied' ? 'text-red-400' : 'text-slate-500'} />
                    )}
                    <div className="text-left">
                      <span className={notificationsEnabled ? 'text-white' : 'text-slate-400'}>
                        Browser Notifications
                      </span>
                      <p className="text-xs text-slate-500">
                        {notificationsEnabled 
                          ? 'Enabled (when tab is open)' 
                          : notificationPermission === 'denied'
                            ? 'Blocked - enable in browser settings'
                            : 'Works when browser is open'}
                      </p>
                    </div>
                  </div>
                  {notificationPermission !== 'denied' && (
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${notificationsEnabled ? 'bg-green-500' : 'bg-slate-600'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  )}
                </button>
              )}
            </div>
          )}
          
          {/* App Installation Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">App Installation</h3>
            
            {isInstalled ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-600/20 border border-green-500/30">
                <Check size={20} className="text-green-400" />
                <div>
                  <span className="text-white">App Installed</span>
                  <p className="text-xs text-green-400/80">Running as standalone app</p>
                </div>
              </div>
            ) : isIOS ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowIOSInstructions(!showIOSInstructions)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/50 border border-slate-600/30 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone size={20} className="text-slate-400" />
                    <span className="text-slate-300">Install App</span>
                  </div>
                  <span className="text-xs text-slate-500">iOS</span>
                </button>
                
                {showIOSInstructions && (
                  <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30 text-sm space-y-2">
                    <p className="text-blue-300 font-medium">To install on iOS:</p>
                    <ol className="text-blue-200/80 space-y-1 list-decimal list-inside text-xs">
                      <li>Tap the Share button <span className="inline-block w-4 h-4 bg-blue-400/30 rounded text-center text-xs">↑</span></li>
                      <li>Scroll down and tap "Add to Home Screen"</li>
                      <li>Tap "Add" to confirm</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-600/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Download size={20} className="text-cyan-400" />
                  <div className="text-left">
                    <span className="text-white">Install App</span>
                    <p className="text-xs text-cyan-400/80">Add to home screen</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600/30">
                <Smartphone size={20} className="text-slate-500" />
                <div>
                  <span className="text-slate-400">App Installation</span>
                  <p className="text-xs text-slate-500">Not available in this browser</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Account Section */}
          {isAuthenticated && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Account</h3>
              
              {/* Show account email */}
              <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={16} className="text-slate-500" />
                  <span className="text-slate-400 truncate">{user?.email}</span>
                </div>
                {isGoogleUser && (
                  <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                    <ExternalLink size={12} />
                    Signed in with Google
                  </div>
                )}
              </div>
              
              {/* Password Reset - Only show for non-Google users or if in recovery mode */}
              {(!isGoogleUser || isPasswordRecovery) && !showPasswordReset && !showSendResetEmail && (
                <button
                  onClick={() => setShowSendResetEmail(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600/30 hover:bg-slate-700 transition-colors text-left"
                >
                  <Key size={20} className="text-slate-400" />
                  <div>
                    <span className="text-slate-300">Change Password</span>
                    <p className="text-xs text-slate-500">Send password reset email</p>
                  </div>
                </button>
              )}
              
              {/* Password Reset Form (for recovery mode) */}
              {showPasswordReset && (
                <div className="space-y-3 p-3 rounded-lg bg-amber-900/20 border border-amber-500/30">
                  <h4 className="text-amber-300 font-bold flex items-center gap-2">
                    <Key size={16} />
                    Set New Password
                  </h4>
                  
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                    />
                  </div>
                  
                  {passwordError && (
                    <p className="text-red-400 text-xs">{passwordError}</p>
                  )}
                  
                  {passwordSuccess && (
                    <p className="text-green-400 text-xs flex items-center gap-1">
                      <Check size={14} /> {passwordSuccess}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdatePassword}
                      disabled={updatingPassword}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                      {updatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordReset(false);
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordError('');
                      }}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Send Reset Email Form */}
              {showSendResetEmail && !showPasswordReset && (
                <div className="space-y-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600/30">
                  {!resetEmailSent ? (
                    <>
                      <p className="text-sm text-slate-300">
                        Send a password reset link to <span className="text-cyan-400">{user?.email}</span>?
                      </p>
                      
                      {resetEmailError && (
                        <p className="text-red-400 text-xs">{resetEmailError}</p>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={handleSendResetEmail}
                          disabled={sendingResetEmail}
                          className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                        >
                          {sendingResetEmail ? 'Sending...' : 'Send Reset Email'}
                        </button>
                        <button
                          onClick={() => setShowSendResetEmail(false)}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <Check size={24} className="text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-bold">Reset Email Sent!</p>
                      <p className="text-sm text-slate-400 mt-1">Check your inbox for the reset link</p>
                      <button
                        onClick={() => {
                          setShowSendResetEmail(false);
                          setResetEmailSent(false);
                        }}
                        className="mt-3 text-cyan-400 text-sm hover:text-cyan-300"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Sign Out */}
              {!showSignOutConfirm ? (
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600/30 hover:bg-red-900/30 hover:border-red-500/30 transition-colors text-left group"
                >
                  <LogOut size={20} className="text-slate-400 group-hover:text-red-400" />
                  <span className="text-slate-300 group-hover:text-red-300">Sign Out</span>
                </button>
              ) : (
                <div className="space-y-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                  <p className="text-red-300 text-sm">Are you sure you want to sign out?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                      {signingOut ? 'Signing out...' : 'Sign Out'}
                    </button>
                    <button
                      onClick={() => setShowSignOutConfirm(false)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
