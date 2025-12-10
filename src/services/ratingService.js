// Rating Service - ELO rating system
import { supabase, isSupabaseConfigured } from '../utils/supabase';

export const ratingService = {
  // Get user's current rating
  async getUserRating(userId) {
    if (!isSupabaseConfigured()) return { data: null, error: null };

    const { data, error } = await supabase
      .from('profiles')
      .select('elo_rating, highest_rating, rating_games_played')
      .eq('id', userId)
      .single();

    return { data, error };
  },

  // Get rating history for a user
  async getRatingHistory(userId, limit = 50) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('rating_history')
      .select(`
        id,
        old_rating,
        new_rating,
        change,
        opponent_rating,
        result,
        created_at,
        game_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  },

  // Update ratings after a game (calls database function)
  async updateRatingsAfterGame(gameId, winnerId) {
    if (!isSupabaseConfigured()) return { error: null };

    const { error } = await supabase.rpc('update_ratings_after_game', {
      p_game_id: gameId,
      p_winner_id: winnerId
    });

    return { error };
  },

  // Get rating leaderboard
  async getRatingLeaderboard(limit = 100) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, elo_rating, highest_rating, rating_games_played, wins, losses')
      .gt('rating_games_played', 0)
      .order('elo_rating', { ascending: false })
      .limit(limit);

    // Add rank
    const rankedData = data?.map((player, index) => ({
      ...player,
      rank: index + 1
    })) || [];

    return { data: rankedData, error };
  },

  // Get user's rank
  async getUserRank(userId) {
    if (!isSupabaseConfigured()) return { rank: null, error: null };

    // Get user's rating
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('elo_rating')
      .eq('id', userId)
      .single();

    if (userError) return { rank: null, error: userError };

    // Count players with higher rating
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gt('elo_rating', user.elo_rating)
      .gt('rating_games_played', 0);

    return { rank: (count || 0) + 1, error };
  },

  // Calculate expected ELO change (client-side preview)
  calculateExpectedChange(playerRating, opponentRating, isWin) {
    const kFactor = 32;
    const expected = 1.0 / (1.0 + Math.pow(10, (opponentRating - playerRating) / 400));
    const result = isWin ? 1 : 0;
    return Math.round(kFactor * (result - expected));
  },

  // Get rating tier/rank name with pentomino shape identifier
  getRatingTier(rating) {
    // Tiers use pentomino shapes: each tier is a different piece
    // Colors follow cyberpunk neon theme
    if (rating >= 2200) return { name: 'Grandmaster', shape: 'X', color: 'text-amber-400', glowColor: '#f59e0b' };
    if (rating >= 2000) return { name: 'Master', shape: 'W', color: 'text-purple-400', glowColor: '#a855f7' };
    if (rating >= 1800) return { name: 'Expert', shape: 'T', color: 'text-blue-400', glowColor: '#3b82f6' };
    if (rating >= 1600) return { name: 'Advanced', shape: 'Y', color: 'text-cyan-400', glowColor: '#22d3ee' };
    if (rating >= 1400) return { name: 'Intermediate', shape: 'L', color: 'text-green-400', glowColor: '#22c55e' };
    if (rating >= 1200) return { name: 'Beginner', shape: 'I', color: 'text-slate-400', glowColor: '#94a3b8' };
    return { name: 'Novice', shape: 'O', color: 'text-slate-500', glowColor: '#64748b' };
  },

  // Get rating change color
  getChangeColor(change) {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-slate-400';
  },

  // Get rating statistics
  async getRatingStats(userId) {
    if (!isSupabaseConfigured()) return { data: null, error: null };

    const { data: history, error } = await this.getRatingHistory(userId, 100);
    if (error) return { data: null, error };

    if (!history?.length) {
      return { 
        data: { 
          currentStreak: 0,
          bestStreak: 0,
          avgChange: 0,
          recentTrend: 'stable'
        }, 
        error: null 
      };
    }

    // Calculate stats
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let totalChange = 0;

    for (const entry of history) {
      totalChange += entry.change;
      
      if (entry.result === 'win') {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Current streak (from most recent)
    for (const entry of history) {
      if (entry.result === 'win') {
        currentStreak++;
      } else {
        break;
      }
    }

    // Recent trend (last 10 games)
    const recent = history.slice(0, 10);
    const recentChange = recent.reduce((sum, e) => sum + e.change, 0);
    let recentTrend = 'stable';
    if (recentChange > 50) recentTrend = 'rising';
    else if (recentChange < -50) recentTrend = 'falling';

    return {
      data: {
        currentStreak,
        bestStreak,
        avgChange: Math.round(totalChange / history.length),
        recentTrend,
        gamesAnalyzed: history.length
      },
      error: null
    };
  },

  // Get head-to-head stats
  async getHeadToHead(userId1, userId2) {
    if (!isSupabaseConfigured()) return { data: null, error: null };

    const { data, error } = await supabase.rpc('get_head_to_head', {
      user1_id: userId1,
      user2_id: userId2
    });

    if (error) return { data: null, error };

    // Data comes as array with single row
    const stats = data?.[0] || {
      total_games: 0,
      user1_wins: 0,
      user2_wins: 0,
      draws: 0,
      last_played: null
    };

    return { data: stats, error: null };
  }
};

export default ratingService;
