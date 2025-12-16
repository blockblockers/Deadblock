// Player Profile Card - Enhanced display for main menu with rating info, username editing, and achievements
// UPDATED: Uses direct fetch to bypass Supabase client timeout issues
// FIXED: Handles missing achievement RPC functions gracefully
import { useState, useEffect } from 'react';
import { ChevronRight, WifiOff, HelpCircle, Pencil, Trophy, X, Loader, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRankInfo } from '../utils/rankUtils';
import { dbSelect, dbUpdate } from '../services/supabaseDirectFetch';
import TierIcon from './TierIcon';
import Achievements from './Achievements';
import achievementService from '../services/achievementService';

// =====================================================
// LOCAL STORAGE KEYS (same as AuthContext)
// =====================================================
const STORAGE_KEYS = {
  CACHED_PROFILE: 'deadblock_cached_profile',
};

// Helper to safely get cached profile from localStorage
const getCachedProfileSync = () => {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.CACHED_PROFILE);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('[PlayerProfileCard] Error reading cached profile:', e);
  }
  return null;
};

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
          
          {/* Rank Tiers */}
          <div className="space-y-2">
            <h3 className="text-cyan-300 font-semibold text-sm">Rank Tiers</h3>
            <div className="space-y-1.5">
              {[
                { name: 'Bronze', range: '< 1200', color: 'text-amber-600' },
                { name: 'Silver', range: '1200-1399', color: 'text-slate-300' },
                { name: 'Gold', range: '1400-1599', color: 'text-yellow-400' },
                { name: 'Platinum', range: '1600-1799', color: 'text-cyan-300' },
                { name: 'Diamond', range: '1800-1999', color: 'text-purple-400' },
                { name: 'Master', range: '2000+', color: 'text-pink-400' },
              ].map(tier => (
                <div key={tier.name} className="flex justify-between items-center text-sm">
                  <span className={tier.color}>{tier.name}</span>
                  <span className="text-slate-500">{tier.range}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* How it works */}
          <div className="space-y-2">
            <h3 className="text-cyan-300 font-semibold text-sm">How Rating Changes</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Win vs higher rated: +20 to +32 points</li>
              <li>• Win vs similar rated: +16 points</li>
              <li>• Win vs lower rated: +8 to +16 points</li>
              <li>• Loss: -8 to -32 points (inverse)</li>
            </ul>
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

// Username Edit Modal - UPDATED to use dbSelect instead of supabase client
const UsernameEditModal = ({ currentUsername, onSave, onClose }) => {
  const [newUsername, setNewUsername] = useState(currentUsername || '');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Debounced username validation
  useEffect(() => {
    if (!newUsername || newUsername === currentUsername) {
      setError('');
      return;
    }
    
    // Basic validation
    if (newUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (newUsername.length > 20) {
      setError('Username must be 20 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setError('Only letters, numbers, and underscores allowed');
      return;
    }
    
    // Check if username is available using direct fetch
    const checkUsername = async () => {
      setChecking(true);
      setError('');
      
      try {
        // Use dbSelect instead of supabase client
        const { data, error: fetchError } = await dbSelect('profiles', {
          select: 'id',
          eq: { username: newUsername.toLowerCase() },
          limit: 1
        });
        
        if (fetchError) {
          setError('Could not check username');
        } else if (data && data.length > 0) {
          setError('Username is already taken');
        } else {
          setError('');
        }
      } catch (err) {
        console.error('Username check error:', err);
        setError('Could not verify username');
      }
      
      setChecking(false);
    };
    
    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [newUsername, currentUsername]);
  
  const handleSave = async () => {
    if (error || checking || !newUsername || newUsername === currentUsername) return;
    
    setSaving(true);
    const success = await onSave(newUsername);
    setSaving(false);
    
    if (success) {
      onClose();
    } else {
      setError('Failed to save username');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-sm w-full overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-cyan-300">Edit Username</h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">New Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.trim())}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
              placeholder="Enter username"
              maxLength={20}
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
            {checking && (
              <p className="text-slate-400 text-sm mt-2">Checking availability...</p>
            )}
            {!error && !checking && newUsername && newUsername !== currentUsername && (
              <p className="text-green-400 text-sm mt-2">Username is available!</p>
            )}
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
              {saving ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlayerProfileCard = ({ onClick, isOffline = false }) => {
  const { profile, isAuthenticated, updateProfile, refreshProfile } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementCount, setAchievementCount] = useState({ unlocked: 0, total: 0 });
  
  // =====================================================
  // FIX: Load cached profile synchronously on mount
  // This ensures profile displays immediately when app reopens
  // =====================================================
  const [localCachedProfile, setLocalCachedProfile] = useState(() => getCachedProfileSync());
  
  // Use cached profile as fallback when AuthContext profile isn't loaded yet
  const effectiveProfile = profile || localCachedProfile;
  
  // Update local cache when AuthContext profile changes
  useEffect(() => {
    if (profile) {
      setLocalCachedProfile(profile);
    }
  }, [profile]);
  
  // DEBUG: Log which render path we're taking
  console.log('[PlayerProfileCard] Render state:', { 
    isOffline, 
    isAuthenticated, 
    hasProfile: !!profile,
    hasLocalCache: !!localCachedProfile,
    hasEffectiveProfile: !!effectiveProfile,
    profileUsername: effectiveProfile?.username,
    willRenderOffline: isOffline && !effectiveProfile,
    willRenderLoading: !effectiveProfile && !isOffline,
    willRenderAuthenticated: !!effectiveProfile
  });
  
  // Get rank info for authenticated users
  const rankInfo = effectiveProfile ? getRankInfo(effectiveProfile.rating || 1000) : null;
  
  // Retry profile fetch if authenticated but no profile
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    let mounted = true;
    
    const attemptFetch = async () => {
      if (!mounted) return;
      
      if (isAuthenticated && !profile && retryCount < maxRetries && refreshProfile) {
        retryCount++;
        console.log(`[PlayerProfileCard] Profile missing, retry attempt ${retryCount}/${maxRetries}...`);
        try {
          const result = await refreshProfile();
          console.log('[PlayerProfileCard] Profile retry result:', !!result);
          if (!result && retryCount < maxRetries && mounted) {
            // Wait and try again with exponential backoff
            setTimeout(attemptFetch, 500 * retryCount);
          }
        } catch (err) {
          console.error('[PlayerProfileCard] Profile retry failed:', err);
          if (retryCount < maxRetries && mounted) {
            setTimeout(attemptFetch, 500 * retryCount);
          }
        }
      }
    };
    
    // Only start retrying if authenticated but no profile (and no cache)
    if (isAuthenticated && !profile && !localCachedProfile) {
      // Small delay to let AuthContext finish its initialization
      const startDelay = setTimeout(() => {
        attemptFetch();
      }, 300);
      
      return () => {
        mounted = false;
        clearTimeout(startDelay);
      };
    }
    
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, profile, localCachedProfile, refreshProfile]);
  
  // =====================================================
  // FIXED: Load achievement count with graceful fallback
  // Handles missing RPC functions without errors
  // =====================================================
  useEffect(() => {
    if (effectiveProfile?.id) {
      const loadAchievements = async () => {
        try {
          // Check if getAchievementStats exists before calling
          if (typeof achievementService?.getAchievementStats === 'function') {
            const result = await achievementService.getAchievementStats(effectiveProfile.id);
            if (result.data) {
              setAchievementCount({
                unlocked: result.data.unlockedCount || 0,
                total: result.data.totalAchievements || 0
              });
            }
          }
        } catch (err) {
          // Silently fail - achievements are optional feature
          console.log('[PlayerProfileCard] Achievements not available:', err.message);
        }
      };
      
      loadAchievements();
    }
  }, [effectiveProfile?.id]);
  
  // Handle username save - UPDATED to use dbUpdate instead of supabase client
  const handleSaveUsername = async (newUsername) => {
    if (!effectiveProfile?.id) return false;
    
    try {
      // Use dbUpdate instead of supabase client
      const { error } = await dbUpdate(
        'profiles',
        { username: newUsername.toLowerCase(), display_name: newUsername },
        { eq: { id: effectiveProfile.id } }
      );
      
      if (error) throw error;
      
      // Update local profile via AuthContext
      if (updateProfile) {
        await updateProfile({ username: newUsername.toLowerCase(), display_name: newUsername });
      }
      
      return true;
    } catch (err) {
      console.error('Error saving username:', err);
      return false;
    }
  };
  
  // Offline mode display - only show if explicitly offline AND no cached profile
  if (isOffline && !effectiveProfile) {
    console.log('[PlayerProfileCard] Rendering: OFFLINE mode button (no profile)');
    return (
      <button
        onClick={onClick}
        data-testid="profile-card-offline"
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
  }
  
  // Loading state - only show if no profile AND no cache AND not offline
  if (!effectiveProfile) {
    console.log('[PlayerProfileCard] Rendering: LOADING state button');
    return (
      <button 
        onClick={onClick}
        data-testid="profile-card-loading"
        className="w-full flex items-center gap-3 p-3 transition-all group"
        style={{
          background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)',
          border: '2px solid rgba(100, 116, 139, 0.4)',
          borderRadius: '12px',
          boxShadow: '0 0 15px rgba(100, 116, 139, 0.15), 0 4px 15px rgba(0,0,0,0.3)'
        }}
      >
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '2px solid rgba(100, 116, 139, 0.5)'
          }}
        >
          <Loader size={20} className="animate-spin" style={{ color: '#94a3b8' }} />
        </div>
        <div className="flex-1 text-left">
          <div style={{ color: '#94a3b8', fontWeight: '700', fontSize: '14px' }}>Loading Profile...</div>
          <div style={{ color: '#64748b', fontSize: '12px' }}>Tap to retry</div>
        </div>
        <ChevronRight size={20} style={{ color: '#64748b' }} />
      </button>
    );
  }
  
  // Authenticated display with profile (from AuthContext OR from local cache)
  console.log('[PlayerProfileCard] Rendering: AUTHENTICATED with profile:', effectiveProfile.username);
  
  const displayName = effectiveProfile.display_name || effectiveProfile.username || 'Player';
  const initial = displayName[0]?.toUpperCase() || '?';
  
  return (
    <>
      <button
        onClick={onClick}
        data-testid="profile-card-authenticated"
        className="w-full flex items-center gap-3 p-3 transition-all group"
        style={{
          background: `linear-gradient(135deg, ${rankInfo?.bgColor || 'rgba(51, 65, 85, 0.9)'} 0%, rgba(30, 41, 59, 0.95) 100%)`,
          border: `2px solid ${rankInfo?.borderColor || 'rgba(34, 211, 238, 0.4)'}`,
          borderRadius: '12px',
          boxShadow: `0 0 25px ${rankInfo?.glowColor || 'rgba(34, 211, 238, 0.15)'}, 0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`
        }}
      >
        {/* Avatar */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg, ${rankInfo?.avatarBg || 'rgba(34, 211, 238, 0.2)'} 0%, rgba(15, 23, 42, 0.95) 100%)`,
            border: `2px solid ${rankInfo?.borderColor || 'rgba(34, 211, 238, 0.5)'}`,
            boxShadow: `0 0 15px ${rankInfo?.glowColor || 'rgba(34, 211, 238, 0.3)'}, inset 0 1px 0 rgba(255,255,255,0.1)`
          }}
        >
          {effectiveProfile.avatar_url && !imageError ? (
            <img 
              src={effectiveProfile.avatar_url} 
              alt={displayName}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span style={{ color: rankInfo?.textColor || '#22d3ee', fontWeight: '700', fontSize: '18px' }}>
              {initial}
            </span>
          )}
          
          {/* Tier Icon Overlay */}
          {rankInfo && (
            <div className="absolute -bottom-1 -right-1">
              <TierIcon tier={rankInfo.tier} size={18} />
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span 
              className="font-bold text-sm truncate"
              style={{ color: rankInfo?.textColor || '#22d3ee' }}
            >
              {displayName}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUsernameEdit(true);
              }}
              className="p-0.5 opacity-50 hover:opacity-100 transition-opacity"
            >
              <Pencil size={12} style={{ color: rankInfo?.textColor || '#22d3ee' }} />
            </button>
          </div>
          
          {/* Rating & Stats Row */}
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1">
              <Trophy size={12} style={{ color: rankInfo?.accentColor || '#fbbf24' }} />
              <span style={{ color: rankInfo?.accentColor || '#fbbf24', fontSize: '12px', fontWeight: '600' }}>
                {effectiveProfile.rating || 1000}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRatingInfo(true);
                }}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                <HelpCircle size={10} style={{ color: '#94a3b8' }} />
              </button>
            </div>
            <span style={{ color: '#64748b', fontSize: '11px' }}>•</span>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>
              {effectiveProfile.games_played || 0} games
            </span>
            {achievementCount.unlocked > 0 && (
              <>
                <span style={{ color: '#64748b', fontSize: '11px' }}>•</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAchievements(true);
                  }}
                  className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <Trophy size={10} style={{ color: '#fbbf24' }} />
                  <span style={{ color: '#fbbf24', fontSize: '11px' }}>
                    {achievementCount.unlocked}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Arrow */}
        <ChevronRight 
          size={20} 
          style={{ color: rankInfo?.textColor || '#22d3ee' }} 
          className="group-hover:translate-x-1 transition-all flex-shrink-0" 
        />
      </button>
      
      {/* Modals */}
      {showRatingInfo && (
        <RatingInfoModal onClose={() => setShowRatingInfo(false)} />
      )}
      
      {showUsernameEdit && (
        <UsernameEditModal
          currentUsername={effectiveProfile.username}
          onSave={handleSaveUsername}
          onClose={() => setShowUsernameEdit(false)}
        />
      )}
      
      {showAchievements && (
        <Achievements
          isOpen={showAchievements}
          onClose={() => setShowAchievements(false)}
        />
      )}
    </>
  );
};

export default PlayerProfileCard;
