// AchievementsDisplay.jsx - Achievements display for PlayerStatsModal
// v7.12 - FIXED: Now uses getAchievementsWithStatus for consistency with other screens
// Place in src/components/AchievementsDisplay.jsx

import { useState, useEffect } from 'react';
import { Trophy, Lock, ChevronDown, ChevronUp, Award, Star, Zap, Target, Crown, Medal, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import achievementService from '../services/achievementService';
import { soundManager } from '../utils/soundManager';

// Rarity colors
const RARITY_COLORS = {
  legendary: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
  epic: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  rare: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  uncommon: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
  common: { bg: 'bg-slate-500/20', border: 'border-slate-500/50', text: 'text-slate-400' }
};

// Icon components
const iconComponents = {
  Trophy, Award, Star, Zap, Target, Crown, Medal, Flame
};

// Single achievement badge
const AchievementBadge = ({ achievement, showDetails = false }) => {
  const colors = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
  const IconComponent = iconComponents[achievement.iconName] || Award;
  const isUnlocked = achievement.unlocked;
  
  return (
    <div className={`
      p-3 rounded-lg border transition-all
      ${isUnlocked 
        ? `${colors.bg} ${colors.border}` 
        : 'bg-slate-800/30 border-slate-700/30 opacity-60'}
    `}>
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center shrink-0
          ${isUnlocked ? colors.bg : 'bg-slate-800/50'}
        `}>
          {isUnlocked ? (
            achievement.icon ? (
              <span className="text-xl">{achievement.icon}</span>
            ) : (
              <IconComponent size={20} className={colors.text} />
            )
          ) : (
            <Lock size={16} className="text-slate-600" />
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
            {achievement.name}
          </div>
          {showDetails && (
            <div className={`text-xs mt-0.5 ${isUnlocked ? 'text-slate-400' : 'text-slate-600'}`}>
              {achievement.description}
            </div>
          )}
        </div>
        
        {/* Points */}
        <div className={`text-xs font-bold px-2 py-1 rounded ${
          isUnlocked ? `${colors.bg} ${colors.text}` : 'bg-slate-800/50 text-slate-600'
        }`}>
          +{achievement.points}
        </div>
      </div>
      
      {/* Earned date */}
      {isUnlocked && (achievement.unlockedAt || achievement.unlocked_at) && (
        <div className="text-xs text-slate-500 mt-2 pl-13">
          Earned {new Date(achievement.unlockedAt || achievement.unlocked_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

// Category section with expand/collapse
const AchievementCategory = ({ title, achievements, expanded, onToggle }) => {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalPoints = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + (a.points || 0), 0);
  
  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-medium capitalize">{title}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
            {unlockedCount}/{achievements.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {totalPoints > 0 && (
            <span className="text-xs text-amber-400">+{totalPoints} pts</span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </div>
      </button>
      
      {expanded && (
        <div className="p-3 bg-slate-900/50 space-y-2">
          {achievements.map(achievement => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              showDetails={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main achievements display component
const AchievementsDisplay = ({ compact = false }) => {
  const { profile } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);
  
  useEffect(() => {
    if (profile?.id) {
      loadAchievements();
    }
  }, [profile?.id]);
  
  const loadAchievements = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    
    try {
      // Use getAchievementsWithStatus for consistency with other screens
      if (typeof achievementService?.getAchievementsWithStatus === 'function') {
        const result = await achievementService.getAchievementsWithStatus(profile.id);
        console.log('[AchievementsDisplay] Loaded achievements:', result.data?.length || 0);
        setAchievements(result.data || []);
      } else {
        console.warn('[AchievementsDisplay] Achievement service not available');
        setAchievements([]);
      }
    } catch (err) {
      console.error('[AchievementsDisplay] Error loading achievements:', err);
      setAchievements([]);
    }
    
    setLoading(false);
  };
  
  const toggleCategory = (category) => {
    soundManager.playClickSound?.('select');
    setExpandedCategory(expandedCategory === category ? null : category);
  };
  
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }
  
  // Calculate stats
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const totalPoints = unlockedAchievements.reduce((sum, a) => sum + (a.points || 0), 0);
  
  // Group achievements by category
  const categories = {};
  achievements.forEach(achievement => {
    const cat = achievement.category || 'general';
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(achievement);
  });
  
  // Compact view - just show summary and recent achievements
  if (compact) {
    const recentUnlocked = unlockedAchievements
      .sort((a, b) => {
        const dateA = new Date(a.unlockedAt || a.unlocked_at || 0);
        const dateB = new Date(b.unlockedAt || b.unlocked_at || 0);
        return dateB - dateA;
      })
      .slice(0, 3);
    
    return (
      <div>
        {/* Summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" />
            <span className="text-slate-400 text-sm">Achievements</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{unlockedAchievements.length}</span>
            <span className="text-slate-500">/ {achievements.length}</span>
            <span className="text-xs text-amber-400 ml-2">+{totalPoints} pts</span>
          </div>
        </div>
        
        {/* Recent badges */}
        {recentUnlocked.length > 0 ? (
          <div className="space-y-2">
            {recentUnlocked.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                showDetails={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500 text-sm">
            No achievements yet - keep playing!
          </div>
        )}
      </div>
    );
  }
  
  // Full view - all categories
  const categoryOrder = ['weekly', 'speed', 'puzzle', 'online', 'ai', 'general'];
  const categoryTitles = {
    weekly: 'Weekly Challenges',
    speed: 'Speed Puzzle',
    puzzle: 'Puzzle Mode',
    online: 'Online Matches',
    ai: 'VS AI',
    general: 'General'
  };
  
  return (
    <div>
      {/* Header with total */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl border border-amber-500/30">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-amber-400" />
          <span className="text-white font-bold">Achievements</span>
        </div>
        <div className="text-right">
          <div className="text-amber-300 font-bold">{unlockedAchievements.length} / {achievements.length}</div>
          <div className="text-xs text-amber-400/70">{totalPoints} points</div>
        </div>
      </div>
      
      {/* Categories */}
      <div className="space-y-2">
        {categoryOrder.map(category => {
          const categoryAchievements = categories[category];
          if (!categoryAchievements?.length) return null;
          return (
            <AchievementCategory
              key={category}
              title={categoryTitles[category] || category}
              achievements={categoryAchievements}
              expanded={expandedCategory === category}
              onToggle={() => toggleCategory(category)}
            />
          );
        })}
      </div>
      
      {/* Empty state */}
      {achievements.length === 0 && (
        <div className="text-center py-8">
          <Trophy size={40} className="mx-auto text-slate-600 mb-2" />
          <p className="text-slate-400">No achievements available</p>
          <p className="text-slate-500 text-sm mt-1">Play games to start earning achievements!</p>
        </div>
      )}
    </div>
  );
};

export default AchievementsDisplay;
