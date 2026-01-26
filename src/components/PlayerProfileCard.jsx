// PlayerProfileCard.jsx - Enhanced display for main menu with rating info, username editing, achievements, and streak
// v7.14: Fixed streakService import (named export, not default)
// Place in src/components/PlayerProfileCard.jsx

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, WifiOff, HelpCircle, Trophy, X, Loader, LogIn, Check, AlertCircle, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRankInfo } from '../utils/rankUtils';
import { supabase } from '../utils/supabase';
import TierIcon from './TierIcon';
import Achievements from './Achievements';
import achievementService from '../services/achievementService';
// FIXED: streakService is a named export, not default
import { streakService } from '../services/streakService';

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

// Streak Badge Component
const StreakBadge = ({ streak, status }) => {
  if (!streak || streak <= 0) return null;
  
  // Color progression based on streak length
  let colors = {
    bg: 'rgba(100, 116, 139, 0.3)',
    border: 'rgba(100, 116, 139, 0.5)',
    text: '#94a3b8',
    glow: 'none'
  };
  
  if (streak >= 30) {
    // Gold/Amber for 30+ days
    colors = {
      bg: 'rgba(251, 191, 36, 0.2)',
      border: 'rgba(251, 191, 36, 0.5)',
      text: '#fbbf24',
      glow: '0 0 12px rgba(251, 191, 36, 0.4)'
    };
  } else if (streak >= 7) {
    // Orange for 7-29 days
    colors = {
      bg: 'rgba(249, 115, 22, 0.2)',
      border: 'rgba(249, 115, 22, 0.5)',
      text: '#f97316',
      glow: '0 0 8px rgba(249, 115, 22, 0.3)'
    };
  } else if (streak >= 3) {
    // Red for 3-6 days
    colors = {
      bg: 'rgba(239, 68, 68, 0.2)',
      border: 'rgba(239, 68, 68, 0.5)',
      text: '#ef4444',
      glow: '0 0 6px rgba(239, 68, 68, 0.3)'
    };
  }
  
  const pulseAnimation = streak >= 7 ? 'animate-pulse' : '';
  
  return (
    <div 
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${pulseAnimation}`}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        boxShadow: colors.glow
      }}
      title={`${streak} day streak${status === 'played_today' ? ' (played today)' : status === 'at_risk' ? ' (play today to continue!)' : ''}`}
    >
      <Flame size={12} style={{ color: colors.text }} />
      <span>{streak}</span>
    </div>
  );
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
            <h3 className="text-sm font-bold text-cyan-400">TIERS</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-medium">Grandmaster</span>
                <span className="text-slate-500">1800+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-400 font-medium">Master</span>
                <span className="text-slate-500">1600-1799</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-400 font-medium">Expert</span>
                <span className="text-slate-500">1400-1599</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-medium">Advanced</span>
                <span className="text-slate-500">1200-1399</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-400 font-medium">Intermediate</span>
                <span className="text-slate-500">1000-1199</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sky-400 font-medium">Beginner</span>
                <span className="text-slate-500">800-999</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-teal-400 font-medium">Novice</span>
                <span className="text-slate-500">0-799</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-400">HOW IT WORKS</h3>
            <ul className="text-sm text-slate-400 space-y-1.5">
              <li>• Win against higher-rated: +20 to +32 points</li>
              <li>• Win against similar-rated: +10 to +20 points</li>
              <li>• Win against lower-rated: +5 to +10 points</li>
              <li>• Losses subtract similar amounts</li>
              <li>• New players start at 1000 ELO</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main PlayerProfileCard Component
const PlayerProfileCard = ({ onClick, onViewStats, isOfflineMode = false }) => {
  const { profile, isAuthenticated, loading: authLoading, sessionReady } = useAuth();
  
  // Achievement state
  const [achievementCount, setAchievementCount] = useState({ unlocked: 0, total: 0 });
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRatingInfo, setShowRatingInfo] = useState(false);
  
  // Streak state
  const [streakData, setStreakData] = useState(null);
  
  // Get locally cached profile for instant display
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
  
  // Load streak data
  useEffect(() => {
    const loadStreak = async () => {
      if (!effectiveProfile?.id) {
        console.log('[PlayerProfileCard] No profile ID for streak');
        return;
      }
      
      try {
        console.log('[PlayerProfileCard] Loading streak for:', effectiveProfile.id);
        const result = await streakService.getStreak(effectiveProfile.id);
        
        console.log('[PlayerProfileCard] Streak result:', result);
        
        if (result.data && !result.error) {
          console.log('[PlayerProfileCard] Streak loaded:', result.data);
          setStreakData(result.data);
        } else if (result.error) {
          console.warn('[PlayerProfileCard] Streak load error:', result.error);
        }
      } catch (err) {
        console.error('[PlayerProfileCard] Error loading streak:', err);
      }
    };
    
    loadStreak();
  }, [effectiveProfile?.id]);
  
  // Load achievement counts
  useEffect(() => {
    const loadAchievements = async () => {
      if (!effectiveProfile?.id) {
        console.log('[PlayerProfileCard] No profile ID for achievements');
        return;
      }
      
      try {
        console.log('[PlayerProfileCard] Loading achievements for:', effectiveProfile.id);
        
        const result = await achievementService.getAchievementsWithStatus(effectiveProfile.id);
        console.log('[PlayerProfileCard] Achievement result:', result);
        
        if (result.data && result.data.length > 0) {
          const unlocked = result.data.filter(a => a.unlocked);
          const total = result.data.length;
          console.log('[PlayerProfileCard] Achievements loaded:', { unlocked: unlocked.length, total });
          setAchievementCount({ unlocked: unlocked.length, total });
        }
      } catch (err) {
        console.error('[PlayerProfileCard] Error loading achievements:', err);
      }
    };
    
    loadAchievements();
  }, [effectiveProfile?.id]);
  
  // Pre-compute rgba values for the tier color
  const glowRgba = {
    '10': hexToRgba(glowColor, 0.10),
    '20': hexToRgba(glowColor, 0.20),
    '30': hexToRgba(glowColor, 0.30),
    '40': hexToRgba(glowColor, 0.40),
    '50': hexToRgba(glowColor, 0.50),
  };
  
  // Offline mode card
  if (isOfflineMode) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
        style={{
          background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.4), rgba(51, 65, 85, 0.3))',
          border: '1px solid rgba(100, 116, 139, 0.3)',
        }}
      >
        <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center">
          <WifiOff size={24} className="text-slate-500" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-slate-300">Offline Mode</div>
          <div className="text-xs text-slate-500">Tap to sign in</div>
        </div>
        <ChevronRight size={20} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }
  
  // Show login prompt if not authenticated
  if (!isAuthenticated && sessionReady && !authLoading && !effectiveProfile) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(34, 211, 238, 0.05))',
          border: '1px solid rgba(34, 211, 238, 0.3)',
        }}
      >
        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <LogIn size={24} className="text-cyan-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-cyan-300">Sign In</div>
          <div className="text-xs text-slate-400">Play online & track stats</div>
        </div>
        <ChevronRight size={20} className="text-cyan-400/70 group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }
  
  // Show loading state only if no cached profile
  if ((authLoading || !sessionReady) && !effectiveProfile) {
    return (
      <div 
        className="w-full flex items-center gap-3 p-3 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(34, 211, 238, 0.05))',
          border: '1px solid rgba(34, 211, 238, 0.2)',
        }}
      >
        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <Loader size={24} className="text-cyan-400 animate-spin" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-slate-400">Loading...</div>
          <div className="text-xs text-slate-500">Please wait</div>
        </div>
      </div>
    );
  }
  
  // Use effective profile (cached or fresh)
  const displayName = effectiveProfile?.username || effectiveProfile?.display_name || 'Player';
  
  return (
    <>
      {/* Main Profile Card */}
      <button
        onClick={onViewStats || onClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${glowRgba['20']}, ${glowRgba['10']})`,
          border: `1px solid ${glowRgba['30']}`,
          boxShadow: `0 4px 20px ${glowRgba['20']}, inset 0 1px 0 ${glowRgba['20']}`,
        }}
      >
        {/* Tier Icon */}
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${glowRgba['30']}, ${glowRgba['10']})`,
            border: `1px solid ${glowRgba['40']}`,
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
          <div className="flex items-center gap-2 flex-wrap">
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
            {/* Streak badge */}
            {streakData && streakData.current_streak > 0 && (
              <StreakBadge 
                streak={streakData.current_streak} 
                status={streakData.streak_status}
              />
            )}
          </div>
        </div>
        
        {/* Arrow */}
        <ChevronRight 
          size={20} 
          className="group-hover:translate-x-0.5 transition-all flex-shrink-0" 
          style={{ color: glowColor, opacity: 0.7 }} 
        />
      </button>
      
      {/* Rating Info & Achievements Row */}
      <div className="flex items-center gap-2 mt-2">
        {/* Rating Info Button */}
        <button
          onClick={() => setShowRatingInfo(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all"
          style={{
            background: `linear-gradient(135deg, ${glowRgba['10']}, transparent)`,
            border: `1px solid ${glowRgba['20']}`,
          }}
        >
          <HelpCircle size={14} style={{ color: glowColor, opacity: 0.7 }} />
          <span className="text-xs" style={{ color: glowColor, opacity: 0.8 }}>Rating Info</span>
        </button>
        
        {/* Achievements Button */}
        <button
          onClick={() => setShowAchievements(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all"
          style={{
            background: `linear-gradient(135deg, rgba(251, 191, 36, 0.1), transparent)`,
            border: '1px solid rgba(251, 191, 36, 0.2)',
          }}
        >
          <Trophy size={14} className="text-amber-400/70" />
          <span className="text-xs text-amber-400/80">
            {achievementCount.unlocked}/{achievementCount.total} Achievements
          </span>
        </button>
      </div>
      
      {/* Rating Info Modal */}
      {showRatingInfo && (
        <RatingInfoModal onClose={() => setShowRatingInfo(false)} />
      )}
      
      {/* Achievements Modal */}
      {showAchievements && effectiveProfile?.id && (
        <Achievements
          userId={effectiveProfile.id}
          onClose={() => setShowAchievements(false)}
        />
      )}
    </>
  );
};

export default PlayerProfileCard;
