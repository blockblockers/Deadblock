// Achievement Service - Handles achievement tracking and retrieval
// Uses Supabase REST API directly for reliability

import { supabase, isSupabaseConfigured } from '../utils/supabase';

// =============================================================================
// CONSTANTS
// =============================================================================

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
    glow: 'rgba(168,85,247,0.3)' 
  },
  legendary: { 
    bg: 'bg-amber-500/20', 
    border: 'border-amber-400', 
    text: 'text-amber-300', 
    glow: 'rgba(251,191,36,0.5)' 
  },
};

export const CATEGORY_LABELS = {
  weekly: 'Weekly Challenge',
  speed: 'Speed Puzzle',
  puzzle: 'Puzzle Mode',
  online: 'Online Games',
  ai: 'VS AI',
  general: 'General',
};

// =============================================================================
// ACHIEVEMENT SERVICE
// =============================================================================

export const achievementService = {
  /**
   * Get all achievements with user's unlock status
   */
  async getAchievementsWithStatus(userId) {
    if (!isSupabaseConfigured() || !userId) {
      return { data: [], error: null };
    }

    try {
      // Try using the RPC function first (more efficient)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_achievements_with_status', { p_user_id: userId });
      
      if (!rpcError && rpcData) {
        return { data: rpcData, error: null };
      }

      // Fallback: Manual join query
      const { data: definitions, error: defError } = await supabase
        .from('achievement_definitions')
        .select('*')
        .order('category')
        .order('rarity');

      if (defError) {
        console.error('Error fetching achievement definitions:', defError);
        throw defError;
      }

      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId);

      if (userError) {
        console.error('Error fetching user achievements:', userError);
        throw userError;
      }

      // Map earned achievements
      const earnedMap = new Map(
        (userAchievements || []).map(ua => [ua.achievement_id, ua.earned_at])
      );

      const achievementsWithStatus = (definitions || []).map(def => ({
        ...def,
        earned: earnedMap.has(def.id),
        earned_at: earnedMap.get(def.id) || null,
      }));

      return { data: achievementsWithStatus, error: null };

    } catch (error) {
      console.error('Achievement service error:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'Failed to load achievements. Database migration may be required.',
          code: error.code 
        } 
      };
    }
  },

  /**
   * Get achievement statistics for a user
   */
  async getAchievementStats(userId) {
    if (!isSupabaseConfigured() || !userId) {
      return { 
        data: {
          total_earned: 0,
          total_available: 0,
          total_points: 0,
          common_earned: 0,
          uncommon_earned: 0,
          rare_earned: 0,
          epic_earned: 0,
          legendary_earned: 0,
        }, 
        error: null 
      };
    }

    try {
      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_achievement_summary', { p_user_id: userId });

      if (!rpcError && rpcData && rpcData.length > 0) {
        return { data: rpcData[0], error: null };
      }

      // Fallback: Manual calculation
      const { data: definitions } = await supabase
        .from('achievement_definitions')
        .select('id, points, rarity');

      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId);

      const earnedIds = new Set((userAchievements || []).map(ua => ua.achievement_id));
      const allDefs = definitions || [];

      const stats = {
        total_earned: earnedIds.size,
        total_available: allDefs.length,
        total_points: 0,
        common_earned: 0,
        uncommon_earned: 0,
        rare_earned: 0,
        epic_earned: 0,
        legendary_earned: 0,
      };

      for (const def of allDefs) {
        if (earnedIds.has(def.id)) {
          stats.total_points += def.points;
          stats[`${def.rarity}_earned`] = (stats[`${def.rarity}_earned`] || 0) + 1;
        }
      }

      return { data: stats, error: null };

    } catch (error) {
      console.error('Error getting achievement stats:', error);
      return { 
        data: {
          total_earned: 0,
          total_available: 0,
          total_points: 0,
        }, 
        error 
      };
    }
  },

  /**
   * Get user's earned achievements
   */
  async getUserAchievements(userId) {
    if (!isSupabaseConfigured() || !userId) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          id,
          achievement_id,
          earned_at,
          game_id,
          achievement:achievement_definitions(*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };

    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return { data: [], error };
    }
  },

  /**
   * Award an achievement to a user
   */
  async awardAchievement(userId, achievementId, gameId = null) {
    if (!isSupabaseConfigured() || !userId || !achievementId) {
      return { success: false, error: 'Invalid parameters' };
    }

    try {
      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('award_achievement', { 
          p_user_id: userId, 
          p_achievement_id: achievementId,
          p_game_id: gameId 
        });

      if (!rpcError) {
        return { success: rpcData === true, alreadyEarned: rpcData === false, error: null };
      }

      // Fallback: Direct insert
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          game_id: gameId,
        });

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation = already earned
          return { success: false, alreadyEarned: true, error: null };
        }
        throw error;
      }

      return { success: true, alreadyEarned: false, error: null };

    } catch (error) {
      console.error('Error awarding achievement:', error);
      return { success: false, error };
    }
  },

  /**
   * Check and award achievements based on stats
   * Call this after game events (wins, completions, etc.)
   */
  async checkAndAwardAchievements(userId, stats) {
    if (!userId || !stats) return { awarded: [] };

    const awarded = [];

    try {
      // Check speed puzzle achievements
      if (stats.speedStreak) {
        if (stats.speedStreak >= 5) {
          const result = await this.awardAchievement(userId, ACHIEVEMENTS.SPEED_STREAK_5);
          if (result.success) awarded.push(ACHIEVEMENTS.SPEED_STREAK_5);
        }
        if (stats.speedStreak >= 10) {
          const result = await this.awardAchievement(userId, ACHIEVEMENTS.SPEED_STREAK_10);
          if (result.success) awarded.push(ACHIEVEMENTS.SPEED_STREAK_10);
        }
        if (stats.speedStreak >= 25) {
          const result = await this.awardAchievement(userId, ACHIEVEMENTS.SPEED_STREAK_25);
          if (result.success) awarded.push(ACHIEVEMENTS.SPEED_STREAK_25);
        }
        if (stats.speedStreak >= 50) {
          const result = await this.awardAchievement(userId, ACHIEVEMENTS.SPEED_STREAK_50);
          if (result.success) awarded.push(ACHIEVEMENTS.SPEED_STREAK_50);
        }
      }

      // Check puzzle achievements
      if (stats.puzzlesCompleted) {
        if (stats.puzzlesCompleted >= 1) {
          const result = await this.awardAchievement(userId, ACHIEVEMENTS.PUZZLE_FIRST);
          if (result.success) awarded.push(ACHIEVEMENTS.PUZZLE_FIRST);
        }
        if (stats.puzzlesCompleted >= 100) {
          const result = await this.awardAchievement(userId, ACHIEVEMENTS.PUZZLE_TOTAL_100);
          if (result.success) awarded.push(ACHIEVEMENTS.PUZZLE_TOTAL_100);
        }
      }

      // Check online win achievements
      if (stats.onlineWins) {
        if (stats.onlineWins >= 1) {
          const result = await this.awardAchievement(userId, ACHIEVEMENTS.ONLINE_FIRST_WIN);
          if (result.success) awarded.push(ACHIEVEMENTS.ONLINE_FIRST_WIN);
        }
        if (stats.onlineWins >= 10) {
          const result = await this.awardAchievement(userId, ACHIEVEMENTS.ONLINE_WINS_10);
          if (result.success) awarded.push(ACHIEVEMENTS.ONLINE_WINS_10);
        }
        if (stats.onlineWins >= 50) {
          const result = await this.awardAchievement(userId, ACHIEVEMENTS.ONLINE_WINS_50);
          if (result.success) awarded.push(ACHIEVEMENTS.ONLINE_WINS_50);
        }
      }

      // Check AI achievements
      if (stats.aiWins >= 1) {
        const result = await this.awardAchievement(userId, ACHIEVEMENTS.AI_FIRST_WIN);
        if (result.success) awarded.push(ACHIEVEMENTS.AI_FIRST_WIN);
      }

      if (stats.aiHardWins >= 1) {
        const result = await this.awardAchievement(userId, ACHIEVEMENTS.AI_HARD_WIN);
        if (result.success) awarded.push(ACHIEVEMENTS.AI_HARD_WIN);
      }

      if (stats.aiHardWins >= 10) {
        const result = await this.awardAchievement(userId, ACHIEVEMENTS.AI_HARD_WINS_10);
        if (result.success) awarded.push(ACHIEVEMENTS.AI_HARD_WINS_10);
      }

      // Check weekly achievements
      if (stats.weeklyWins >= 1) {
        const result = await this.awardAchievement(userId, ACHIEVEMENTS.WEEKLY_CHAMPION);
        if (result.success) awarded.push(ACHIEVEMENTS.WEEKLY_CHAMPION);
      }

      if (stats.weeklyCompletions >= 1) {
        const result = await this.awardAchievement(userId, ACHIEVEMENTS.WEEKLY_FIRST);
        if (result.success) awarded.push(ACHIEVEMENTS.WEEKLY_FIRST);
      }

    } catch (error) {
      console.error('Error checking achievements:', error);
    }

    return { awarded };
  },

  /**
   * Get recently earned achievements for display
   */
  async getRecentAchievements(userId, limit = 5) {
    if (!isSupabaseConfigured() || !userId) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          achievement_id,
          earned_at,
          achievement:achievement_definitions(*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data: data || [], error: null };

    } catch (error) {
      console.error('Error fetching recent achievements:', error);
      return { data: [], error };
    }
  },
};

export default achievementService;
