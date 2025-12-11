// Achievements Service - Track and grant achievements
import { supabase, isSupabaseConfigured } from '../utils/supabase';

export const achievementService = {
  // Get all achievements
  async getAllAchievements() {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('category')
        .order('requirement_value');

      // If the table doesn't exist, return empty array
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        return { data: [], error: null };
      }

      return { data: data || [], error };
    } catch (err) {
      console.error('Error in getAllAchievements:', err);
      return { data: [], error: null };
    }
  },

  // Get user's unlocked achievements
  async getUserAchievements(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          id,
          unlocked_at,
          game_id,
          achievement:achievements(*)
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      // If the table doesn't exist, return empty array
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        return { data: [], error: null };
      }

      return { data: data || [], error };
    } catch (err) {
      console.error('Error in getUserAchievements:', err);
      return { data: [], error: null };
    }
  },

  // Get achievements with unlock status for a user
  async getAchievementsWithStatus(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      // Get all achievements
      const { data: allAchievements, error: achError } = await supabase
        .from('achievements')
        .select('*')
        .order('category')
        .order('requirement_value');

      // If the table doesn't exist, return empty array
      if (achError?.code === '42P01' || achError?.message?.includes('does not exist')) {
        return { data: [], error: null };
      }

      if (achError) return { data: null, error: achError };

      // Get user's unlocked achievements
      const { data: unlocked, error: unlockError } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId);

      // If the table doesn't exist, just continue with empty unlocked
      const unlockedData = (unlockError?.code === '42P01' || unlockError?.message?.includes('does not exist')) 
        ? [] 
        : (unlocked || []);

      // Create a map of unlocked achievements
      const unlockedMap = new Map(unlockedData.map(u => [u.achievement_id, u.unlocked_at]) || []);

      // Merge the data
      const achievementsWithStatus = (allAchievements || []).map(a => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) || null
      }));

      return { data: achievementsWithStatus, error: null };
    } catch (err) {
      console.error('Error in getAchievementsWithStatus:', err);
      return { data: [], error: null };
    }
  },

  // Check and grant achievements after a game
  async checkAchievements(userId, gameId = null) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase.rpc('check_achievements', {
      p_user_id: userId,
      p_game_id: gameId
    });

    return { data: data || [], error };
  },

  // Get achievement statistics
  async getAchievementStats(userId) {
    if (!isSupabaseConfigured()) return { data: null, error: null };

    try {
      const [allResult, unlockedResult] = await Promise.all([
        supabase.from('achievements').select('id, points'),
        supabase.from('user_achievements')
          .select('achievement:achievements(points)')
          .eq('user_id', userId)
      ]);

      // Handle missing tables gracefully
      const allData = (allResult.error?.code === '42P01' || allResult.error?.message?.includes('does not exist'))
        ? []
        : (allResult.data || []);
      const unlockedData = (unlockedResult.error?.code === '42P01' || unlockedResult.error?.message?.includes('does not exist'))
        ? []
        : (unlockedResult.data || []);

      const totalAchievements = allData.length;
      const totalPoints = allData.reduce((sum, a) => sum + (a.points || 0), 0);
      const unlockedCount = unlockedData.length;
      const earnedPoints = unlockedData.reduce((sum, u) => sum + (u.achievement?.points || 0), 0);

      return {
        data: {
          totalAchievements,
          unlockedCount,
          totalPoints,
          earnedPoints,
          completionPercentage: totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0
        },
        error: null
      };
    } catch (err) {
      console.error('Error in getAchievementStats:', err);
      return { data: { totalAchievements: 0, unlockedCount: 0, totalPoints: 0, earnedPoints: 0, completionPercentage: 0 }, error: null };
    }
  },

  // Get recent achievements across all users (for feed)
  async getRecentAchievements(limit = 10) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        id,
        unlocked_at,
        user:profiles!user_achievements_user_id_fkey(id, username, avatar_url),
        achievement:achievements(*)
      `)
      .order('unlocked_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  },

  // Get achievement by ID
  async getAchievement(achievementId) {
    if (!isSupabaseConfigured()) return { data: null, error: null };

    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('id', achievementId)
      .single();

    return { data, error };
  },

  // Get users who have an achievement
  async getAchievementHolders(achievementId, limit = 50) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        unlocked_at,
        user:profiles!user_achievements_user_id_fkey(id, username, avatar_url, elo_rating)
      `)
      .eq('achievement_id', achievementId)
      .order('unlocked_at', { ascending: true })
      .limit(limit);

    return { data: data || [], error };
  },

  // Get rarity statistics for achievements
  async getAchievementRarity() {
    if (!isSupabaseConfigured()) return { data: {}, error: null };

    // Get total user count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Get count for each achievement
    const { data: achievements } = await supabase
      .from('achievements')
      .select('id');

    const rarityMap = {};

    if (achievements && totalUsers > 0) {
      for (const ach of achievements) {
        const { count } = await supabase
          .from('user_achievements')
          .select('id', { count: 'exact', head: true })
          .eq('achievement_id', ach.id);

        rarityMap[ach.id] = {
          holders: count || 0,
          percentage: totalUsers > 0 ? Math.round(((count || 0) / totalUsers) * 100) : 0
        };
      }
    }

    return { data: rarityMap, error: null };
  }
};

// Achievement rarity colors
export const RARITY_COLORS = {
  common: { bg: 'bg-slate-500/20', border: 'border-slate-400', text: 'text-slate-300', glow: 'rgba(148,163,184,0.3)' },
  uncommon: { bg: 'bg-green-500/20', border: 'border-green-400', text: 'text-green-300', glow: 'rgba(74,222,128,0.3)' },
  rare: { bg: 'bg-blue-500/20', border: 'border-blue-400', text: 'text-blue-300', glow: 'rgba(96,165,250,0.3)' },
  epic: { bg: 'bg-purple-500/20', border: 'border-purple-400', text: 'text-purple-300', glow: 'rgba(192,132,252,0.3)' },
  legendary: { bg: 'bg-amber-500/20', border: 'border-amber-400', text: 'text-amber-300', glow: 'rgba(251,191,36,0.4)' }
};

export default achievementService;
