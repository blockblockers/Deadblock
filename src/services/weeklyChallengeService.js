// Weekly Challenge Service - Handles weekly puzzle challenges
import { supabase, isSupabaseConfigured } from '../utils/supabase';

class WeeklyChallengeService {
  // Get or create the current week's challenge
  async getCurrentChallenge() {
    console.log('[WeeklyChallengeService] getCurrentChallenge called');
    
    if (!isSupabaseConfigured()) {
      console.log('[WeeklyChallengeService] Supabase not configured');
      return { data: null, error: 'Supabase not configured' };
    }
    
    console.log('[WeeklyChallengeService] Supabase is configured, checking connection...');
    
    try {
      console.log('[WeeklyChallengeService] Calling RPC get_or_create_weekly_challenge...');
      const startTime = Date.now();
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
      );
      
      const rpcPromise = supabase.rpc('get_or_create_weekly_challenge');
      
      let result;
      try {
        result = await Promise.race([rpcPromise, timeoutPromise]);
      } catch (raceError) {
        console.error('[WeeklyChallengeService] Race error:', raceError.message);
        result = { data: null, error: { message: raceError.message } };
      }
      
      const { data, error } = result;
      const elapsed = Date.now() - startTime;
      
      console.log('[WeeklyChallengeService] RPC completed in', elapsed, 'ms');
      console.log('[WeeklyChallengeService] RPC result:', { hasData: !!data, dataType: typeof data, error: error?.message });
      
      if (error) {
        console.error('[WeeklyChallengeService] RPC error:', error);
        
        // Fallback: try to get current challenge directly from table
        console.log('[WeeklyChallengeService] Trying fallback query...');
        const now = new Date().toISOString();
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('weekly_challenges')
          .select('*')
          .lte('starts_at', now)
          .gte('ends_at', now)
          .order('starts_at', { ascending: false })
          .limit(1)
          .single();
        
        if (fallbackData) {
          console.log('[WeeklyChallengeService] Fallback succeeded:', fallbackData.id);
          return { data: fallbackData, error: null };
        }
        
        console.error('[WeeklyChallengeService] Fallback also failed:', fallbackError?.message);
        return { data: null, error: error?.message || 'Failed to load challenge' };
      }
      
      console.log('[WeeklyChallengeService] Success! Challenge data:', data);
      return { data, error };
    } catch (err) {
      console.error('[WeeklyChallengeService] Exception in getCurrentChallenge:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Submit a result for the weekly challenge
  // isFirstAttempt - true if this is the user's first completion of this challenge
  async submitResult(challengeId, completionTimeMs, isFirstAttempt = false) {
    if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };
    
    try {
      // Check if user has existing result
      const { data: existingResult } = await supabase
        .from('weekly_challenge_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .single();
      
      if (existingResult) {
        // Update best time if improved
        const updateData = {};
        const currentBest = existingResult.best_time_ms || existingResult.completion_time_ms;
        
        if (completionTimeMs < currentBest) {
          updateData.best_time_ms = completionTimeMs;
          updateData.completion_time_ms = completionTimeMs; // Keep for backwards compatibility
        }
        
        if (Object.keys(updateData).length > 0) {
          const { data, error } = await supabase
            .from('weekly_challenge_results')
            .update(updateData)
            .eq('id', existingResult.id)
            .select()
            .single();
          
          return { 
            data: { 
              ...data, 
              is_improvement: true,
              first_attempt_time_ms: existingResult.first_attempt_time_ms,
              best_time_ms: completionTimeMs
            }, 
            error 
          };
        }
        
        // No improvement
        return { 
          data: { 
            ...existingResult, 
            is_improvement: false 
          }, 
          error: null 
        };
      } else {
        // First ever completion - first_attempt_time equals completion time
        const { data, error } = await supabase
          .from('weekly_challenge_results')
          .insert({
            user_id: user.id,
            challenge_id: challengeId,
            first_attempt_time_ms: completionTimeMs,
            best_time_ms: completionTimeMs,
            completion_time_ms: completionTimeMs, // Keep for backwards compatibility
            completed_at: new Date().toISOString()
          })
          .select()
          .single();
        
        return { 
          data: { 
            ...data, 
            is_improvement: true,
            first_attempt_time_ms: completionTimeMs,
            best_time_ms: completionTimeMs
          }, 
          error 
        };
      }
    } catch (err) {
      console.error('Error submitting weekly result:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Get the leaderboard for a challenge (ranked by first_attempt_time_ms)
  async getLeaderboard(challengeId, limit = 50) {
    if (!isSupabaseConfigured()) return { data: [], error: 'Supabase not configured' };
    
    try {
      // Query directly with sorting by first_attempt_time_ms
      const { data, error } = await supabase
        .from('weekly_challenge_results')
        .select(`
          user_id,
          first_attempt_time_ms,
          best_time_ms,
          completion_time_ms,
          completed_at,
          profiles!weekly_challenge_results_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('challenge_id', challengeId)
        .order('first_attempt_time_ms', { ascending: true, nullsFirst: false })
        .limit(limit);
      
      if (error) {
        // Fallback to RPC if direct query fails
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_weekly_leaderboard', {
          p_challenge_id: challengeId,
          p_limit: limit
        });
        return { data: rpcData || [], error: rpcError };
      }
      
      // Flatten the data
      const formattedData = (data || []).map(entry => ({
        user_id: entry.user_id,
        first_attempt_time_ms: entry.first_attempt_time_ms || entry.completion_time_ms,
        best_time_ms: entry.best_time_ms || entry.completion_time_ms,
        completion_time_ms: entry.completion_time_ms,
        completed_at: entry.completed_at,
        username: entry.profiles?.username,
        display_name: entry.profiles?.display_name,
        avatar_url: entry.profiles?.avatar_url
      }));
      
      return { data: formattedData, error: null };
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
  
  // Get user's rank in a challenge (based on first_attempt_time)
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
