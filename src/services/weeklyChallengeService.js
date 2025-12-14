// Weekly Challenge Service - Handles weekly puzzle challenges
// FIXED: Uses direct fetch to bypass Supabase client timeout issues
import { supabase, isSupabaseConfigured } from '../utils/supabase';

// Helper to get auth data and make direct fetch calls
const getAuthHeaders = () => {
  const authKey = 'sb-oyeibyrednwlolmsjlwk-auth-token';
  const authData = JSON.parse(localStorage.getItem(authKey) || 'null');
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!authData?.access_token || !ANON_KEY) {
    return null;
  }
  
  return {
    'Authorization': `Bearer ${authData.access_token}`,
    'apikey': ANON_KEY,
    'Content-Type': 'application/json'
  };
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';

class WeeklyChallengeService {
  // Get or create the current week's challenge
  async getCurrentChallenge() {
    console.log('[WeeklyChallengeService] getCurrentChallenge called');
    
    if (!isSupabaseConfigured()) {
      console.log('[WeeklyChallengeService] Supabase not configured');
      return { data: null, error: 'Supabase not configured' };
    }
    
    const headers = getAuthHeaders();
    if (!headers) {
      console.log('[WeeklyChallengeService] No auth headers available');
      return { data: null, error: 'Not authenticated' };
    }
    
    try {
      console.log('[WeeklyChallengeService] Calling RPC via direct fetch...');
      const startTime = Date.now();
      
      // Call RPC via direct fetch
      const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_or_create_weekly_challenge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      
      const elapsed = Date.now() - startTime;
      console.log('[WeeklyChallengeService] RPC completed in', elapsed, 'ms, status:', rpcResponse.status);
      
      if (rpcResponse.ok) {
        const data = await rpcResponse.json();
        console.log('[WeeklyChallengeService] Success! Challenge data:', data);
        return { data, error: null };
      }
      
      // RPC failed, try fallback query
      console.log('[WeeklyChallengeService] RPC failed, trying fallback query...');
      const now = new Date().toISOString();
      
      const fallbackResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_challenges?starts_at=lte.${now}&ends_at=gte.${now}&order=starts_at.desc&limit=1`,
        { headers }
      );
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.length > 0) {
          console.log('[WeeklyChallengeService] Fallback succeeded:', fallbackData[0].id);
          return { data: fallbackData[0], error: null };
        }
      }
      
      const errorData = await rpcResponse.json().catch(() => ({}));
      console.error('[WeeklyChallengeService] Both RPC and fallback failed');
      return { data: null, error: errorData?.message || 'Failed to load challenge' };
      
    } catch (err) {
      console.error('[WeeklyChallengeService] Exception in getCurrentChallenge:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Submit a result for the weekly challenge
  async submitResult(challengeId, completionTimeMs, isFirstAttempt = false) {
    if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
    
    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: 'Not authenticated' };
    
    // Get user ID from localStorage
    const authKey = 'sb-oyeibyrednwlolmsjlwk-auth-token';
    const authData = JSON.parse(localStorage.getItem(authKey) || 'null');
    const userId = authData?.user?.id;
    
    if (!userId) return { data: null, error: 'Not authenticated' };
    
    try {
      // Check if user has existing result
      const existingResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_challenge_results?user_id=eq.${userId}&challenge_id=eq.${challengeId}&select=*`,
        { headers }
      );
      
      const existingResults = existingResponse.ok ? await existingResponse.json() : [];
      const existingResult = existingResults[0];
      
      if (existingResult) {
        // Update best time if improved
        const currentBest = existingResult.best_time_ms || existingResult.completion_time_ms;
        
        if (completionTimeMs < currentBest) {
          const updateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/weekly_challenge_results?id=eq.${existingResult.id}`,
            {
              method: 'PATCH',
              headers: { ...headers, 'Prefer': 'return=representation' },
              body: JSON.stringify({
                best_time_ms: completionTimeMs,
                completion_time_ms: completionTimeMs
              })
            }
          );
          
          const updatedData = updateResponse.ok ? (await updateResponse.json())[0] : existingResult;
          
          return { 
            data: { 
              ...updatedData, 
              is_improvement: true,
              first_attempt_time_ms: existingResult.first_attempt_time_ms,
              best_time_ms: completionTimeMs
            }, 
            error: null 
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
        // First ever completion
        const insertResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/weekly_challenge_results`,
          {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify({
              user_id: userId,
              challenge_id: challengeId,
              first_attempt_time_ms: completionTimeMs,
              best_time_ms: completionTimeMs,
              completion_time_ms: completionTimeMs,
              completed_at: new Date().toISOString()
            })
          }
        );
        
        const insertedData = insertResponse.ok ? (await insertResponse.json())[0] : null;
        
        return { 
          data: { 
            ...insertedData, 
            is_improvement: true,
            first_attempt_time_ms: completionTimeMs,
            best_time_ms: completionTimeMs
          }, 
          error: insertResponse.ok ? null : 'Failed to save result'
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
    
    const headers = getAuthHeaders();
    if (!headers) return { data: [], error: 'Not authenticated' };
    
    try {
      // Query results with profiles
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_challenge_results?challenge_id=eq.${challengeId}&order=first_attempt_time_ms.asc.nullslast&limit=${limit}&select=user_id,first_attempt_time_ms,best_time_ms,completion_time_ms,completed_at`,
        { headers }
      );
      
      if (!response.ok) {
        return { data: [], error: 'Failed to fetch leaderboard' };
      }
      
      const results = await response.json();
      
      if (results.length === 0) {
        return { data: [], error: null };
      }
      
      // Fetch profiles for all users
      const userIds = results.map(r => r.user_id);
      const profilesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=in.(${userIds.join(',')})&select=id,username,display_name,avatar_url`,
        { headers }
      );
      
      const profiles = profilesResponse.ok ? await profilesResponse.json() : [];
      const profileMap = {};
      profiles.forEach(p => { profileMap[p.id] = p; });
      
      // Combine results with profiles
      const formattedData = results.map(entry => ({
        user_id: entry.user_id,
        first_attempt_time_ms: entry.first_attempt_time_ms || entry.completion_time_ms,
        best_time_ms: entry.best_time_ms || entry.completion_time_ms,
        completion_time_ms: entry.completion_time_ms,
        completed_at: entry.completed_at,
        username: profileMap[entry.user_id]?.username,
        display_name: profileMap[entry.user_id]?.display_name,
        avatar_url: profileMap[entry.user_id]?.avatar_url
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
    
    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: 'Not authenticated' };
    
    const authKey = 'sb-oyeibyrednwlolmsjlwk-auth-token';
    const authData = JSON.parse(localStorage.getItem(authKey) || 'null');
    const userId = authData?.user?.id;
    
    if (!userId) return { data: null, error: 'Not authenticated' };
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_challenge_results?user_id=eq.${userId}&challenge_id=eq.${challengeId}&select=*`,
        { headers }
      );
      
      if (!response.ok) {
        return { data: null, error: 'Failed to fetch result' };
      }
      
      const results = await response.json();
      return { data: results[0] || null, error: null };
    } catch (err) {
      console.error('Error getting user result:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Get user's rank in a challenge (based on first_attempt_time)
  async getUserRank(challengeId) {
    if (!isSupabaseConfigured()) return { rank: null, error: 'Supabase not configured' };
    
    const authKey = 'sb-oyeibyrednwlolmsjlwk-auth-token';
    const authData = JSON.parse(localStorage.getItem(authKey) || 'null');
    const userId = authData?.user?.id;
    
    if (!userId) return { rank: null, error: 'Not authenticated' };
    
    try {
      const { data: leaderboard } = await this.getLeaderboard(challengeId, 1000);
      const userIndex = leaderboard.findIndex(entry => entry.user_id === userId);
      
      if (userIndex === -1) return { rank: null, error: null };
      return { rank: userIndex + 1, error: null };
    } catch (err) {
      return { rank: null, error: err.message };
    }
  }
  
  // Generate a deterministic puzzle seed for the week
  generatePuzzleSeed(challenge) {
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
