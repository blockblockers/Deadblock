// Player Profile Card - Enhanced display for main menu with rating info, username editing, and achievements
// FIXED: Loading state race condition - now shows profile immediately when available
import { useState, useEffect } from 'react';
import { ChevronRight, WifiOff, HelpCircle, Pencil, Trophy, X, Loader, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRankInfo } from '../utils/rankUtils';
import { supabase } from '../utils/supabase';
import TierIcon from './TierIcon';
import Achievements from './Achievements';
import achievementService from '../services/achievementService';

// Rating Info Modal
const RatingInfoModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-sm w-full overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
        {/* Header - Centered */}
        <div className="p-4 border-b border-cyan-500/20">
          <div className="flex items-center justify-center gap-2 relative">
            <Trophy size={20} className="text-cyan-400" />
            <h2 className="text-lg font-bold text-cyan-300">Rating System</h2>
            <button
              onClick={onClose}
              className="absolute right-0 p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-slate-400">
            Your ELO rating changes based on match results. Beat higher-rated players to gain more points!
          </p>
          
          {/* Tier List */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Rating Tiers</h3>
            {[
              { min: 2200, name: 'Grandmaster', shape: 'X', color: 'text-amber-400', glowColor: '#f59e0b', bg: 'bg-amber-500/10 border-amber-500/30' },
              { min: 2000, name: 'Master', shape: 'W', color: 'text-purple-400', glowColor: '#a855f7', bg: 'bg-purple-500/10 border-purple-500/30' },
              { min: 1800, name: 'Expert', shape: 'T', color: 'text-blue-400', glowColor: '#3b82f6', bg: 'bg-blue-500/10 border-blue-500/30' },
              { min: 1600, name: 'Advanced', shape: 'Y', color: 'text-cyan-400', glowColor: '#22d3ee', bg: 'bg-cyan-500/10 border-cyan-500/30' },
              { min: 1400, name: 'Intermediate', shape: 'L', color: 'text-green-400', glowColor: '#22c55e', bg: 'bg-green-500/10 border-green-500/30' },
              { min: 1200, name: 'Beginner', shape: 'I', color: 'text-sky-400', glowColor: '#38bdf8', bg: 'bg-sky-500/10 border-sky-500/30' },
              { min: 0, name: 'Novice', shape: 'O', color: 'text-teal-400', glowColor: '#2dd4bf', bg: 'bg-teal-500/10 border-teal-500/30' },
            ].map((tier) => (
              <div key={tier.name} className={`flex items-center justify-between p-2 rounded-lg border ${tier.bg}`}>
                <div className="flex items-center gap-3">
                  <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="default" />
                  <span className={`font-bold ${tier.color}`}>{tier.name}</span>
                </div>
                <span className="text-xs text-slate-500">{tier.min}+</span>
              </div>
            ))}
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <p className="text-xs text-slate-500">
              New players start at 1000 ELO. Win against stronger opponents for bigger gains, lose against weaker opponents for bigger losses.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};

// Username Edit Modal
const UsernameEditModal = ({ currentUsername, onSave, onClose }) => {
  const [username, setUsername] = useState(currentUsername || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    const trimmed = username.trim().toLowerCase();
    
    // Validation
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (trimmed.length > 16) {
      setError('Username must be 16 characters or less');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setError('Only letters, numbers, and underscores allowed');
      return;
    }
    
    setSaving(true);
    setError('');
    
    const success = await onSave(trimmed);
    
    if (success) {
      onClose();
    } else {
      setError('Username may be taken. Try another.');
      setSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-sm w-full overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
        <div className="p-4 border-b border-cyan-500/20">
          <div className="flex items-center justify-center gap-2 relative">
            <Pencil size={20} className="text-cyan-400" />
            <h2 className="text-lg font-bold text-cyan-300">Edit Username</h2>
            <button
              onClick={onClose}
              className="absolute right-0 p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            maxLength={16}
            placeholder="Enter username"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
          <p className="text-slate-500 text-xs mt-2">
            3-16 characters: letters, numbers, underscores
          </p>
        </div>
        
        <div className="p-4 border-t border-cyan-500/20 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * PlayerProfileCard - Shows player profile in main menu
 * 
 * LOGIC (PRIORITY ORDER):
 * 1. If we have a profile → Show authenticated view (ALWAYS - this is the key fix)
 * 2. If authenticated but no profile → Show loading (with 5s timeout)
 * 3. Otherwise → Show sign-in button (calls onSignIn if provided, otherwise onClick)
 */
const PlayerProfileCard = ({ onClick, onSignIn, isOffline = false }) => {
  const { user, profile, isAuthenticated, updateProfile, refreshProfile, loading: authLoading } = useAuth();
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementCount, setAchievementCount] = useState({ unlocked: 0, total: 0 });
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  
  // Debug logging
  console.log('[PlayerProfileCard] Render state:', { 
    isOffline, 
    isAuthenticated, 
    hasUser: !!user,
    hasProfile: !!profile, 
    profileUsername: profile?.username,
    authLoading,
    loadingTimedOut
  });
  
  // Get rank info for authenticated users
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  
  // Timeout for loading state - don't show loading forever
  useEffect(() => {
    let timer;
    
    // If authenticated but no profile, set a timeout to show sign-in instead of infinite loading
    if (isAuthenticated && !profile && !authLoading) {
      timer = setTimeout(() => {
        console.log('[PlayerProfileCard] Loading timed out after 5s');
        setLoadingTimedOut(true);
      }, 5000);
    } else {
      setLoadingTimedOut(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAuthenticated, profile, authLoading]);
  
  // Try to refresh profile if we have a user but no profile
  useEffect(() => {
    let mounted = true;
    
    const tryRefresh = async () => {
      if (user?.id && !profile && refreshProfile && !authLoading) {
        console.log('[PlayerProfileCard] Attempting profile refresh for user:', user.id);
        try {
          await refreshProfile();
        } catch (err) {
          console.error('[PlayerProfileCard] Refresh failed:', err);
        }
      }
    };
    
    // Delay to let AuthContext settle
    const timer = setTimeout(() => {
      if (mounted) tryRefresh();
    }, 500);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [user?.id, profile, refreshProfile, authLoading]);
  
  // Load achievement count
  useEffect(() => {
    if (profile?.id) {
      if (typeof achievementService?.getAchievementStats === 'function') {
        achievementService.getAchievementStats(profile.id).then(result => {
          if (result.data) {
            setAchievementCount({
              unlocked: result.data.unlockedCount || 0,
              total: result.data.totalAchievements || 0
            });
          }
        }).catch((err) => {
          console.warn('[PlayerProfileCard] Achievement stats error:', err);
        });
      }
    }
  }, [profile?.id]);
  
  // Handle username save
  const handleSaveUsername = async (newUsername) => {
    if (!profile?.id) return false;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.toLowerCase(), display_name: newUsername })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      if (updateProfile) {
        await updateProfile({ username: newUsername.toLowerCase(), display_name: newUsername });
      }
      
      return true;
    } catch (err) {
      console.error('Error saving username:', err);
      return false;
    }
  };
  
  // ============================================================================
  // RENDER DECISION - Priority order matters!
  // ============================================================================
  
  // PRIORITY 1: If we have a profile, ALWAYS show authenticated view
  // This prevents the loading flash when profile exists
  if (profile) {
    const displayName = profile.username || profile.display_name || 'Player';
    
    // Get contrasting background color for tier icon circle
    const getTierIconBackground = () => {
      if (!rankInfo?.glowColor) return 'rgba(15, 23, 42, 0.9)';
      
      const contrastBackgrounds = {
        '#f59e0b': 'rgba(30, 20, 60, 0.95)',
        '#a855f7': 'rgba(20, 40, 40, 0.95)',
        '#3b82f6': 'rgba(40, 25, 20, 0.95)',
        '#22d3ee': 'rgba(40, 20, 40, 0.95)',
        '#22c55e': 'rgba(40, 20, 35, 0.95)',
        '#38bdf8': 'rgba(35, 25, 45, 0.95)',
        '#2dd4bf': 'rgba(40, 25, 50, 0.95)',
      };
      return contrastBackgrounds[rankInfo.glowColor] || 'rgba(15, 23, 42, 0.95)';
    };
    
    const glowColor = rankInfo?.glowColor || '#22d3ee';
    
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    const glowRgba = {
      '08': hexToRgba(glowColor, 0.08),
      '10': hexToRgba(glowColor, 0.10),
      '15': hexToRgba(glowColor, 0.15),
      '25': hexToRgba(glowColor, 0.25),
      '35': hexToRgba(glowColor, 0.35),
      '40': hexToRgba(glowColor, 0.40),
      '50': hexToRgba(glowColor, 0.50),
    };
    
    const borderRgba = hexToRgba(glowColor, 0.4);
    
    const buttonStyle = {
      background: `linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, ${glowRgba['15']} 25%, rgba(30, 41, 59, 0.85) 50%, ${glowRgba['10']} 75%, rgba(15, 23, 42, 0.95) 100%)`,
      border: `2px solid ${borderRgba}`,
      borderRadius: '12px',
      boxShadow: `0 0 30px ${glowRgba['25']}, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 40px ${glowRgba['08']}`,
      WebkitBackdropFilter: 'blur(8px)',
      backdropFilter: 'blur(8px)',
    };
    
    const tierIconStyle = {
      background: `radial-gradient(circle at 30% 30%, ${getTierIconBackground()}, rgba(10, 15, 25, 0.98))`,
      border: `2px solid ${glowRgba['50']}`,
      boxShadow: `0 0 20px ${glowRgba['35']}, inset 0 0 15px ${glowRgba['15']}, inset 0 2px 4px rgba(255,255,255,0.1)`,
    };
    
    console.log('[PlayerProfileCard] Rendering: AUTHENTICATED view for', displayName);
    
    return (
      <>
        <button 
          onClick={onClick}
          data-testid="profile-card-authenticated"
          className="w-full transition-all overflow-hidden group"
          style={buttonStyle}
        >
          <div className="flex items-center gap-3 p-3">
            {/* Tier Icon Circle */}
            <div 
              className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={tierIconStyle}
            >
              {rankInfo && (
                <TierIcon shape={rankInfo.shape} glowColor={rankInfo.glowColor} size="medium" />
              )}
            </div>
            
            {/* Player info */}
            <div className="flex-1 text-left min-w-0">
              <div 
                className="font-black text-base tracking-wide truncate"
                style={{ 
                  color: '#f1f5f9',
                  textShadow: `0 0 12px ${glowRgba['40']}, 0 0 4px rgba(0,0,0,0.8)` 
                }}
              >
                {displayName}
              </div>
              <div className="flex items-center gap-2">
                {rankInfo && (
                  <span 
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: glowColor, textShadow: `0 0 10px ${glowRgba['50']}` }}
                  >
                    {rankInfo.name}
                  </span>
                )}
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>
                  {profile.rating || 1000} ELO
                </span>
              </div>
            </div>
            
            {/* Arrow */}
            <ChevronRight 
              size={20} 
              className="group-hover:translate-x-0.5 transition-all flex-shrink-0" 
              style={{ color: glowColor, opacity: 0.7 }} 
            />
          </div>
        </button>
        
        {/* Modals */}
        {showRatingInfo && (
          <RatingInfoModal onClose={() => setShowRatingInfo(false)} />
        )}
        
        {showUsernameEdit && (
          <UsernameEditModal
            currentUsername={profile.username}
            onSave={handleSaveUsername}
            onClose={() => setShowUsernameEdit(false)}
          />
        )}
        
        {showAchievements && (
          <Achievements
            userId={profile.id}
            onClose={() => setShowAchievements(false)}
          />
        )}
      </>
    );
  }
  
  // PRIORITY 2: Loading state - only if authenticated, no profile, auth not loading, and not timed out
  if (isAuthenticated && !profile && !authLoading && !loadingTimedOut) {
    console.log('[PlayerProfileCard] Rendering: LOADING state');
    return (
      <button 
        onClick={() => {
          console.log('[PlayerProfileCard] Manual refresh triggered');
          if (refreshProfile) refreshProfile();
        }}
        data-testid="profile-card-loading"
        className="w-full flex items-center gap-3 p-3 transition-colors cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)',
          border: '2px solid rgba(34, 211, 238, 0.3)',
          borderRadius: '12px',
          boxShadow: '0 0 20px rgba(34, 211, 238, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
      >
        <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse" />
        <div className="flex-1 text-left">
          <div className="h-4 w-24 bg-slate-700 rounded animate-pulse mb-1.5" />
          <div style={{ fontSize: '12px', color: '#64748b' }}>Loading profile... tap to retry</div>
        </div>
      </button>
    );
  }
  
  // PRIORITY 3: Sign-in button (offline, not authenticated, or loading timed out)
  console.log('[PlayerProfileCard] Rendering: SIGN IN button');
  return (
    <button
      onClick={onSignIn || onClick}
      data-testid="profile-card-signin"
      className="w-full flex items-center gap-3 p-3 transition-all group"
      style={{
        background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)',
        border: '2px solid rgba(34, 211, 238, 0.4)',
        borderRadius: '12px',
        boxShadow: '0 0 25px rgba(34, 211, 238, 0.15), 0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
      }}
    >
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '2px solid rgba(34, 211, 238, 0.5)',
          boxShadow: '0 0 15px rgba(34, 211, 238, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        <LogIn size={20} style={{ color: '#22d3ee' }} />
      </div>
      <div className="flex-1 text-left">
        <div style={{ color: '#22d3ee', fontWeight: '900', fontSize: '14px', letterSpacing: '0.05em', textShadow: '0 0 10px rgba(34, 211, 238, 0.5)' }}>SIGN IN</div>
        <div style={{ color: '#94a3b8', fontSize: '12px' }}>Track stats & compete online</div>
      </div>
      <ChevronRight size={20} style={{ color: '#22d3ee' }} className="group-hover:translate-x-1 transition-all" />
    </button>
  );
};

export default PlayerProfileCard;
