// Authentication Screen - Login/Signup
import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NeonTitle from './NeonTitle';
import { soundManager } from '../utils/soundManager';

const AuthScreen = ({ onBack, onSuccess }) => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login'); // login, signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    soundManager.playButtonClick();

    try {
      if (mode === 'signup') {
        if (!username || username.length < 3) {
          setError('Username must be at least 3 characters');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, username);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Account created! Check your email to confirm.');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          onSuccess?.();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
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

  const toggleMode = () => {
    soundManager.playClickSound('select');
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Grid background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      
      {/* Glow effects */}
      <div className="fixed top-1/4 left-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-400 hover:text-cyan-300 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Menu</span>
          </button>

          {/* Title */}
          <div className="text-center mb-6">
            <NeonTitle size="default" />
            <p className="text-slate-400 text-sm mt-2">
              {mode === 'login' ? 'Sign in to play online' : 'Create your account'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
            
            {/* Error/Success messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-slate-400 text-xs mb-1.5">Username</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                    required
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

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-5">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-slate-500 text-xs">OR</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full py-3 bg-slate-800 border border-slate-700 text-white font-medium rounded-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Toggle mode */}
            <p className="text-center text-slate-400 text-sm mt-5">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={toggleMode}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
