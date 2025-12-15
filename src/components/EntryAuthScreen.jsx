import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle, Loader2, KeyRound, Wand2 } from 'lucide-react';

const EntryAuthScreen = ({ onComplete }) => {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink, resetPassword, loading: authLoading, user } = useAuth();
  
  const [mode, setMode] = useState('welcome'); // 'welcome', 'signin', 'signup', 'magic-link', 'forgot-password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // If user is already authenticated, complete immediately
  useEffect(() => {
    if (user) {
      localStorage.setItem('deadblock_entry_auth_passed', 'true');
      onComplete();
    }
  }, [user, onComplete]);

  const handleGoogleSignIn = async () => {
    soundManager.playButtonClick();
    setError('');
    setLoading(true);
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    soundManager.playButtonClick();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        localStorage.setItem('deadblock_entry_auth_passed', 'true');
        onComplete();
      }
    } catch (err) {
      setError('Failed to sign in');
    }
    setLoading(false);
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    soundManager.playButtonClick();
    setError('');
    setLoading(true);

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error, data } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else if (data?.user?.identities?.length === 0) {
        setError('An account with this email already exists');
      } else {
        setEmailSent(true);
        setMessage('Check your email to confirm your account!');
      }
    } catch (err) {
      setError('Failed to create account');
    }
    setLoading(false);
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    soundManager.playButtonClick();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        setError(error.message);
      } else {
        setEmailSent(true);
        setMessage('Check your email for the magic link!');
      }
    } catch (err) {
      setError('Failed to send magic link');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    soundManager.playButtonClick();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setEmailSent(true);
        setMessage('Check your email for the password reset link!');
      }
    } catch (err) {
      setError('Failed to send reset email');
    }
    setLoading(false);
  };

  const handleSkip = () => {
    soundManager.playButtonClick();
    localStorage.setItem('deadblock_entry_auth_passed', 'true');
    onComplete();
  };

  const switchMode = (newMode) => {
    soundManager.playClickSound('select');
    setMode(newMode);
    setError('');
    setMessage('');
    setEmailSent(false);
  };

  // Common scroll container styles
  const scrollContainerStyle = {
    position: 'fixed',
    inset: 0,
    overflow: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    touchAction: 'pan-y pinch-zoom',
  };

  // Common content wrapper styles
  const contentWrapperStyle = {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    paddingTop: 'max(1rem, env(safe-area-inset-top, 0))',
    paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0))',
  };

  // Footer component
  const Footer = () => (
    <div className="text-center mt-6 pt-4">
      <p className="text-slate-600 text-xs mb-2">© 2024 Deadblock</p>
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
  );

  // Background component
  const Background = ({ variant = 'cyan' }) => (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `linear-gradient(rgba(${variant === 'purple' ? '168,85,247' : '34,211,238'},0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(${variant === 'purple' ? '168,85,247' : '34,211,238'},0.3) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
    </div>
  );

  // Email sent confirmation screen
  if (emailSent) {
    return (
      <div className="full-screen-scroll bg-slate-950" style={scrollContainerStyle}>
        <Background />
        <div style={contentWrapperStyle}>
          <div className="relative z-10 w-full max-w-sm">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-8 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)] text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
              <p className="text-slate-400 mb-6">{message}</p>
              <button
                onClick={() => switchMode('welcome')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors touch-manipulation active:scale-[0.98]"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Welcome screen
  if (mode === 'welcome') {
    return (
      <div className="full-screen-scroll bg-slate-950" style={scrollContainerStyle}>
        <Background />
        <div style={contentWrapperStyle}>
          <div className="relative z-10 w-full max-w-sm">
            <div className="text-center mb-8">
              <NeonTitle className="text-5xl mb-2">DEADBLOCK</NeonTitle>
              <p className="text-cyan-300/70 text-sm tracking-widest">STRATEGIC PUZZLE GAME</p>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 touch-manipulation active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-xs">OR</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => switchMode('signin')}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-300 border border-slate-700 touch-manipulation active:scale-[0.98]"
                >
                  <Mail size={18} />
                  Sign in with Email
                </button>

                <button
                  onClick={() => switchMode('magic-link')}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-300 touch-manipulation active:scale-[0.98]"
                >
                  <Wand2 size={18} />
                  Magic Link (Passwordless)
                </button>
              </div>

              <div className="text-center mt-5">
                <span className="text-slate-500 text-sm">New here? </span>
                <button 
                  onClick={() => switchMode('signup')}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  Create account
                </button>
              </div>
            </div>

            <button
              onClick={handleSkip}
              className="w-full mt-4 py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors flex items-center justify-center gap-2 touch-manipulation"
            >
              Skip for now
              <ArrowRight size={16} />
            </button>

            <Footer />
          </div>
          <div className="h-8" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Sign In Form
  if (mode === 'signin') {
    return (
      <div className="full-screen-scroll bg-slate-950" style={scrollContainerStyle}>
        <Background />
        <div style={contentWrapperStyle}>
          <div className="relative z-10 w-full max-w-sm">
            <div className="text-center mb-6">
              <NeonTitle className="text-4xl mb-2">SIGN IN</NeonTitle>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-3 pl-10 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-3 pl-10 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 touch-manipulation"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg disabled:opacity-50 touch-manipulation active:scale-[0.98]"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
                </button>
              </form>

              <div className="text-center mt-5">
                <span className="text-slate-500 text-sm">Don't have an account? </span>
                <button 
                  onClick={() => switchMode('signup')}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  Sign up
                </button>
              </div>
            </div>

            <button
              onClick={() => switchMode('welcome')}
              className="w-full mt-4 py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors touch-manipulation"
            >
              ← Back
            </button>

            <Footer />
          </div>
          <div className="h-8" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Sign Up Form
  if (mode === 'signup') {
    return (
      <div className="full-screen-scroll bg-slate-950" style={scrollContainerStyle}>
        <Background />
        <div style={contentWrapperStyle}>
          <div className="relative z-10 w-full max-w-sm">
            <div className="text-center mb-6">
              <NeonTitle className="text-4xl mb-2">CREATE ACCOUNT</NeonTitle>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-3 pl-10 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-3 pl-10 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 touch-manipulation"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full py-3 pl-10 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg disabled:opacity-50 touch-manipulation active:scale-[0.98]"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'Create Account'}
                </button>
              </form>

              <div className="text-center mt-5">
                <span className="text-slate-500 text-sm">Already have an account? </span>
                <button 
                  onClick={() => switchMode('signin')}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  Sign in
                </button>
              </div>
            </div>

            <button
              onClick={() => switchMode('welcome')}
              className="w-full mt-4 py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors touch-manipulation"
            >
              ← Back
            </button>

            <Footer />
          </div>
          <div className="h-8" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Magic Link Form
  if (mode === 'magic-link') {
    return (
      <div className="full-screen-scroll bg-slate-950" style={scrollContainerStyle}>
        <Background variant="purple" />
        <div style={contentWrapperStyle}>
          <div className="relative z-10 w-full max-w-sm">
            <div className="text-center mb-6">
              <NeonTitle className="text-4xl mb-2">MAGIC LINK</NeonTitle>
              <p className="text-purple-300/70 text-sm">Sign in without a password</p>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
              <form onSubmit={handleMagicLink} className="space-y-4">
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-3 pl-10 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg disabled:opacity-50 touch-manipulation active:scale-[0.98]"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : (
                    <>
                      <Wand2 size={18} />
                      Send Magic Link
                    </>
                  )}
                </button>
              </form>
            </div>

            <button
              onClick={() => switchMode('welcome')}
              className="w-full mt-4 py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors touch-manipulation"
            >
              ← Back
            </button>

            <Footer />
          </div>
          <div className="h-8" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Forgot Password Form
  if (mode === 'forgot-password') {
    return (
      <div className="full-screen-scroll bg-slate-950" style={scrollContainerStyle}>
        <Background />
        <div style={contentWrapperStyle}>
          <div className="relative z-10 w-full max-w-sm">
            <div className="text-center mb-6">
              <NeonTitle className="text-4xl mb-2">RESET PASSWORD</NeonTitle>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <p className="text-slate-400 text-sm mb-4">
                  Enter your email and we'll send you a link to reset your password.
                </p>

                <div>
                  <label className="block text-slate-400 text-sm mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-3 pl-10 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg disabled:opacity-50 touch-manipulation active:scale-[0.98]"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : (
                    <>
                      <KeyRound size={18} />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-5">
                <button 
                  onClick={() => switchMode('signin')}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            </div>

            <button
              onClick={() => switchMode('welcome')}
              className="w-full mt-4 py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors touch-manipulation"
            >
              ← Back
            </button>

            <Footer />
          </div>
          <div className="h-8" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return null;
};

export default EntryAuthScreen;
