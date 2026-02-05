// PlayerProfileCard.jsx - Enhanced display for main menu with rating info, username editing, and achievements
// v7.12: Added NEW achievements indicator badge (similar to friend requests)
// Place in src/components/PlayerProfileCard.jsx

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, WifiOff, HelpCircle, Trophy, X, Loader, LogIn, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRankInfo } from '../utils/rankUtils';
import { supabase } from '../utils/supabase';
import TierIcon from './TierIcon';
import Achievements from './Achievements';
import achievementService from '../services/achievementService';

// Helper to get cached profile synchronously from localStorage
const getCachedProfileSync = () => {
  try {
    const cached = localStorage.getItem('deadblock_profile_cache');
    if (cached) {
      const { profile, timestamp } = JSON.parse(cached);
      // Cache valid for 24 hours
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return profile;
      }
    }
  } catch (e) {
    console.warn('[PlayerProfileCard] Failed to read cached profile:', e);
  }
  return null;
};

// Rating Info Modal
const RatingInfoModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-sm w-full overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
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
        
        <div 
          className="p-4 space-y-4 max-h-[70vh] overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          <p className="text-sm text-slate-400">
            Your ELO rating changes based on match results. Beat higher-rated players to gain more points!
          </p>
          
          <div className="space-y-2">
            {[
              { name: 'Bronze', range: '0-1199', color: '#CD7F32' },
              { name: 'Silver', range: '1200-1399', color: '#C0C0C0' },
              { name: 'Gold', range: '1400-1599', color: '#FFD700' },
              { name: 'Platinum', range: '1600-1799', color: '#00CED1' },
              { name: 'Diamond', range: '1800-1999', color: '#B9F2FF' },
              { name: 'Master', range: '2000+', color: '#FF6B6B' },
            ].map(tier => (
              <div key={tier.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <span className="font-bold" style={{ color: tier.color }}>{tier.name}</span>
                <span className="text-slate-400 text-sm">{tier.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Username Edit Modal
const UsernameEditModal = ({ currentUsername, onSave, onClose }) => {
  const [newUsername, setNewUsername] = useState(currentUsername || '');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);

  const validateUsername = (name) => {
    if (!name || name.length < 3) return 'Username must be at least 3 characters';
    if (name.length > 20) return 'Username must be 20 characters or less';
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Only letters, numbers, and underscores allowed';
    return null;
  };

  const checkAvailability = useCallback(async (name) => {
    if (name.toLowerCase() === currentUsername?.toLowerCase()) {
      setIsAvailable(true);
      return;
    }
    
    const validationError = validateUsername(name);
    if (validationError) {
      setError(validationError);
      setIsAvailable(false);
      return;
    }

    setChecking(true);
    setError('');
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', name)
        .maybeSingle();
      
      if (data) {
        setError('Username already taken');
        setIsAvailable(false);
      } else {
        setIsAvailable(true);
      }
    } catch (err) {
      console.error('Error checking username:', err);
    }
    
    setChecking(false);
  }, [currentUsername]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (newUsername && newUsername !== currentUsername) {
        checkAvailability(newUsername);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newUsername, currentUsername, checkAvailability]);

  const handleSave = async () => {
    if (error || !isAvailable || saving) return;
    
    setSaving(true);
    const success = await onSave(newUsername);
    setSaving(false);
    
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-sm w-full p-6 border border-cyan-500/30">
        <h2 className="text-xl font-bold text-cyan-300 mb-4">Edit Username</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Username</label>
            <div className="relative">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  setError('');
                  setIsAvailable(null);
                }}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none pr-10"
                placeholder="Enter username"
                maxLength={20}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && <Loader size={18} className="text-slate-400 animate-spin" />}
                {!checking && isAvailable === true && <Check size={18} className="text-green-400" />}
                {!checking && isAvailable === false && <AlertCircle size={18} className="text-red-400" />}
              </div>
            </div>
            {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            <p className="text-slate-500 text-xs mt-1">
              Letters, numbers, and underscores only.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!!error || checking || saving || !newUsername || newUsername === currentUsername}
              className="flex-1 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <><Loader size={18} className="animate-spin" /> Saving...</> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * PlayerProfileCard - Shows player profile in main menu
 */
const PlayerProfileCard = ({ onClick, onSignIn, isOffline = false }) => {
  const { user, profile, isAuthenticated, updateProfile, refreshProfile, loading: authLoading } = useAuth();
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementCount, setAchievementCount] = useState({ unlocked: 0, total: 0 });
  const [newAchievementsCount, setNewAchievementsCount] = useState(0);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  
  // Use cached profile as fallback
  const [localCachedProfile] = useState(() => getCachedProfileSync());
  const effectiveProfile = profile || localCachedProfile;
  
  // Get rank info
  const rankInfo = effectiveProfile ? getRankInfo(effectiveProfile.rating || 1000) : null;
  const glowColor = rankInfo?.glowColor || '#22d3ee';
  
  // Helper for RGBA conversion
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // Load achievement counts and check for new ones
  useEffect(() => {
    const loadAchievements = async () => {
      if (!effectiveProfile?.id) {
        console.log('[PlayerProfileCard] No profile ID for achievements');
        return;
      }
      
      try {
        console.log('[PlayerProfileCard] Loading achievements for:', effectiveProfile.id);
        
        // Get all achievements with status
        const result = await achievementService.getAchievementsWithStatus(effectiveProfile.id);
        console.log('[PlayerProfileCard] Achievement result:', { 
          dataLength: result.data?.length, 
          error: result.error 
        });
        
        if (result.data && result.data.length > 0) {
          const unlocked = result.data.filter(a => a.unlocked);
          const total = result.data.length;
          console.log('[PlayerProfileCard] Achievements loaded:', { unlocked: unlocked.length, total });
          setAchievementCount({ unlocked: unlocked.length, total });
          
          // Check for new (unviewed) achievements
          const lastViewedTime = localStorage.getItem(`deadblock_achievements_viewed_${effectiveProfile.id}`);
          const lastViewed = lastViewedTime ? new Date(lastViewedTime) : null;
          
          if (lastViewed && !isNaN(lastViewed.getTime())) {
            // Count achievements unlocked after last view
            const newCount = unlocked.filter(a => {
              const unlockedAt = a.unlockedAt || a.unlocked_at;
              return unlockedAt && new Date(unlockedAt) > lastViewed;
            }).length;
            setNewAchievementsCount(newCount);
          } else {
            // No valid lastViewed (localStorage cleared, first open, etc.)
            // Don't mark existing achievements as "new" - initialize the timestamp
            // so only future unlocks will trigger the badge
            localStorage.setItem(
              `deadblock_achievements_viewed_${effectiveProfile.id}`,
              new Date().toISOString()
            );
            setNewAchievementsCount(0);
          }
        } else {
          console.log('[PlayerProfileCard] No achievements found or error:', result.error);
        }
      } catch (err) {
        console.error('[PlayerProfileCard] Error loading achievements:', err);
      }
    };
    
    loadAchievements();
  }, [effectiveProfile?.id]);
  
  // Mark achievements as viewed when modal opens
  const handleOpenAchievements = () => {
    setShowAchievements(true);
    
    // Mark as viewed
    if (effectiveProfile?.id) {
      localStorage.setItem(
        `deadblock_achievements_viewed_${effectiveProfile.id}`,
        new Date().toISOString()
      );
      setNewAchievementsCount(0);
    }
  };
  
  // Handle username save
  const handleSaveUsername = async (newUsername) => {
    try {
      if (updateProfile) {
        await updateProfile({ username: newUsername.toLowerCase(), display_name: newUsername });
      }
      return true;
    } catch (err) {
      console.error('Error saving username:', err);
      return false;
    }
  };
  
  // Offline mode display
  if (isOffline && !effectiveProfile) {
    return (
      <button
        onClick={onClick || onSignIn}
        className="w-full flex items-center gap-3 p-3 transition-all group"
        style={{
          background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)',
          border: '2px solid rgba(34, 211, 238, 0.4)',
          borderRadius: '12px',
          boxShadow: '0 0 25px rgba(34, 211, 238, 0.15)'
        }}
      >
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '2px solid rgba(34, 211, 238, 0.5)'
          }}
        >
          <LogIn size={20} style={{ color: '#22d3ee' }} />
        </div>
        <div className="flex-1 text-left">
          <div style={{ color: '#22d3ee', fontWeight: '900', fontSize: '14px' }}>SIGN IN</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Track stats & compete online</div>
        </div>
        <ChevronRight size={20} style={{ color: '#22d3ee' }} className="group-hover:translate-x-1 transition-all" />
      </button>
    );
  }
  
  // Loading state
  if (!effectiveProfile) {
    return (
      <button 
        onClick={() => refreshProfile?.()}
        className="w-full flex items-center gap-3 p-3"
        style={{
          background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)',
          border: '2px solid rgba(34, 211, 238, 0.3)',
          borderRadius: '12px'
        }}
      >
        <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse" />
        <div className="flex-1 text-left">
          <div className="h-4 bg-slate-700 rounded w-24 animate-pulse mb-2" />
          <div className="h-3 bg-slate-700 rounded w-16 animate-pulse" />
        </div>
      </button>
    );
  }
  
  // Authenticated view with profile
  const displayName = effectiveProfile.display_name || effectiveProfile.username || 'Player';
  const glowRgba = {
    '15': hexToRgba(glowColor, 0.15),
    '30': hexToRgba(glowColor, 0.3),
    '40': hexToRgba(glowColor, 0.4),
    '50': hexToRgba(glowColor, 0.5),
  };
  
  return (
    <>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 transition-all group relative"
        style={{
          background: `linear-gradient(135deg, ${glowRgba['15']} 0%, rgba(15, 23, 42, 0.95) 100%)`,
          border: `2px solid ${glowRgba['40']}`,
          borderRadius: '12px',
          boxShadow: `0 0 25px ${glowRgba['15']}, 0 4px 15px rgba(0,0,0,0.3)`
        }}
      >
        {/* Action buttons (achievements, edit) */}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {/* Achievements button with NEW indicator */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAchievements();
            }}
            className="relative p-1.5 rounded-lg transition-all hover:scale-110"
            style={{ 
              background: newAchievementsCount > 0 
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.2))'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1))',
              border: newAchievementsCount > 0 
                ? '1px solid rgba(251, 191, 36, 0.5)'
                : '1px solid rgba(251, 191, 36, 0.3)'
            }}
            title={`Achievements (${achievementCount.unlocked}/${achievementCount.total})`}
          >
            <Trophy 
              size={14} 
              className="text-amber-400" 
            />
            {/* NEW badge */}
            {newAchievementsCount > 0 && (
              <span 
                className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold rounded-full animate-pulse"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)'
                }}
              >
                {newAchievementsCount > 9 ? '9+' : newAchievementsCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Tier icon */}
        <div 
          className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${glowRgba['30']} 0%, rgba(15, 23, 42, 0.95) 100%)`,
            border: `2px solid ${glowRgba['50']}`,
            boxShadow: `0 0 15px ${glowRgba['30']}`
          }}
        >
          {rankInfo && <TierIcon shape={rankInfo.shape} glowColor={glowColor} size="medium" />}
        </div>
        
        {/* Player info */}
        <div className="flex-1 text-left min-w-0 pr-16">
          <div 
            className="font-black text-base tracking-wide truncate"
            style={{ color: '#f1f5f9', textShadow: `0 0 12px ${glowRgba['40']}` }}
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
              {effectiveProfile.rating || 1000} ELO
            </span>
          </div>
        </div>
        
        {/* Arrow */}
        <ChevronRight 
          size={20} 
          className="group-hover:translate-x-0.5 transition-all flex-shrink-0" 
          style={{ color: glowColor, opacity: 0.7 }} 
        />
      </button>
      
      {/* Modals */}
      {showRatingInfo && <RatingInfoModal onClose={() => setShowRatingInfo(false)} />}
      
      {showUsernameEdit && (
        <UsernameEditModal
          currentUsername={effectiveProfile.username}
          onSave={handleSaveUsername}
          onClose={() => setShowUsernameEdit(false)}
        />
      )}
      
      {showAchievements && (
        <Achievements
          userId={effectiveProfile.id}
          onClose={() => setShowAchievements(false)}
        />
      )}
    </>
  );
};

export default PlayerProfileCard;
