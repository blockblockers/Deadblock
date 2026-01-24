// Streak Service - Manages play streak tracking
// v7.13: Service for game play streak feature with fixed emoji encoding
// Place in src/services/streakService.js
import { supabase, isSupabaseConfigured } from '../utils/supabase';

// Auth key for direct fetch
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Get auth headers for direct fetch
const getAuthHeaders = () => {
  try {
    const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (!authData?.access_token || !ANON_KEY) {
      return null;
    }
    return {
      'Authorization': `Bearer ${authData.access_token}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    };
  } catch (e) {
    return null;
  }
};

export const streakService = {
  /**
   * Update streak after completing any game type (AI, puzzle, speed puzzle, weekly challenge)
   * Call this after any game completion that should count toward the streak
   * @param {string} userId - The user's ID
   * @returns {Object} - { current_streak, longest_streak, streak_continued, new_achievements }
   */
  async updateStreak(userId) {
    if (!isSupabaseConfigured() || !userId) {
      console.warn('[StreakService] Not configured or no userId');
      return { data: null, error: 'Not configured' };
    }

    try {
      const headers = getAuthHeaders();
      if (!headers) {
        return { data: null, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/update_streak_for_offline_game`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ p_user_id: userId })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StreakService] updateStreak error:', errorText);
        return { data: null, error: errorText };
      }

      const data = await response.json();
      console.log('[StreakService] Streak updated:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('[StreakService] updateStreak exception:', err);
      return { data: null, error: err.message };
    }
  },

  /**
   * Get current streak info for a user
   * @param {string} userId - The user's ID
   * @returns {Object} - { current_streak, longest_streak, last_played_date, streak_status }
   */
  async getStreak(userId) {
    if (!isSupabaseConfigured() || !userId) {
      return { data: null, error: 'Not configured' };
    }

    try {
      const headers = getAuthHeaders();
      if (!headers) {
        // Try with anon key for public profiles
        const anonHeaders = ANON_KEY ? {
          'apikey': ANON_KEY,
          'Content-Type': 'application/json'
        } : null;
        
        if (!anonHeaders) {
          return { data: null, error: 'Not authenticated' };
        }

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/rpc/get_user_streak`,
          {
            method: 'POST',
            headers: anonHeaders,
            body: JSON.stringify({ p_user_id: userId })
          }
        );

        if (response.ok) {
          const data = await response.json();
          return { data, error: null };
        }
        return { data: null, error: 'Failed to fetch' };
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_user_streak`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ p_user_id: userId })
        }
      );

      if (!response.ok) {
        // Fallback to direct profile query
        return this.getStreakFromProfile(userId);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      console.error('[StreakService] getStreak exception:', err);
      // Fallback to direct profile query
      return this.getStreakFromProfile(userId);
    }
  },

  /**
   * Fallback method to get streak from profiles table directly
   */
  async getStreakFromProfile(userId) {
    try {
      const headers = getAuthHeaders();
      const fetchHeaders = headers || (ANON_KEY ? {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
      } : null);

      if (!fetchHeaders) {
        return { data: null, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=current_streak,longest_streak,last_played_date`,
        { headers: { ...fetchHeaders, 'Accept': 'application/vnd.pgrst.object+json' } }
      );

      if (!response.ok) {
        return { data: null, error: 'Failed to fetch profile' };
      }

      const profile = await response.json();
      
      // Calculate streak status
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const lastPlayed = profile.last_played_date;
      
      let streakStatus = 'none';
      let currentStreak = profile.current_streak || 0;
      
      if (!lastPlayed) {
        streakStatus = 'none';
      } else if (lastPlayed === today) {
        streakStatus = 'played_today';
      } else if (lastPlayed === yesterday) {
        streakStatus = 'at_risk';
      } else {
        streakStatus = 'broken';
        currentStreak = 0;
      }

      return {
        data: {
          current_streak: currentStreak,
          longest_streak: profile.longest_streak || 0,
          last_played_date: lastPlayed,
          streak_status: streakStatus
        },
        error: null
      };
    } catch (err) {
      console.error('[StreakService] getStreakFromProfile exception:', err);
      return { data: null, error: err.message };
    }
  },

  /**
   * Format streak for display
   * @param {number} streak - Number of days
   * @returns {string} - Formatted string like "5 days" or "1 day"
   */
  formatStreak(streak) {
    if (!streak || streak <= 0) return '0 days';
    return streak === 1 ? '1 day' : `${streak} days`;
  },

  /**
   * Get streak status color and icon
   * @param {string} status - 'played_today', 'at_risk', 'broken', 'none'
   * @returns {Object} - { color, bgColor, icon, message }
   */
  getStreakStatusStyle(status) {
    switch (status) {
      case 'played_today':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-900/30',
          borderColor: 'border-green-500/30',
          icon: '✓',
          message: 'Played today!'
        };
      case 'at_risk':
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-900/30',
          borderColor: 'border-amber-500/30',
          icon: '⚠',
          message: 'Play today to keep your streak!'
        };
      case 'broken':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-900/30',
          borderColor: 'border-red-500/30',
          icon: '💔',
          message: 'Streak broken - start a new one!'
        };
      default:
        return {
          color: 'text-slate-400',
          bgColor: 'bg-slate-800/30',
          borderColor: 'border-slate-600/30',
          icon: '🔥',
          message: 'Play a game to start your streak!'
        };
    }
  },

  /**
   * Get the next streak achievement milestone
   * @param {number} currentStreak - Current streak in days
   * @returns {Object} - { days, name, icon } or null if all achieved
   */
  getNextMilestone(currentStreak) {
    const milestones = [
      { days: 30, name: 'Month Warrior', icon: '🔥' },
      { days: 90, name: 'Season Champion', icon: '⚡' },
      { days: 180, name: 'Half-Year Hero', icon: '💎' },
      { days: 360, name: 'Year Legend', icon: '👑' },
      { days: 620, name: 'Immortal Operator', icon: '🏆' },
    ];

    for (const milestone of milestones) {
      if (currentStreak < milestone.days) {
        return {
          ...milestone,
          daysRemaining: milestone.days - currentStreak,
          progress: Math.round((currentStreak / milestone.days) * 100)
        };
      }
    }

    return null; // All milestones achieved
  }
};

export default streakService;
