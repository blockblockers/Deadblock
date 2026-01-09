// Achievements - View and track achievements
// v7.11: Fixed error handling - don't show migration error when tables exist
import { useState, useEffect } from 'react';
import { Trophy, Lock, Star, X, ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from 'lucide-react';
import achievementService from '../services/achievementService';

// Rarity colors for achievements
const RARITY_COLORS = {
  common: { bg: 'bg-slate-600', text: 'text-slate-300', border: 'border-slate-500', glow: 'rgba(100, 116, 139, 0.5)' },
  uncommon: { bg: 'bg-green-600', text: 'text-green-300', border: 'border-green-500', glow: 'rgba(34, 197, 94, 0.5)' },
  rare: { bg: 'bg-blue-600', text: 'text-blue-300', border: 'border-blue-500', glow: 'rgba(59, 130, 246, 0.5)' },
  epic: { bg: 'bg-purple-600', text: 'text-purple-300', border: 'border-purple-500', glow: 'rgba(168, 85, 247, 0.5)' },
  legendary: { bg: 'bg-amber-600', text: 'text-amber-300', border: 'border-amber-500', glow: 'rgba(245, 158, 11, 0.5)' },
};

// Achievement popup for newly earned achievements
export const AchievementPopup = ({ achievement, onClose }) => {
  const colors = RARITY_COLORS[achievement?.rarity] || RARITY_COLORS.common;
  
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  if (!achievement) return null;
  
  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
      <div className={`${colors.bg} rounded-xl p-4 shadow-2xl border ${colors.border} max-w-sm`}
        style={{ boxShadow: `0 0 30px ${colors.glow}` }}>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{achievement.icon}</div>
          <div className="flex-1">
            <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">Achievement Unlocked!</div>
            <div className={`font-bold ${colors.text}`}>{achievement.name}</div>
            <div className="text-slate-300 text-xs">{achievement.description}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Achievements = ({ userId, onClose, viewOnly = false, playerName = null }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'auth' | 'table' | 'network' | 'unknown'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  
  // Title text - show player name if viewing someone else's achievements
  const titleText = viewOnly && playerName 
    ? `${playerName}'s Achievements` 
    : 'Achievements';

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);
    setErrorType(null);
    
    try {
      // Check if functions exist before calling
      if (typeof achievementService?.getAchievementsWithStatus !== 'function') {
        console.error('[Achievements] getAchievementsWithStatus is not a function');
        setError('Achievement service not properly configured');
        setErrorType('unknown');
        setLoading(false);
        return;
      }
      
      console.log('[Achievements] Loading achievements for userId:', userId);
      const achResult = await achievementService.getAchievementsWithStatus(userId);
      console.log('[Achievements] Result:', achResult);
      
      // v7.11: Better error handling - check specific error types
      if (achResult.error) {
        const errorMsg = achResult.error.message || achResult.error || 'Unknown error';
        console.error('[Achievements] Error:', errorMsg);
        
        // Check if it's an auth error (401)
        if (errorMsg.includes('401') || errorMsg.includes('unauthorized') || errorMsg.includes('Not authenticated')) {
          setError('Please sign in to view achievements');
          setErrorType('auth');
        }
        // Check if tables don't exist (42P01 is PostgreSQL "undefined_table")
        else if (errorMsg.includes('42P01') || errorMsg.includes('does not exist') || errorMsg.includes('relation')) {
          setError('Achievements require database setup. Please contact support.');
          setErrorType('table');
        }
        // Network error
        else if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('Failed to fetch')) {
          setError('Network error. Please check your connection and try again.');
          setErrorType('network');
        }
        // Other errors
        else {
          setError(errorMsg);
          setErrorType('unknown');
        }
        
        setLoading(false);
        return;
      }
      
      // v7.11: If we got empty data with no error, that's OK - just no achievements yet
      if (achResult.data) {
        console.log('[Achievements] Loaded', achResult.data.length, 'achievements');
        setAchievements(achResult.data);
      } else {
        // Empty achievements is fine
        setAchievements([]);
      }
      
      // Stats are optional - don't fail if not available
      if (typeof achievementService?.getAchievementStats === 'function') {
        try {
          const statsResult = await achievementService.getAchievementStats(userId);
          if (statsResult.data) {
            setStats(statsResult.data);
          }
        } catch (statsErr) {
          console.log('[Achievements] Stats not available:', statsErr);
          // Stats failing shouldn't show an error
        }
      }
    } catch (err) {
      console.error('[Achievements] Exception loading achievements:', err);
      // v7.11: More specific error messages based on error type
      const errorMsg = err.message || 'Unknown error';
      if (errorMsg.includes('401')) {
        setError('Please sign in to view achievements');
        setErrorType('auth');
      } else if (errorMsg.includes('42P01') || errorMsg.includes('does not exist')) {
        setError('Achievements require database setup.');
        setErrorType('table');
      } else {
        setError('Failed to load achievements. Please try again.');
        setErrorType('unknown');
      }
    }
    
    setLoading(false);
  };

  // Group achievements by category
  const categories = ['all', 'weekly', 'speed', 'puzzle', 'online', 'ai', 'general'];
  
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
      case 'weekly': return '📅';
      case 'speed': return '⚡';
      case 'puzzle': return '🧩';
      case 'online': return '🌐';
      case 'ai': return '🤖';
      case 'general': return '🎮';
      default: return '🏆';
    }
  };

  // Get error display info based on error type
  const getErrorDisplay = () => {
    switch (errorType) {
      case 'auth':
        return {
          icon: '🔒',
          title: 'Sign In Required',
          color: 'text-cyan-300'
        };
      case 'table':
        return {
          icon: '🔧',
          title: 'Setup Required',
          color: 'text-amber-300'
        };
      case 'network':
        return {
          icon: '📡',
          title: 'Connection Error',
          color: 'text-red-300'
        };
      default:
        return {
          icon: '⚠️',
          title: 'Error',
          color: 'text-amber-300'
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]">
        {/* Header */}
        <div className="p-4 border-b border-amber-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-400" size={24} />
              <h2 className="text-lg font-bold text-amber-300">{titleText}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Stats - only show if we have them */}
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

        {/* Category Filter - only show if no error */}
        {!error && (
          <div 
            className="flex gap-2 p-3 border-b border-amber-500/20 overflow-x-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
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
        )}

        {/* Achievements List */}
        <div 
          className="p-4 overflow-y-auto max-h-[50vh]"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {error ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">{getErrorDisplay().icon}</div>
              <p className={`font-medium mb-2 ${getErrorDisplay().color}`}>{getErrorDisplay().title}</p>
              <p className="text-slate-400 text-sm mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                {errorType === 'network' && (
                  <button
                    onClick={loadAchievements}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Retry
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Loading achievements...</p>
            </div>
          ) : sortedAchievements.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="mx-auto text-slate-600 mb-2" size={40} />
              <p className="text-slate-400">
                {selectedCategory === 'all' 
                  ? 'No achievements earned yet. Keep playing!' 
                  : 'No achievements in this category'}
              </p>
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
                          <span className={`font-bold ${achievement.unlocked ? colors.text : 'text-slate-400'}`}>
                            {achievement.name}
                          </span>
                          {achievement.unlocked && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-900/50 text-amber-400">
                              +{achievement.points}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate ${achievement.unlocked ? 'text-slate-300' : 'text-slate-500'}`}>
                          {achievement.description}
                        </p>
                      </div>
                      
                      {/* Expand indicator */}
                      <div className="text-slate-500">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-slate-700/50 mt-1 pt-2">
                        <div className="text-xs text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Rarity:</span>
                            <span className={colors.text}>{achievement.rarity?.charAt(0).toUpperCase() + achievement.rarity?.slice(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Category:</span>
                            <span>{getCategoryIcon(achievement.category)} {achievement.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Points:</span>
                            <span className="text-amber-400">{achievement.points}</span>
                          </div>
                          {achievement.unlocked && achievement.unlockedAt && (
                            <div className="flex justify-between">
                              <span>Unlocked:</span>
                              <span>{new Date(achievement.unlockedAt).toLocaleDateString()}</span>
                            </div>
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

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Achievements;
