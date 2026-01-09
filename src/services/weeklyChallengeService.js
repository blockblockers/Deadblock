// Weekly Challenge Service - Handles weekly puzzle challenges
// v7.11: Added getUserPodiumBreakdown for detailed 1st/2nd/3rd place stats
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
        
        // VALIDATION: Check if challenge dates are current
        if (data) {
          const now = new Date();
          const startsAt = data.starts_at ? new Date(data.starts_at) : null;
          const endsAt = data.ends_at ? new Date(data.ends_at) : null;
          
          console.log('[WeeklyChallengeService] Challenge dates validation:', {
            now: now.toISOString(),
            starts_at: startsAt?.toISOString(),
            ends_at: endsAt?.toISOString(),
            week_number: data.week_number,
            challenge_id: data.id,
            puzzle_seed: data.puzzle_seed
          });
        }
        
        return { data, error: null };
      }
      
      // Handle errors
      const errorText = await rpcResponse.text();
      console.error('[WeeklyChallengeService] RPC error:', rpcResponse.status, errorText);
      return { data: null, error: `RPC failed: ${rpcResponse.status}` };
    } catch (err) {
      console.error('[WeeklyChallengeService] Exception:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Submit a result for the weekly challenge
  async submitResult(challengeId, completionTimeMs) {
    if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
    
    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: 'Not authenticated' };
    
    const authKey = 'sb-oyeibyrednwlolmsjlwk-auth-token';
    const authData = JSON.parse(localStorage.getItem(authKey) || 'null');
    const userId = authData?.user?.id;
    
    if (!userId) return { data: null, error: 'Not authenticated' };
    
    try {
      // Check if user already has a result for this challenge
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_challenge_results?user_id=eq.${userId}&challenge_id=eq.${challengeId}&select=*`,
        { headers }
      );
      
      if (!checkResponse.ok) {
        return { data: null, error: 'Failed to check existing result' };
      }
      
      const existing = await checkResponse.json();
      
      if (existing && existing.length > 0) {
        // User has existing result - update if this is a better time
        const existingResult = existing[0];
        const isImprovement = completionTimeMs < (existingResult.best_time_ms || Infinity);
        
        if (isImprovement) {
          const updateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/weekly_challenge_results?id=eq.${existingResult.id}`,
            {
              method: 'PATCH',
              headers: {
                ...headers,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                best_time_ms: completionTimeMs,
                completed_at: new Date().toISOString()
              })
            }
          );
          
          const updatedData = updateResponse.ok ? (await updateResponse.json())[0] : existingResult;
          
          return { 
            data: { 
              ...updatedData, 
              is_improvement: true,
              first_attempt_time_ms: existingResult.first_attempt_time_ms,
              best_time_ms: completionTimeMs,
              was_first_attempt: false
            }, 
            error: null 
          };
        } else {
          // Not an improvement
          return { 
            data: { 
              ...existingResult, 
              is_improvement: false,
              was_first_attempt: false
            }, 
            error: null 
          };
        }
      } else {
        // First attempt - insert new result
        const insertResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/weekly_challenge_results`,
          {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
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
            best_time_ms: completionTimeMs,
            was_first_attempt: true
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
    console.log('[WeeklyChallengeService] getLeaderboard called:', { challengeId, limit });
    
    if (!isSupabaseConfigured()) return { data: [], error: 'Supabase not configured' };
    
    const headers = getAuthHeaders();
    if (!headers) return { data: [], error: 'Not authenticated' };
    
    try {
      // Query results
      const resultsUrl = `${SUPABASE_URL}/rest/v1/weekly_challenge_results?challenge_id=eq.${challengeId}&order=first_attempt_time_ms.asc.nullslast&limit=${limit}&select=user_id,first_attempt_time_ms,best_time_ms,completion_time_ms,completed_at`;
      
      const response = await fetch(resultsUrl, { headers });
      
      if (!response.ok) {
        console.error('[WeeklyChallengeService] Results fetch failed:', response.status);
        return { data: [], error: 'Failed to fetch leaderboard' };
      }
      
      const results = await response.json();
      
      if (results.length === 0) {
        return { data: [], error: null };
      }
      
      // Fetch profiles for all users
      const userIds = results.map(r => r.user_id);
      const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?id=in.(${userIds.map(id => `"${id}"`).join(',')})&select=id,username,display_name,rating`;
      
      const profilesResponse = await fetch(profilesUrl, { headers });
      
      let profilesMap = {};
      if (profilesResponse.ok) {
        const profiles = await profilesResponse.json();
        profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
      
      // Combine results with profiles
      const leaderboard = results.map((result, index) => ({
        ...result,
        rank: index + 1,
        profile: profilesMap[result.user_id] || { username: 'Unknown', display_name: 'Unknown' }
      }));
      
      return { data: leaderboard, error: null };
    } catch (err) {
      console.error('Error getting leaderboard:', err);
      return { data: [], error: err.message };
    }
  }
  
  // Get user's rank in a challenge
  async getUserRank(challengeId) {
    if (!isSupabaseConfigured()) return { rank: null, error: 'Not configured' };
    
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
      console.error('Error getting user rank:', err);
      return { rank: null, error: err.message };
    }
  }
  
  // Get user's stats for a specific challenge
  async getUserChallengeStats(challengeId) {
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
        return { data: null, error: 'Failed to fetch stats' };
      }
      
      const results = await response.json();
      const result = results[0];
      
      if (!result) {
        return { data: null, error: null };
      }
      
      return { 
        data: {
          best_time: result.best_time_ms || result.first_attempt_time_ms || result.completion_time_ms,
          first_attempt_time: result.first_attempt_time_ms,
          attempts: result.attempts || 1,
          completed_at: result.completed_at
        }, 
        error: null 
      };
    } catch (err) {
      console.error('Error getting user challenge stats:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Get count of top 3 finishes for a user across all completed weekly challenges
  async getUserPodiumCount(userId) {
    if (!isSupabaseConfigured()) return { data: 0, error: 'Not configured' };
    
    const headers = getAuthHeaders();
    if (!headers) return { data: 0, error: 'Not authenticated' };
    
    try {
      // First, get all completed challenges (ended before now)
      const now = new Date().toISOString();
      const challengesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_challenges?ends_at=lt.${now}&select=id`,
        { headers }
      );
      
      if (!challengesResponse.ok) {
        return { data: 0, error: 'Failed to fetch challenges' };
      }
      
      const challenges = await challengesResponse.json();
      if (!challenges || challenges.length === 0) {
        return { data: 0, error: null };
      }
      
      let podiumCount = 0;
      
      // For each completed challenge, check user's rank
      for (const challenge of challenges) {
        const { data: leaderboard } = await this.getLeaderboard(challenge.id, 10);
        
        if (leaderboard && leaderboard.length > 0) {
          // Find user's position in top 3
          const userIndex = leaderboard.findIndex(entry => entry.user_id === userId);
          if (userIndex !== -1 && userIndex < 3) {
            podiumCount++;
          }
        }
      }
      
      return { data: podiumCount, error: null };
    } catch (err) {
      console.error('Error getting user podium count:', err);
      return { data: 0, error: err.message };
    }
  }
  
  // =========================================================================
  // v7.11: NEW - Get detailed podium breakdown (1st, 2nd, 3rd place counts)
  // =========================================================================
  async getUserPodiumBreakdown(userId) {
    if (!isSupabaseConfigured()) return { data: null, error: 'Not configured' };
    
    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: 'Not authenticated' };
    
    try {
      // Get all completed challenges (ended before now)
      const now = new Date().toISOString();
      const challengesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_challenges?ends_at=lt.${now}&select=id`,
        { headers }
      );
      
      if (!challengesResponse.ok) {
        console.log('[WeeklyChallengeService] Failed to fetch completed challenges');
        return { data: null, error: 'Failed to fetch challenges' };
      }
      
      const challenges = await challengesResponse.json();
      if (!challenges || challenges.length === 0) {
        console.log('[WeeklyChallengeService] No completed challenges found');
        return { data: { first: 0, second: 0, third: 0, total: 0 }, error: null };
      }
      
      console.log('[WeeklyChallengeService] Processing', challenges.length, 'completed challenges for podium breakdown');
      
      let first = 0, second = 0, third = 0;
      
      // For each completed challenge, check user's rank
      for (const challenge of challenges) {
        const { data: leaderboard } = await this.getLeaderboard(challenge.id, 10);
        
        if (leaderboard && leaderboard.length > 0) {
          const userIndex = leaderboard.findIndex(entry => entry.user_id === userId);
          if (userIndex === 0) {
            first++;
            console.log('[WeeklyChallengeService] Found 1st place in challenge', challenge.id);
          } else if (userIndex === 1) {
            second++;
            console.log('[WeeklyChallengeService] Found 2nd place in challenge', challenge.id);
          } else if (userIndex === 2) {
            third++;
            console.log('[WeeklyChallengeService] Found 3rd place in challenge', challenge.id);
          }
        }
      }
      
      const total = first + second + third;
      console.log('[WeeklyChallengeService] Podium breakdown:', { first, second, third, total });
      
      return { data: { first, second, third, total }, error: null };
    } catch (err) {
      console.error('[WeeklyChallengeService] Error getting user podium breakdown:', err);
      return { data: null, error: err.message };
    }
  }
  
  // Generate a deterministic puzzle seed for the week
  generatePuzzleSeed(challenge) {
    return challenge?.puzzle_seed;
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
