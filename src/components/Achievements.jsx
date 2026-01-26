// Achievements.jsx - Modal displaying all achievements with improved scroll and text
// v7.14: Fixed text truncation - name and description now wrap properly
// Place in src/components/Achievements.jsx

import { useState, useEffect, useRef } from 'react';
import { X, Trophy, Lock, Star, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import achievementService from '../services/achievementService';
import { soundManager } from '../utils/soundManager';

// Rarity colors with proper theming
const RARITY_COLORS = {
  common: {
    bg: 'bg-slate-500/20',
    border: 'border-slate-500/40',
    text: 'text-slate-300',
    glow: 'rgba(148, 163, 184, 0.3)'
  },
  uncommon: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/40',
    text: 'text-green-400',
    glow: 'rgba(34, 197, 94, 0.3)'
  },
  rare: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    glow: 'rgba(59, 130, 246, 0.3)'
  },
  epic: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    glow: 'rgba(168, 85, 247, 0.4)'
  },
  legendary: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    glow: 'rgba(251, 191, 36, 0.5)'
  }
};

// Category display helpers
const getCategoryIcon = (category) => {
  const icons = {
    victory: '🏆',
    dedication: '🔥',
    skill: '⭐',
    social: '👥',
    puzzle: '🧩',
    special: '💎',
    speed: '⚡',
    weekly: '📅'
  };
  return icons[category] || '🎮';
};

const Achievements = ({ userId, onClose }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unlocked', 'locked'
  const [expandedId, setExpandedId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (userId) {
      loadAchievements();
    }
  }, [userId]);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await achievementService.getAchievementsWithStatus(userId);

      if (result.error) {
        setError(result.error);
      } else {
        // Sort: unlocked first, then by rarity
        const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
        const sorted = [...(result.data || [])].sort((a, b) => {
          if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
          return (rarityOrder[a.rarity] || 5) - (rarityOrder[b.rarity] || 5);
        });
        setAchievements(sorted);
      }
    } catch (err) {
      setError('Failed to load achievements');
      console.error('[Achievements] Error:', err);
    }

    setLoading(false);
  };

  // Filter achievements
  const filteredAchievements = achievements.filter(a => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  // Stats
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalPoints = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + (a.points || 0), 0);

  const handleClose = () => {
    soundManager.playButtonClick?.();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden border border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="p-4 border-b border-amber-500/20 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={24} className="text-amber-400" />
              <h2 className="text-xl font-bold text-amber-300">Achievements</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                <span className="text-amber-400 font-bold">{unlockedCount}</span>/{achievements.length} unlocked
              </span>
              <span className="text-slate-400">
                <Star size={14} className="inline text-amber-400" /> <span className="text-amber-400 font-bold">{totalPoints}</span> pts
              </span>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-3">
            {['all', 'unlocked', 'locked'].map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); soundManager.playClickSound?.('click'); }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all ${
                  filter === f
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            minHeight: 0
          }}
        >
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="text-center py-12">
                <Loader className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
                <p className="text-slate-400">Loading achievements...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={loadAchievements}
                  className="mt-4 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30"
                >
                  Retry
                </button>
              </div>
            ) : filteredAchievements.length === 0 ? (
              <div className="text-center py-12">
                <Trophy size={48} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">
                  {filter === 'unlocked' ? 'No achievements unlocked yet' :
                   filter === 'locked' ? 'All achievements unlocked!' :
                   'No achievements found'}
                </p>
              </div>
            ) : (
              filteredAchievements.map((achievement) => {
                const colors = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
                const isExpanded = expandedId === achievement.id;

                return (
                  <div
                    key={achievement.id}
                    className={`
                      rounded-xl border transition-all cursor-pointer
                      ${achievement.unlocked
                        ? `${colors.bg} ${colors.border}`
                        : 'bg-slate-800/30 border-slate-700 opacity-60'
                      }
                    `}
                    onClick={() => {
                      setExpandedId(isExpanded ? null : achievement.id);
                      soundManager.playClickSound?.('click');
                    }}
                  >
                    <div className="flex items-start gap-3 p-3">
                      {/* Icon */}
                      <div
                        className={`
                          w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0
                          ${achievement.unlocked ? colors.bg : 'bg-slate-700'}
                        `}
                        style={achievement.unlocked ? { boxShadow: `0 0 15px ${colors.glow}` } : {}}
                      >
                        {achievement.unlocked ? achievement.icon : <Lock size={18} className="text-slate-500" />}
                      </div>

                      {/* Info - FIXED: Allow text to wrap */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* Name - wraps instead of truncates */}
                            <h3 className={`font-bold text-sm leading-tight ${achievement.unlocked ? colors.text : 'text-slate-500'}`}>
                              {achievement.name}
                            </h3>
                            {/* Rarity badge */}
                            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${colors.bg} ${colors.text}`}>
                              {achievement.rarity}
                            </span>
                          </div>
                          
                          {/* Points */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <div className="text-right">
                              <div className={`font-bold text-sm ${achievement.unlocked ? 'text-amber-400' : 'text-slate-600'}`}>
                                +{achievement.points}
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                          </div>
                        </div>
                        
                        {/* Description - FIXED: wraps instead of truncates */}
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {achievement.description}
                        </p>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-slate-700/50 mt-1">
                        <div className="flex justify-between items-center mt-2 text-xs">
                          <span className="text-slate-400">
                            Category: <span className="text-slate-300">{getCategoryIcon(achievement.category)} {achievement.category}</span>
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
              })
            )}
          </div>
          
          {/* Bottom padding for safe area */}
          <div className="h-4" />
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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-achievement-popup">
      <div
        className={`${colors.bg} border ${colors.border} rounded-xl p-4 shadow-xl flex items-center gap-4 min-w-[280px] relative`}
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
