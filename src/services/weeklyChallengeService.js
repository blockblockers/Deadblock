// Weekly Challenge Service - Handles weekly puzzle challenges
import { supabase, isSupabaseConfigured } from '../utils/supabase';

class WeeklyChallengeService {
  // Get or create the current week's challenge
  async getCurrentChallenge() {
    if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
    
    try {
      const { data, error } = await supabase.rpc('get_or_create_weekly_challenge');
      return { data, error };
    } catch (err) {
      console.error('Error getting weekly challenge:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Submit a result for the weekly challenge
  async submitResult(challengeId, completionTimeMs) {
    if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };
    
    try {
      const { data, error } = await supabase.rpc('submit_weekly_result', {
        p_user_id: user.id,
        p_challenge_id: challengeId,
        p_completion_time_ms: completionTimeMs
      });
      return { data, error };
    } catch (err) {
      console.error('Error submitting weekly result:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Get the leaderboard for a challenge
  async getLeaderboard(challengeId, limit = 50) {
    if (!isSupabaseConfigured()) return { data: [], error: 'Supabase not configured' };
    
    try {
      const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
        p_challenge_id: challengeId,
        p_limit: limit
      });
      return { data: data || [], error };
    } catch (err) {
      console.error('Error getting weekly leaderboard:', err);
      return { data: [], error: err.message };
    }
  }
  
  // Get the user's result for a specific challenge
  async getUserResult(challengeId) {
    if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };
    
    try {
      const { data, error } = await supabase
        .from('weekly_challenge_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .single();
      
      return { data, error: error?.code === 'PGRST116' ? null : error };
    } catch (err) {
      console.error('Error getting user result:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Get user's rank in a challenge
  async getUserRank(challengeId) {
    if (!isSupabaseConfigured()) return { rank: null, error: 'Supabase not configured' };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { rank: null, error: 'Not authenticated' };
    
    try {
      const { data: leaderboard } = await this.getLeaderboard(challengeId, 1000);
      const userIndex = leaderboard.findIndex(entry => entry.user_id === user.id);
      
      if (userIndex === -1) return { rank: null, error: null };
      return { rank: userIndex + 1, error: null };
    } catch (err) {
      return { rank: null, error: err.message };
    }
  }
  
  // Generate a deterministic puzzle seed for the week
  generatePuzzleSeed(challenge) {
    // Use the challenge's seed to ensure all players get the same puzzle
    return challenge.puzzle_seed;
  }
  
  // Format time from milliseconds
  formatTime(ms) {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = ms % 1000;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${Math.floor(remainingMs / 100)}`;
    }
    return `${seconds}.${Math.floor(remainingMs / 100)}s`;
  }
  
  // Get time remaining in the week
  getTimeRemaining(challenge) {
    if (!challenge?.ends_at) return null;
    
    const now = new Date();
    const endDate = new Date(challenge.ends_at);
    const diff = endDate - now;
    
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes, expired: false };
  }
}

export const weeklyChallengeService = new WeeklyChallengeService();
export default weeklyChallengeService;
