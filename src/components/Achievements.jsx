// Achievements - View and track achievements
import { useState, useEffect } from 'react';
import { Trophy, Lock, Star, X, ChevronDown, ChevronUp, AlertTriangle, ExternalLink, Award, Zap, Target, Bot, User, Calendar, Flame, Crown, Medal, Gamepad2 } from 'lucide-react';
import { achievementService, RARITY_COLORS, CATEGORY_LABELS } from '../services/achievementService';

// Icon mapping
const ICON_MAP = {
  Trophy, Crown, Medal, Calendar, Flame, Zap, Target, Award, Bot, User, Gamepad2, Star
};

const AchievementCard = ({ achievement, expanded, onToggle }) => {
  const rarity = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
  const IconComponent = ICON_MAP[achievement.icon] || Trophy;
  
  return (
    <div 
      className={`relative rounded-xl border ${rarity.border} ${rarity.bg} p-4 transition-all duration-300 ${
        achievement.earned 
          ? 'opacity-100' 
          : 'opacity-50 grayscale'
      }`}
      style={{ 
        boxShadow: achievement.earned ? `0 0 20px ${rarity.glow}` : 'none' 
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          achievement.earned ? rarity.bg : 'bg-slate-700/50'
        }`}>
          {achievement.earned ? (
            <IconComponent size={24} className={rarity.text} />
          ) : (
            <Lock size={20} className="text-slate-500" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold ${achievement.earned ? rarity.text : 'text-slate-400'}`}>
              {achievement.name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${rarity.bg} ${rarity.text} border ${rarity.border}`}>
              {achievement.rarity}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">{achievement.description}</p>
          
          {achievement.earned && achievement.earned_at && (
            <p className="text-xs text-slate-500 mt-2">
              Earned {new Date(achievement.earned_at).toLocaleDateString()}
            </p>
          )}
        </div>
        
        {/* Points */}
        <div className="text-right">
          <div className={`font-bold ${achievement.earned ? 'text-amber-400' : 'text-slate-500'}`}>
            {achievement.points}
          </div>
          <div className="text-xs text-slate-500">pts</div>
        </div>
      </div>
    </div>
  );
};

const MigrationRequiredMessage = ({ onClose }) => (
  <div className="p-6 text-center">
    <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
      <AlertTriangle size={32} className="text-amber-400" />
    </div>
    <h3 className="text-xl font-bold text-white mb-2">Database Setup Required</h3>
    <p className="text-slate-400 mb-4">
      The achievements system requires a database migration to be run on your Supabase project.
    </p>
    
    <div className="bg-slate-800/50 rounded-lg p-4 text-left mb-4">
      <h4 className="text-sm font-semibold text-cyan-300 mb-2">How to fix:</h4>
      <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
        <li>Go to your Supabase Dashboard</li>
        <li>Navigate to <span className="text-cyan-400">SQL Editor</span></li>
        <li>Run the <span className="text-cyan-400">006_achievements_migration.sql</span> file</li>
        <li>Refresh this page</li>
      </ol>
    </div>
    
    <div className="flex gap-3">
      <a
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        Open Supabase
        <ExternalLink size={16} />
      </a>
      <button
        onClick={onClose}
        className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
      >
        Close
      </button>
    </div>
  </div>
);

const Achievements = ({ userId, onClose }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (userId) {
      loadAchievements();
    }
  }, [userId]);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [achResult, statsResult] = await Promise.all([
        achievementService.getAchievementsWithStatus(userId),
        achievementService.getAchievementStats(userId)
      ]);

      if (achResult.error) {
        throw new Error(achResult.error.message || 'Failed to load achievements');
      }
      
      if (achResult.data) {
        setAchievements(achResult.data);
      }
      
      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError(err.message || 'Failed to load achievements');
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  // Filter achievements by category
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  // Get unique categories
  const categories = ['all', ...new Set(achievements.map(a => a.category))];

  // Check if error is migration-related
  const isMigrationError = error && (
    error.includes('migration') || 
    error.includes('does not exist') ||
    error.includes('42P01') ||
    error.includes('relation')
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleClose}
    >
      <div 
        className="bg-slate-900/95 rounded-2xl w-full max-w-lg border border-amber-500/30 shadow-[0_0_40px_rgba(251,191,36,0.2)]"
        style={{
          maxHeight: '85vh',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400" size={28} />
            <h2 className="text-2xl font-bold text-amber-300 tracking-wide">ACHIEVEMENTS</h2>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-2 -m-2 touch-manipulation active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-auto"
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-slate-400">Loading achievements...</p>
            </div>
          ) : isMigrationError ? (
            <MigrationRequiredMessage onClose={handleClose} />
          ) : error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="text-red-400 mx-auto mb-3" size={32} />
              <p className="text-red-300 mb-4">{error}</p>
              <button 
                onClick={loadAchievements}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Stats Summary */}
              {stats && (
                <div className="p-4 border-b border-slate-700/50">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-amber-400">{stats.total_earned}</div>
                      <div className="text-xs text-slate-500">of {stats.total_available}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-cyan-400">{stats.total_points}</div>
                      <div className="text-xs text-slate-500">points</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-purple-400">
                        {stats.total_available > 0 
                          ? Math.round((stats.total_earned / stats.total_available) * 100) 
                          : 0}%
                      </div>
                      <div className="text-xs text-slate-500">complete</div>
                    </div>
                  </div>
                  
                  {/* Rarity breakdown */}
                  <div className="flex gap-2 mt-3 justify-center flex-wrap">
                    {stats.legendary_earned > 0 && (
                      <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded-full">
                        ✨ {stats.legendary_earned} Legendary
                      </span>
                    )}
                    {stats.epic_earned > 0 && (
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                        💎 {stats.epic_earned} Epic
                      </span>
                    )}
                    {stats.rare_earned > 0 && (
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                        💠 {stats.rare_earned} Rare
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Category Filter */}
              <div className="p-4 border-b border-slate-700/50">
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                          : 'bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-700'
                      }`}
                    >
                      {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Achievements List */}
              <div className="p-4 space-y-3">
                {filteredAchievements.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No achievements in this category yet
                  </div>
                ) : (
                  filteredAchievements.map(achievement => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Achievements;
