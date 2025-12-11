/**
 * Unified Achievement Service
 * Consolidates achievementService.js and achievementsService.js into one service
 * 
 * MIGRATION NOTE: This file replaces both:
 * - /services/achievementService.js
 * - /services/achievementsService.js
 * 
 * Update imports to use this file instead:
 * import { achievementService, ACHIEVEMENTS, RARITY_COLORS } from '../services/achievementServiceUnified';
 */

import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { logger } from '../utils/logger';

const log = logger.achievements;

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Achievement identifiers
 */
export const ACHIEVEMENTS = {
  // Weekly
  WEEKLY_CHAMPION: 'weekly_champion',
  WEEKLY_TOP_3: 'weekly_top_3',
  WEEKLY_FIRST: 'weekly_first',
  WEEKLY_STREAK_4: 'weekly_streak_4',
  
  // Speed
  SPEED_STREAK_5: 'speed_streak_5',
  SPEED_STREAK_10: 'speed_streak_10',
  SPEED_STREAK_25: 'speed_streak_25',
  SPEED_STREAK_50: 'speed_streak_50',
  
  // Puzzle
  PUZZLE_FIRST: 'puzzle_first',
  PUZZLE_EASY_10: 'puzzle_easy_10',
  PUZZLE_MEDIUM_10: 'puzzle_medium_10',
  PUZZLE_HARD_10: 'puzzle_hard_10',
  PUZZLE_TOTAL_100: 'puzzle_total_100',
  
  // Online
  ONLINE_FIRST_WIN: 'online_first_win',
  ONLINE_WINS_10: 'online_wins_10',
  ONLINE_WINS_50: 'online_wins_50',
  ONLINE_STREAK_5: 'online_streak_5',
  
  // AI
  AI_FIRST_WIN: 'ai_first_win',
  AI_HARD_WIN: 'ai_hard_win',
  AI_HARD_WINS_10: 'ai_hard_wins_10',
  
  // General
  GAMES_PLAYED_100: 'games_played_100',
  PROFILE_COMPLETE: 'profile_complete',
};

/**
 * Achievement icon mapping (Lucide icons)
 */
export const ACHIEVEMENT_ICONS = {
  Crown: 'Crown',
  Medal: 'Medal',
  Calendar: 'Calendar',
  Flame: 'Flame',
  Zap: 'Zap',
  Target: 'Target',
  Award: 'Award',
  Trophy: 'Trophy',
  Bot: 'Bot',
  Gamepad2: 'Gamepad2',
  User: 'User',
};

/**
 * Rarity color schemes
 */
export const RARITY_COLORS = {
  common: { 
    bg: 'bg-slate-500/20', 
    border: 'border-slate-400', 
    text: 'text-slate-300', 
    glow: 'rgba(148,163,184,0.3)' 
  },
  uncommon: { 
    bg: 'bg-green-500/20', 
    border: 'border-green-400', 
    text: 'text-green-300', 
    glow: 'rgba(74,222,128,0.3)' 
  },
  rare: { 
    bg: 'bg-blue-500/20', 
    border: 'border-blue-400', 
    text: 'text-blue-300', 
    glow: 'rgba(96,165,250,0.3)' 
  },
  epic: { 
    bg: 'bg-purple-500/20', 
    border: 'border-purple-400', 
    text: 'text-purple-300', 
    glow: 'rgba(192,132,252,0.3)' 
  },
  legendary: { 
    bg: 'bg-amber-500/20', 
    border: 'border-amber-400', 
    text: 'text-amber-300', 
    glow: 'rgba(251,191,36,0.4)' 
  },
};

// =============================================================================
// SERVICE CLASS
// =============================================================================

class AchievementService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.CACHE_DURATION = 60000; // 1 minute
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Check if the service is available
   */
  _isAvailable() {
    return isSupabaseConfigured();
  }

  /**
   * Get current user ID
   */
  async _getCurrentUserId() {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  /**
   * Handle table-not-found errors gracefully
   */
  _handleTableError(error) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return true; // Table doesn't exist, return empty data
    }
    return false;
  }

  /**
   * Check if cache is valid
   */
  _isCacheValid() {
    return this.cache && 
           this.cacheTimestamp && 
           (Date.now() - this.cacheTimestamp < this.CACHE_DURATION);
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  // ===========================================================================
  // FETCHING ACHIEVEMENTS
  // ===========================================================================

  /**
   * Get all achievement definitions
   */
  async getAllDefinitions() {
    if (!this._isAvailable()) return { data: [], error: null };

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('category')
        .order('requirement_value');

      if (this._handleTableError(error)) {
        return { data: [], error: null };
      }

      return { data: data || [], error };
    } catch (err) {
      log.error('Error getting achievement definitions:', err);
      return { data: [], error: null };
    }
  }

  /**
   * Get achievements unlocked by a specific user
   */
  async getUserAchievements(userId = null, forceRefresh = false) {
    if (!this._isAvailable()) return { data: [], error: null };

    // Use provided userId or get current user
    const targetUserId = userId || await this._getCurrentUserId();
    if (!targetUserId) return { data: [], error: 'Not authenticated' };

    // Check cache (only for current user)
    if (!forceRefresh && !userId && this._isCacheValid()) {
      return { data: this.cache, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          id,
          unlocked_at,
          game_id,
          achievement:achievements(*)
        `)
        .eq('user_id', targetUserId)
        .order('unlocked_at', { ascending: false });

      if (this._handleTableError(error)) {
        return { data: [], error: null };
      }

      // Cache result if it's current user
      if (!userId && data) {
        this.cache = data;
        this.cacheTimestamp = Date.now();
      }

      return { data: data || [], error };
    } catch (err) {
      log.error('Error getting user achievements:', err);
      return { data: [], error: null };
    }
  }

  /**
   * Get all achievements with unlock status for a user
   */
  async getAchievementsWithStatus(userId = null) {
    if (!this._isAvailable()) return { data: [], error: null };

    const targetUserId = userId || await this._getCurrentUserId();
    if (!targetUserId) return { data: [], error: 'Not authenticated' };

    try {
      // Fetch all achievements
      const { data: allAchievements, error: achError } = await this.getAllDefinitions();
      if (achError) return { data: [], error: achError };

      // Fetch user's unlocked achievements
      const { data: unlocked, error: unlockError } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', targetUserId);

      const unlockedData = this._handleTableError(unlockError) ? [] : (unlocked || []);

      // Create unlock map
      const unlockedMap = new Map(
        unlockedData.map(u => [u.achievement_id, u.unlocked_at])
      );

      // Merge data
      const achievementsWithStatus = allAchievements.map(a => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) || null,
      }));

      return { data: achievementsWithStatus, error: null };
    } catch (err) {
      log.error('Error getting achievements with status:', err);
      return { data: [], error: null };
    }
  }

  /**
   * Check if user has a specific achievement
   */
  async hasAchievement(achievementId) {
    const { data } = await this.getUserAchievements();
    return data.some(a => 
      a.achievement_id === achievementId || 
      a.achievement?.id === achievementId
    );
  }

  // ===========================================================================
  // AWARDING ACHIEVEMENTS
  // ===========================================================================

  /**
   * Award an achievement to a user
   */
  async awardAchievement(achievementId, metadata = {}) {
    if (!this._isAvailable()) return { success: false, error: 'Not configured' };

    const userId = await this._getCurrentUserId();
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.rpc('award_achievement', {
        p_user_id: userId,
        p_achievement_id: achievementId,
        p_metadata: metadata,
      });

      if (data?.success) {
        this.clearCache();
        log.info('Achievement awarded:', achievementId);
      }

      return { 
        success: data?.success || false, 
        error: data?.error || error 
      };
    } catch (err) {
      log.error('Error awarding achievement:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Check and grant achievements after a game
   */
  async checkAchievements(userId = null, gameId = null) {
    if (!this._isAvailable()) return { data: [], error: null };

    const targetUserId = userId || await this._getCurrentUserId();
    if (!targetUserId) return { data: [], error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.rpc('check_achievements', {
        p_user_id: targetUserId,
        p_game_id: gameId,
      });

      if (data?.length > 0) {
        this.clearCache();
      }

      return { data: data || [], error };
    } catch (err) {
      log.error('Error checking achievements:', err);
      return { data: [], error: err.message };
    }
  }

  /**
   * Check and award achievements based on player stats
   */
  async checkAndAwardFromStats(stats) {
    if (!this._isAvailable()) return [];

    const awarded = [];

    const checkAndAward = async (condition, achievementId, metadata = {}) => {
      if (condition) {
        const result = await this.awardAchievement(achievementId, metadata);
        if (result.success) {
          awarded.push(achievementId);
        }
      }
    };

    // Speed Puzzle achievements
    await checkAndAward(stats.speed_best_streak >= 5, ACHIEVEMENTS.SPEED_STREAK_5);
    await checkAndAward(stats.speed_best_streak >= 10, ACHIEVEMENTS.SPEED_STREAK_10);
    await checkAndAward(stats.speed_best_streak >= 25, ACHIEVEMENTS.SPEED_STREAK_25);
    await checkAndAward(stats.speed_best_streak >= 50, ACHIEVEMENTS.SPEED_STREAK_50);

    // Puzzle achievements
    const puzzleTotal = (stats.puzzles_easy_solved || 0) + 
                        (stats.puzzles_medium_solved || 0) + 
                        (stats.puzzles_hard_solved || 0);
    
    await checkAndAward(puzzleTotal >= 1, ACHIEVEMENTS.PUZZLE_FIRST);
    await checkAndAward(stats.puzzles_easy_solved >= 10, ACHIEVEMENTS.PUZZLE_EASY_10);
    await checkAndAward(stats.puzzles_medium_solved >= 10, ACHIEVEMENTS.PUZZLE_MEDIUM_10);
    await checkAndAward(stats.puzzles_hard_solved >= 10, ACHIEVEMENTS.PUZZLE_HARD_10);
    await checkAndAward(puzzleTotal >= 100, ACHIEVEMENTS.PUZZLE_TOTAL_100);

    // AI achievements
    const aiTotalWins = (stats.ai_easy_wins || 0) + 
                        (stats.ai_medium_wins || 0) + 
                        (stats.ai_hard_wins || 0);
    
    await checkAndAward(aiTotalWins >= 1, ACHIEVEMENTS.AI_FIRST_WIN);
    await checkAndAward(stats.ai_hard_wins >= 1, ACHIEVEMENTS.AI_HARD_WIN);
    await checkAndAward(stats.ai_hard_wins >= 10, ACHIEVEMENTS.AI_HARD_WINS_10);

    // Online achievements
    await checkAndAward(stats.games_won >= 1, ACHIEVEMENTS.ONLINE_FIRST_WIN);
    await checkAndAward(stats.games_won >= 10, ACHIEVEMENTS.ONLINE_WINS_10);
    await checkAndAward(stats.games_won >= 50, ACHIEVEMENTS.ONLINE_WINS_50);

    // General achievements
    const totalGames = (stats.games_played || 0) + 
                       (stats.local_games_played || 0) + 
                       puzzleTotal + aiTotalWins;
    
    await checkAndAward(totalGames >= 100, ACHIEVEMENTS.GAMES_PLAYED_100);

    return awarded;
  }

  /**
   * Award weekly challenge achievements
   */
  async checkWeeklyAchievements(rank, challengeId) {
    const awarded = [];

    // First weekly challenge completion
    const firstResult = await this.awardAchievement(
      ACHIEVEMENTS.WEEKLY_FIRST, 
      { challenge_id: challengeId }
    );
    if (firstResult.success) awarded.push(ACHIEVEMENTS.WEEKLY_FIRST);

    // Top 3 finish
    if (rank <= 3) {
      const top3Result = await this.awardAchievement(
        ACHIEVEMENTS.WEEKLY_TOP_3, 
        { challenge_id: challengeId, rank }
      );
      if (top3Result.success) awarded.push(ACHIEVEMENTS.WEEKLY_TOP_3);
    }

    return awarded;
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get achievement statistics for a user
   */
  async getStats(userId = null) {
    if (!this._isAvailable()) return { data: null, error: null };

    const targetUserId = userId || await this._getCurrentUserId();
    if (!targetUserId) return { data: null, error: 'Not authenticated' };

    try {
      const [allResult, unlockedResult] = await Promise.all([
        supabase.from('achievements').select('id, points'),
        supabase.from('user_achievements')
          .select('achievement:achievements(points)')
          .eq('user_id', targetUserId),
      ]);

      const allData = this._handleTableError(allResult.error) ? [] : (allResult.data || []);
      const unlockedData = this._handleTableError(unlockedResult.error) ? [] : (unlockedResult.data || []);

      const totalAchievements = allData.length;
      const totalPoints = allData.reduce((sum, a) => sum + (a.points || 0), 0);
      const unlockedCount = unlockedData.length;
      const earnedPoints = unlockedData.reduce((sum, u) => sum + (u.achievement?.points || 0), 0);

      return {
        data: {
          totalAchievements,
          unlockedCount,
          totalPoints,
          earnedPoints,
          completionPercentage: totalAchievements > 0 
            ? Math.round((unlockedCount / totalAchievements) * 100) 
            : 0,
        },
        error: null,
      };
    } catch (err) {
      log.error('Error getting achievement stats:', err);
      return { 
        data: { 
          totalAchievements: 0, 
          unlockedCount: 0, 
          totalPoints: 0, 
          earnedPoints: 0, 
          completionPercentage: 0 
        }, 
        error: null 
      };
    }
  }

  /**
   * Get achievement progress for display
   */
  getProgressFromStats(stats) {
    const getNextMilestone = (current, milestones) => {
      for (const milestone of milestones) {
        if (current < milestone) return milestone;
      }
      return null;
    };

    return {
      speed: {
        current: stats.speed_best_streak || 0,
        milestones: [5, 10, 25, 50],
        next: getNextMilestone(stats.speed_best_streak || 0, [5, 10, 25, 50]),
      },
      puzzles: {
        total: (stats.puzzles_easy_solved || 0) + 
               (stats.puzzles_medium_solved || 0) + 
               (stats.puzzles_hard_solved || 0),
        milestones: [1, 10, 50, 100],
      },
      online: {
        wins: stats.games_won || 0,
        milestones: [1, 10, 50],
      },
      ai: {
        hardWins: stats.ai_hard_wins || 0,
        milestones: [1, 10],
      },
    };
  }

  // ===========================================================================
  // SOCIAL FEATURES
  // ===========================================================================

  /**
   * Get recent achievements across all users (for feed)
   */
  async getRecentGlobal(limit = 10) {
    if (!this._isAvailable()) return { data: [], error: null };

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          id,
          unlocked_at,
          user:profiles!user_achievements_user_id_fkey(id, username, avatar_url),
          achievement:achievements(*)
        `)
        .order('unlocked_at', { ascending: false })
        .limit(limit);

      return { data: data || [], error };
    } catch (err) {
      log.error('Error getting recent achievements:', err);
      return { data: [], error: null };
    }
  }

  /**
   * Get users who have a specific achievement
   */
  async getHolders(achievementId, limit = 50) {
    if (!this._isAvailable()) return { data: [], error: null };

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          unlocked_at,
          user:profiles!user_achievements_user_id_fkey(id, username, avatar_url, elo_rating)
        `)
        .eq('achievement_id', achievementId)
        .order('unlocked_at', { ascending: true })
        .limit(limit);

      return { data: data || [], error };
    } catch (err) {
      log.error('Error getting achievement holders:', err);
      return { data: [], error: null };
    }
  }

  /**
   * Get rarity statistics for achievements
   */
  async getRarityStats() {
    if (!this._isAvailable()) return { data: {}, error: null };

    try {
      // Get total user count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      // Get all achievements
      const { data: achievements } = await supabase
        .from('achievements')
        .select('id');

      if (!achievements || totalUsers === 0) {
        return { data: {}, error: null };
      }

      const rarityMap = {};

      // This could be optimized with a single query using GROUP BY
      for (const ach of achievements) {
        const { count } = await supabase
          .from('user_achievements')
          .select('id', { count: 'exact', head: true })
          .eq('achievement_id', ach.id);

        rarityMap[ach.id] = {
          holders: count || 0,
          percentage: totalUsers > 0 
            ? Math.round(((count || 0) / totalUsers) * 100) 
            : 0,
        };
      }

      return { data: rarityMap, error: null };
    } catch (err) {
      log.error('Error getting rarity stats:', err);
      return { data: {}, error: null };
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export singleton instance
export const achievementService = new AchievementService();

// Also export as default
export default achievementService;

// Legacy aliases for backward compatibility
export const achievementsService = achievementService;
export const achievementIcons = ACHIEVEMENT_ICONS;
