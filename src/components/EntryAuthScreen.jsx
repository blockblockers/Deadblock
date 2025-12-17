// EntryAuthScreen.jsx - Enhanced with Invite Link Support
// FULL REPLACEMENT FILE
// ============================================

import { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, UserPlus2, LogIn, KeyRound, Wand2, Key, ArrowRight, CheckCircle, ArrowLeft, Wifi, WifiOff, RefreshCw, Swords, Users, Loader, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const EntryAuthScreen = ({ 
  onComplete, 
  onOfflineMode, 
  forceOnlineOnly = false, 
  intendedDestination = 'online-menu',
  // NEW: Invite-related props
  inviteInfo = null,
  inviteLoading = false,
  inviteError = null,
  onCancelInvite = null
}) => {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink, resetPassword, resendConfirmationEmail } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  
  // Check if this is an invite flow
  const isInviteFlow = !!inviteInfo || inviteLoading;
  
  // Get friendly name for the destination
  const getDestinationName = () => {
    if (intendedDestination === 'game-invite' && inviteInfo) {
      return `Game with ${inviteInfo.from_username || 'a friend'}`;
    }
    switch (intendedDestination) {
      case 'weekly-menu':
        return 'Weekly Challenge';
      case 'online-menu':
      default:
        return 'Online Multiplayer';
    }
  };
  
  // Modes: select, login, signup, forgot-password, magic-link
  const [mode, setMode] = useState('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // New states for resend confirmation
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const clearMessages = () => {
    setError('');
    setSuccess('');
    setShowResendOption(false);
  };

  const switchMode = (newMode) => {
    soundManager.playClickSound?.('select');
    setMode(newMode);
    clearMessages();
  };

  // Handle email/password sign in
  const handleSignIn = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    soundManager.playButtonClick?.();

    try {
      const result = await signIn(email, password);
      
      if (result.error) {
        setError(result.error.message);
        
        // Show resend option if login failed due to unverified email
        if (result.needsEmailConfirmation) {
          setShowResendOption(true);
        }
      } else {
        // Success - onComplete will be called, and App.jsx will handle invite acceptance
        onComplete?.();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setLoading(false);
  };

  // Handle email/password sign up
  const handleSignUp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    soundManager.playButtonClick?.();

    // Validation
    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const result = await signUp(email, password, username);
      
      if (result.error) {
        setError(result.error.message);
      } else if (result.needsEmailConfirmation) {
        setSuccess('Account created! Check your email and click the verification link, then come back and sign in.');
      } else {
        // User is auto-logged in (email confirmation disabled)
        setSuccess('Account created! Signing you in...');
        setTimeout(() => {
          onComplete?.();
        }, 1000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setLoading(false);
  };

  // Handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    soundManager.playButtonClick?.();

    try {
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Password reset email sent! Check your inbox (and junk/spam folder).');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setLoading(false);
  };

  // Handle magic link
  const handleMagicLink = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    soundManager.playButtonClick?.();

    try {
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const { error } = await signInWithMagicLink(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Magic link sent! Check your email (and junk/spam folder) to sign in.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    clearMessages();
    soundManager.playButtonClick?.();
    setLoading(true);
    console.log('[EntryAuthScreen] Starting Google Sign In...');
    
    try {
      const { data, error } = await signInWithGoogle();
      console.log('[EntryAuthScreen] Google Sign In result:', { data, error });
      
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      
      // If no error but we're still here after 3 seconds, redirect probably failed
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          console.log('[EntryAuthScreen] Google redirect may have failed');
          setError('Could not redirect to Google. Please try again or use another sign-in method.');
          setLoading(false);
        }
      }, 3000);
      
    } catch (err) {
      console.error('[EntryAuthScreen] Google Sign In exception:', err);
      setError('Failed to start Google Sign In. Please try again.');
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email || resendingEmail) return;
    
    setResendingEmail(true);
    soundManager.playButtonClick?.();
    
    try {
      const { error } = await resendConfirmationEmail(email);
      if (error) {
        setError('Could not resend email: ' + error.message);
      } else {
        setSuccess('Confirmation email sent! Check your inbox (and junk/spam folder).');
        setShowResendOption(false);
      }
    } catch (err) {
      setError('Failed to resend confirmation email');
    }
    
    setResendingEmail(false);
  };

  const handleOfflineMode = () => {
    soundManager.playButtonClick?.();
    onOfflineMode?.();
  };

  const handleCancelInvite = () => {
    soundManager.playButtonClick?.();
    onCancelInvite?.();
  };

  // Scroll styles for mobile/iPad
  const scrollStyles = needsScroll ? {
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y pinch-zoom',
    overscrollBehavior: 'contain',
    height: '100%',
    minHeight: '100dvh',
  } : {};

  // ============================================
  // INVITE INFO BANNER COMPONENT
  // ============================================
  const InviteBanner = () => {
    if (inviteLoading) {
      return (
        <div className="mb-4 p-4 bg-amber-900/30 border border-amber-500/50 rounded-xl">
          <div className="flex items-center gap-3">
            <Loader size={20} className="text-amber-400 animate-spin" />
            <span className="text-amber-300 text-sm">Loading game invite...</span>
          </div>
        </div>
      );
    }
    
    if (inviteError) {
      return (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
          <div className="flex items-center gap-3">
            <XCircle size={20} className="text-red-400" />
            <div className="flex-1">
              <span className="text-red-300 text-sm">{inviteError}</span>
            </div>
            {onCancelInvite && (
              <button
                onClick={handleCancelInvite}
                className="text-red-400 hover:text-red-300 text-xs underline"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      );
    }
    
    if (!inviteInfo) return null;
    
    return (
      <div className="mb-4 p-4 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/50 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Swords size={24} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-amber-300 font-bold text-sm mb-1">
              Game Invitation
            </h3>
            <p className="text-slate-300 text-sm">
              <span className="text-white font-semibold">
                {inviteInfo.from_username || inviteInfo.from_display_name || 'A player'}
              </span>
              {' '}has challenged you to a game of Deadblock!
            </p>
            {inviteInfo.recipient_name && inviteInfo.recipient_name !== 'Friend' && (
              <p className="text-slate-400 text-xs mt-1">
                Invited as: {inviteInfo.recipient_name}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-amber-500/20">
          <p className="text-amber-200/80 text-xs">
            Sign in or create an account to join the game
          </p>
        </div>
        {onCancelInvite && (
          <button
            onClick={handleCancelInvite}
            className="mt-2 text-slate-400 hover:text-slate-300 text-xs underline"
          >
            Cancel and go to main menu
          </button>
        )}
      </div>
    );
  };

  // ============================================
  // SELECTION MODE RENDER
  // ============================================
  const renderSelectMode = () => (
    <div className="space-y-3">
      {/* Invite Banner */}
      <InviteBanner />
      
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {/* Sign In Options */}
      <div className="space-y-2">
        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 bg-white text-gray-800 font-semibold rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          <span>{isInviteFlow ? 'Continue with Google' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-500 text-xs">or</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Email Sign In */}
        <button
          onClick={() => switchMode('login')}
          className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-cyan-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-[0.98]"
        >
          <LogIn size={18} />
          <span>Sign In with Email</span>
        </button>

        {/* Create Account */}
        <button
          onClick={() => switchMode('signup')}
          className="w-full py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-600 active:scale-[0.98]"
        >
          <UserPlus2 size={18} />
          <span>Create Account</span>
        </button>

        {/* Other options */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => switchMode('magic-link')}
            className="flex-1 py-2.5 bg-slate-800/50 text-slate-300 text-sm rounded-lg hover:bg-slate-700/50 transition-all flex items-center justify-center gap-1.5 border border-slate-700/50"
          >
            <Wand2 size={14} />
            <span>Magic Link</span>
          </button>
          <button
            onClick={() => switchMode('forgot-password')}
            className="flex-1 py-2.5 bg-slate-800/50 text-slate-300 text-sm rounded-lg hover:bg-slate-700/50 transition-all flex items-center justify-center gap-1.5 border border-slate-700/50"
          >
            <Key size={14} />
            <span>Forgot Password</span>
          </button>
        </div>
      </div>

      {/* Play Offline Option - Hidden during invite flow */}
      {!forceOnlineOnly && !isInviteFlow && onOfflineMode && (
        <div className="pt-4 border-t border-slate-700/50">
          <button
            onClick={handleOfflineMode}
            className="w-full py-3 bg-slate-900/50 text-slate-400 font-medium rounded-xl hover:bg-slate-800/50 hover:text-slate-300 transition-all flex items-center justify-center gap-2 border border-slate-700/30"
          >
            <WifiOff size={16} />
            <span>Play Offline Instead</span>
          </button>
          <p className="text-slate-600 text-xs text-center mt-2">
            VS AI, local 2-player, and puzzles available offline
          </p>
        </div>
      )}
    </div>
  );

  // ============================================
  // LOGIN MODE RENDER
  // ============================================
  const renderLoginMode = () => (
    <form onSubmit={handleSignIn} className="space-y-4">
      {/* Invite Banner */}
      <InviteBanner />
      
      <button
        type="button"
        onClick={() => switchMode('select')}
        className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors mb-2"
      >
        <ArrowLeft size={14} />
        Back
      </button>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
          {showResendOption && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendingEmail}
              className="mt-2 w-full py-2 bg-red-800/50 hover:bg-red-700/50 rounded text-red-200 text-xs font-medium flex items-center justify-center gap-2"
            >
              {resendingEmail ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Mail size={12} />
              )}
              Resend Confirmation Email
            </button>
          )}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      {/* Email */}
      <div>
        <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 rounded-xl text-white border border-slate-700 focus:border-cyan-500 focus:outline-none transition-colors"
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>
      </div>
      
      {/* Password */}
      <div>
        <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-12 py-3 bg-slate-800 rounded-xl text-white border border-slate-700 focus:border-cyan-500 focus:outline-none transition-colors"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-bold rounded-xl hover:from-cyan-500 hover:to-cyan-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <LogIn size={18} />
            <span>{isInviteFlow ? 'Sign In & Join Game' : 'Sign In'}</span>
          </>
        )}
      </button>
    </form>
  );

  // ============================================
  // SIGNUP MODE RENDER
  // ============================================
  const renderSignupMode = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      {/* Invite Banner */}
      <InviteBanner />
      
      <button
        type="button"
        onClick={() => switchMode('select')}
        className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors mb-2"
      >
        <ArrowLeft size={14} />
        Back
      </button>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      {/* Username */}
      <div>
        <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Username</label>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 rounded-xl text-white border border-slate-700 focus:border-cyan-500 focus:outline-none transition-colors"
            placeholder="Choose a username"
            required
            minLength={3}
            maxLength={20}
            autoComplete="username"
          />
        </div>
        <p className="text-slate-500 text-xs mt-1">3-20 characters, shown to other players</p>
      </div>
      
      {/* Email */}
      <div>
        <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 rounded-xl text-white border border-slate-700 focus:border-cyan-500 focus:outline-none transition-colors"
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>
      </div>
      
      {/* Password */}
      <div>
        <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-12 py-3 bg-slate-800 rounded-xl text-white border border-slate-700 focus:border-cyan-500 focus:outline-none transition-colors"
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold rounded-xl hover:from-green-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <UserPlus2 size={18} />
            <span>{isInviteFlow ? 'Create Account & Join Game' : 'Create Account'}</span>
          </>
        )}
      </button>
    </form>
  );

  // ============================================
  // FORGOT PASSWORD MODE
  // ============================================
  const renderForgotPasswordMode = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <button
        type="button"
        onClick={() => switchMode('select')}
        className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors mb-2"
      >
        <ArrowLeft size={14} />
        Back
      </button>
      
      <div className="text-center mb-4">
        <KeyRound size={32} className="text-amber-400 mx-auto mb-2" />
        <h3 className="text-white font-semibold">Reset Password</h3>
        <p className="text-slate-400 text-sm">Enter your email to receive a reset link</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      <div>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 rounded-xl text-white border border-slate-700 focus:border-cyan-500 focus:outline-none transition-colors"
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading || !!success}
        className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-amber-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Mail size={18} />
            <span>Send Reset Link</span>
          </>
        )}
      </button>
    </form>
  );

  // ============================================
  // MAGIC LINK MODE
  // ============================================
  const renderMagicLinkMode = () => (
    <form onSubmit={handleMagicLink} className="space-y-4">
      {/* Invite Banner */}
      <InviteBanner />
      
      <button
        type="button"
        onClick={() => switchMode('select')}
        className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors mb-2"
      >
        <ArrowLeft size={14} />
        Back
      </button>
      
      <div className="text-center mb-4">
        <Wand2 size={32} className="text-purple-400 mx-auto mb-2" />
        <h3 className="text-white font-semibold">Magic Link</h3>
        <p className="text-slate-400 text-sm">Sign in without a password</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      <div>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 rounded-xl text-white border border-slate-700 focus:border-cyan-500 focus:outline-none transition-colors"
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading || !!success}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold rounded-xl hover:from-purple-500 hover:to-purple-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Wand2 size={18} />
            <span>Send Magic Link</span>
          </>
        )}
      </button>
    </form>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4"
      style={scrollStyles}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        {isInviteFlow && (
          <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
        )}
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-6">
          <NeonTitle size="medium" />
          <p className="text-slate-400 text-sm mt-2">
            {isInviteFlow 
              ? 'Sign in to accept your game invitation'
              : `Sign in to access ${getDestinationName()}`
            }
          </p>
        </div>
        
        {/* Auth Card */}
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
          {mode === 'select' && renderSelectMode()}
          {mode === 'login' && renderLoginMode()}
          {mode === 'signup' && renderSignupMode()}
          {mode === 'forgot-password' && renderForgotPasswordMode()}
          {mode === 'magic-link' && renderMagicLinkMode()}
        </div>
        
        {/* Footer */}
        <p className="text-slate-500 text-xs text-center mt-4">
          By signing in, you agree to our terms of service
        </p>
      </div>
    </div>
  );
};

export default EntryAuthScreen;
