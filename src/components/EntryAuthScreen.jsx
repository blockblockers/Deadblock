// EntryAuthScreen.jsx - Enhanced Entry Screen with Account Management
// v7.15: Added subtle "Delete Account" link for account deletion (App Store/Play Store requirement)
// Features:
// - Clear separation between Google sign-in and local account
// - Benefits of online vs offline clearly shown
// - Improved cyberpunk color scheme
// - Terms/Privacy links and copyright
// - Invite link support
// - Account management (password reset, account deletion)
// ============================================

import { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, UserPlus2, LogIn, KeyRound, Wand2, Key, ArrowRight, CheckCircle, ArrowLeft, Wifi, WifiOff, RefreshCw, Swords, Users, Loader, XCircle, Trophy, Zap, Globe, Shield, Star, ChevronRight, X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import AccountDeletionModal from './AccountDeletionModal';

const EntryAuthScreen = ({ 
  onComplete, 
  onOfflineMode, 
  forceOnlineOnly = false, 
  intendedDestination = 'online-menu',
  // Invite-related props
  inviteInfo = null,
  inviteLoading = false,
  inviteError = null,
  onCancelInvite = null
}) => {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink, resetPassword, resendConfirmationEmail } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  
  // Check if this is an invite flow
  const isInviteFlow = !!inviteInfo || inviteLoading;
  
  // Modes: select, login, signup, forgot-password, magic-link
  const [mode, setMode] = useState('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Resend confirmation states
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  
  // v7.15: Account deletion modal state
  const [showAccountDeletion, setShowAccountDeletion] = useState(false);

  // Get friendly name for the destination
  const getDestinationName = () => {
    switch (intendedDestination) {
      case 'weekly-menu':
        return 'Weekly Challenge';
      case 'online-menu':
      default:
        return 'Online Multiplayer';
    }
  };

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
        if (result.needsEmailConfirmation) {
          setShowResendOption(true);
        }
      } else {
        onComplete?.();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setLoading(false);
  };

  // Handle resend confirmation email
  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setResendingEmail(true);
    setError('');
    
    try {
      const { error } = await resendConfirmationEmail(email);
      
      if (error) {
        setError(error.message || 'Failed to resend confirmation email');
      } else {
        setSuccess('Confirmation email sent! Check your inbox and spam folder, then click the link to verify.');
        setShowResendOption(false);
      }
    } catch (err) {
      setError('Failed to resend confirmation email');
    }
    
    setResendingEmail(false);
  };

  // Handle email/password sign up
  const handleSignUp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    soundManager.playButtonClick?.();

    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }
    if (username.length > 20) {
      setError('Username must be 20 characters or less');
      setLoading(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
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

  const handleOfflineMode = () => {
    soundManager.playButtonClick?.();
    onOfflineMode?.();
  };

  // Scroll styles for mobile/iPad
  const scrollStyles = needsScroll ? {
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y pinch-zoom',
    overscrollBehavior: 'contain',
    height: '100%',
    minHeight: '100vh',
    minHeight: '100dvh',
  } : {};

  // Theme based on invite flow
  const activeTheme = isInviteFlow ? {
    cardBg: 'bg-slate-900/80',
    cardBorder: 'border-amber-500/30',
    cardShadow: 'shadow-[0_0_40px_rgba(251,191,36,0.15)]',
    accent: 'amber',
  } : {
    cardBg: 'bg-slate-900/80',
    cardBorder: 'border-cyan-500/30',
    cardShadow: 'shadow-[0_0_40px_rgba(34,211,238,0.15)]',
    accent: 'cyan',
  };

  // ============================================
  // SELECT MODE - Choose auth method
  // ============================================
  const renderSelectMode = () => (
    <div className="space-y-3">
      {/* Invite Info Banner */}
      {isInviteFlow && (
        <div className="p-3 bg-amber-900/30 border border-amber-500/30 rounded-xl mb-2">
          {inviteLoading ? (
            <div className="flex items-center justify-center gap-2 text-amber-300">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm">Loading invite...</span>
            </div>
          ) : inviteError ? (
            <div className="flex items-center gap-2 text-red-300">
              <XCircle size={16} />
              <span className="text-sm">{inviteError}</span>
            </div>
          ) : inviteInfo ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-amber-300 mb-1">
                <Swords size={16} />
                <span className="font-bold text-sm">Game Invite</span>
              </div>
              <p className="text-amber-200/80 text-xs">
                <span className="font-semibold">{inviteInfo.inviterName}</span> challenged you!
              </p>
            </div>
          ) : null}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm">
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
          <span>Continue with Google</span>
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
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] active:scale-[0.98]"
        >
          <LogIn size={18} />
          <span>Sign in with Email</span>
        </button>

        {/* Create Account */}
        <button
          onClick={() => switchMode('signup')}
          className="w-full py-3 bg-slate-800/80 hover:bg-slate-700/80 text-white font-semibold rounded-xl border border-slate-600 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <UserPlus2 size={18} />
          <span>Create Account</span>
        </button>
      </div>

      {/* Offline Mode Option */}
      {!forceOnlineOnly && (
        <>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">or continue without account</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>
          
          <button
            onClick={handleOfflineMode}
            className="w-full py-2.5 text-slate-400 hover:text-cyan-300 text-sm transition-colors flex items-center justify-center gap-2"
          >
            <WifiOff size={14} />
            <span>Play Offline</span>
          </button>
        </>
      )}
      
      {/* Cancel Invite */}
      {isInviteFlow && onCancelInvite && (
        <button
          onClick={onCancelInvite}
          className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          Cancel and go to main menu
        </button>
      )}
    </div>
  );

  // ============================================
  // LOGIN MODE
  // ============================================
  const renderLoginMode = () => (
    <div className="space-y-4">
      <button
        onClick={() => switchMode('select')}
        className="flex items-center gap-2 text-slate-400 hover:text-green-300 text-sm transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back
      </button>
      
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-400/30">
          <LogIn size={28} className="text-green-400" />
        </div>
        <h3 className="text-white font-bold text-lg">Welcome Back</h3>
        <p className="text-slate-400 text-sm">Sign in to your account</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-xl text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Resend confirmation option */}
      {showResendOption && (
        <div className="p-3 bg-amber-900/30 border border-amber-500/30 rounded-xl">
          <p className="text-amber-200 text-sm mb-2">
            Your email hasn't been verified yet.
          </p>
          <button
            onClick={handleResendConfirmation}
            disabled={resendingEmail}
            className="w-full py-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {resendingEmail ? (
              <><RefreshCw size={14} className="animate-spin" /> Sending...</>
            ) : (
              <><Mail size={14} /> Resend confirmation email</>
            )}
          </button>
        </div>
      )}

      <form onSubmit={handleSignIn} className="space-y-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 focus:outline-none transition-all"
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 focus:outline-none transition-all"
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader size={18} className="animate-spin" /> Signing in...</>
          ) : (
            <><LogIn size={18} /> Sign In</>
          )}
        </button>
      </form>
      
      <div className="flex items-center justify-between text-xs">
        <button 
          onClick={() => switchMode('forgot-password')} 
          className="text-slate-400 hover:text-green-300 transition-colors"
        >
          Forgot password?
        </button>
        <button 
          onClick={() => switchMode('magic-link')} 
          className="text-slate-400 hover:text-purple-300 transition-colors flex items-center gap-1"
        >
          <Wand2 size={12} />
          Magic link
        </button>
      </div>
    </div>
  );

  // ============================================
  // SIGNUP MODE
  // ============================================
  const renderSignupMode = () => (
    <div className="space-y-4">
      <button
        onClick={() => switchMode('select')}
        className="flex items-center gap-2 text-slate-400 hover:text-amber-300 text-sm transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back
      </button>
      
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-400/30">
          <UserPlus2 size={28} className="text-amber-400" />
        </div>
        <h3 className="text-white font-bold text-lg">Create Account</h3>
        <p className="text-slate-400 text-sm">Join the competition</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-xl text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Username</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all"
              placeholder="Choose a username"
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">3-20 characters, letters, numbers, underscores</p>
        </div>
        
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all"
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all"
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
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader size={18} className="animate-spin" /> Creating account...</>
          ) : (
            <><UserPlus2 size={18} /> Create Account</>
          )}
        </button>
      </form>
      
      <p className="text-slate-500 text-xs text-center">
        Already have an account?{' '}
        <button onClick={() => switchMode('login')} className="text-green-400 hover:text-green-300">
          Sign in
        </button>
      </p>
    </div>
  );

  // ============================================
  // FORGOT PASSWORD MODE
  // ============================================
  const renderForgotPasswordMode = () => (
    <div className="space-y-4">
      <button
        onClick={() => switchMode('login')}
        className="flex items-center gap-2 text-slate-400 hover:text-cyan-300 text-sm transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to sign in
      </button>
      
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-cyan-400/30">
          <KeyRound size={28} className="text-cyan-400" />
        </div>
        <h3 className="text-white font-bold text-lg">Reset Password</h3>
        <p className="text-slate-400 text-sm">Enter your email to receive a reset link</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-xl text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-3">
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none transition-all"
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader size={18} className="animate-spin" /> Sending...</>
          ) : (
            <><Mail size={18} /> Send Reset Link</>
          )}
        </button>
      </form>
    </div>
  );

  // ============================================
  // MAGIC LINK MODE
  // ============================================
  const renderMagicLinkMode = () => (
    <div className="space-y-4">
      <button
        onClick={() => switchMode('login')}
        className="flex items-center gap-2 text-slate-400 hover:text-purple-300 text-sm transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to sign in
      </button>
      
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-400/30">
          <Wand2 size={28} className="text-purple-400" />
        </div>
        <h3 className="text-white font-bold text-lg">Magic Link</h3>
        <p className="text-slate-400 text-sm">Sign in without a password</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-xl text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleMagicLink} className="space-y-3">
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 focus:outline-none transition-all"
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader size={18} className="animate-spin" /> Sending...</>
          ) : (
            <><Wand2 size={18} /> Send Magic Link</>
          )}
        </button>
      </form>
      
      <p className="text-slate-500 text-xs text-center">
        📧 The link will expire in 1 hour
      </p>
    </div>
  );

  return (
    <div 
      className="min-h-screen bg-slate-950 flex flex-col"
      style={scrollStyles}
    >
      {/* Grid Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        {/* Title */}
        <div className="mb-6">
          <NeonTitle size="medium" />
        </div>
        
        {/* Subtitle showing intended destination */}
        <p className="text-slate-400 text-sm mb-6 text-center">
          {isInviteFlow 
            ? '🎮 Sign in to accept your game challenge!'
            : <>Sign in to access <span className="text-cyan-400">{getDestinationName()}</span></>
          }
        </p>
        
        {/* Auth Card */}
        <div className={`w-full max-w-sm ${activeTheme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${activeTheme.cardBorder} ${activeTheme.cardShadow}`}>
          {mode === 'select' && renderSelectMode()}
          {mode === 'login' && renderLoginMode()}
          {mode === 'signup' && renderSignupMode()}
          {mode === 'forgot-password' && renderForgotPasswordMode()}
          {mode === 'magic-link' && renderMagicLinkMode()}
        </div>
      </div>

      {/* Footer - v7.15: Added account management link */}
      <div 
        className="relative z-10 text-center pb-5 px-4"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        {/* Subtle account deletion link */}
        <button
          onClick={() => {
            soundManager.playClickSound?.('select');
            setShowAccountDeletion(true);
          }}
          className="text-slate-600 hover:text-red-400/70 text-xs transition-colors mb-2 flex items-center justify-center gap-1 mx-auto"
        >
          <Trash2 size={10} />
          <span>Delete Account</span>
        </button>
        
        <p className="text-slate-600 text-xs">
          © 2025 Deadblock. All rights reserved.
        </p>
      </div>
      
      {/* Account Deletion Modal */}
      {showAccountDeletion && (
        <AccountDeletionModal 
          onClose={() => setShowAccountDeletion(false)} 
        />
      )}
    </div>
  );
};

export default EntryAuthScreen;
