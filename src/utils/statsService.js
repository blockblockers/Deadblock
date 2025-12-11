// Stats Service - Track and update single player statistics
import { supabase } from './supabase';

class StatsService {
  constructor() {
    this.pendingUpdates = [];
    this.flushTimeout = null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!supabase?.auth?.getUser;
  }

  // Queue a stat update (batches updates for efficiency)
  async updateStat(statType, value = 1) {
    if (!supabase) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Not logged in, skip stat tracking
      
      // Call the database function to update stats
      const { error } = await supabase.rpc('update_player_stats', {
        p_user_id: user.id,
        p_stat_type: statType,
        p_stat_value: value
      });
      
      if (error) {
        console.error('[Stats] Error updating stat:', statType, error);
      } else {
        console.log('[Stats] Updated:', statType, value);
      }
    } catch (err) {
      console.error('[Stats] Failed to update stat:', err);
    }
  }

  // Puzzle Mode Stats
  async recordPuzzleAttempt(difficulty) {
    const statType = `puzzle_${difficulty}_attempted`;
    await this.updateStat(statType);
  }

  async recordPuzzleSolved(difficulty) {
    const statType = `puzzle_${difficulty}_solved`;
    await this.updateStat(statType);
  }

  // Speed Puzzle Stats
  async recordSpeedPuzzleComplete() {
    await this.updateStat('speed_puzzle_completed');
  }

  async recordSpeedSessionComplete(finalStreak) {
    await this.updateStat('speed_session_completed');
    // Update best streak if this is higher
    await this.updateStat('speed_best_streak', finalStreak);
  }

  async updateSpeedBestStreak(streak) {
    await this.updateStat('speed_best_streak', streak);
  }

  // VS AI Stats
  async recordAIGameResult(difficulty, won) {
    const statType = `ai_${difficulty}_${won ? 'win' : 'loss'}`;
    await this.updateStat(statType);
  }

  // Local multiplayer
  async recordLocalGame() {
    await this.updateStat('local_game');
  }

  // Get user's stats from profile
  async getStats() {
    if (!supabase) return null;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          puzzles_easy_solved,
          puzzles_easy_attempted,
          puzzles_medium_solved,
          puzzles_medium_attempted,
          puzzles_hard_solved,
          puzzles_hard_attempted,
          speed_best_streak,
          speed_total_puzzles,
          speed_total_sessions,
          ai_easy_wins,
          ai_easy_losses,
          ai_medium_wins,
          ai_medium_losses,
          ai_hard_wins,
          ai_hard_losses,
          local_games_played,
          rating,
          games_played,
          games_won,
          last_played_at
        `)
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('[Stats] Error fetching stats:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('[Stats] Failed to get stats:', err);
      return null;
    }
  }

  // Get speed puzzle leaderboard
  async getSpeedLeaderboard(limit = 10) {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, speed_best_streak, rating')
        .gt('speed_best_streak', 0)
        .order('speed_best_streak', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('[Stats] Error fetching leaderboard:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('[Stats] Failed to get leaderboard:', err);
      return [];
    }
  }

  // Calculate derived stats
  calculateDerivedStats(stats) {
    if (!stats) return null;
    
    // Puzzle win rates
    const puzzleEasyTotal = stats.puzzles_easy_attempted || 0;
    const puzzleMediumTotal = stats.puzzles_medium_attempted || 0;
    const puzzleHardTotal = stats.puzzles_hard_attempted || 0;
    
    const puzzleEasyWinRate = puzzleEasyTotal > 0 
      ? Math.round((stats.puzzles_easy_solved / puzzleEasyTotal) * 100) 
      : 0;
    const puzzleMediumWinRate = puzzleMediumTotal > 0 
      ? Math.round((stats.puzzles_medium_solved / puzzleMediumTotal) * 100) 
      : 0;
    const puzzleHardWinRate = puzzleHardTotal > 0 
      ? Math.round((stats.puzzles_hard_solved / puzzleHardTotal) * 100) 
      : 0;
    
    // AI win rates
    const aiEasyTotal = (stats.ai_easy_wins || 0) + (stats.ai_easy_losses || 0);
    const aiMediumTotal = (stats.ai_medium_wins || 0) + (stats.ai_medium_losses || 0);
    const aiHardTotal = (stats.ai_hard_wins || 0) + (stats.ai_hard_losses || 0);
    
    const aiEasyWinRate = aiEasyTotal > 0 
      ? Math.round((stats.ai_easy_wins / aiEasyTotal) * 100) 
      : 0;
    const aiMediumWinRate = aiMediumTotal > 0 
      ? Math.round((stats.ai_medium_wins / aiMediumTotal) * 100) 
      : 0;
    const aiHardWinRate = aiHardTotal > 0 
      ? Math.round((stats.ai_hard_wins / aiHardTotal) * 100) 
      : 0;
    
    // Online win rate
    const onlineTotal = stats.games_played || 0;
    const onlineWinRate = onlineTotal > 0 
      ? Math.round((stats.games_won / onlineTotal) * 100) 
      : 0;
    
    // Speed puzzle average
    const speedAvgStreak = stats.speed_total_sessions > 0
      ? Math.round(stats.speed_total_puzzles / stats.speed_total_sessions)
      : 0;
    
    return {
      ...stats,
      // Puzzle derived
      puzzleEasyWinRate,
      puzzleMediumWinRate,
      puzzleHardWinRate,
      puzzleTotalSolved: (stats.puzzles_easy_solved || 0) + (stats.puzzles_medium_solved || 0) + (stats.puzzles_hard_solved || 0),
      // AI derived
      aiEasyWinRate,
      aiMediumWinRate,
      aiHardWinRate,
      aiTotalWins: (stats.ai_easy_wins || 0) + (stats.ai_medium_wins || 0) + (stats.ai_hard_wins || 0),
      aiTotalGames: aiEasyTotal + aiMediumTotal + aiHardTotal,
      // Online derived
      onlineWinRate,
      // Speed derived
      speedAvgStreak,
    };
  }
}

// Export singleton instance
export const statsService = new StatsService();
export default statsService;
