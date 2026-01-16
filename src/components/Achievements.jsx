// Achievements - View and track achievements
// FIXED v2: Simplified rendering to ensure achievements display
import { useState, useEffect } from 'react';
import { Trophy, Lock, X, ChevronDown, ChevronUp, AlertTriangle, Crown, Medal, Calendar, Flame, Zap, Target, Award, Bot, Gamepad2, User } from 'lucide-react';
import achievementService from '../services/achievementService';

// Icon mapping - achievement.icon is a string like "Crown", map to component
const iconMap = {
  Crown, Medal, Calendar, Flame, Zap, Target, Award, Trophy, Bot, Gamepad2, User,
};

// Rarity colors
const RARITY_COLORS = {
  common: { bg: 'bg-slate-600/20', text: 'text-slate-300', border: 'border-slate-500/40', glow: 'rgba(100,116,139,0.3)' },
  uncommon: { bg: 'bg-green-600/20', text: 'text-green-300', border: 'border-green-500/40', glow: 'rgba(34,197,94,0.3)' },
  rare: { bg: 'bg-blue-600/20', text: 'text-blue-300', border: 'border-blue-500/40', glow: 'rgba(59,130,246,0.3)' },
  epic: { bg: 'bg-purple-600/20', text: 'text-purple-300', border: 'border-purple-500/40', glow: 'rgba(168,85,247,0.3)' },
  legendary: { bg: 'bg-amber-600/20', text: 'text-amber-300', border: 'border-amber-500/40', glow: 'rgba(245,158,11,0.3)' },
};

// Single achievement row component
const AchievementRow = ({ achievement, isExpanded, onToggle }) => {
  const colors = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
  const IconComponent = iconMap[achievement.icon] || Award;
  
  return (
    <div 
      className={`
        rounded-lg border transition-all cursor-pointer mb-2
        ${achievement.unlocked 
          ? `${colors.bg} ${colors.border}` 
          : 'bg-slate-800/30 border-slate-700 opacity-60'
        }
      `}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div 
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${achievement.unlocked ? colors.bg : 'bg-slate-700'}`}
          style={achievement.unlocked ? { boxShadow: `0 0 12px ${colors.glow}` } : {}}
        >
          {achievement.unlocked ? (
            <IconComponent size={20} className={colors.text} />
          ) : (
            <Lock size={16} className="text-slate-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold text-sm ${achievement.unlocked ? colors.text : 'text-slate-500'}`}>
              {achievement.name}
            </h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {achievement.rarity}
            </span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-1">
            {achievement.description}
          </p>
        </div>

        {/* Points */}
        <div className="text-right flex-shrink-0">
          <div className={`font-bold text-sm ${achievement.unlocked ? 'text-amber-400' : 'text-slate-600'}`}>
            +{achievement.points || 0}
          </div>
          <div className="text-[10px] text-slate-500">pts</div>
        </div>
        
        {/* Expand icon */}
        <div className="flex-shrink-0">
          {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-700/50 mt-1 pt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">
              Category: <span className="text-slate-300 capitalize">{achievement.category}</span>
            </span>
            {achievement.unlocked && achievement.unlockedAt && (
              <span className="text-green-400">
                ✓ {new Date(achievement.unlockedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Achievements = ({ userId, onClose, viewOnly = false, playerName = null }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  
  const titleText = viewOnly && playerName ? `${playerName}'s Achievements` : 'Achievements';

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if service method exists
      if (typeof achievementService?.getAchievementsWithStatus !== 'function') {
        console.warn('[Achievements] Service method not found, trying getAllAchievements');
        
        // Fallback to getAllAchievements
        if (typeof achievementService?.getAllAchievements === 'function') {
          const result = await achievementService.getAllAchievements();
          const allAchs = result.data || [];
          setAchievements(allAchs.map(a => ({ ...a, unlocked: false })));
          setStats({
            unlockedCount: 0,
            totalAchievements: allAchs.length,
            earnedPoints: 0,
            completionPercentage: 0
          });
        } else {
          setAchievements([]);
          setStats({ unlockedCount: 0, totalAchievements: 0, earnedPoints: 0, completionPercentage: 0 });
        }
        setLoading(false);
        return;
      }
      
      const achResult = await achievementService.getAchievementsWithStatus(userId);
      const loadedAchievements = achResult.data || [];
      
      console.log('[Achievements] Loaded:', loadedAchievements.length, 'achievements');
      console.log('[Achievements] Sample:', loadedAchievements[0]);
      
      setAchievements(loadedAchievements);
      
      // Calculate stats
      const unlockedCount = loadedAchievements.filter(a => a.unlocked).length;
      const totalAchievements = loadedAchievements.length;
      const earnedPoints = loadedAchievements.filter(a => a.unlocked).reduce((sum, a) => sum + (a.points || 0), 0);
      
      setStats({
        unlockedCount,
        totalAchievements,
        earnedPoints,
        completionPercentage: totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0
      });
      
    } catch (err) {
      console.error('[Achievements] Error:', err);
      setError(err.message);
      setAchievements([]);
      setStats({ unlockedCount: 0, totalAchievements: 0, earnedPoints: 0, completionPercentage: 0 });
    }
    
    setLoading(false);
  };

  // Categories
  const categories = ['all', 'weekly', 'speed', 'puzzle', 'online', 'ai', 'general'];
  
  // Filter achievements
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  // Sort: unlocked first, then by rarity
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return (rarityOrder[a.rarity] || 4) - (rarityOrder[b.rarity] || 4);
  });

  const getCategoryIcon = (cat) => {
    const icons = { weekly: '📅', speed: '⚡', puzzle: '🧩', online: '🌐', ai: '🤖', general: '🎮', all: '🏆' };
    return icons[cat] || '🏆';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-amber-500/30 shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-amber-500/20 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-400" size={24} />
              <h2 className="text-lg font-bold text-amber-300">{titleText}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X size={24} />
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-amber-400">
                  {stats.unlockedCount}/{stats.totalAchievements}
                </div>
                <div className="text-[10px] text-slate-400">Unlocked</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-amber-400">{stats.earnedPoints}</div>
                <div className="text-[10px] text-slate-400">Points</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-amber-400">{stats.completionPercentage}%</div>
                <div className="text-[10px] text-slate-400">Complete</div>
              </div>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex gap-1.5 p-3 border-b border-amber-500/20 overflow-x-auto flex-shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all
                ${selectedCategory === cat 
                  ? 'bg-amber-500 text-slate-900' 
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }
              `}
            >
              {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Achievements List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {error ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto text-amber-400 mb-2" size={40} />
              <p className="text-amber-300 font-medium mb-2">Error Loading</p>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Loading achievements...</p>
            </div>
          ) : sortedAchievements.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="mx-auto text-slate-600 mb-2" size={40} />
              {achievements.length === 0 ? (
                <>
                  <p className="text-slate-400">No achievements available</p>
                  <p className="text-slate-500 text-sm mt-1">Play games to earn achievements!</p>
                </>
              ) : (
                <p className="text-slate-400">No achievements in "{selectedCategory}"</p>
              )}
            </div>
          ) : (
            <div>
              {/* Debug info */}
              <div className="text-[10px] text-slate-600 mb-2">
                Showing {sortedAchievements.length} of {achievements.length} achievements
              </div>
              
              {/* Achievement list */}
              {sortedAchievements.map((achievement) => (
                <AchievementRow
                  key={achievement.id}
                  achievement={achievement}
                  isExpanded={expandedId === achievement.id}
                  onToggle={() => setExpandedId(expandedId === achievement.id ? null : achievement.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Achievement unlock popup
export const AchievementPopup = ({ achievement, onClose }) => {
  const colors = RARITY_COLORS[achievement?.rarity] || RARITY_COLORS.common;
  const IconComponent = iconMap[achievement?.icon] || Award;

  if (!achievement) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-achievement-popup">
      <div 
        className={`${colors.bg} border ${colors.border} rounded-xl p-4 shadow-xl flex items-center gap-4 min-w-[280px]`}
        style={{ boxShadow: `0 0 30px ${colors.glow}` }}
      >
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-black/30">
          <IconComponent size={28} className={colors.text} />
        </div>
        <div className="flex-1">
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wide">
            Achievement Unlocked!
          </div>
          <div className={`font-bold ${colors.text}`}>{achievement.name}</div>
          <div className="text-xs text-slate-400">{achievement.description}</div>
        </div>
        <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <style>{`
        @keyframes achievementPopup {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
          10% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.05); }
          20% { transform: translateX(-50%) translateY(0) scale(1); }
          90% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
        .animate-achievement-popup {
          animation: achievementPopup 4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Achievements;
