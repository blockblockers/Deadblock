// Achievements - View and track achievements
import { useState, useEffect } from 'react';
import { Trophy, Lock, Star, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import achievementService, { RARITY_COLORS } from '../services/achievementService';

const Achievements = ({ userId, onClose }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [achResult, statsResult] = await Promise.all([
        achievementService.getAchievementsWithStatus(userId),
        achievementService.getAchievementStats(userId)
      ]);

      if (achResult.error) throw new Error(achResult.error.message || 'Failed to load achievements');
      if (achResult.data) setAchievements(achResult.data);
      if (statsResult.data) setStats(statsResult.data);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError('Achievements require database migration. Please run the migration first.');
    }
    
    setLoading(false);
  };

  // Group achievements by category
  const categories = ['all', 'games', 'skill', 'social', 'special'];
  
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
      case 'games': return '🎮';
      case 'skill': return '⚡';
      case 'social': return '👥';
      case 'special': return '✨';
      default: return '🏆';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-amber-500/30 shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-amber-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-400" size={24} />
              <h2 className="text-lg font-bold text-amber-300">Achievements</h2>
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

        {/* Category Filter */}
        <div className="flex gap-2 p-3 border-b border-amber-500/20 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
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

        {/* Achievements List */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
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
              <p className="text-slate-400">No achievements in this category</p>
            </div>
          ) : (
            <div className="space-y-2">
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
