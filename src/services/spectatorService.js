// spectatorService.js - Spectator functionality for watching live games
// v7.12 FIX: getFriendGames now checks both player1_id AND player2_id
// Previously only checked player1_id, missing games where friend is player2
import { isSupabaseConfigured, supabase } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';

const getAuthHeaders = () => {
  try {
    const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (!authData?.access_token || !ANON_KEY) return null;
    return {
      'Authorization': `Bearer ${authData.access_token}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    };
  } catch (e) {
    return null;
  }
};

// Simple DB helpers
const dbSelect = async (table, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: 'Not authenticated' };
  
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  if (options.select) url += `select=${encodeURIComponent(options.select)}&`;
  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      url += `${key}=eq.${value}&`;
    });
  }
  if (options.in) {
    Object.entries(options.in).forEach(([key, values]) => {
      url += `${key}=in.(${values.join(',')})&`;
    });
  }
  if (options.or) {
    url += `or=(${encodeURIComponent(options.or)})&`;
  }
  if (options.order) url += `order=${options.order}&`;
  if (options.limit) url += `limit=${options.limit}&`;
  
  try {
    const response = await fetch(url, { 
      headers: options.single 
        ? { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
        : headers 
    });
    if (!response.ok) return { data: null, error: 'Fetch failed' };
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};

const dbInsert = async (table, data) => {
  const headers = getAuthHeaders();
  if (!headers) return { error: 'Not authenticated' };
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(data)
    });
    return { error: response.ok ? null : 'Insert failed' };
  } catch (err) {
    return { error: err.message };
  }
};

const dbDelete = async (table, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { error: 'Not authenticated' };
  
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      url += `${key}=eq.${value}&`;
    });
  }
  
  try {
    const response = await fetch(url, { method: 'DELETE', headers });
    return { error: response.ok ? null : 'Delete failed' };
  } catch (err) {
    return { error: err.message };
  }
};

const dbCount = async (table, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { count: 0, error: 'Not authenticated' };
  
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      url += `${key}=eq.${value}&`;
    });
  }
  
  try {
    const response = await fetch(url, { 
      headers: { ...headers, 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' }
    });
    const countHeader = response.headers.get('content-range');
    const count = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0;
    return { count, error: null };
  } catch (err) {
    return { count: 0, error: err.message };
  }
};

let spectatorPollingInterval = null;

export const spectatorService = {
  async joinAsSpectator(gameId, userId) {
    if (!isSupabaseConfigured()) return { error: 'Not configured' };
    
    // Check if already spectating
    const { data: existing } = await dbSelect('game_spectators', {
      select: 'id',
      eq: { game_id: gameId, user_id: userId },
      single: true
    });
    
    if (existing) return { error: null }; // Already joined
    
    return await dbInsert('game_spectators', {
      game_id: gameId,
      user_id: userId
    });
  },

  async leaveSpectating(gameId, userId) {
    if (!isSupabaseConfigured()) return { error: 'Not configured' };
    
    return await dbDelete('game_spectators', {
      eq: { game_id: gameId, user_id: userId }
    });
  },

  async getSpectators(gameId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data: spectators, error } = await dbSelect('game_spectators', {
      select: 'id,user_id,joined_at',
      eq: { game_id: gameId }
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
      select: 'id,username,display_name,avatar_url,rating',
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

  // v7.12 FIX: Now checks BOTH player1_id AND player2_id using OR filter
  async getFriendGames(friendIds) {
    if (!isSupabaseConfigured() || !friendIds.length) return { data: [], error: null };

    const headers = getAuthHeaders();
    if (!headers) return { data: [], error: 'Not authenticated' };

    try {
      // Build OR filter to check both player1_id and player2_id
      const friendIdList = friendIds.join(',');
      const orFilter = `player1_id.in.(${friendIdList}),player2_id.in.(${friendIdList})`;
      
      const url = `${SUPABASE_URL}/rest/v1/games?select=id,status,current_player,allow_spectators,created_at,player1_id,player2_id&or=(${encodeURIComponent(orFilter)})&status=eq.active&allow_spectators=eq.true&order=created_at.desc`;
      
      console.log('[SpectatorService] Fetching friend games with OR filter for', friendIds.length, 'friends');
      
      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.error('[SpectatorService] Failed to fetch friend games:', response.status);
        return { data: [], error: 'Fetch failed' };
      }
      
      const data = await response.json();
      console.log('[SpectatorService] Found', data?.length || 0, 'active games');
      
      if (!data?.length) return { data: [], error: null };

      // Get all unique player IDs for profile lookup
      const playerIds = [...new Set(data.flatMap(g => [g.player1_id, g.player2_id]))];
      const { data: profiles } = await dbSelect('profiles', {
        select: 'id,username,display_name,avatar_url,rating',
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
    } catch (err) {
      console.error('[SpectatorService] getFriendGames exception:', err);
      return { data: [], error: err.message };
    }
  }
};

export default spectatorService;
