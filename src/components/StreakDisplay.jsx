// StreakDisplay Component - Shows play streak info in profiles
// v7.12: New component for game play streak feature
import { useState, useEffect } from 'react';
import { Flame, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { streakService } from '../services/streakService';

/**
 * Compact streak display for profile cards
 * Shows current streak with flame icon and status indicator
 */
export const StreakBadge = ({ streak, longestStreak, status, size = 'normal' }) => {
  const statusStyle = streakService.getStreakStatusStyle(status);
  const isCompact = size === 'compact';
  
  if (!streak && streak !== 0) return null;
  
  return (
    <div className={`
      flex items-center gap-2 rounded-lg px-3 py-2
      ${statusStyle.bgColor} border ${statusStyle.borderColor}
    `}>
      <div className={`${isCompact ? 'text-lg' : 'text-2xl'}`}>
        {status === 'played_today' ? '🔥' : status === 'at_risk' ? '⚠️' : '🔥'}
      </div>
      <div>
        <div className={`font-bold ${statusStyle.color} ${isCompact ? 'text-sm' : 'text-lg'}`}>
          {streak} day{streak !== 1 ? 's' : ''}
        </div>
        {!isCompact && longestStreak > streak && (
          <div className="text-xs text-slate-500">
            Best: {longestStreak} days
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Full streak display with progress to next milestone
 * Use in player stats modal or full profile view
 */
export const StreakProgress = ({ streak, longestStreak, status, showMilestone = true }) => {
  const statusStyle = streakService.getStreakStatusStyle(status);
  const nextMilestone = showMilestone ? streakService.getNextMilestone(streak || 0) : null;
  
  return (
    <div className={`
      rounded-xl p-4 border
      ${statusStyle.bgColor} ${statusStyle.borderColor}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={20} className={statusStyle.color} />
          <span className="text-white font-bold">Play Streak</span>
        </div>
        <div className={`text-xs px-2 py-1 rounded ${statusStyle.bgColor} ${statusStyle.color}`}>
          {statusStyle.message}
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${statusStyle.color}`}>
            {streak || 0}
          </div>
          <div className="text-xs text-slate-400">Current Streak</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {longestStreak || 0}
          </div>
          <div className="text-xs text-slate-400">Longest Streak</div>
        </div>
      </div>
      
      {/* Next Milestone Progress */}
      {nextMilestone && (
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{nextMilestone.icon}</span>
              <span className="text-sm text-slate-300">{nextMilestone.name}</span>
            </div>
            <span className="text-xs text-slate-400">
              {nextMilestone.daysRemaining} days to go
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
              style={{ width: `${nextMilestone.progress}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1 text-right">
            {nextMilestone.progress}% complete
          </div>
        </div>
      )}
      
      {/* All milestones achieved */}
      {!nextMilestone && (streak || 0) >= 620 && (
        <div className="bg-amber-900/30 rounded-lg p-3 text-center border border-amber-500/30">
          <Trophy size={24} className="mx-auto text-amber-400 mb-2" />
          <div className="text-amber-300 font-bold">All Milestones Achieved!</div>
          <div className="text-xs text-amber-400/70">You are a true Deadblock legend</div>
        </div>
      )}
    </div>
  );
};

/**
 * Inline streak display for compact spaces
 * Shows just the number with flame icon
 */
export const StreakInline = ({ streak, status }) => {
  const statusStyle = streakService.getStreakStatusStyle(status);
  
  return (
    <div className={`inline-flex items-center gap-1 ${statusStyle.color}`}>
      <Flame size={14} />
      <span className="font-bold">{streak || 0}</span>
    </div>
  );
};

/**
 * Hook to load streak data for a user
 */
export const useStreak = (userId) => {
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    const loadStreak = async () => {
      setLoading(true);
      const { data, error } = await streakService.getStreak(userId);
      
      if (error) {
        setError(error);
      } else {
        setStreakData(data);
      }
      setLoading(false);
    };
    
    loadStreak();
  }, [userId]);
  
  return { streakData, loading, error, refetch: () => {
    if (userId) {
      setLoading(true);
      streakService.getStreak(userId).then(({ data }) => {
        setStreakData(data);
        setLoading(false);
      });
    }
  }};
};

/**
 * Standalone component that loads its own streak data
 * Useful for embedding in profiles
 */
const StreakDisplay = ({ userId, variant = 'full', className = '' }) => {
  const { streakData, loading, error } = useStreak(userId);
  
  if (loading) {
    return (
      <div className={`animate-pulse bg-slate-800/50 rounded-lg h-20 ${className}`} />
    );
  }
  
  if (error || !streakData) {
    return null; // Silently fail if streak data unavailable
  }
  
  const { current_streak, longest_streak, streak_status } = streakData;
  
  if (variant === 'badge') {
    return (
      <StreakBadge 
        streak={current_streak} 
        longestStreak={longest_streak}
        status={streak_status}
        className={className}
      />
    );
  }
  
  if (variant === 'inline') {
    return (
      <StreakInline 
        streak={current_streak}
        status={streak_status}
      />
    );
  }
  
  if (variant === 'compact') {
    return (
      <StreakBadge 
        streak={current_streak} 
        longestStreak={longest_streak}
        status={streak_status}
        size="compact"
        className={className}
      />
    );
  }
  
  // Full variant
  return (
    <StreakProgress 
      streak={current_streak}
      longestStreak={longest_streak}
      status={streak_status}
      className={className}
    />
  );
};

export default StreakDisplay;
