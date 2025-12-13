// Spectator Service - Watch live games
// OPTIMIZED: Uses RealtimeManager for game updates, polling for spectator count
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';

// Polling interval for spectator count
let spectatorPollingInterval = null;

export const spectatorService = {
  // Get list of games available to spectate
  async getSpectatableGames(limit = 10) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const { data, error } = await supabase.rpc('get_spectatable_games', {
        limit_count: limit
      });
      
      // If the RPC doesn't exist, return empty array
      if (error?.code === '42883' || error?.message?.includes('does not exist')) {
        return { data: [], error: null };
      }

      return { data: data || [], error };
    } catch (err) {
      console.error('Error in getSpectatableGames:', err);
      return { data: [], error: null };
    }
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

    // Stop spectator polling
    this.stopSpectatorPolling();

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

  // Subscribe to spectator changes - OPTIMIZED: Uses polling instead of Realtime
  subscribeToSpectators(gameId, callback) {
    if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

    console.log('[SpectatorService] Starting spectator count polling (10s interval)');

    // Initial fetch
    this.getSpectators(gameId).then(({ data }) => {
      callback(data || []);
    });

    // Poll every 10 seconds
    spectatorPollingInterval = setInterval(async () => {
      const { data } = await this.getSpectators(gameId);
      callback(data || []);
    }, 10000);

    return {
      unsubscribe: () => this.stopSpectatorPolling()
    };
  },

  // Stop spectator polling
  stopSpectatorPolling() {
    if (spectatorPollingInterval) {
      clearInterval(spectatorPollingInterval);
      spectatorPollingInterval = null;
    }
  },

  // Subscribe to game updates as spectator - OPTIMIZED: Uses RealtimeManager
  subscribeToGame(gameId, onUpdate, onError) {
    if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

    console.log('[SpectatorService] Subscribing to game via RealtimeManager');

    // Connect to game channel via RealtimeManager
    realtimeManager.connectGame(gameId);

    // Register handler for game updates
    const unsubscribe = realtimeManager.on('gameUpdate', (gameData) => {
      console.log('[SpectatorService] Game update received:', gameData?.id);
      onUpdate(gameData);
    });

    return {
      unsubscribe: () => {
        unsubscribe();
        realtimeManager.disconnectGame();
      }
    };
  },

  // Unsubscribe from channels
  unsubscribe(subscription) {
    if (subscription?.unsubscribe) {
      subscription.unsubscribe();
    }
    this.stopSpectatorPolling();
  },

  // Get game for spectating (read-only)
  async getGameForSpectating(gameId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    // Try the 'games' table first (main games table)
    let result = await supabase
      .from('games')
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
        player1:profiles!games_player1_id_fkey(id, username, avatar_url, rating),
        player2:profiles!games_player2_id_fkey(id, username, avatar_url, rating)
      `)
      .eq('id', gameId)
      .single();

    // If not found, try online_games table
    if (result.error && result.error.code === 'PGRST116') {
      result = await supabase
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
          player1:profiles!online_games_player1_id_fkey(id, username, avatar_url, rating),
          player2:profiles!online_games_player2_id_fkey(id, username, avatar_url, rating)
        `)
        .eq('id', gameId)
        .single();
    }

    const { data, error } = result;

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
      .from('games')
      .select(`
        id,
        status,
        current_player,
        allow_spectators,
        created_at,
        player1:profiles!games_player1_id_fkey(id, username, avatar_url, rating),
        player2:profiles!games_player2_id_fkey(id, username, avatar_url, rating)
      `)
      .in('player1_id', friendIds)
      .or(`player2_id.in.(${friendIds.join(',')})`)
      .eq('status', 'active')
      .eq('allow_spectators', true);

    return { data: data || [], error };
  }
};

export default spectatorService;
