// Achievements - View and track achievements
import { useState, useEffect } from 'react';
import { Trophy, Lock, Star, X, ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

// Rarity colors for achievements
const RARITY_COLORS = {
  common: { bg: 'bg-slate-600', text: 'text-slate-300', border: 'border-slate-500', glow: 'rgba(100,116,139,0.3)' },
  uncommon: { bg: 'bg-green-600', text: 'text-green-300', border: 'border-green-500', glow: 'rgba(34,197,94,0.3)' },
  rare: { bg: 'bg-blue-600', text: 'text-blue-300', border: 'border-blue-500', glow: 'rgba(59,130,246,0.3)' },
  epic: { bg: 'bg-purple-600', text: 'text-purple-300', border: 'border-purple-500', glow: 'rgba(147,51,234,0.3)' },
  legendary: { bg: 'bg-amber-600', text: 'text-amber-300', border: 'border-amber-500', glow: 'rgba(245,158,11,0.4)' },
};

// Import or create achievement service
let achievementService = null;
try {
  achievementService = require('../services/achievementService').default;
} catch (e) {
  console.warn('Achievement service not available');
}

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
      // Check if service exists and has required methods
      if (!achievementService || typeof achievementService.getAchievementsWithStatus !== 'function') {
        throw new Error('Achievement service not properly configured');
      }
      
      const achResult = await achievementService.getAchievementsWithStatus(userId);
      
      if (achResult.error) {
        throw new Error(achResult.error.message || 'Failed to load achievements');
      }
      
      if (achResult.data && achResult.data.length > 0) {
        setAchievements(achResult.data);
      } else {
        // No achievements data - might be missing tables
        throw new Error('No achievement data available');
      }
      
      // Stats are optional - don't fail if not available
      if (typeof achievementService.getStats === 'function') {
        const statsResult = await achievementService.getStats(userId);
        if (statsResult.data) setStats(statsResult.data);
      } else if (typeof achievementService.getAchievementStats === 'function') {
        const statsResult = await achievementService.getAchievementStats(userId);
        if (statsResult.data) setStats(statsResult.data);
      }
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError(err.message || 'Achievements require database migration. Please run the migration first.');
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
    return (rarityOrder[a.rarity] || 4) - (rarityOrder[b.rarity] || 4);
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

  const handleClose = () => {
    soundManager.playButtonClick();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-slate-900 rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-amber-500/30 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-amber-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-400" size={24} />
              <h2 className="text-lg font-bold text-amber-300">Achievements</h2>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Stats */}
          {stats && !error && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {stats.unlockedCount || 0}/{stats.totalAchievements || 0}
                </div>
                <div className="text-xs text-slate-400">Unlocked</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {stats.earnedPoints || 0}
                </div>
                <div className="text-xs text-slate-400">Points</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {stats.completionPercentage || 0}%
                </div>
                <div className="text-xs text-slate-400">Complete</div>
              </div>
            </div>
          )}
        </div>

        {/* Category Filter - Only show if we have achievements */}
        {!error && achievements.length > 0 && (
          <div className="flex gap-2 p-3 border-b border-amber-500/20 overflow-x-auto">
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
        )}

        {/* Achievements List */}
        <div 
          className="p-4 overflow-y-auto"
          style={{ 
            maxHeight: '50vh',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {error ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto text-amber-400 mb-3" size={48} />
              <p className="text-amber-300 font-medium mb-2">Feature Not Available</p>
              <p className="text-slate-400 text-sm mb-4">{error}</p>
              
              {/* Migration instructions */}
              <div className="bg-slate-800/50 rounded-lg p-4 text-left mb-4">
                <p className="text-slate-300 text-sm mb-2 font-medium">To enable achievements:</p>
                <ol className="text-slate-400 text-xs space-y-1 list-decimal list-inside">
                  <li>Open your Supabase Dashboard</li>
                  <li>Go to SQL Editor</li>
                  <li>Run the 005_social_features.sql migration</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              
              <a 
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink size={16} />
                Open Supabase
              </a>
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
                        ? `${colors.bg}/20 ${colors.border}` 
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
                          ? `${colors.bg}/30` 
                          : 'bg-slate-700'
                        }
                      `}
                      style={achievement.unlocked ? { boxShadow: `0 0 15px ${colors.glow}` } : {}}
                      >
                        {achievement.unlocked 
                          ? (achievement.icon || '🏆')
                          : <Lock size={20} className="text-slate-500" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold truncate ${achievement.unlocked ? colors.text : 'text-slate-500'}`}>
                            {achievement.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg}/30 ${colors.text}`}>
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
                            +{achievement.points || 0}
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

  useEffect(() => {
    if (achievement) {
      soundManager.playSound?.('achievement') || soundManager.playButtonClick?.();
      // Auto-close after 4 seconds
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-achievement-popup"
      onClick={onClose}
    >
      <div 
        className={`
          ${colors.bg}/20 border ${colors.border} rounded-xl p-4 shadow-xl
          flex items-center gap-4 min-w-[280px] backdrop-blur-md
        `}
        style={{ boxShadow: `0 0 30px ${colors.glow}` }}
      >
        <div className="text-4xl">{achievement.icon || '🏆'}</div>
        <div>
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wide">
            Achievement Unlocked!
          </div>
          <div className={`font-bold ${colors.text}`}>{achievement.name}</div>
          <div className="text-xs text-slate-400">{achievement.description}</div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
