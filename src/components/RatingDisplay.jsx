// RatingDisplay - Show ELO rating with tier badge
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Trophy } from 'lucide-react';
import { ratingService } from '../services/ratingService';

const RatingDisplay = ({ userId, rating, showHistory = false, compact = false }) => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const tier = ratingService.getRatingTier(rating || 1200);

  useEffect(() => {
    if (showHistory && userId) {
      loadHistory();
    }
  }, [userId, showHistory]);

  const loadHistory = async () => {
    const [historyResult, statsResult] = await Promise.all([
      ratingService.getRatingHistory(userId, 10),
      ratingService.getRatingStats(userId)
    ]);
    if (historyResult.data) setHistory(historyResult.data);
    if (statsResult.data) setStats(statsResult.data);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`text-lg ${tier.color}`}>{tier.icon}</span>
        <span className="font-bold text-white">{rating || 1200}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      {/* Main rating display */}
      <div 
        className={`p-4 ${showHistory ? 'cursor-pointer hover:bg-slate-800/70' : ''}`}
        onClick={() => showHistory && setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center text-2xl
              bg-gradient-to-br ${getTierGradient(tier.name)}
            `}>
              {tier.icon}
            </div>
            <div>
              <div className="text-sm text-slate-400">{tier.name}</div>
              <div className="text-2xl font-bold text-white">{rating || 1200}</div>
            </div>
          </div>
          
          {showHistory && (
            <ChevronRight 
              size={20} 
              className={`text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          )}
        </div>

        {/* Quick stats */}
        {stats && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-1 text-sm">
              {stats.recentTrend === 'rising' ? (
                <TrendingUp size={14} className="text-green-400" />
              ) : stats.recentTrend === 'falling' ? (
                <TrendingDown size={14} className="text-red-400" />
              ) : (
                <Minus size={14} className="text-slate-400" />
              )}
              <span className={`
                ${stats.recentTrend === 'rising' ? 'text-green-400' : ''}
                ${stats.recentTrend === 'falling' ? 'text-red-400' : ''}
                ${stats.recentTrend === 'stable' ? 'text-slate-400' : ''}
              `}>
                {stats.recentTrend}
              </span>
            </div>
            
            {stats.currentStreak > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-amber-400">🔥</span>
                <span className="text-slate-300">{stats.currentStreak} streak</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating history */}
      {expanded && history.length > 0 && (
        <div className="border-t border-slate-700 p-3 max-h-48 overflow-y-auto">
          <div className="text-xs text-slate-500 mb-2">Recent Games</div>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <div 
                key={entry.id || i}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  {entry.result === 'win' ? (
                    <Trophy size={14} className="text-green-400" />
                  ) : entry.result === 'loss' ? (
                    <span className="text-red-400">✕</span>
                  ) : (
                    <Minus size={14} className="text-slate-400" />
                  )}
                  <span className="text-slate-400 text-xs">
                    vs {entry.opponent_rating}
                  </span>
                </div>
                <div className={`font-mono font-medium ${
                  entry.change > 0 ? 'text-green-400' : 
                  entry.change < 0 ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {entry.change > 0 ? '+' : ''}{entry.change}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Get gradient for tier
function getTierGradient(tierName) {
  switch (tierName) {
    case 'Grandmaster': return 'from-amber-400 to-yellow-600';
    case 'Master': return 'from-purple-400 to-pink-600';
    case 'Expert': return 'from-blue-400 to-indigo-600';
    case 'Advanced': return 'from-cyan-400 to-teal-600';
    case 'Intermediate': return 'from-green-400 to-emerald-600';
    case 'Beginner': return 'from-slate-400 to-slate-600';
    default: return 'from-slate-500 to-slate-700';
  }
}

// Rating change display (for end of game)
export const RatingChange = ({ oldRating, newRating, result }) => {
  const change = newRating - oldRating;
  const oldTier = ratingService.getRatingTier(oldRating);
  const newTier = ratingService.getRatingTier(newRating);
  const tierChanged = oldTier.name !== newTier.name;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <div className="text-sm text-slate-400 mb-2">Rating Change</div>
      
      <div className="flex items-center justify-between">
        <div className="text-slate-500">{oldRating}</div>
        <div className="flex items-center gap-2">
          {change > 0 ? (
            <TrendingUp className="text-green-400" size={20} />
          ) : change < 0 ? (
            <TrendingDown className="text-red-400" size={20} />
          ) : (
            <Minus className="text-slate-400" size={20} />
          )}
          <span className={`text-xl font-bold ${
            change > 0 ? 'text-green-400' : 
            change < 0 ? 'text-red-400' : 'text-slate-400'
          }`}>
            {change > 0 ? '+' : ''}{change}
          </span>
        </div>
        <div className="text-white font-bold">{newRating}</div>
      </div>

      {/* Tier change notification */}
      {tierChanged && (
        <div className={`
          mt-3 p-2 rounded-lg text-center text-sm font-medium
          ${newTier.name > oldTier.name 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
          }
        `}>
          {change > 0 ? '🎉 Promoted to' : '📉 Demoted to'} {newTier.icon} {newTier.name}!
        </div>
      )}
    </div>
  );
};

// Mini rating badge
export const RatingBadge = ({ rating, size = 'md' }) => {
  const tier = ratingService.getRatingTier(rating || 1200);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full font-medium
      bg-slate-800 border border-slate-700
      ${sizeClasses[size]}
    `}>
      <span className={tier.color}>{tier.icon}</span>
      <span className="text-white">{rating || 1200}</span>
    </span>
  );
};

export default RatingDisplay;
