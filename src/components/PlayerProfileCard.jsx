// Player Profile Card - Enhanced display for main menu with rating info, username editing, and achievements
import { useState, useEffect } from 'react';
import { ChevronRight, WifiOff, HelpCircle, Pencil, Trophy, X, Loader } from 'lucide-react';
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
              { min: 1200, name: 'Beginner', shape: 'I', color: 'text-slate-400', glowColor: '#94a3b8', bg: 'bg-slate-500/10 border-slate-500/30' },
              { min: 0, name: 'Novice', shape: 'O', color: 'text-slate-500', glowColor: '#64748b', bg: 'bg-slate-600/10 border-slate-600/30' },
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
    
    // Check if username is available
    const checkUsername = async () => {
      setChecking(true);
      setError('');
      
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', newUsername.toLowerCase())
          .maybeSingle();
        
        if (fetchError) throw fetchError;
        if (data) {
          setError('Username is already taken');
        }
      } catch (err) {
        console.error('Error checking username:', err);
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
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between">
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
        
        {/* Form */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">New Username</label>
            <div className="relative">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                maxLength={20}
              />
              {checking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader size={18} className="text-cyan-400 animate-spin" />
                </div>
              )}
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              3-20 characters. Letters, numbers, and underscores only.
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
  const [profileRetried, setProfileRetried] = useState(false);
  
  // Get rank info for authenticated users
  const rankInfo = profile ? getRankInfo(profile.rating || 1000) : null;
  
  // Retry profile fetch if authenticated but no profile
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptFetch = async () => {
      if (isAuthenticated && !profile && retryCount < maxRetries && refreshProfile) {
        retryCount++;
        console.log(`[PlayerProfileCard] Profile missing, retry attempt ${retryCount}/${maxRetries}...`);
        try {
          const result = await refreshProfile();
          console.log('[PlayerProfileCard] Profile retry result:', !!result);
          if (!result && retryCount < maxRetries) {
            // Wait and try again
            setTimeout(attemptFetch, 1000 * retryCount);
          }
        } catch (err) {
          console.error('[PlayerProfileCard] Profile retry failed:', err);
          if (retryCount < maxRetries) {
            setTimeout(attemptFetch, 1000 * retryCount);
          }
        }
      }
    };
    
    if (isAuthenticated && !profile && !profileRetried) {
      setProfileRetried(true);
      attemptFetch();
    }
  }, [isAuthenticated, profile, profileRetried, refreshProfile]);
  
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
  
  // Handle username save
  const handleSaveUsername = async (newUsername) => {
    if (!profile?.id) return false;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.toLowerCase(), display_name: newUsername })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      // Update local profile
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
  if (isOffline || !isAuthenticated) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all group"
        style={{
          background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%)',
          borderColor: 'rgba(100, 116, 139, 0.4)',
          boxShadow: '0 0 20px rgba(100, 116, 139, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border-2 border-slate-500/50 shadow-[0_0_10px_rgba(100,116,139,0.3)]">
          <WifiOff size={20} className="text-slate-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-white font-black text-sm tracking-wide" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>OFFLINE MODE</div>
          <div className="text-slate-500 text-xs">Stats not tracked</div>
        </div>
        <ChevronRight size={20} className="text-slate-500 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
      </button>
    );
  }
  
  // Loading state - clickable to retry
  if (!profile) {
    return (
      <button 
        onClick={() => {
          console.log('[PlayerProfileCard] Manual refresh triggered');
          if (refreshProfile) refreshProfile();
        }}
        className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-slate-800/50 transition-colors cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%)',
          borderColor: 'rgba(34, 211, 238, 0.3)',
        }}
      >
        <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse" />
        <div className="flex-1 text-left">
          <div className="h-4 w-24 bg-slate-700 rounded animate-pulse mb-1.5" />
          <div className="text-xs text-slate-500">Loading profile... tap to retry</div>
        </div>
      </button>
    );
  }
  
  const displayName = profile.username || profile.display_name || 'Player';
  
  // Get contrasting background color for tier icon circle based on tier color
  const getTierIconBackground = () => {
    if (!rankInfo?.color) return 'rgba(15, 23, 42, 0.9)';
    
    // Map tier glow colors to contrasting dark backgrounds
    const contrastBackgrounds = {
      '#f59e0b': 'rgba(30, 20, 60, 0.95)',   // Grandmaster amber → dark purple
      '#a855f7': 'rgba(20, 40, 40, 0.95)',   // Master purple → dark teal
      '#3b82f6': 'rgba(40, 25, 20, 0.95)',   // Expert blue → dark orange-brown
      '#22d3ee': 'rgba(40, 20, 40, 0.95)',   // Advanced cyan → dark magenta
      '#22c55e': 'rgba(40, 20, 35, 0.95)',   // Intermediate green → dark rose
      '#94a3b8': 'rgba(20, 25, 40, 0.95)',   // Beginner slate → dark blue
      '#64748b': 'rgba(20, 25, 40, 0.95)',   // Novice gray → dark blue
    };
    return contrastBackgrounds[rankInfo.color] || 'rgba(15, 23, 42, 0.95)';
  };
  
  return (
    <>
      <button 
        onClick={onClick}
        className="w-full rounded-xl border transition-all overflow-hidden group backdrop-blur-sm"
        style={{
          background: `linear-gradient(135deg, 
            rgba(15, 23, 42, 0.85) 0%, 
            ${rankInfo?.color}10 25%,
            rgba(30, 41, 59, 0.75) 50%, 
            ${rankInfo?.color}08 75%,
            rgba(15, 23, 42, 0.85) 100%)`,
          borderColor: `${rankInfo?.color}40` || 'rgba(34, 211, 238, 0.3)',
          boxShadow: `0 0 25px ${rankInfo?.color}20, 
                      inset 0 1px 0 rgba(255,255,255,0.1),
                      inset 0 0 30px ${rankInfo?.color}05`
        }}
      >
        <div className="flex items-center gap-3 p-3">
          {/* Tier Icon Circle with contrasting background */}
          <div 
            className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2"
            style={{ 
              background: `radial-gradient(circle at 30% 30%, 
                ${getTierIconBackground()}, 
                rgba(10, 15, 25, 0.98))`,
              borderColor: `${rankInfo?.color}50`,
              boxShadow: `0 0 20px ${rankInfo?.color}35, 
                          inset 0 0 15px ${rankInfo?.color}15,
                          inset 0 2px 4px rgba(255,255,255,0.1)`
            }}
          >
            {rankInfo && (
              <TierIcon shape={rankInfo.shape} glowColor={rankInfo.color} size="medium" />
            )}
          </div>
          
          {/* Player info */}
          <div className="flex-1 text-left min-w-0">
            <div 
              className="font-black text-base tracking-wide truncate"
              style={{ 
                color: '#f1f5f9',
                textShadow: `0 0 12px ${rankInfo?.color}40, 0 0 4px rgba(0,0,0,0.8)` 
              }}
            >
              {displayName}
            </div>
            <div className="flex items-center gap-2">
              {rankInfo && (
                <span 
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: rankInfo.color, textShadow: `0 0 10px ${rankInfo.color}50` }}
                >
                  {rankInfo.name}
                </span>
              )}
              <span className="text-slate-400 text-xs font-medium">
                {profile.rating || 1000} ELO
              </span>
            </div>
          </div>
          
          {/* Arrow */}
          <ChevronRight 
            size={20} 
            className="group-hover:translate-x-0.5 transition-all flex-shrink-0" 
            style={{ color: rankInfo?.color || '#64748b', opacity: 0.7 }} 
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
};

export default PlayerProfileCard;
