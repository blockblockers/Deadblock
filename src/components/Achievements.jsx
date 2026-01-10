// Achievements.jsx - Full-screen achievements display
// v7.12 - FIXES:
// - Improved scroll handling for mobile
// - Fixed touch scroll on achievement list
// - Better layout with flex container
// - Highlights NEW achievements (unlocked since last view)
// Place in src/components/Achievements.jsx

import { useState, useEffect } from 'react';
import { X, Trophy, Lock, ChevronDown, ChevronUp, Loader, Award, Star, Zap, Target, Crown, Medal, Flame, Sparkles } from 'lucide-react';
import achievementService from '../services/achievementService';
import { soundManager } from '../utils/soundManager';

// Rarity colors
const RARITY_COLORS = {
  legendary: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', glow: 'rgba(251,191,36,0.3)' },
  epic: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', glow: 'rgba(168,85,247,0.3)' },
  rare: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', glow: 'rgba(59,130,246,0.3)' },
  uncommon: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400', glow: 'rgba(34,197,94,0.3)' },
  common: { bg: 'bg-slate-500/20', border: 'border-slate-500/50', text: 'text-slate-400', glow: 'rgba(100,116,139,0.3)' }
};

// Icon components
const iconComponents = {
  Trophy, Award, Star, Zap, Target, Crown, Medal, Flame
};

const Achievements = ({ userId, playerName, onClose }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [lastViewedTime, setLastViewedTime] = useState(null);

  const titleText = playerName 
    ? `${playerName}'s Achievements` 
    : 'Achievements';

  useEffect(() => {
    // Get last viewed time for highlighting new achievements
    const storedTime = localStorage.getItem(`deadblock_achievements_viewed_${userId}`);
    setLastViewedTime(storedTime ? new Date(storedTime) : null);
    
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (typeof achievementService?.getAchievementsWithStatus !== 'function') {
        console.warn('[Achievements] Achievement service method not found');
        setAchievements([]);
        setStats({ unlockedCount: 0, totalAchievements: 0, earnedPoints: 0, completionPercentage: 0 });
        setLoading(false);
        return;
      }
      
      const achResult = await achievementService.getAchievementsWithStatus(userId);
      
      if (achResult.error && achResult.error !== 'Not authenticated') {
        console.warn('[Achievements] Error loading achievements:', achResult.error);
      }
      
      setAchievements(achResult.data || []);
      
      // Calculate stats
      if (typeof achievementService?.getAchievementStats === 'function') {
        const statsResult = await achievementService.getAchievementStats(userId);
        if (statsResult.data) {
          setStats(statsResult.data);
        } else {
          const unlockedCount = (achResult.data || []).filter(a => a.unlocked).length;
          const totalAchievements = (achResult.data || []).length;
          const earnedPoints = (achResult.data || []).filter(a => a.unlocked).reduce((sum, a) => sum + (a.points || 0), 0);
          setStats({
            unlockedCount,
            totalAchievements,
            earnedPoints,
            completionPercentage: totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0
          });
        }
      }
    } catch (err) {
      console.error('Error loading achievements:', err);
      setAchievements([]);
      setStats({ unlockedCount: 0, totalAchievements: 0, earnedPoints: 0, completionPercentage: 0 });
    }
    
    setLoading(false);
  };

  // Check if achievement is newly unlocked (since last view)
  const isNewAchievement = (achievement) => {
    if (!achievement.unlocked || !lastViewedTime) return false;
    const unlockedAt = achievement.unlockedAt || achievement.unlocked_at;
    if (!unlockedAt) return false;
    return new Date(unlockedAt) > lastViewedTime;
  };

  // Group achievements by category
  const categories = ['all', 'weekly', 'speed', 'puzzle', 'online', 'ai', 'general'];
  
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  // Sort: NEW first, then unlocked, then by rarity
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    // New achievements first
    const aIsNew = isNewAchievement(a);
    const bIsNew = isNewAchievement(b);
    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;
    
    // Then unlocked
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    
    // Then by rarity
    return (rarityOrder[a.rarity] || 4) - (rarityOrder[b.rarity] || 4);
  });

  // Count new achievements
  const newCount = achievements.filter(a => isNewAchievement(a)).length;

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'weekly': return '📅';
      case 'speed': return '⚡';
      case 'puzzle': return '🧩';
      case 'online': return '🌐';
      case 'ai': return '🤖';
      case 'general': return '🎮';
      default: return '🏆';
    }
  };

  const toggleExpand = (id) => {
    soundManager.playClickSound?.('select');
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col border border-amber-500/30 shadow-xl">
        {/* Header - Fixed */}
        <div className="p-4 border-b border-amber-500/20 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-400" size={24} />
              <h2 className="text-lg font-bold text-amber-300">{titleText}</h2>
              {newCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-slate-900 rounded-full animate-pulse">
                  {newCount} NEW
                </span>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {stats.unlockedCount}/{stats.totalAchievements}
                </div>
                <div className="text-xs text-slate-400">Unlocked</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {stats.earnedPoints}
                </div>
                <div className="text-xs text-slate-400">Points</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {stats.completionPercentage}%
                </div>
                <div className="text-xs text-slate-400">Complete</div>
              </div>
            </div>
          )}
        </div>

        {/* Category Filter - Fixed */}
        <div 
          className="flex gap-2 p-3 border-b border-amber-500/20 overflow-x-auto shrink-0"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                soundManager.playClickSound?.('select');
                setSelectedCategory(cat);
              }}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${selectedCategory === cat 
                  ? 'bg-amber-500 text-slate-900' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'}
              `}
            >
              {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Achievements List - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain min-h-0"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            transform: 'translateZ(0)',
            willChange: 'scroll-position'
          }}
        >
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-amber-400" size={32} />
              </div>
            ) : sortedAchievements.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="mx-auto text-slate-600 mb-3" size={48} />
                <p className="text-slate-400">No achievements in this category</p>
              </div>
            ) : (
              sortedAchievements.map(achievement => {
                const colors = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
                const isExpanded = expandedId === achievement.id;
                const IconComponent = iconComponents[achievement.icon] || Award;
                const isNew = isNewAchievement(achievement);
                
                return (
                  <button
                    key={achievement.id}
                    onClick={() => toggleExpand(achievement.id)}
                    className={`
                      w-full text-left rounded-xl border transition-all relative
                      ${achievement.unlocked 
                        ? `${colors.bg} ${colors.border}` 
                        : 'bg-slate-800/30 border-slate-700/30 opacity-60'}
                      ${isNew ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' : ''}
                    `}
                    style={achievement.unlocked ? { boxShadow: `0 0 20px ${colors.glow}` } : {}}
                  >
                    {/* NEW badge */}
                    {isNew && (
                      <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-slate-900 text-xs font-bold rounded-full shadow-lg">
                        <Sparkles size={10} />
                        NEW
                      </div>
                    )}
                    
                    {/* Main row */}
                    <div className="p-3 flex items-center gap-3">
                      {/* Icon */}
                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center shrink-0
                        ${achievement.unlocked ? colors.bg : 'bg-slate-800/50'}
                      `}>
                        {achievement.unlocked ? (
                          achievement.icon ? (
                            <span className="text-2xl">{achievement.icon}</span>
                          ) : (
                            <IconComponent size={24} className={colors.text} />
                          )
                        ) : (
                          <Lock size={20} className="text-slate-600" />
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold ${achievement.unlocked ? 'text-white' : 'text-slate-500'}`}>
                          {achievement.name}
                        </div>
                        <div className={`text-sm ${achievement.unlocked ? 'text-slate-400' : 'text-slate-600'}`}>
                          {achievement.description}
                        </div>
                      </div>
                      
                      {/* Points & expand */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${achievement.unlocked ? colors.text : 'text-slate-600'}`}>
                            +{achievement.points}
                          </div>
                          <div className="text-xs text-slate-500">pts</div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-slate-700/50">
                        <div className="flex justify-between items-center mt-2 text-xs">
                          <span className="text-slate-400">
                            Category: <span className="text-slate-300">{getCategoryIcon(achievement.category)} {achievement.category}</span>
                          </span>
                          {achievement.unlocked && (achievement.unlockedAt || achievement.unlocked_at) && (
                            <span className="text-green-400">
                              ✓ Unlocked {new Date(achievement.unlockedAt || achievement.unlocked_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Rarity: <span className={colors.text}>{achievement.rarity}</span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Achievement unlock popup
export const AchievementPopup = ({ achievement, onClose }) => {
  const colors = RARITY_COLORS[achievement?.rarity] || RARITY_COLORS.common;

  if (!achievement) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div 
        className={`
          ${colors.bg} border ${colors.border} rounded-xl p-4 shadow-xl
          flex items-center gap-4 min-w-[280px]
        `}
        style={{ boxShadow: `0 0 30px ${colors.glow}` }}
      >
        <div className="text-4xl">{achievement.icon || '🏆'}</div>
        <div>
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wide">
            Achievement Unlocked!
          </div>
          <div className="text-white font-bold">{achievement.name}</div>
          <div className="text-sm text-slate-400">+{achievement.points} points</div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Achievements;
