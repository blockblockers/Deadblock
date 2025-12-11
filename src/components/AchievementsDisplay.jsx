// Achievements Display - Shows user achievements in profile
import { useState, useEffect } from 'react';
import { Crown, Medal, Calendar, Flame, Zap, Target, Award, Trophy, Bot, Gamepad2, User, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { achievementService } from '../services/achievementService';
import { useAuth } from '../contexts/AuthContext';
import { soundManager } from '../utils/soundManager';

// Icon mapping
const iconMap = {
  Crown,
  Medal,
  Calendar,
  Flame,
  Zap,
  Target,
  Award,
  Trophy,
  Bot,
  Gamepad2,
  User,
};

// Color mapping for Tailwind
const colorMap = {
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-400', glow: 'shadow-cyan-500/30' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', glow: 'shadow-orange-500/30' },
  red: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-red-500/30' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400', glow: 'shadow-green-500/30' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400', glow: 'shadow-purple-500/30' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400', glow: 'shadow-blue-500/30' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-400', glow: 'shadow-pink-500/30' },
};

// Single achievement badge
const AchievementBadge = ({ achievement, earned = false, showDetails = false }) => {
  const Icon = iconMap[achievement.icon] || Award;
  const colors = colorMap[achievement.color] || colorMap.cyan;
  
  return (
    <div 
      className={`relative p-3 rounded-xl border transition-all ${
        earned 
          ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}` 
          : 'bg-slate-800/30 border-slate-700/30 opacity-50'
      }`}
    >
      {/* Lock overlay for unearned */}
      {!earned && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/50">
          <Lock size={16} className="text-slate-600" />
        </div>
      )}
      
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          earned ? colors.bg : 'bg-slate-800/50'
        }`}>
          <Icon size={20} className={earned ? colors.text : 'text-slate-600'} />
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm ${earned ? 'text-white' : 'text-slate-500'}`}>
            {achievement.name}
          </div>
          {showDetails && (
            <div className={`text-xs mt-0.5 ${earned ? 'text-slate-400' : 'text-slate-600'}`}>
              {achievement.description}
            </div>
          )}
        </div>
        
        {/* Points */}
        <div className={`text-xs font-bold px-2 py-1 rounded ${
          earned ? `${colors.bg} ${colors.text}` : 'bg-slate-800/50 text-slate-600'
        }`}>
          +{achievement.points}
        </div>
      </div>
      
      {/* Earned date */}
      {earned && achievement.earned_at && (
        <div className="text-xs text-slate-500 mt-2 pl-13">
          Earned {new Date(achievement.earned_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

// Category section
const AchievementCategory = ({ title, achievements, earnedIds, expanded, onToggle }) => {
  const earnedCount = achievements.filter(a => earnedIds.has(a.id)).length;
  const totalPoints = achievements.reduce((sum, a) => earnedIds.has(a.id) ? sum + a.points : sum, 0);
  
  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-medium capitalize">{title}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
            {earnedCount}/{achievements.length}
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
              earned={earnedIds.has(achievement.id)}
              showDetails={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main achievements display
const AchievementsDisplay = ({ compact = false }) => {
  const { profile } = useAuth();
  const [userAchievements, setUserAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
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
    
    const [userResult, allResult] = await Promise.all([
      achievementService.getUserAchievements(profile.id),
      achievementService.getAllAchievements()
    ]);
    
    setUserAchievements(userResult.data || []);
    setAllAchievements(allResult.data || []);
    setLoading(false);
  };
  
  const toggleCategory = (category) => {
    soundManager.playClickSound('select');
    setExpandedCategory(expandedCategory === category ? null : category);
  };
  
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }
  
  // Create set of earned achievement IDs (old service has nested achievement object)
  const earnedIds = new Set(userAchievements.map(a => a.achievement?.id).filter(Boolean));
  
  // Group achievements by category
  const categories = {};
  allAchievements.forEach(achievement => {
    if (!categories[achievement.category]) {
      categories[achievement.category] = [];
    }
    categories[achievement.category].push(achievement);
  });
  
  // Calculate total points
  const totalPoints = userAchievements.reduce((sum, a) => {
    return sum + (a.achievement?.points || 0);
  }, 0);
  
  // Compact view - just show summary and recent achievements
  if (compact) {
    const recentAchievements = userAchievements.slice(0, 3);
    
    return (
      <div>
        {/* Summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" />
            <span className="text-slate-400 text-sm">Achievements</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{userAchievements.length}</span>
            <span className="text-slate-500">/ {allAchievements.length}</span>
            <span className="text-xs text-amber-400 ml-2">+{totalPoints} pts</span>
          </div>
        </div>
        
        {/* Recent badges */}
        {recentAchievements.length > 0 ? (
          <div className="space-y-2">
            {recentAchievements.map(ua => {
              const achievement = ua.achievement;
              if (!achievement) return null;
              return (
                <AchievementBadge
                  key={achievement.id}
                  achievement={{ ...achievement, earned_at: ua.unlocked_at }}
                  earned={true}
                  showDetails={false}
                />
              );
            })}
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
          <div className="text-amber-300 font-bold">{userAchievements.length} / {allAchievements.length}</div>
          <div className="text-xs text-amber-400/70">{totalPoints} points</div>
        </div>
      </div>
      
      {/* Categories */}
      <div className="space-y-2">
        {categoryOrder.map(category => {
          if (!categories[category]?.length) return null;
          return (
            <AchievementCategory
              key={category}
              title={categoryTitles[category] || category}
              achievements={categories[category]}
              earnedIds={earnedIds}
              expanded={expandedCategory === category}
              onToggle={() => toggleCategory(category)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsDisplay;
