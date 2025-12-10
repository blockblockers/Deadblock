// Entry Authentication Screen - First screen after app load
// Offers: Google Sign In, Email/Password, or Offline Mode
import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, UserPlus2, LogIn, Globe, KeyRound, Wand2, Key, ArrowRight, CheckCircle, ArrowLeft, Wifi, WifiOff, Trophy, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const EntryAuthScreen = ({ onComplete, onOfflineMode, forceOnlineOnly = false }) => {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink, resetPassword } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  
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
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
  };

  const handleOfflineMode = () => {
    soundManager.playButtonClick();
    onOfflineMode?.();
  };

  // Scroll styles for mobile
  const scrollStyles = needsScroll ? {
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
  } : {};

  // Selection screen - choose auth method
  const renderSelectMode = () => (
    <div className="space-y-4">
      {/* Sign In Options */}
      <div className="space-y-3">
        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full py-4 bg-white text-gray-800 font-semibold rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Email Sign In */}
        <button
          onClick={() => switchMode('login')}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-[0.98]"
        >
          <Mail size={20} />
          Sign In with Email
        </button>

        {/* Create Account */}
        <button
          onClick={() => switchMode('signup')}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-[0.98]"
        >
          <UserPlus2 size={20} />
          Create Account
        </button>
      </div>

      {/* Benefits of signing in */}
      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Wifi size={16} className="text-cyan-400" />
          <span className="text-cyan-400 text-sm font-bold">SIGN IN BENEFITS</span>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-amber-400" />
            <span>Track your stats & achievements</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-purple-400" />
            <span>Compete on global leaderboards</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-green-400" />
            <span>Play ranked matches online</span>
          </div>
        </div>
      </div>

      {/* Offline Mode Option */}
      {!forceOnlineOnly && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">OR</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <button
            onClick={handleOfflineMode}
            className="w-full py-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 border border-slate-600/50 hover:border-slate-500/50"
          >
            <WifiOff size={18} />
            Continue Offline
          </button>

          <p className="text-center text-slate-500 text-xs">
            Play without an account. Stats won't be saved and online features will be unavailable.
          </p>
        </>
      )}

      {/* Force online message */}
      {forceOnlineOnly && (
        <p className="text-center text-amber-400/80 text-xs mt-2">
          Sign in required for online multiplayer
        </p>
      )}
    </div>
  );

  // Login form
  const renderLoginForm = () => (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 mb-3">
        <KeyRound size={14} className="text-cyan-400" />
        <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Sign In</span>
      </div>
      
      <button
        type="button"
        onClick={() => switchMode('select')}
        className="flex items-center gap-2 mb-3 text-slate-400 hover:text-cyan-300 text-sm transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>
      
      {error && (
        <div className="mb-3 p-2.5 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-2.5 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSignIn} className="space-y-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1">Password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => switchMode('forgot-password')}
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_20px_rgba(34,211,238,0.4)] text-white"
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

      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <button
          type="button"
          onClick={() => switchMode('magic-link')}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-400 hover:text-violet-300 transition-colors group"
        >
          <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />
          Sign in with Magic Link
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );

  // Signup form
  const renderSignupForm = () => (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus2 size={14} className="text-purple-400" />
        <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">Create Account</span>
      </div>
      
      <button
        type="button"
        onClick={() => switchMode('select')}
        className="flex items-center gap-2 mb-3 text-slate-400 hover:text-cyan-300 text-sm transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>
      
      {error && (
        <div className="mb-3 p-2.5 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-2.5 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1">Username</label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1">Password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create password (6+ chars)"
              className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] text-white"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <UserPlus2 size={16} />
              Create Account
            </span>
          )}
        </button>
      </form>
    </div>
  );

  // Forgot password form
  const renderForgotPasswordForm = () => (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 mb-3">
        <Key size={14} className="text-amber-400" />
        <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Reset Password</span>
      </div>
      
      <button
        type="button"
        onClick={() => switchMode('login')}
        className="flex items-center gap-2 mb-3 text-slate-400 hover:text-cyan-300 text-sm transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Sign In
      </button>
      
      {error && (
        <div className="mb-3 p-2.5 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-2.5 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-3">
        <p className="text-slate-400 text-sm mb-3">
          Enter your email and we'll send you a link to reset your password.
        </p>
        
        <div>
          <label className="block text-slate-400 text-xs mb-1">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] text-white"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Mail size={16} />
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
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 mb-3">
        <Wand2 size={14} className="text-violet-400" />
        <span className="text-violet-400 text-xs font-bold uppercase tracking-wider">Magic Link</span>
      </div>
      
      <button
        type="button"
        onClick={() => switchMode('login')}
        className="flex items-center gap-2 mb-3 text-slate-400 hover:text-cyan-300 text-sm transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Sign In
      </button>
      
      {error && (
        <div className="mb-3 p-2.5 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-2.5 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleMagicLink} className="space-y-3">
        <p className="text-slate-400 text-sm mb-3">
          Enter your email and we'll send you a magic link to sign in instantly - no password needed!
        </p>
        
        <div>
          <label className="block text-slate-400 text-xs mb-1">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.4)] text-white"
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
      className="min-h-screen bg-slate-950 flex flex-col"
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
          <div className="text-center mb-6">
            <NeonTitle size="xlarge" />
            <p className="text-slate-400 text-sm mt-3">
              Strategic Pentomino Puzzle Game
            </p>
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
      
      {/* Footer */}
      <div className="relative text-center pb-4">
        <p className="text-slate-600 text-xs">
          © 2024 Deadblock
        </p>
      </div>
    </div>
  );
};

export default EntryAuthScreen;
