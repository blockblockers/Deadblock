// Spectator Service - Watch live games
// UPDATED: Uses direct fetch to bypass Supabase client timeout issues
import { isSupabaseConfigured } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';
import { dbSelect, dbInsert, dbDelete, dbRpc, dbCount } from './supabaseDirectFetch';

let spectatorPollingInterval = null;

export const spectatorService = {
  async getSpectatableGames(limit = 10) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const { data, error } = await dbRpc('get_spectatable_games', { limit_count: limit });
      if (error?.code === '42883' || error?.message?.includes('does not exist')) {
        return { data: [], error: null };
      }
      return { data: data || [], error };
    } catch (err) {
      console.error('Error in getSpectatableGames:', err);
      return { data: [], error: null };
    }
  },

  async joinAsSpectator(gameId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    return await dbInsert('game_spectators', {
      game_id: gameId,
      user_id: userId
    }, { returning: true, single: true });
  },

  async leaveSpectating(gameId, userId) {
    if (!isSupabaseConfigured()) return { error: null };

    const { error } = await dbDelete('game_spectators', {
      eq: { game_id: gameId, user_id: userId }
    });

    this.stopSpectatorPolling();
    return { error };
  },

  async getSpectators(gameId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data: spectators, error } = await dbSelect('game_spectators', {
      select: 'id,joined_at,user_id',
      eq: { game_id: gameId },
      order: 'joined_at.asc'
    });

    if (error || !spectators?.length) return { data: [], error };

    const userIds = spectators.map(s => s.user_id);
    const { data: profiles } = await dbSelect('profiles', {
      select: 'id,username,avatar_url',
      in: { id: userIds }
    });

    const profileMap = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    const result = spectators.map(s => ({
      id: s.id,
      joined_at: s.joined_at,
      user: profileMap[s.user_id]
    }));

    return { data: result, error: null };
  },

  async getSpectatorCount(gameId) {
    if (!isSupabaseConfigured()) return { count: 0, error: null };

    const { count, error } = await dbCount('game_spectators', {
      eq: { game_id: gameId }
    });

    return { count: count || 0, error };
  },

  subscribeToSpectators(gameId, callback) {
    if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

    console.log('[SpectatorService] Starting spectator count polling (10s interval)');

    this.getSpectators(gameId).then(({ data }) => {
      callback(data || []);
    });

    spectatorPollingInterval = setInterval(async () => {
      const { data } = await this.getSpectators(gameId);
      callback(data || []);
    }, 10000);

    return { unsubscribe: () => this.stopSpectatorPolling() };
  },

  stopSpectatorPolling() {
    if (spectatorPollingInterval) {
      clearInterval(spectatorPollingInterval);
      spectatorPollingInterval = null;
    }
  },

  subscribeToGame(gameId, onUpdate, onError) {
    if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

    console.log('[SpectatorService] Subscribing to game via RealtimeManager');
    realtimeManager.connectGame(gameId);

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

  unsubscribe(subscription) {
    if (subscription?.unsubscribe) subscription.unsubscribe();
    this.stopSpectatorPolling();
  },

  async getGameForSpectating(gameId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    // Get game
    let { data: game, error } = await dbSelect('games', {
      select: 'id,status,board,board_pieces,used_pieces,current_player,winner_id,created_at,updated_at,allow_spectators,player1_id,player2_id',
      eq: { id: gameId },
      single: true
    });

    if (error || !game) return { data: null, error: error || { message: 'Game not found' } };

    if (!game.allow_spectators && game.status === 'active') {
      return { data: null, error: { message: 'This game does not allow spectators' } };
    }

    // Get player profiles
    const { data: profiles } = await dbSelect('profiles', {
      select: 'id,username,avatar_url,rating',
      in: { id: [game.player1_id, game.player2_id] }
    });

    const profileMap = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    return {
      data: {
        ...game,
        player1: profileMap[game.player1_id],
        player2: profileMap[game.player2_id]
      },
      error: null
    };
  },

  async isSpectating(gameId, userId) {
    if (!isSupabaseConfigured()) return false;

    const { data } = await dbSelect('game_spectators', {
      select: 'id',
      eq: { game_id: gameId, user_id: userId },
      single: true
    });

    return !!data;
  },

  async getFriendGames(friendIds) {
    if (!isSupabaseConfigured() || !friendIds.length) return { data: [], error: null };

    const { data, error } = await dbSelect('games', {
      select: 'id,status,current_player,allow_spectators,created_at,player1_id,player2_id',
      in: { player1_id: friendIds },
      eq: { status: 'active', allow_spectators: true }
    });

    if (error || !data?.length) return { data: [], error };

    const playerIds = [...new Set(data.flatMap(g => [g.player1_id, g.player2_id]))];
    const { data: profiles } = await dbSelect('profiles', {
      select: 'id,username,avatar_url,rating',
      in: { id: playerIds }
    });

    const profileMap = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    const result = data.map(g => ({
      ...g,
      player1: profileMap[g.player1_id],
      player2: profileMap[g.player2_id]
    }));

    return { data: result, error: null };
  }
};

export default spectatorService;
