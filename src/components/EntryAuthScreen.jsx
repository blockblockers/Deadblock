// Entry Authentication Screen - First screen after app load
// UPDATED: Fixed privacy/terms links to use correct file paths
// Offers: Google Sign In, Email/Password, or Offline Mode
import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, UserPlus2, LogIn, KeyRound, Wand2, Key, ArrowRight, CheckCircle, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const EntryAuthScreen = ({ onComplete, onOfflineMode, forceOnlineOnly = false, intendedDestination = 'online-menu' }) => {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink, resetPassword } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  
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
  
  // Modes: select, login, signup, forgot-password, magic-link
  const [mode, setMode] = useState('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchMode = (newMode) => {
    soundManager.playClickSound('select');
    setMode(newMode);
    clearMessages();
  };

  // Handle email/password sign in
  const handleSignIn = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    soundManager.playButtonClick();

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        onComplete?.();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setLoading(false);
  };

  // Handle sign up
  const handleSignUp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    soundManager.playButtonClick();

    try {
      // Validations
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
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const { error, needsEmailConfirmation } = await signUp(email, password, username);
      if (error) {
        setError(error.message);
      } else if (needsEmailConfirmation) {
        setSuccess('Account created! Check your email to confirm, then sign in.');
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
    soundManager.playButtonClick();

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
    soundManager.playButtonClick();

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
    soundManager.playButtonClick();
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
      
      // Loading will stay true until redirect happens or timeout triggers
    } catch (err) {
      console.error('[EntryAuthScreen] Google Sign In exception:', err);
      setError('Failed to start Google Sign In. Please try again.');
      setLoading(false);
    }
  };

  const handleOfflineMode = () => {
    soundManager.playButtonClick();
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
    minHeight: '100dvh', // Dynamic viewport height for iOS
  } : {};

  // Selection screen - choose auth method
  const renderSelectMode = () => (
    <div className="space-y-3">
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
            <>
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Connecting to Google...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Email Sign In */}
        <button
          onClick={() => switchMode('login')}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.3)] active:scale-[0.98]"
        >
          <Mail size={18} />
          Sign In with Email
        </button>

        {/* Create Account */}
        <button
          onClick={() => switchMode('signup')}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] active:scale-[0.98]"
        >
          <UserPlus2 size={18} />
          Create Account
        </button>
      </div>

      {/* Benefits of signing in */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
        <div className="flex items-center gap-2 mb-2">
          <Wifi size={14} className="text-cyan-400" />
          <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Online Features</span>
        </div>
        <ul className="space-y-1 text-slate-300 text-sm">
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400" />
            Challenge players worldwide
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400" />
            Track your stats & achievements
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400" />
            Weekly puzzles & leaderboards
          </li>
        </ul>
      </div>

      {/* Offline Mode Option - only if not forced online */}
      {!forceOnlineOnly && (
        <button
          onClick={handleOfflineMode}
          className="w-full py-2.5 text-slate-400 hover:text-slate-300 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <WifiOff size={16} />
          Continue Offline
        </button>
      )}
      
      {/* Force online message */}
      {forceOnlineOnly && (
        <div className="text-center">
          <p className="text-amber-400 text-sm">
            Sign in required for {getDestinationName()}
          </p>
          <button
            onClick={handleOfflineMode}
            className="mt-2 text-slate-500 hover:text-slate-400 text-xs flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowLeft size={12} />
            Back to Menu
          </button>
        </div>
      )}
    </div>
  );

  // Login form
  const renderLoginForm = () => (
    <div className="space-y-3">
      {/* Back button */}
      <button
        onClick={() => switchMode('select')}
        className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors text-sm mb-2"
      >
        <ArrowLeft size={16} />
        Back
      </button>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSignIn} className="space-y-3">
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound size={14} className="text-cyan-400" />
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Sign In</span>
          </div>
          
          {/* Email */}
          <div className="relative mb-3">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
              required
            />
          </div>
          
          {/* Password */}
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
              required
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
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <LogIn size={16} />
              Sign In
            </span>
          )}
        </button>
      </form>

      {/* Forgot Password / Magic Link */}
      <div className="flex justify-center gap-4 text-xs">
        <button
          onClick={() => switchMode('forgot-password')}
          className="text-slate-400 hover:text-cyan-400 transition-colors"
        >
          Forgot Password?
        </button>
        <span className="text-slate-600">|</span>
        <button
          onClick={() => switchMode('magic-link')}
          className="text-slate-400 hover:text-purple-400 transition-colors"
        >
          Use Magic Link
        </button>
      </div>
    </div>
  );

  // Signup form
  const renderSignupForm = () => (
    <div className="space-y-3">
      {/* Back button */}
      <button
        onClick={() => switchMode('select')}
        className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors text-sm mb-2"
      >
        <ArrowLeft size={16} />
        Back
      </button>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-3">
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus2 size={14} className="text-purple-400" />
            <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">Create Account</span>
          </div>
          
          {/* Username */}
          <div className="relative mb-3">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              maxLength={20}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>
          
          {/* Email */}
          <div className="relative mb-3">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>
          
          {/* Password */}
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
              required
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
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating account...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <UserPlus2 size={16} />
              Create Account
            </span>
          )}
        </button>

        <p className="text-slate-500 text-xs text-center">
          By signing up, you agree to our{' '}
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
            Privacy Policy
          </a>
        </p>
      </form>
    </div>
  );

  // Forgot password form
  const renderForgotPasswordForm = () => (
    <div className="space-y-3">
      {/* Back button */}
      <button
        onClick={() => switchMode('login')}
        className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors text-sm mb-2"
      >
        <ArrowLeft size={16} />
        Back to Sign In
      </button>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-3">
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} className="text-amber-400" />
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Reset Password</span>
          </div>
          
          <p className="text-slate-400 text-sm mb-3">
            Enter your email and we'll send you a link to reset your password.
          </p>
          
          {/* Email */}
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Key size={16} />
              Send Reset Link
            </span>
          )}
        </button>

        <p className="text-slate-500 text-xs text-center mt-2">
          📧 Don't forget to check your junk/spam folder!
        </p>
      </form>
    </div>
  );

  // Magic link form
  const renderMagicLinkForm = () => (
    <div className="space-y-3">
      {/* Back button */}
      <button
        onClick={() => switchMode('login')}
        className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors text-sm mb-2"
      >
        <ArrowLeft size={16} />
        Back to Sign In
      </button>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleMagicLink} className="space-y-3">
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 size={14} className="text-violet-400" />
            <span className="text-violet-400 text-xs font-bold uppercase tracking-wider">Magic Link</span>
          </div>
          
          <p className="text-slate-400 text-sm mb-3">
            No password needed! We'll email you a secure link to sign in.
          </p>
          
          {/* Email */}
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Wand2 size={16} />
              Send Magic Link
            </span>
          )}
        </button>

        <p className="text-slate-500 text-xs text-center mt-2">
          📧 Don't forget to check your junk/spam folder!
        </p>
      </form>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-slate-950 flex flex-col"
      style={scrollStyles}
    >
      {/* Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow effects */}
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-5">
            <NeonTitle size="large" />
            <div className="entry-subtitle font-black tracking-[0.15em] text-sm mt-2">
              STRATEGIC PUZZLE GAME
            </div>
          </div>

          {/* Render based on mode */}
          {mode === 'select' && renderSelectMode()}
          {mode === 'login' && renderLoginForm()}
          {mode === 'signup' && renderSignupForm()}
          {mode === 'forgot-password' && renderForgotPasswordForm()}
          {mode === 'magic-link' && renderMagicLinkForm()}
          
          {/* Bottom safe area spacer */}
          {needsScroll && <div className="h-8 flex-shrink-0" />}
        </div>
      </div>
      
      {/* Footer - FIXED: Updated links to correct paths */}
      <div className="relative text-center pb-4 pt-2">
        <p className="text-slate-600 text-xs mb-2">
          © 2024 Deadblock
        </p>
        <div className="flex items-center justify-center gap-3 text-xs">
          <a 
            href="/privacy.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-cyan-400 transition-colors underline underline-offset-2"
          >
            Privacy Policy
          </a>
          <span className="text-slate-700">•</span>
          <a 
            href="/terms.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-cyan-400 transition-colors underline underline-offset-2"
          >
            Terms of Service
          </a>
        </div>
      </div>
      
      {/* Subtitle styling to match other screens */}
      <style>{`
        .entry-subtitle {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default EntryAuthScreen;
