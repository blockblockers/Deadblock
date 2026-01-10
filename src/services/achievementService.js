// achievementService.js - Achievement tracking and display
// v7.12 - FIXED: Now queries 'achievements' table instead of 'achievement_definitions'
// Place in src/services/achievementService.js

import { supabase } from '../utils/supabase';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return supabase && typeof supabase.from === 'function';
};

// Get current user ID
const getCurrentUserId = () => {
  try {
    const session = supabase?.auth?.session?.();
    return session?.user?.id || null;
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
   */
  async getUserAchievements(forceRefresh = false) {
    if (!isSupabaseConfigured()) return { data: [], error: null };
    
    const userId = getCurrentUserId();
    if (!userId) return { data: [], error: 'Not authenticated' };
    
    // Check cache
    if (!forceRefresh && this.cache && this.cacheTimestamp && 
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
      console.log('[achievementService] getAchievementStats: RPC not available, calculating manually');
      
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
