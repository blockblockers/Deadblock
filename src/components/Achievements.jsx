// Achievements Modal - View all achievements with categories and progress
// v7.12: Fixed scroll getting stuck at bottom on iOS/mobile
// v7.12: Added 'dedication' category for play streak achievements
import { useState, useEffect, useRef } from 'react';
import { Trophy, X, Lock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import achievementService from '../services/achievementService';
import { soundManager } from '../utils/soundManager';

// Rarity colors
const RARITY_COLORS = {
  common: {
    bg: 'bg-slate-700/50',
    border: 'border-slate-600',
    text: 'text-slate-300',
    glow: 'rgba(148, 163, 184, 0.3)'
  },
  uncommon: {
    bg: 'bg-green-900/50',
    border: 'border-green-600',
    text: 'text-green-300',
    glow: 'rgba(34, 197, 94, 0.3)'
  },
  rare: {
    bg: 'bg-blue-900/50',
    border: 'border-blue-500',
    text: 'text-blue-300',
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  epic: {
    bg: 'bg-purple-900/50',
    border: 'border-purple-500',
    text: 'text-purple-300',
    glow: 'rgba(168, 85, 247, 0.4)'
  },
  legendary: {
    bg: 'bg-amber-900/50',
    border: 'border-amber-500',
    text: 'text-amber-300',
    glow: 'rgba(245, 158, 11, 0.5)'
  }
};

const Achievements = ({ userId, onClose, playerName }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const scrollContainerRef = useRef(null);

  const titleText = playerName ? `${playerName}'s Achievements` : 'Achievements';

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  // Reset scroll position when category changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedCategory]);

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

  // Group achievements by category - added 'dedication' for streaks
  const categories = ['all', 'dedication', 'weekly', 'speed', 'puzzle', 'online', 'ai', 'general'];
  
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  // Sort: unlocked first, then by rarity
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'dedication': return '🔥';
      case 'weekly': return '📅';
      case 'speed': return '⚡';
      case 'puzzle': return '🧩';
      case 'online': return '🌐';
      case 'ai': return '🤖';
      case 'general': return '🎮';
      default: return '🏆';
    }
  };

  // Handle scroll touch events to prevent getting stuck
  const handleTouchMove = (e) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const touchStartY = parseFloat(container.dataset.touchStartY || '0');
    const touchCurrentY = e.touches[0].clientY;
    const isScrollingUp = touchCurrentY > touchStartY;
    const isScrollingDown = touchCurrentY < touchStartY;
    
    const isAtTop = scrollTop <= 1;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
    
    // Prevent parent scroll but allow this container to scroll
    if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
      // At boundary, scrolling in blocked direction - prevent but don't get stuck
      e.stopPropagation();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-amber-500/30 shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="p-4 border-b border-amber-500/20 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-400" size={24} />
              <h2 className="text-lg font-bold text-amber-300">{titleText}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
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
        <div className="flex gap-2 p-3 border-b border-amber-500/20 overflow-x-auto flex-shrink-0 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                soundManager.playClickSound('select');
                setSelectedCategory(cat);
              }}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${selectedCategory === cat 
                  ? 'bg-amber-500 text-slate-900' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
                }
              `}
            >
              {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Achievements List - Scrollable with iOS fix */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            minHeight: 0,
          }}
          onTouchStart={(e) => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.dataset.touchStartY = e.touches[0].clientY;
            }
          }}
          onTouchMove={handleTouchMove}
        >
          <div className="p-4">
            {error ? (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto text-amber-400 mb-2" size={40} />
                <p className="text-amber-300 font-medium mb-2">Feature Not Available</p>
                <p className="text-slate-400 text-sm">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
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
                    <p className="text-slate-400">No achievements available yet</p>
                    <p className="text-slate-500 text-sm mt-1">Play games to start earning achievements!</p>
                  </>
                ) : (
                  <p className="text-slate-400">No achievements in this category</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {sortedAchievements.map(achievement => {
                  const colors = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
                  const isExpanded = expandedId === achievement.id;
                  
                  return (
                    <div 
                      key={achievement.id}
                      className={`
                        rounded-lg border transition-all cursor-pointer
                        ${achievement.unlocked 
                          ? `${colors.bg} ${colors.border}` 
                          : 'bg-slate-800/30 border-slate-700 opacity-60'
                        }
                      `}
                      onClick={() => setExpandedId(isExpanded ? null : achievement.id)}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Icon */}
                        <div className={`
                          w-12 h-12 rounded-lg flex items-center justify-center text-2xl
                          ${achievement.unlocked 
                            ? colors.bg 
                            : 'bg-slate-700'
                          }
                        `}
                        style={achievement.unlocked ? { boxShadow: `0 0 15px ${colors.glow}` } : {}}
                        >
                          {achievement.unlocked ? achievement.icon : <Lock size={20} className="text-slate-500" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-bold truncate ${achievement.unlocked ? colors.text : 'text-slate-500'}`}>
                              {achievement.name}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                              {achievement.rarity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {achievement.description}
                          </p>
                        </div>

                        {/* Points & expand */}
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className={`font-bold ${achievement.unlocked ? 'text-amber-400' : 'text-slate-600'}`}>
                              +{achievement.points}
                            </div>
                            <div className="text-xs text-slate-500">pts</div>
                          </div>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-slate-700/50">
                          <div className="flex justify-between items-center mt-2 text-xs">
                            <span className="text-slate-400">
                              Category: <span className="text-slate-300">{getCategoryIcon(achievement.category)} {achievement.category}</span>
                            </span>
                            {achievement.unlocked && achievement.unlockedAt && (
                              <span className="text-green-400">
                                ✓ Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-achievement-popup"
    >
      <div 
        className={`
          ${colors.bg} border ${colors.border} rounded-xl p-4 shadow-xl
          flex items-center gap-4 min-w-[280px]
        `}
        style={{ boxShadow: `0 0 30px ${colors.glow}` }}
      >
        <div className="text-4xl">{achievement.icon}</div>
        <div>
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wide">
            Achievement Unlocked!
          </div>
          <div className={`font-bold ${colors.text}`}>{achievement.name}</div>
          <div className="text-xs text-slate-400">{achievement.description}</div>
        </div>
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-500 hover:text-white"
        >
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
