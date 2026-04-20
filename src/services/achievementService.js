// achievementService.js - Achievement tracking and display
// v7.13 - Added checkAchievements with correct online-only stat calculation
//         (profiles.games_won/games_played include AI — must subtract for online achievements)
// v7.12 - FIXED: Now queries 'achievements' table instead of 'achievement_definitions'
// Place in src/services/achievementService.js

import { supabase } from '../utils/supabase';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return supabase && typeof supabase.from === 'function';
};

// Get current user ID - tries multiple methods for compatibility
const getCurrentUserId = () => {
  try {
    // Try to get from localStorage auth token first (most reliable)
    const authKey = 'sb-oyeibyrednwlolmsjlwk-auth-token';
    const authData = JSON.parse(localStorage.getItem(authKey) || 'null');
    if (authData?.user?.id) {
      return authData.user.id;
    }
    
    // Try modern Supabase method
    const session = supabase?.auth?.getSession?.();
    if (session?.data?.session?.user?.id) {
      return session.data.session.user.id;
    }
    
    // Try legacy method
    const legacySession = supabase?.auth?.session?.();
    if (legacySession?.user?.id) {
      return legacySession.user.id;
    }
    
    return null;
  } catch {
    return null;
  }
};

// Direct database select helper
const dbSelect = async (table, options = {}) => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Not configured' };
  
  try {
    let query = supabase.from(table).select(options.select || '*');
    
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (options.order) {
      const orders = options.order.split(',');
      orders.forEach(o => {
        const [col, dir] = o.trim().split('.');
        query = query.order(col, { ascending: dir !== 'desc' });
      });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    return { data, error };
  } catch (err) {
    console.error(`[achievementService] dbSelect ${table} error:`, err);
    return { data: null, error: err.message };
  }
};

// RPC helper
const dbRpc = async (funcName, params = {}) => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Not configured' };
  
  try {
    const { data, error } = await supabase.rpc(funcName, params);
    return { data, error };
  } catch (err) {
    console.error(`[achievementService] dbRpc ${funcName} error:`, err);
    return { data: null, error: err.message };
  }
};

class AchievementService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.CACHE_DURATION = 30000; // 30 seconds
  }

  // ===========================================================================
  // FETCHING ACHIEVEMENTS
  // ===========================================================================

  /**
   * Get all achievement definitions
   * v7.12: Changed from 'achievement_definitions' to 'achievements' table
   */
  async getAllAchievements() {
    if (!isSupabaseConfigured()) return { data: [], error: 'Supabase not configured' };
    
    try {
      // v7.12: Query 'achievements' table instead of 'achievement_definitions'
      const { data, error } = await dbSelect('achievements', {
        select: '*',
        order: 'category.asc,points.asc'
      });
      
      if (error) {
        // Handle table not found gracefully
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[achievementService] achievements table not found');
          return { data: [], error: null };
        }
        console.error('[achievementService] getAllAchievements error:', error);
      }
      
      return { data: data || [], error: error?.message || null };
    } catch (err) {
      console.error('[achievementService] Error getting achievements:', err);
      return { data: [], error: err.message };
    }
  }

  /**
   * Get user's unlocked achievements
   * @param {string|boolean} userIdOrForceRefresh - Either userId to query, or boolean for forceRefresh
   * @param {boolean} forceRefresh - Force cache refresh
   */
  async getUserAchievements(userIdOrForceRefresh = false, forceRefresh = false) {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    // Handle both signatures: (userId, forceRefresh) and (forceRefresh)
    let userId;
    let shouldRefresh = forceRefresh;
    
    if (typeof userIdOrForceRefresh === 'string') {
      userId = userIdOrForceRefresh;
    } else if (typeof userIdOrForceRefresh === 'boolean') {
      shouldRefresh = userIdOrForceRefresh;
      userId = getCurrentUserId();
    } else {
      userId = getCurrentUserId();
    }
    
    if (!userId) return { data: [], error: 'Not authenticated' };
    
    // Check cache (only for current user's data)
    if (!shouldRefresh && this.cache && this.cacheTimestamp && 
        Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return { data: this.cache, error: null };
    }
    
    try {
      // Try RPC first (if it exists)
      const { data: rpcData, error: rpcError } = await dbRpc('get_user_achievements', { 
        p_user_id: userId 
      });
      
      if (!rpcError && rpcData) {
        this.cache = rpcData;
        this.cacheTimestamp = Date.now();
        return { data: rpcData, error: null };
      }
      
      // Fallback: Direct query
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          id,
          achievement_id,
          unlocked_at,
          game_id,
          achievement:achievements(*)
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });
      
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return { data: [], error: null };
        }
        console.error('[achievementService] getUserAchievements error:', error);
        return { data: [], error: error.message };
      }
      
      this.cache = data || [];
      this.cacheTimestamp = Date.now();
      
      return { data: data || [], error: null };
    } catch (err) {
      console.error('[achievementService] Error getting user achievements:', err);
      return { data: [], error: err.message };
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
  // ACHIEVEMENT STATISTICS
  // ===========================================================================

  /**
   * Get achievement statistics for a user
   */
  async getAchievementStats(userId) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }
    
    const targetUserId = userId || getCurrentUserId();
    if (!targetUserId) {
      return { data: null, error: 'Not authenticated' };
    }
    
    try {
      // Try RPC first
      const { data: rpcData, error: rpcError } = await dbRpc('get_achievement_stats', {
        p_user_id: targetUserId
      });
      
      if (!rpcError && rpcData) {
        return { data: rpcData, error: null };
      }
      
      // Fallback: Calculate manually
      // console.log('[achievementService] getAchievementStats: RPC not available, calculating manually');
      
      // v7.12: Query 'achievements' table
      const { data: allAchievements } = await dbSelect('achievements', {
        select: 'id,points'
      });
      
      // Get user's unlocked achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', targetUserId);
      
      const totalAchievements = allAchievements?.length || 0;
      const totalPoints = allAchievements?.reduce((sum, a) => sum + (a.points || 0), 0) || 0;
      const unlockedCount = userAchievements?.length || 0;
      
      // Calculate earned points by matching achievement IDs
      let earnedPoints = 0;
      if (userAchievements && allAchievements) {
        const pointsMap = new Map(allAchievements.map(a => [a.id, a.points || 0]));
        earnedPoints = userAchievements.reduce((sum, ua) => {
          return sum + (pointsMap.get(ua.achievement_id) || 0);
        }, 0);
      }
      
      return {
        data: {
          totalAchievements,
          unlockedCount,
          totalPoints,
          earnedPoints,
          completionPercentage: totalAchievements > 0 
            ? Math.round((unlockedCount / totalAchievements) * 100) 
            : 0
        },
        error: null
      };
    } catch (err) {
      console.error('[achievementService] getAchievementStats error:', err);
      return { data: null, error: err.message };
    }
  }

  /**
   * Get achievements with unlock status for display
   */
  async getAchievementsWithStatus(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    const targetUserId = userId || getCurrentUserId();
    if (!targetUserId) return { data: [], error: 'Not authenticated' };
    
    try {
      // Get all achievements
      const { data: allAchievements, error: achError } = await this.getAllAchievements();
      if (achError) {
        console.warn('[achievementService] Error loading all achievements:', achError);
        return { data: [], error: achError };
      }
      
      // Get user's unlocked achievements
      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', targetUserId);
      
      // Handle table not found
      const unlockedData = userError?.code === '42P01' ? [] : (userAchievements || []);
      
      // Create map of unlocked achievement IDs
      const unlockedMap = new Map();
      unlockedData.forEach(ua => {
        if (ua.achievement_id) {
          unlockedMap.set(ua.achievement_id, ua.unlocked_at);
        }
      });
      
      // Merge data
      const achievementsWithStatus = (allAchievements || []).map(a => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) || null,
      }));
      
      return { data: achievementsWithStatus, error: null };
    } catch (err) {
      console.error('[achievementService] getAchievementsWithStatus error:', err);
      return { data: [], error: err.message };
    }
  }

  // ===========================================================================
  // AWARDING ACHIEVEMENTS
  // ===========================================================================

  /**
   * Award an achievement to a user
   */
  async awardAchievement(achievementId, metadata = {}) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };
    
    const userId = getCurrentUserId();
    if (!userId) return { success: false, error: 'Not authenticated' };
    
    try {
      // Try RPC first
      const { data, error } = await dbRpc('award_achievement', {
        p_user_id: userId,
        p_achievement_id: achievementId,
        p_metadata: metadata
      });
      
      if (!error && data?.success) {
        // Clear cache
        this.cache = null;
        this.cacheTimestamp = null;
        return { success: true, error: null };
      }
      
      // Fallback: Direct insert
      const { error: insertError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString()
        });
      
      if (insertError) {
        // Ignore duplicate errors
        if (insertError.code === '23505') {
          return { success: true, error: null }; // Already has achievement
        }
        return { success: false, error: insertError.message };
      }
      
      // Clear cache
      this.cache = null;
      this.cacheTimestamp = null;
      
      return { success: true, error: null };
    } catch (err) {
      console.error('[achievementService] awardAchievement error:', err);
      return { success: false, error: err.message };
    }
  }

  // ===========================================================================
  // CHECKING & AWARDING ACHIEVEMENTS
  // ===========================================================================

  /**
   * Check all achievement conditions for a user and award any newly earned.
   * 
   * CRITICAL: profiles.games_played and profiles.games_won include AI games.
   * Online achievement checks must subtract AI totals to get true online counts.
   */
  async checkAchievements(userId, gameId = null) {
    if (!isSupabaseConfigured()) return { data: [], error: 'Not configured' };

    const targetUserId = userId || getCurrentUserId();
    if (!targetUserId) return { data: [], error: 'Not authenticated' };

    try {
      // Fetch profile stats (includes AI fields)
      const { data: stats, error: statsError } = await supabase
        .from('profiles')
        .select('games_played, games_won, ai_easy_wins, ai_easy_losses, ai_medium_wins, ai_medium_losses, ai_hard_wins, ai_hard_losses, local_games_played, speed_best_streak, puzzles_easy_solved, puzzles_medium_solved, puzzles_hard_solved')
        .eq('id', targetUserId)
        .single();

      if (statsError || !stats) {
        console.error('[achievementService] checkAchievements: Failed to load stats:', statsError);
        return { data: [], error: statsError?.message || 'No stats' };
      }

      // Get already-unlocked achievement IDs
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', targetUserId);

      const alreadyUnlocked = new Set((existing || []).map(e => e.achievement_id));

      // --- Calculate corrected counts ---
      const aiTotalWins = (stats.ai_easy_wins || 0) + (stats.ai_medium_wins || 0) + (stats.ai_hard_wins || 0);
      const aiTotalLosses = (stats.ai_easy_losses || 0) + (stats.ai_medium_losses || 0) + (stats.ai_hard_losses || 0);
      const aiTotalGames = aiTotalWins + aiTotalLosses;

      // Online-only: subtract AI and local from profile totals
      const onlineGamesPlayed = Math.max(0, (stats.games_played || 0) - aiTotalGames - (stats.local_games_played || 0));
      const onlineGamesWon = Math.max(0, (stats.games_won || 0) - aiTotalWins);

      // Puzzle totals
      const puzzleTotal = (stats.puzzles_easy_solved || 0) + (stats.puzzles_medium_solved || 0) + (stats.puzzles_hard_solved || 0);

      // Total across ALL modes (for general achievements)
      const totalAllGames = (stats.games_played || 0) + (stats.local_games_played || 0) + puzzleTotal;

      // --- Define conditions: [achievementId, condition] ---
      const checks = [
        // Online (use corrected online-only counts)
        ['online_first_win',   onlineGamesWon >= 1],
        ['online_wins_10',     onlineGamesWon >= 10],
        ['online_wins_50',     onlineGamesWon >= 50],
        ['online_games_10',    onlineGamesPlayed >= 10],
        ['online_games_50',    onlineGamesPlayed >= 50],
        ['online_games_100',   onlineGamesPlayed >= 100],

        // AI
        ['ai_first_win',       aiTotalWins >= 1],
        ['ai_hard_win',        (stats.ai_hard_wins || 0) >= 1],
        ['ai_hard_wins_10',    (stats.ai_hard_wins || 0) >= 10],
        ['ai_expert_win',      false], // Checked separately when expert AI is beaten

        // Speed
        ['speed_streak_5',     (stats.speed_best_streak || 0) >= 5],
        ['speed_streak_10',    (stats.speed_best_streak || 0) >= 10],
        ['speed_streak_25',    (stats.speed_best_streak || 0) >= 25],
        ['speed_streak_50',    (stats.speed_best_streak || 0) >= 50],

        // Puzzle
        ['puzzle_first',       puzzleTotal >= 1],
        ['puzzle_easy_10',     (stats.puzzles_easy_solved || 0) >= 10],
        ['puzzle_medium_10',   (stats.puzzles_medium_solved || 0) >= 10],
        ['puzzle_hard_10',     (stats.puzzles_hard_solved || 0) >= 10],
        ['puzzle_total_100',   puzzleTotal >= 100],

        // General
        ['games_played_100',   totalAllGames >= 100],
      ];

      // --- Award newly qualified achievements ---
      const awarded = [];

      for (const [achId, condition] of checks) {
        if (condition && !alreadyUnlocked.has(achId)) {
          const result = await this.awardAchievement(achId, gameId ? { game_id: gameId } : {});
          if (result.success) {
            awarded.push({ achievement_id: achId, success: true });
          }
        }
      }

      return { data: awarded, error: null };
    } catch (err) {
      console.error('[achievementService] checkAchievements error:', err);
      return { data: [], error: err.message };
    }
  }

  /**
   * Check weekly challenge achievements (called separately after weekly completion)
   */
  async checkWeeklyAchievements(rank, challengeId) {
    if (!isSupabaseConfigured()) return [];

    const awarded = [];

    try {
      // First weekly completion
      const first = await this.awardAchievement('weekly_first', { challenge_id: challengeId });
      if (first.success) awarded.push('weekly_first');

      // Top 3 finish
      if (rank <= 3) {
        const top3 = await this.awardAchievement('weekly_top_3', { challenge_id: challengeId, rank });
        if (top3.success) awarded.push('weekly_top_3');
      }

      // Champion (1st place)
      if (rank === 1) {
        const champ = await this.awardAchievement('weekly_champion', { challenge_id: challengeId });
        if (champ.success) awarded.push('weekly_champion');
      }
    } catch (err) {
      console.error('[achievementService] checkWeeklyAchievements error:', err);
    }

    return awarded;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }
}

// Export singleton instance
const achievementService = new AchievementService();
export default achievementService;
