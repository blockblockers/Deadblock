// Authentication Screen - Login/Signup/Reset/Magic Link
import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, UserPlus, LogIn, UserPlus2, Globe, KeyRound, Wand2, Key, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const AuthScreen = ({ onBack, onSuccess, inviteInfo }) => {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink, resetPassword } = useAuth();
  const { needsScroll } = useResponsiveLayout(700);
  
  // Modes: login, signup, forgot-password, magic-link
  const [mode, setMode] = useState('login');
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
        onSuccess?.();
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
        // Email confirmation required - user needs to check email first
        setSuccess('Account created! Check your email to confirm, then sign in.');
      } else {
        // User is auto-logged in (email confirmation disabled)
        setSuccess('Account created! Signing you in...');
        setTimeout(() => {
          onSuccess?.();
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

  const handleBack = () => {
    soundManager.playButtonClick();
    onBack();
  };

  // Scroll styles for mobile
  const scrollStyles = needsScroll ? {
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
  } : {};

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
      <div className="relative flex-1 flex flex-col items-center px-4 py-4">
        <div className="w-full max-w-sm">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Menu</span>
          </button>

          {/* Title */}
          <div className="text-center mb-3">
            <NeonTitle size="xlarge" />
            <div className="online-subtitle font-black tracking-[0.25em] text-sm mt-3">
              ONLINE PLAY
            </div>
          </div>

          {/* Invite Banner */}
          {inviteInfo && (
            <div className="mb-3 p-3 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/50 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.2)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                  <UserPlus size={20} />
                </div>
                <div>
                  <p className="text-amber-300 font-medium text-sm">🎮 You've been invited!</p>
                  <p className="text-amber-100/80 text-xs">
                    <span className="font-bold">{inviteInfo.from_display_name || inviteInfo.from_username}</span> wants to challenge you!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Google Sign In - Primary Option (only for login/signup) */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Globe size={14} className="text-cyan-400" />
                <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">Quick Sign In</span>
              </div>
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 bg-white text-gray-800 font-semibold rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          )}

          {/* Divider (only for login/signup) */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-slate-500 text-xs">OR</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>
          )}

          {/* Main Auth Card */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            
            {/* Section header - changes based on mode */}
            <div className="flex items-center gap-2 mb-3">
              {mode === 'login' && <KeyRound size={14} className="text-cyan-400" />}
              {mode === 'signup' && <UserPlus2 size={14} className="text-purple-400" />}
              {mode === 'forgot-password' && <Key size={14} className="text-amber-400" />}
              {mode === 'magic-link' && <Wand2 size={14} className="text-violet-400" />}
              <span className={`text-xs font-bold uppercase tracking-wider ${
                mode === 'login' ? 'text-cyan-400' :
                mode === 'signup' ? 'text-purple-400' :
                mode === 'forgot-password' ? 'text-amber-400' :
                'text-violet-400'
              }`}>
                {mode === 'login' && 'Email & Password'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot-password' && 'Reset Password'}
                {mode === 'magic-link' && 'Magic Link'}
              </span>
            </div>
            
            {/* Mode Toggle Tabs - Only for login/signup */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="flex mb-3 bg-slate-800/50 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    mode === 'login' 
                      ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <LogIn size={14} />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    mode === 'signup' 
                      ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <UserPlus2 size={14} />
                  Sign Up
                </button>
              </div>
            )}

            {/* Back to Sign In - for reset/magic link modes */}
            {(mode === 'forgot-password' || mode === 'magic-link') && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="flex items-center gap-2 mb-3 text-slate-400 hover:text-cyan-300 text-sm transition-colors"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </button>
            )}
            
            {/* Error/Success messages */}
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

            {/* LOGIN FORM */}
            {mode === 'login' && (
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

                {/* Forgot Password Link */}
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
            )}

            {/* SIGNUP FORM */}
            {mode === 'signup' && (
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
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot-password' && (
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
              </form>
            )}

            {/* MAGIC LINK FORM */}
            {mode === 'magic-link' && (
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
              </form>
            )}

            {/* Alternative sign-in option - Magic Link (only on login) */}
            {mode === 'login' && (
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
            )}
          </div>
          
          {/* Bottom safe area spacer */}
          {needsScroll && <div className="h-8 flex-shrink-0" />}
        </div>
      </div>
      
      {/* Styles */}
      <style>{`
        .online-subtitle {
          color: #fff;
          text-shadow:
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px #22d3ee,
            0 0 40px #22d3ee,
            0 0 60px #a855f7;
          animation: online-pulse 3s ease-in-out infinite;
        }
        @keyframes online-pulse {
          0%, 100% {
            text-shadow:
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 20px #22d3ee,
              0 0 40px #22d3ee,
              0 0 60px #a855f7;
            filter: brightness(1);
          }
          50% {
            text-shadow:
              0 0 5px #fff,
              0 0 15px #fff,
              0 0 30px #22d3ee,
              0 0 50px #22d3ee,
              0 0 70px #a855f7;
            filter: brightness(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default AuthScreen;
