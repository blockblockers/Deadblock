// SettingsModal.jsx - Enhanced with TRUE Push Notifications support
// v7.21: Sign-out notification prompt — when push is subscribed, asks user to keep or
//        turn off notifications before signing out. Preserves subscription by default.
// v7.20: Push notifications preserved across sign-out (removed unsubscribe from sign-out flow);
//        moved Delete Account below Sign Out button
// v7.19: Added volume sliders for Sound Effects and Background Music; safe-area-inset-top
//        padding on modal wrapper for iPhone notch clearance
// v7.18: iOS scroll fix — removed WebkitOverflowScrolling, touchAction, changed overscrollBehavior to none
// v7.17: overflow-y-scroll (was auto) — scroll always active on iOS regardless of content height
// v7.15: Purple glow orb Change Password, orange glow orb Sign Out (matched Delete Account pattern)
// UPDATED: Added push notification subscription management
// v7.10: Added iOS scroll fixes for modal content
// v7.11: Added granular notification preferences
// Place in src/components/SettingsModal.jsx

import { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Vibrate, RotateCcw, LogOut, AlertTriangle, Music, Key, Lock, Eye, EyeOff, Check, Loader, Mail, Trash2, Bell, BellOff, Download, Smartphone, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { useAuth } from '../contexts/AuthContext';
import { pushNotificationService } from '../services/pushNotificationService';
import { supabase } from '../utils/supabase';

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
  // v7.19: Volume controls (stored as 0-100 for slider, converted to 0-1 when calling soundManager)
  const [soundVolume, setSoundVolume] = useState(() => Math.round((soundManager.soundVolume ?? 0.5) * 100));
  const [musicVolume, setMusicVolume] = useState(() => Math.round((soundManager.musicVolume ?? 0.3) * 100));
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
  
  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [resetEmailError, setResetEmailError] = useState('');

  // v7.11: Granular notification preferences
  // v7.15.2: Added streakReminder for daily play streak notifications
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('deadblock_notification_prefs');
      return saved ? JSON.parse(saved) : {
        yourTurn: true,
        gameInvites: true,
        friendRequests: true,
        rematchRequests: true,
        chatMessages: true,
        gameStart: true,
        weeklyChallenge: true,
        streakReminder: true
      };
    } catch {
      return {
        yourTurn: true,
        gameInvites: true,
        friendRequests: true,
        rematchRequests: true,
        chatMessages: true,
        gameStart: true,
        weeklyChallenge: true,
        streakReminder: true
      };
    }
  });
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);

  // Check if user is using Google OAuth (no password auth)
  const isGoogleUser = user?.app_metadata?.provider === 'google' || 
                       user?.identities?.some(i => i.provider === 'google');
  
  // Initialize push notifications and other states
  useEffect(() => {
    const initPushNotifications = async () => {
      // v7.14: Fixed initialization to properly detect subscription state
      
      // First check if push is even supported
      if (!pushNotificationService.isSupported()) {
        console.log('[SettingsModal] Push notifications not supported');
        setPushSupported(false);
        return;
      }
      
      setPushSupported(true);
      
      // Initialize the service (this fetches existing subscription)
      const initialized = await pushNotificationService.initialize();
      console.log('[SettingsModal] Push service initialized:', initialized);
      
      if (initialized) {
        // Get permission status
        setPushPermission(pushNotificationService.getPermissionStatus());
        
        // CRITICAL FIX: Check subscription directly from push manager
        // This ensures we get the true state, not stale internal state
        try {
          const registration = await navigator.serviceWorker.ready;
          const currentSubscription = await registration.pushManager.getSubscription();
          const isSubscribed = currentSubscription !== null;
          console.log('[SettingsModal] Push subscription state:', isSubscribed, currentSubscription?.endpoint?.slice(-20));
          setPushSubscribed(isSubscribed);
        } catch (err) {
          console.error('[SettingsModal] Error checking subscription:', err);
          // Fallback to service's internal state
          setPushSubscribed(pushNotificationService.isSubscribed());
        }
      } else {
        console.warn('[SettingsModal] Push initialization failed');
        setPushPermission(pushNotificationService.getPermissionStatus());
        setPushSubscribed(false);
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
    if (!pushSupported || !user?.id) {
      console.log('[SettingsModal] Toggle blocked:', { pushSupported, userId: user?.id });
      return;
    }
    
    setPushLoading(true);
    setPushError(null);
    
    try {
      if (pushSubscribed) {
        // Unsubscribe
        console.log('[SettingsModal] Attempting to unsubscribe...');
        const result = await pushNotificationService.unsubscribe(user.id);
        console.log('[SettingsModal] Unsubscribe result:', result);
        
        if (result.success) {
          setPushSubscribed(false);
          soundManager.playClickSound?.('click');
        } else {
          console.error('[SettingsModal] Unsubscribe failed:', result.reason);
          setPushError('Failed to disable notifications: ' + (result.reason || 'Unknown error'));
        }
      } else {
        // Subscribe
        console.log('[SettingsModal] Attempting to subscribe...');
        const result = await pushNotificationService.subscribe(user.id);
        console.log('[SettingsModal] Subscribe result:', result);
        
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
            setPushError('Failed to enable notifications: ' + (result.reason || 'Please try again.'));
          }
        }
      }
    } catch (error) {
      console.error('[SettingsModal] Push toggle error:', error);
      setPushError('An error occurred: ' + error.message);
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

  // v7.11: Toggle individual notification preference
  const toggleNotificationPref = (key) => {
    const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(newPrefs);
    localStorage.setItem('deadblock_notification_prefs', JSON.stringify(newPrefs));
    soundManager.playClickSound?.('click');
  };

  // v7.11: Enable all notifications
  // v7.15.2: Added streakReminder
  const enableAllNotifications = () => {
    const allEnabled = {
      yourTurn: true,
      gameInvites: true,
      friendRequests: true,
      rematchRequests: true,
      chatMessages: true,
      gameStart: true,
      weeklyChallenge: true,
      streakReminder: true
    };
    setNotificationPrefs(allEnabled);
    localStorage.setItem('deadblock_notification_prefs', JSON.stringify(allEnabled));
    soundManager.playClickSound?.('success');
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
  
  // v7.19: Volume change handlers — convert slider 0-100 to soundManager's 0-1 range
  const handleSoundVolumeChange = (e) => {
    const vol = parseInt(e.target.value);
    setSoundVolume(vol);
    soundManager.setSoundVolume(vol / 100);
  };
  
  const handleMusicVolumeChange = (e) => {
    const vol = parseInt(e.target.value);
    setMusicVolume(vol);
    soundManager.setMusicVolume(vol / 100);
  };
  
  // Handle sign out — v7.21: accepts keepNotifications flag from confirmation UI
  const handleSignOut = async (keepNotifications = true) => {
    setSigningOut(true);
    try {
      // v7.21: Only unsubscribe if user explicitly chose to turn off notifications
      if (!keepNotifications && pushSubscribed && user?.id) {
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
  
  // Handle account deletion (user is already logged in)
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setDeletingAccount(true);
    setDeleteError('');
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setDeleteError('No user session found.');
        setDeletingAccount(false);
        return;
      }
      
      let deleted = false;
      
      // Try Edge Function first
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const session = await supabase.auth.getSession();
        const accessToken = session.data?.session?.access_token;
        
        if (accessToken && supabaseUrl) {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/delete-user-account`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (response.ok) {
            const result = await response.json();
            if (result.success) deleted = true;
          }
        }
      } catch (e) {
        console.warn('[Settings] Edge function delete failed:', e);
      }
      
      // Fallback to RPC
      if (!deleted) {
        const { error: rpcError } = await supabase.rpc('delete_user_account', {
          p_user_id: currentUser.id
        });
        if (rpcError) {
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', currentUser.id);
          if (profileError) {
            setDeleteError('Failed to delete. Contact deadblock.game@gmail.com');
            setDeletingAccount(false);
            return;
          }
        }
      }
      
      await supabase.auth.signOut();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('deadblock_') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      setDeleteSuccess(true);
      setTimeout(() => { window.location.href = '/'; }, 2000);
    } catch (err) {
      console.error('[Settings] Delete error:', err);
      setDeleteError('Failed to delete. Contact deadblock.game@gmail.com');
      setDeletingAccount(false);
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
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      style={{
        padding: '1rem',
        paddingTop: 'max(1.5rem, calc(env(safe-area-inset-top) + 12px))',
        paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 12px))',
      }}
    >
      <div 
        className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl w-full max-w-sm overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.2)] flex flex-col"
        style={{ maxHeight: '100%' }}
      >
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
        
        {/* Scrollable Content - v7.18: Stripped iOS-conflicting inline styles */}
        <div 
          className="flex-1 overflow-y-scroll p-4 space-y-4"
          style={{ overscrollBehavior: 'none' }}
        >
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
            
            {/* v7.19: Sound Effects volume slider — only shown when sound is enabled */}
            {soundEnabled && (
              <div className="pl-3 pr-1 -mt-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-12 flex-shrink-0">Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={soundVolume}
                    onChange={handleSoundVolumeChange}
                    className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-xs text-cyan-300 font-medium w-9 text-right tabular-nums">{soundVolume}%</span>
                </div>
              </div>
            )}
            
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
            
            {/* v7.19: Background Music volume slider — only shown when music is enabled */}
            {musicEnabled && (
              <div className="pl-3 pr-1 -mt-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-12 flex-shrink-0">Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={handleMusicVolumeChange}
                    className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-xs text-cyan-300 font-medium w-9 text-right tabular-nums">{musicVolume}%</span>
                </div>
              </div>
            )}
            
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
                  
                  {/* v7.11: Granular Notification Settings */}
                  {pushSubscribed && (
                    <div className="space-y-1 mt-2">
                      <button
                        onClick={() => setShowNotificationPrefs(!showNotificationPrefs)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700/30 rounded-lg transition-all"
                      >
                        <span className="text-xs text-slate-400 uppercase tracking-wide">Notification Types</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); enableAllNotifications(); }}
                            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            Enable All
                          </button>
                          {showNotificationPrefs ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                        </div>
                      </button>
                      
                      {showNotificationPrefs && (
                        <div className="space-y-1 pl-2">
                          {/* Your Turn */}
                          <button
                            onClick={() => toggleNotificationPref('yourTurn')}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">🎮</span>
                              <span className={notificationPrefs.yourTurn ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm'}>Your Turn</span>
                            </div>
                            <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${notificationPrefs.yourTurn ? 'bg-green-500' : 'bg-slate-600'}`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationPrefs.yourTurn ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                          </button>
                          
                          {/* Game Invites */}
                          <button
                            onClick={() => toggleNotificationPref('gameInvites')}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">📩</span>
                              <span className={notificationPrefs.gameInvites ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm'}>Game Invites</span>
                            </div>
                            <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${notificationPrefs.gameInvites ? 'bg-green-500' : 'bg-slate-600'}`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationPrefs.gameInvites ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                          </button>
                          
                          {/* Friend Requests */}
                          <button
                            onClick={() => toggleNotificationPref('friendRequests')}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">👥</span>
                              <span className={notificationPrefs.friendRequests ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm'}>Friend Requests</span>
                            </div>
                            <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${notificationPrefs.friendRequests ? 'bg-green-500' : 'bg-slate-600'}`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationPrefs.friendRequests ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                          </button>
                          
                          {/* Rematch Requests */}
                          <button
                            onClick={() => toggleNotificationPref('rematchRequests')}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">🔄</span>
                              <span className={notificationPrefs.rematchRequests ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm'}>Rematch Requests</span>
                            </div>
                            <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${notificationPrefs.rematchRequests ? 'bg-green-500' : 'bg-slate-600'}`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationPrefs.rematchRequests ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                          </button>
                          
                          {/* Chat Messages */}
                          <button
                            onClick={() => toggleNotificationPref('chatMessages')}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">💬</span>
                              <span className={notificationPrefs.chatMessages ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm'}>Chat Messages</span>
                            </div>
                            <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${notificationPrefs.chatMessages ? 'bg-green-500' : 'bg-slate-600'}`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationPrefs.chatMessages ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                          </button>
                          
                          {/* Game Start */}
                          <button
                            onClick={() => toggleNotificationPref('gameStart')}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">🚀</span>
                              <span className={notificationPrefs.gameStart ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm'}>Game Started</span>
                            </div>
                            <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${notificationPrefs.gameStart ? 'bg-green-500' : 'bg-slate-600'}`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationPrefs.gameStart ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                          </button>
                          
                          {/* Weekly Challenge */}
                          <button
                            onClick={() => toggleNotificationPref('weeklyChallenge')}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">📅</span>
                              <span className={notificationPrefs.weeklyChallenge ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm'}>Weekly Challenge</span>
                            </div>
                            <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${notificationPrefs.weeklyChallenge ? 'bg-green-500' : 'bg-slate-600'}`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationPrefs.weeklyChallenge ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                          </button>
                          
                          {/* Streak Reminder - v7.15.2 */}
                          <button
                            onClick={() => toggleNotificationPref('streakReminder')}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">🔥</span>
                              <span className={notificationPrefs.streakReminder ? 'text-slate-300 text-sm' : 'text-slate-500 text-sm'}>Streak Reminders</span>
                            </div>
                            <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${notificationPrefs.streakReminder ? 'bg-orange-500' : 'bg-slate-600'}`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationPrefs.streakReminder ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
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
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/60 hover:shadow-[0_0_18px_rgba(168,85,247,0.3)] transition-all group text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-purple-500/50 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Key size={20} className="relative text-purple-400" />
                  </div>
                  <div>
                    <span className="text-purple-300 text-sm font-medium">Change Password</span>
                    <p className="text-xs text-purple-400/50">Send password reset email</p>
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
              
              {/* Sign Out — v7.20: moved above Delete Account */}
              {!showSignOutConfirm ? (
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/60 hover:shadow-[0_0_18px_rgba(249,115,22,0.3)] transition-all group text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-orange-500/50 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    <LogOut size={20} className="relative text-orange-400" />
                  </div>
                  <span className="text-orange-300 text-sm font-medium">Sign Out</span>
                </button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                  <p className="text-red-300 text-sm font-medium">Are you sure you want to sign out?</p>
                  
                  {/* v7.21: Notification preference — only shown when push is subscribed */}
                  {pushSubscribed && (
                    <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
                      <p className="text-slate-300 text-xs mb-2">Keep receiving game notifications on this device?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSignOut(true)}
                          disabled={signingOut}
                          className="flex-1 py-2 bg-green-600/80 hover:bg-green-500 text-white rounded-lg font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {signingOut ? 'Signing out...' : <><Bell size={12} /> Keep & Sign Out</>}
                        </button>
                        <button
                          onClick={() => handleSignOut(false)}
                          disabled={signingOut}
                          className="flex-1 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {signingOut ? 'Signing out...' : <><BellOff size={12} /> Turn Off & Sign Out</>}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Simple sign-out when no push subscription */}
                  {!pushSubscribed && (
                    <button
                      onClick={() => handleSignOut(true)}
                      disabled={signingOut}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                      {signingOut ? 'Signing out...' : 'Sign Out'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowSignOutConfirm(false)}
                    disabled={signingOut}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Delete Account — v7.20: moved below Sign Out */}
              {deleteSuccess ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/30 border border-green-500/30 text-green-400 text-sm">
                  <Check size={16} />
                  Account deleted. Redirecting...
                </div>
              ) : !showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/60 hover:shadow-[0_0_18px_rgba(239,68,68,0.3)] transition-all group text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-red-500/50 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Trash2 size={20} className="relative text-red-400" />
                  </div>
                  <div>
                    <span className="text-red-300 text-sm font-medium">Delete Account</span>
                    <p className="text-xs text-red-400/50">Permanently remove your account</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-red-300 text-sm font-bold">This cannot be undone</span>
                  </div>
                  <p className="text-red-300/70 text-xs">
                    All data will be permanently deleted: profile, games, stats, friends, achievements.
                  </p>
                  {deleteError && (
                    <p className="text-red-400 text-xs">{deleteError}</p>
                  )}
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">
                      Type <span className="text-red-400 font-bold font-mono">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-800/80 rounded-lg text-white text-center font-mono text-sm border border-red-500/30 focus:border-red-500 focus:outline-none"
                      placeholder="Type DELETE"
                      autoComplete="off"
                      disabled={deletingAccount}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError(''); }}
                      disabled={deletingAccount}
                      className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {deletingAccount ? (
                        <><Loader size={14} className="animate-spin" /> Deleting...</>
                      ) : (
                        <><Trash2 size={14} /> Delete</>
                      )}
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
