// Spectator Service - Watch live games
import { supabase, isSupabaseConfigured } from '../utils/supabase';

export const spectatorService = {
  // Get list of games available to spectate
  async getSpectatableGames(limit = 10) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase.rpc('get_spectatable_games', {
      limit_count: limit
    });

    return { data: data || [], error };
  },

  // Join as spectator
  async joinAsSpectator(gameId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    const { data, error } = await supabase
      .from('game_spectators')
      .insert({
        game_id: gameId,
        user_id: userId
      })
      .select()
      .single();

    return { data, error };
  },

  // Leave spectating
  async leaveSpectating(gameId, userId) {
    if (!isSupabaseConfigured()) return { error: null };

    const { error } = await supabase
      .from('game_spectators')
      .delete()
      .eq('game_id', gameId)
      .eq('user_id', userId);

    return { error };
  },

  // Get spectators for a game
  async getSpectators(gameId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('game_spectators')
      .select(`
        id,
        joined_at,
        user:profiles!game_spectators_user_id_fkey(id, username, avatar_url)
      `)
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true });

    return { data: data || [], error };
  },

  // Get spectator count for a game
  async getSpectatorCount(gameId) {
    if (!isSupabaseConfigured()) return { count: 0, error: null };

    const { count, error } = await supabase
      .from('game_spectators')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId);

    return { count: count || 0, error };
  },

  // Subscribe to spectator changes in a game
  subscribeToSpectators(gameId, callback) {
    if (!isSupabaseConfigured()) return null;

    return supabase
      .channel(`spectators-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_spectators',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          // Fetch updated spectator list
          const { data } = await this.getSpectators(gameId);
          callback(data || []);
        }
      )
      .subscribe();
  },

  // Subscribe to game updates as spectator
  subscribeToGame(gameId, onUpdate, onError) {
    if (!isSupabaseConfigured()) return null;

    return supabase
      .channel(`spectate-game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'online_games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          onUpdate(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          onError?.(new Error('Failed to subscribe to game'));
        }
      });
  },

  // Unsubscribe from channels
  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  },

  // Get game for spectating (read-only)
  async getGameForSpectating(gameId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    const { data, error } = await supabase
      .from('online_games')
      .select(`
        id,
        status,
        board,
        board_pieces,
        used_pieces,
        current_player,
        winner_id,
        created_at,
        updated_at,
        allow_spectators,
        player1:profiles!online_games_player1_id_fkey(id, username, avatar_url, elo_rating),
        player2:profiles!online_games_player2_id_fkey(id, username, avatar_url, elo_rating)
      `)
      .eq('id', gameId)
      .single();

    if (!data?.allow_spectators && data?.status === 'active') {
      return { data: null, error: { message: 'This game does not allow spectators' } };
    }

    return { data, error };
  },

  // Check if user is spectating a game
  async isSpectating(gameId, userId) {
    if (!isSupabaseConfigured()) return false;

    const { data } = await supabase
      .from('game_spectators')
      .select('id')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .single();

    return !!data;
  },

  // Get games a friend is playing (for friend activity)
  async getFriendGames(friendIds) {
    if (!isSupabaseConfigured() || !friendIds.length) return { data: [], error: null };

    const { data, error } = await supabase
      .from('online_games')
      .select(`
        id,
        status,
        current_player,
        allow_spectators,
        created_at,
        player1:profiles!online_games_player1_id_fkey(id, username, avatar_url, elo_rating),
        player2:profiles!online_games_player2_id_fkey(id, username, avatar_url, elo_rating)
      `)
      .in('player1_id', friendIds)
      .or(`player2_id.in.(${friendIds.join(',')})`)
      .eq('status', 'active')
      .eq('allow_spectators', true);

    return { data: data || [], error };
  }
};

export default spectatorService;
