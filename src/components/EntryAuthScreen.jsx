// EntryAuthScreen.jsx - Enhanced Entry Screen with Invite Support
// Features:
// - Clear separation between Google sign-in and local account
// - Benefits of online vs offline clearly shown
// - Improved cyberpunk color scheme
// - Terms/Privacy links and copyright
// - Invite link support
// - In-app policy/terms modal (no white flash)
// ============================================

import { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, UserPlus2, LogIn, KeyRound, Wand2, Key, ArrowRight, CheckCircle, ArrowLeft, Wifi, WifiOff, RefreshCw, Swords, Users, Loader, XCircle, Trophy, Zap, Globe, Shield, Star, ChevronRight, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NeonTitle from './NeonTitle';
import FloatingPiecesBackground from './FloatingPiecesBackground';
import { soundManager } from '../utils/soundManager';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Policy/Terms Modal Component - displays content in-app without navigation
const PolicyModal = ({ type, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [error, setError] = useState(false);
  
  const title = type === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
  const url = type === 'privacy' ? '/privacy.html' : '/terms.html';
  
  // Fetch content on mount
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load');
        const html = await response.text();
        
        // Extract body content from HTML
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          setContent(bodyMatch[1]);
        } else {
          setContent(html);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading policy:', err);
        setError(true);
        setLoading(false);
      }
    };
    fetchContent();
  }, [url]);
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-cyan-500/30 shadow-[0_0_60px_rgba(34,211,238,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
          <h2 className="text-lg font-bold text-cyan-300">{title}</h2>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={18} />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">Unable to load content</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Open in new tab
              </a>
            </div>
          ) : (
            <div 
              className="prose prose-invert prose-sm max-w-none prose-headings:text-cyan-300 prose-p:text-slate-300 prose-a:text-cyan-400 prose-strong:text-white prose-li:text-slate-300"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

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
  
  // Policy modal state: null, 'privacy', or 'terms'
  const [policyModal, setPolicyModal] = useState(null);

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
    
    try {
      const { data, error } = await signInWithGoogle();
      
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          setError('Could not redirect to Google. Please try again or use another sign-in method.');
          setLoading(false);
        }
      }, 3000);
      
    } catch (err) {
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
  // INVITE BANNER COMPONENT
  // ============================================
  const InviteBanner = () => {
    if (inviteLoading) {
      return (
        <div className="mb-4 p-4 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/50 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.2)]">
          <div className="flex items-center gap-3">
            <Loader size={20} className="text-amber-400 animate-spin" />
            <span className="text-amber-300 text-sm font-medium">Loading game invite...</span>
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
      <div className="mb-4 p-4 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/50 rounded-xl shadow-[0_0_25px_rgba(251,191,36,0.25)]">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500/20 rounded-lg border border-amber-400/30">
            <Swords size={24} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-amber-300 font-bold text-sm mb-1 flex items-center gap-2">
              🎮 Game Invitation
            </h3>
            <p className="text-slate-200 text-sm">
              <span className="text-amber-200 font-bold">
                {inviteInfo.from_username || inviteInfo.from_display_name || 'A player'}
              </span>
              {' '}has challenged you to a game!
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-amber-500/20">
          <p className="text-amber-200/80 text-xs">
            ✨ Sign in or create an account to accept the challenge
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
  // BENEFITS INFO COMPONENT
  // ============================================
  const BenefitsInfo = () => (
    <div className="mb-5 grid grid-cols-2 gap-3">
      {/* Online Benefits */}
      <div className="p-3 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <Wifi size={14} className="text-cyan-400" />
          <span className="text-cyan-300 text-xs font-bold uppercase tracking-wider">Online</span>
        </div>
        <ul className="space-y-1.5 text-xs text-slate-300">
          <li className="flex items-center gap-1.5">
            <Trophy size={10} className="text-amber-400" />
            <span>Compete globally</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Star size={10} className="text-purple-400" />
            <span>Track stats & rank</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Users size={10} className="text-green-400" />
            <span>Challenge friends</span>
          </li>
        </ul>
      </div>
      
      {/* Offline Info */}
      <div className="p-3 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-600/30 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <WifiOff size={14} className="text-slate-400" />
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Offline</span>
        </div>
        <ul className="space-y-1.5 text-xs text-slate-400">
          <li className="flex items-center gap-1.5">
            <Zap size={10} className="text-slate-500" />
            <span>Play vs AI</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Shield size={10} className="text-slate-500" />
            <span>No account needed</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Globe size={10} className="text-slate-500" />
            <span>Play anywhere</span>
          </li>
        </ul>
      </div>
    </div>
  );

  // ============================================
  // SELECT MODE - Main entry screen
  // ============================================
  const renderSelectMode = () => {
    // Auth options with themed colors matching puzzle difficulty order (green, orange, purple, red)
    const authOptions = [
      {
        id: 'login',
        name: 'SIGN IN',
        subtitle: 'Existing Account',
        description: 'Access your profile and continue your progress',
        icon: LogIn,
        colors: {
          gradient: 'from-green-600 to-emerald-600',
          glow: 'rgba(34,197,94,0.6)',
          text: 'text-green-300',
          ring: 'ring-green-500/50',
          bg: 'bg-green-900/30',
          border: 'border-green-500/40',
        }
      },
      {
        id: 'signup',
        name: 'CREATE ACCOUNT',
        subtitle: 'New Player',
        description: 'Join and start tracking your stats',
        icon: UserPlus2,
        colors: {
          gradient: 'from-amber-500 to-orange-600',
          glow: 'rgba(251,191,36,0.6)',
          text: 'text-amber-300',
          ring: 'ring-amber-500/50',
          bg: 'bg-amber-900/30',
          border: 'border-amber-500/40',
        }
      },
      {
        id: 'google',
        name: 'GOOGLE',
        subtitle: 'Quick Sign-In',
        description: 'Use your Google account for instant access',
        icon: Globe,
        colors: {
          gradient: 'from-purple-500 to-pink-600',
          glow: 'rgba(168,85,247,0.6)',
          text: 'text-purple-300',
          ring: 'ring-purple-500/50',
          bg: 'bg-purple-900/30',
          border: 'border-purple-500/40',
        }
      }
    ];

    // Add offline option if not forced online and no invite
    if (!forceOnlineOnly && !isInviteFlow) {
      authOptions.push({
        id: 'offline',
        name: 'PLAY OFFLINE',
        subtitle: 'No Account',
        description: 'Jump right in - stats won\'t be saved',
        icon: WifiOff,
        colors: {
          gradient: 'from-red-600 to-rose-600',
          glow: 'rgba(239,68,68,0.5)',
          text: 'text-red-300',
          ring: 'ring-red-500/50',
          bg: 'bg-red-900/30',
          border: 'border-red-500/40',
        }
      });
    }

    const handleOptionClick = (optionId) => {
      soundManager.playButtonClick?.();
      if (optionId === 'login') {
        switchMode('login');
      } else if (optionId === 'signup') {
        switchMode('signup');
      } else if (optionId === 'google') {
        handleGoogleSignIn();
      } else if (optionId === 'offline') {
        handleOfflineMode();
      }
    };

    return (
      <div className="space-y-3">
        {/* Invite Banner */}
        <InviteBanner />
        
        {/* Benefits Info - only show if not in invite flow */}
        {!isInviteFlow && <BenefitsInfo />}
        
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            {error}
          </div>
        )}
        
        {/* Auth Options - Glowing Orb Style */}
        <div className="space-y-2">
          {authOptions.map((option) => {
            const Icon = option.icon;
            const isGoogle = option.id === 'google';
            const isLoading = loading && isGoogle;
            
            // Get gradient colors for hover effect (matching puzzle difficulty order)
            const gradientColors = {
              login: { from: '#16a34a', to: '#059669' },      // green
              signup: { from: '#f59e0b', to: '#ea580c' },     // orange
              google: { from: '#a855f7', to: '#db2777' },     // purple
              offline: { from: '#dc2626', to: '#e11d48' }     // red
            };
            const gradient = gradientColors[option.id];
            
            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                disabled={isLoading}
                className={`w-full p-3 rounded-xl transition-all duration-300 relative overflow-hidden group
                  ${option.colors.bg} ${option.colors.border} border-2
                  hover:border-white/40 hover:ring-4 ${option.colors.ring}
                  active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait`}
                style={{ 
                  boxShadow: `0 0 20px ${option.colors.glow.replace('0.6', '0.2')}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 35px ${option.colors.glow}`;
                  e.currentTarget.style.background = `linear-gradient(to right, ${gradient.from}, ${gradient.to})`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 20px ${option.colors.glow.replace('0.6', '0.2')}`;
                  e.currentTarget.style.background = '';
                }}
              >
                {/* Animated shine effect on hover */}
                <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
                </div>
                
                <div className="relative flex items-center gap-3">
                  {/* Icon Circle with Glow */}
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300
                      bg-gradient-to-br ${option.colors.gradient} group-hover:scale-110`}
                    style={{ boxShadow: `0 0 15px ${option.colors.glow}` }}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isGoogle ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    ) : (
                      <Icon size={20} className="text-white" />
                    )}
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={`font-black tracking-wide text-sm group-hover:text-white transition-colors ${option.colors.text}`}>
                        {option.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 group-hover:bg-white/20 group-hover:text-white transition-colors">
                        {option.subtitle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 group-hover:text-white/80 transition-colors">
                      {option.description}
                    </p>
                  </div>
                  
                  {/* Arrow indicator */}
                  <ChevronRight 
                    size={20} 
                    className={`flex-shrink-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white ${option.colors.text}`} 
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================
  // LOGIN MODE - For existing email accounts
  // ============================================
  const renderLoginMode = () => (
    <div className="space-y-4">
      {/* Invite Banner */}
      <InviteBanner />
      
      <button
        type="button"
        onClick={() => switchMode('select')}
        className="flex items-center gap-2 text-slate-400 hover:text-green-300 text-sm transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to options
      </button>
      
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-400/30">
          <KeyRound size={28} className="text-green-400" />
        </div>
        <h3 className="text-white font-bold text-lg">Sign In</h3>
        <p className="text-slate-400 text-sm">Welcome back! Enter your credentials</p>
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
      
      {/* Resend Confirmation */}
      {showResendOption && (
        <div className="p-3 bg-amber-900/30 border border-amber-500/50 rounded-xl">
          <p className="text-amber-200 text-sm mb-2">Haven't verified your email yet?</p>
          <button
            onClick={handleResendConfirmation}
            disabled={resendingEmail}
            className="text-amber-300 hover:text-amber-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
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
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 rounded-xl transition-all duration-300 relative overflow-hidden group
            bg-green-900/30 border-2 border-green-500/40
            hover:border-white/40 hover:ring-4 ring-green-500/50
            active:scale-[0.98] disabled:opacity-50"
          style={{ 
            boxShadow: '0 0 20px rgba(34,197,94,0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 35px rgba(34,197,94,0.6)';
            e.currentTarget.style.background = 'linear-gradient(to right, #16a34a, #059669)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(34,197,94,0.2)';
            e.currentTarget.style.background = '';
          }}
        >
          {/* Animated shine effect on hover */}
          <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
          </div>
          
          <div className="relative flex items-center justify-center gap-3">
            {/* Icon Circle with Glow */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300
                bg-gradient-to-br from-green-600 to-emerald-600 group-hover:scale-110"
              style={{ boxShadow: '0 0 15px rgba(34,197,94,0.6)' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={20} className="text-white" />
              )}
            </div>
            
            {/* Text Content */}
            <span className="font-black tracking-wide text-sm text-green-300 group-hover:text-white transition-colors">
              SIGN IN
            </span>
            
            {/* Arrow indicator */}
            <ChevronRight 
              size={20} 
              className="flex-shrink-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white text-green-300" 
            />
          </div>
        </button>
      </form>
      
      {/* Account recovery options - only for existing accounts */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={() => switchMode('forgot-password')}
          className="text-slate-400 hover:text-amber-400 text-xs transition-colors flex items-center gap-1"
        >
          <Key size={12} />
          Forgot Password?
        </button>
        <span className="text-slate-600">|</span>
        <button
          onClick={() => switchMode('magic-link')}
          className="text-slate-400 hover:text-purple-400 text-xs transition-colors flex items-center gap-1"
        >
          <Wand2 size={12} />
          Magic Link
        </button>
      </div>
    </div>
  );

  // ============================================
  // SIGNUP MODE - Create new account
  // ============================================
  const renderSignupMode = () => (
    <div className="space-y-4">
      {/* Invite Banner */}
      <InviteBanner />
      
      <button
        type="button"
        onClick={() => switchMode('select')}
        className="flex items-center gap-2 text-slate-400 hover:text-amber-300 text-sm transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to options
      </button>
      
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-400/30">
          <UserPlus2 size={28} className="text-amber-400" />
        </div>
        <h3 className="text-white font-bold text-lg">Create Account</h3>
        <p className="text-slate-400 text-sm">Join Deadblock with email & password</p>
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
              autoComplete="username"
            />
          </div>
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
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 rounded-xl transition-all duration-300 relative overflow-hidden group
            bg-amber-900/30 border-2 border-amber-500/40
            hover:border-white/40 hover:ring-4 ring-amber-500/50
            active:scale-[0.98] disabled:opacity-50"
          style={{ 
            boxShadow: '0 0 20px rgba(251,191,36,0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 35px rgba(251,191,36,0.6)';
            e.currentTarget.style.background = 'linear-gradient(to right, #f59e0b, #ea580c)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(251,191,36,0.2)';
            e.currentTarget.style.background = '';
          }}
        >
          {/* Animated shine effect on hover */}
          <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0 group-hover:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
          </div>
          
          <div className="relative flex items-center justify-center gap-3">
            {/* Icon Circle with Glow */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300
                bg-gradient-to-br from-amber-500 to-orange-600 group-hover:scale-110"
              style={{ boxShadow: '0 0 15px rgba(251,191,36,0.6)' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus2 size={20} className="text-white" />
              )}
            </div>
            
            {/* Text Content */}
            <span className="font-black tracking-wide text-sm text-amber-300 group-hover:text-white transition-colors">
              {isInviteFlow ? 'CREATE & JOIN' : 'CREATE ACCOUNT'}
            </span>
            
            {/* Arrow indicator */}
            <ChevronRight 
              size={20} 
              className="flex-shrink-0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white text-amber-300" 
            />
          </div>
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
        type="button"
        onClick={() => switchMode('login')}
        className="flex items-center gap-2 text-slate-400 hover:text-amber-300 text-sm transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to sign in
      </button>
      
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-400/30">
          <KeyRound size={28} className="text-amber-400" />
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
            className="w-full pl-10 pr-4 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 focus:outline-none transition-all"
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !!success}
          className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.25)] disabled:opacity-50 border border-amber-400/30"
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
    </div>
  );

  // ============================================
  // MAGIC LINK MODE
  // ============================================
  const renderMagicLinkMode = () => (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => switchMode('login')}
        className="flex items-center gap-2 text-slate-400 hover:text-green-300 text-sm transition-colors group"
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
          disabled={loading || !!success}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-violet-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.25)] disabled:opacity-50 border border-purple-400/30"
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
      
      <p className="text-slate-500 text-xs text-center">
        📧 We'll send a link to your email that signs you in instantly
      </p>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  
  // Theme configuration - matching PuzzleSelect style
  const theme = {
    gridColor: 'rgba(34,211,238,0.4)',
    glow1: { color: 'bg-cyan-500/35', pos: 'top-20 left-10' },
    glow2: { color: 'bg-blue-500/30', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-purple-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-cyan-950/40 to-slate-900/95',
    cardBorder: 'border-cyan-500/40',
    cardShadow: 'shadow-[0_0_50px_rgba(34,211,238,0.3),inset_0_0_20px_rgba(34,211,238,0.05)]',
  };
  
  // Invite theme - amber glow when invite is present
  const inviteTheme = isInviteFlow ? {
    gridColor: 'rgba(251,191,36,0.4)',
    glow1: { color: 'bg-amber-500/35', pos: 'top-20 left-10' },
    glow2: { color: 'bg-orange-500/30', pos: 'bottom-32 right-10' },
    glow3: { color: 'bg-yellow-500/20', pos: 'top-1/2 left-1/2' },
    cardBg: 'bg-gradient-to-br from-slate-900/95 via-amber-950/40 to-slate-900/95',
    cardBorder: 'border-amber-500/40',
    cardShadow: 'shadow-[0_0_50px_rgba(251,191,36,0.3),inset_0_0_20px_rgba(251,191,36,0.05)]',
  } : theme;
  
  const activeTheme = isInviteFlow ? inviteTheme : theme;

  return (
    <div 
      className="min-h-screen bg-slate-950 flex flex-col"
      style={scrollStyles}
    >
      {/* Themed Grid Background - matching PuzzleSelect */}
      <div className="fixed inset-0 opacity-40 pointer-events-none transition-all duration-700" style={{
        backgroundImage: `linear-gradient(${activeTheme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${activeTheme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      
      {/* Multiple themed glow orbs - matching PuzzleSelect */}
      <div className={`fixed ${activeTheme.glow1.pos} w-80 h-80 ${activeTheme.glow1.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      <div className={`fixed ${activeTheme.glow2.pos} w-72 h-72 ${activeTheme.glow2.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      <div className={`fixed ${activeTheme.glow3.pos} w-64 h-64 ${activeTheme.glow3.color} rounded-full blur-3xl pointer-events-none transition-all duration-700`} />
      
      {/* Floating Pentomino Pieces Background Animation */}
      <FloatingPiecesBackground count={10} colorPreset="default" />
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        {/* Title - Large size matching PuzzleSelect */}
        <div className="text-center mb-4">
          <NeonTitle size="large" />
        </div>
        
        {/* Subtitle */}
        <p className="text-slate-400 text-sm mb-6 text-center max-w-xs">
          {isInviteFlow 
            ? '🎮 Sign in to accept your game challenge!'
            : 'Strategic pentomino puzzle battles. Challenge the AI, solve puzzles, or compete online!'
          }
        </p>
        
        {/* Auth Card - with dramatic PuzzleSelect-style theme */}
        <div className={`w-full max-w-sm ${activeTheme.cardBg} backdrop-blur-md rounded-2xl p-5 border ${activeTheme.cardBorder} ${activeTheme.cardShadow} transition-all duration-500`}>
          {mode === 'select' && renderSelectMode()}
          {mode === 'login' && renderLoginMode()}
          {mode === 'signup' && renderSignupMode()}
          {mode === 'forgot-password' && renderForgotPasswordMode()}
          {mode === 'magic-link' && renderMagicLinkMode()}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-5 px-4">
        <div className="flex items-center justify-center gap-3 text-xs mb-2">
          <button 
            onClick={() => setPolicyModal('privacy')}
            className="text-slate-500 hover:text-cyan-400 transition-colors underline underline-offset-2"
          >
            Privacy Policy
          </button>
          <span className="text-slate-700">•</span>
          <button 
            onClick={() => setPolicyModal('terms')}
            className="text-slate-500 hover:text-cyan-400 transition-colors underline underline-offset-2"
          >
            Terms of Service
          </button>
        </div>
        <p className="text-slate-600 text-xs">
          © 2025 Deadblock. All rights reserved.
        </p>
      </div>
      
      {/* Policy Modal */}
      {policyModal && (
        <PolicyModal 
          type={policyModal} 
          onClose={() => setPolicyModal(null)} 
        />
      )}
      
      {/* Shine animation for glowing orb buttons */}
      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .group:hover .group-hover\\:animate-shine {
          animation: shine 1.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default EntryAuthScreen;
