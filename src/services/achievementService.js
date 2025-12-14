// Achievements Service - Track and award player achievements
// UPDATED: Uses direct fetch to bypass Supabase client timeout issues
import { isSupabaseConfigured } from '../utils/supabase';
import { dbSelect, dbRpc, getCurrentUserId } from './supabaseDirectFetch';

export const achievementIcons = {
  Crown: 'Crown', Medal: 'Medal', Calendar: 'Calendar', Flame: 'Flame',
  Zap: 'Zap', Target: 'Target', Award: 'Award', Trophy: 'Trophy',
  Bot: 'Bot', Gamepad2: 'Gamepad2', User: 'User',
};

export const ACHIEVEMENTS = {
  WEEKLY_CHAMPION: 'weekly_champion', WEEKLY_TOP_3: 'weekly_top_3',
  WEEKLY_FIRST: 'weekly_first', WEEKLY_STREAK_4: 'weekly_streak_4',
  SPEED_STREAK_5: 'speed_streak_5', SPEED_STREAK_10: 'speed_streak_10',
  SPEED_STREAK_25: 'speed_streak_25', SPEED_STREAK_50: 'speed_streak_50',
  PUZZLE_FIRST: 'puzzle_first', PUZZLE_EASY_10: 'puzzle_easy_10',
  PUZZLE_MEDIUM_10: 'puzzle_medium_10', PUZZLE_HARD_10: 'puzzle_hard_10',
  PUZZLE_TOTAL_100: 'puzzle_total_100', ONLINE_FIRST_WIN: 'online_first_win',
  ONLINE_WINS_10: 'online_wins_10', ONLINE_WINS_50: 'online_wins_50',
  ONLINE_STREAK_5: 'online_streak_5', AI_FIRST_WIN: 'ai_first_win',
  AI_HARD_WIN: 'ai_hard_win', AI_HARD_WINS_10: 'ai_hard_wins_10',
  GAMES_PLAYED_100: 'games_played_100', PROFILE_COMPLETE: 'profile_complete',
};

class AchievementsService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.CACHE_DURATION = 60000;
  }
  
  async getUserAchievements(forceRefresh = false) {
    if (!isSupabaseConfigured()) return { data: [], error: 'Supabase not configured' };
    
    const userId = getCurrentUserId();
    if (!userId) return { data: [], error: 'Not authenticated' };
    
    if (!forceRefresh && this.cache && this.cacheTimestamp && 
        Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return { data: this.cache, error: null };
    }
    
    try {
      const { data, error } = await dbRpc('get_user_achievements', { p_user_id: userId });
      
      if (!error && data) {
        this.cache = data;
        this.cacheTimestamp = Date.now();
      }
      
      return { data: data || [], error };
    } catch (err) {
      console.error('Error getting achievements:', err);
      return { data: [], error: err.message };
    }
  }
  
  async awardAchievement(achievementId, metadata = {}) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };
    
    const userId = getCurrentUserId();
    if (!userId) return { success: false, error: 'Not authenticated' };
    
    try {
      const { data, error } = await dbRpc('award_achievement', {
        p_user_id: userId,
        p_achievement_id: achievementId,
        p_metadata: metadata
      });
      
      if (data?.success) {
        this.cache = null;
        this.cacheTimestamp = null;
      }
      
      return { success: data?.success || false, error: data?.error || error };
    } catch (err) {
      console.error('Error awarding achievement:', err);
      return { success: false, error: err.message };
    }
  }
  
  async hasAchievement(achievementId) {
    const { data } = await this.getUserAchievements();
    return data.some(a => a.achievement_id === achievementId);
  }
  
  async getAllAchievements() {
    if (!isSupabaseConfigured()) return { data: [], error: 'Supabase not configured' };
    
    try {
      const { data, error } = await dbSelect('achievement_definitions', {
        select: '*',
        order: 'category.asc,points.asc'
      });
      
      return { data: data || [], error };
    } catch (err) {
      console.error('Error getting achievement definitions:', err);
      return { data: [], error: err.message };
    }
  }
  
  async checkAndAwardAchievements(stats) {
    if (!isSupabaseConfigured()) return;
    
    const awarded = [];
    
    if (stats.speed_best_streak >= 5) {
      const result = await this.awardAchievement(ACHIEVEMENTS.SPEED_STREAK_5);
      if (result.success) awarded.push(ACHIEVEMENTS.SPEED_STREAK_5);
    }
    if (stats.speed_best_streak >= 10) {
      const result = await this.awardAchievement(ACHIEVEMENTS.SPEED_STREAK_10);
      if (result.success) awarded.push(ACHIEVEMENTS.SPEED_STREAK_10);
    }
    if (stats.speed_best_streak >= 25) {
      const result = await this.awardAchievement(ACHIEVEMENTS.SPEED_STREAK_25);
      if (result.success) awarded.push(ACHIEVEMENTS.SPEED_STREAK_25);
    }
    if (stats.speed_best_streak >= 50) {
      const result = await this.awardAchievement(ACHIEVEMENTS.SPEED_STREAK_50);
      if (result.success) awarded.push(ACHIEVEMENTS.SPEED_STREAK_50);
    }
    
    const puzzleTotal = (stats.puzzles_easy_solved || 0) + (stats.puzzles_medium_solved || 0) + (stats.puzzles_hard_solved || 0);
    
    if (puzzleTotal >= 1) {
      const result = await this.awardAchievement(ACHIEVEMENTS.PUZZLE_FIRST);
      if (result.success) awarded.push(ACHIEVEMENTS.PUZZLE_FIRST);
    }
    if (stats.puzzles_easy_solved >= 10) {
      const result = await this.awardAchievement(ACHIEVEMENTS.PUZZLE_EASY_10);
      if (result.success) awarded.push(ACHIEVEMENTS.PUZZLE_EASY_10);
    }
    if (stats.puzzles_medium_solved >= 10) {
      const result = await this.awardAchievement(ACHIEVEMENTS.PUZZLE_MEDIUM_10);
      if (result.success) awarded.push(ACHIEVEMENTS.PUZZLE_MEDIUM_10);
    }
    if (stats.puzzles_hard_solved >= 10) {
      const result = await this.awardAchievement(ACHIEVEMENTS.PUZZLE_HARD_10);
      if (result.success) awarded.push(ACHIEVEMENTS.PUZZLE_HARD_10);
    }
    if (puzzleTotal >= 100) {
      const result = await this.awardAchievement(ACHIEVEMENTS.PUZZLE_TOTAL_100);
      if (result.success) awarded.push(ACHIEVEMENTS.PUZZLE_TOTAL_100);
    }
    
    const aiTotalWins = (stats.ai_easy_wins || 0) + (stats.ai_medium_wins || 0) + (stats.ai_hard_wins || 0);
    
    if (aiTotalWins >= 1) {
      const result = await this.awardAchievement(ACHIEVEMENTS.AI_FIRST_WIN);
      if (result.success) awarded.push(ACHIEVEMENTS.AI_FIRST_WIN);
    }
    if (stats.ai_hard_wins >= 1) {
      const result = await this.awardAchievement(ACHIEVEMENTS.AI_HARD_WIN);
      if (result.success) awarded.push(ACHIEVEMENTS.AI_HARD_WIN);
    }
    if (stats.ai_hard_wins >= 10) {
      const result = await this.awardAchievement(ACHIEVEMENTS.AI_HARD_WINS_10);
      if (result.success) awarded.push(ACHIEVEMENTS.AI_HARD_WINS_10);
    }
    
    if (stats.games_won >= 1) {
      const result = await this.awardAchievement(ACHIEVEMENTS.ONLINE_FIRST_WIN);
      if (result.success) awarded.push(ACHIEVEMENTS.ONLINE_FIRST_WIN);
    }
    if (stats.games_won >= 10) {
      const result = await this.awardAchievement(ACHIEVEMENTS.ONLINE_WINS_10);
      if (result.success) awarded.push(ACHIEVEMENTS.ONLINE_WINS_10);
    }
    if (stats.games_won >= 50) {
      const result = await this.awardAchievement(ACHIEVEMENTS.ONLINE_WINS_50);
      if (result.success) awarded.push(ACHIEVEMENTS.ONLINE_WINS_50);
    }
    
    const totalGames = (stats.games_played || 0) + (stats.local_games_played || 0) + puzzleTotal +
                       (stats.ai_easy_wins || 0) + (stats.ai_easy_losses || 0) +
                       (stats.ai_medium_wins || 0) + (stats.ai_medium_losses || 0) +
                       (stats.ai_hard_wins || 0) + (stats.ai_hard_losses || 0);
    
    if (totalGames >= 100) {
      const result = await this.awardAchievement(ACHIEVEMENTS.GAMES_PLAYED_100);
      if (result.success) awarded.push(ACHIEVEMENTS.GAMES_PLAYED_100);
    }
    
    return awarded;
  }
  
  async checkWeeklyAchievements(rank, challengeId) {
    const awarded = [];
    
    const firstResult = await this.awardAchievement(ACHIEVEMENTS.WEEKLY_FIRST, { challenge_id: challengeId });
    if (firstResult.success) awarded.push(ACHIEVEMENTS.WEEKLY_FIRST);
    
    if (rank <= 3) {
      const top3Result = await this.awardAchievement(ACHIEVEMENTS.WEEKLY_TOP_3, { challenge_id: challengeId, rank });
      if (top3Result.success) awarded.push(ACHIEVEMENTS.WEEKLY_TOP_3);
    }
    
    return awarded;
  }
  
  getAchievementProgress(stats) {
    return {
      speed: {
        current: stats.speed_best_streak || 0,
        milestones: [5, 10, 25, 50],
        next: this.getNextMilestone(stats.speed_best_streak || 0, [5, 10, 25, 50]),
      },
      puzzles: {
        total: (stats.puzzles_easy_solved || 0) + (stats.puzzles_medium_solved || 0) + (stats.puzzles_hard_solved || 0),
        milestones: [1, 10, 50, 100],
      },
      online: { wins: stats.games_won || 0, milestones: [1, 10, 50] },
      ai: { hardWins: stats.ai_hard_wins || 0, milestones: [1, 10] },
    };
  }
  
  getNextMilestone(current, milestones) {
    for (const milestone of milestones) {
      if (current < milestone) return milestone;
    }
    return null;
  }
  
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }
}

export const achievementsService = new AchievementsService();
export default achievementsService;
