// Player Profile Card - Enhanced display for main menu with rating info, username editing, and achievements
// UPDATED: Uses direct fetch to bypass Supabase client timeout issues
import { useState, useEffect } from 'react';
import { ChevronRight, WifiOff, HelpCircle, Pencil, Trophy, X, Loader, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRankInfo } from '../utils/rankUtils';
import { dbSelect, dbUpdate } from '../services/supabaseDirectFetch';
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
            <h3 className="text-sm font-bold text-cyan-300">Rating Tiers</h3>
            {[
              { name: 'Novice', range: '0-999', color: 'text-slate-400', bg: 'bg-slate-600' },
              { name: 'Bronze', range: '1000-1199', color: 'text-amber-600', bg: 'bg-amber-900/50' },
              { name: 'Silver', range: '1200-1399', color: 'text-slate-300', bg: 'bg-slate-500/50' },
              { name: 'Gold', range: '1400-1599', color: 'text-amber-400', bg: 'bg-amber-600/50' },
              { name: 'Platinum', range: '1600-1799', color: 'text-cyan-300', bg: 'bg-cyan-600/50' },
              { name: 'Diamond', range: '1800-1999', color: 'text-purple-300', bg: 'bg-purple-600/50' },
              { name: 'Master', range: '2000-2199', color: 'text-red-400', bg: 'bg-red-600/50' },
              { name: 'Grandmaster', range: '2200+', color: 'text-amber-300', bg: 'bg-gradient-to-r from-amber-600/50 to-red-600/50' },
            ].map(tier => (
              <div key={tier.name} className={`flex items-center justify-between p-2 rounded ${tier.bg}`}>
                <span className={`font-medium ${tier.color}`}>{tier.name}</span>
                <span className="text-slate-400 text-sm">{tier.range}</span>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
            Win against stronger opponents for bigger gains, lose against weaker opponents for bigger losses.
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
          setError('Username already taken');
        }
      } catch (err) {
        setError('Could not check username');
      }
      
      setChecking(false);
    };
    
    const debounceTimer = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimer);
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
        <div className="p-4 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil size={20} className="text-cyan-400" />
              <h2 className="text-lg font-bold text-cyan-300">Edit Username</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">New Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              maxLength={20}
            />
            
            {/* Status indicator */}
            <div className="mt-2 h-5 flex items-center">
              {checking && (
                <span className="text-slate-400 text-sm flex items-center gap-2">
                  <Loader size={14} className="animate-spin" />
                  Checking availability...
                </span>
              )}
              {error && !checking && (
                <span className="text-red-400 text-sm">{error}</span>
              )}
              {!error && !checking && newUsername && newUsername !== currentUsername && (
                <span className="text-green-400 text-sm">✓ Username available</span>
              )}
            </div>
          </div>
          
          <div className="text-xs text-slate-500">
            Letters, numbers, and underscores only.
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
  
  // DEBUG: Log which render path we're taking
  console.log('[PlayerProfileCard] Render state:', { 
    isOffline, 
    isAuthenticated, 
    hasProfile: !!profile, 
    profileUsername: profile?.username,
    // New conditions: show offline only if explicitly offline AND no cached profile
    willRenderOffline: isOffline && !profile,
    willRenderLoading: !profile && !(isOffline && !profile),
    willRenderAuthenticated: !!profile
  });
  
  // Get rank info for authenticated users
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  
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
    
    // Only start retrying if authenticated but no profile
    if (isAuthenticated && !profile) {
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
  }, [isAuthenticated, profile, refreshProfile]);
  
  // Load achievement count
  useEffect(() => {
    if (profile?.id) {
      // Check if getAchievementStats exists before calling
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
          // Achievements may not be available
        });
      } else {
        console.warn('[PlayerProfileCard] achievementService.getAchievementStats is not available');
      }
    }
  }, [profile?.id]);
  
  // Handle username save - UPDATED to use dbUpdate instead of supabase client
  const handleSaveUsername = async (newUsername) => {
    if (!profile?.id) return false;
    
    try {
      // Use dbUpdate instead of supabase client
      const { error } = await dbUpdate(
        'profiles',
        { username: newUsername.toLowerCase(), display_name: newUsername },
        { eq: { id: profile.id } }
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
  // If we have a profile (even from cache), show the authenticated view
  if (isOffline && !profile) {
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
  
  // Loading state - clickable to retry
  if (!profile) {
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
  
  // Authenticated display with profile
  console.log('[PlayerProfileCard] Rendering: AUTHENTICATED with profile:', profile.username);
  
  const displayName = profile.display_name || profile.username || 'Player';
  const glowColor = rankInfo?.glowColor || '#22d3ee';
  
  // Parse glow color for rgba variations
  const glowRgba = {
    '15': glowColor.replace(')', ', 0.15)').replace('rgb', 'rgba'),
    '30': glowColor.replace(')', ', 0.30)').replace('rgb', 'rgba'),
    '40': glowColor.replace(')', ', 0.40)').replace('rgb', 'rgba'),
    '50': glowColor.replace(')', ', 0.50)').replace('rgb', 'rgba'),
  };
  
  // For hex colors
  if (glowColor.startsWith('#')) {
    const hex = glowColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    glowRgba['15'] = `rgba(${r}, ${g}, ${b}, 0.15)`;
    glowRgba['30'] = `rgba(${r}, ${g}, ${b}, 0.30)`;
    glowRgba['40'] = `rgba(${r}, ${g}, ${b}, 0.40)`;
    glowRgba['50'] = `rgba(${r}, ${g}, ${b}, 0.50)`;
  }
  
  // Style for the tier icon container - darker background for contrast
  const tierIconStyle = {
    background: `linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)`,
    border: `2px solid ${glowColor}`,
    boxShadow: `0 0 20px ${glowRgba['40']}, inset 0 0 15px ${glowRgba['15']}`
  };
  
  return (
    <>
      <button
        onClick={onClick}
        data-testid="profile-card-authenticated"
        className="w-full flex items-center gap-3 p-3 transition-all group hover:scale-[1.02]"
        style={{
          background: `linear-gradient(135deg, rgba(51, 65, 85, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)`,
          border: `2px solid ${glowColor}`,
          borderRadius: '12px',
          boxShadow: `0 0 25px ${glowRgba['30']}, 0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`
        }}
      >
        {/* Tier Icon Container - darker contrasting background */}
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
};

export default PlayerProfileCard;
