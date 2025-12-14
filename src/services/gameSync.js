// Game Sync Service - Real-time game state management
// OPTIMIZED: Uses centralized RealtimeManager to reduce connection count
import { supabase } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';

class GameSyncService {
  constructor() {
    this.currentGameId = null;
    this.unsubscribeHandler = null;
  }

  // Subscribe to game updates - now uses RealtimeManager
  subscribeToGame(gameId, onUpdate, onError) {
    if (!supabase) return { unsubscribe: () => {} };

    // Unsubscribe from previous game if any
    this.unsubscribe();
    this.currentGameId = gameId;

    console.log('[GameSync] Subscribing to game via RealtimeManager:', gameId);

    // Connect to game channel via RealtimeManager
    realtimeManager.connectGame(gameId);

    // Register handler for game updates
    this.unsubscribeHandler = realtimeManager.on('gameUpdate', (gameData) => {
      console.log('[GameSync] Game update received:', gameData?.id);
      onUpdate(gameData);
    });

    // Return unsubscribe function
    return {
      unsubscribe: () => this.unsubscribe()
    };
  }

  // Unsubscribe from current game
  unsubscribe() {
    if (this.unsubscribeHandler) {
      this.unsubscribeHandler();
      this.unsubscribeHandler = null;
    }
    
    // Disconnect game channel
    realtimeManager.disconnectGame();
    this.currentGameId = null;
  }

  // Get game state
  async getGame(gameId) {
    if (!supabase) return { data: null, error: { message: 'Not configured' } };

    console.log('gameSync.getGame: Starting fetch for game:', gameId);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
    });

    // First try with foreign key joins
    try {
      console.log('gameSync.getGame: Trying with foreign key joins...');
      
      const queryPromise = supabase
        .from('games')
        .select(`
          *,
          player1:profiles!games_player1_id_fkey(*),
          player2:profiles!games_player2_id_fkey(*)
        `)
        .eq('id', gameId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (!error && data) {
        console.log('gameSync.getGame: Success with foreign keys, game:', data.id);
        return { data, error: null };
      }
      
      console.log('gameSync.getGame: Foreign key join failed:', error?.message);
    } catch (e) {
      console.log('gameSync.getGame: Exception with foreign key join:', e.message);
    }

    // Fallback: fetch game and profiles separately
    try {
      console.log('gameSync.getGame: Trying fallback (separate queries)...');
      
      const gameQueryPromise = supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      const { data: game, error: gameError } = await Promise.race([gameQueryPromise, timeoutPromise]);

      if (gameError) {
        console.error('gameSync.getGame: Error fetching game:', gameError);
        return { data: null, error: gameError };
      }

      if (!game) {
        console.log('gameSync.getGame: Game not found');
        return { data: null, error: { message: 'Game not found' } };
      }

      console.log('gameSync.getGame: Game loaded, fetching profiles...');

      // Fetch player profiles separately
      const profilesPromise = supabase
        .from('profiles')
        .select('*')
        .in('id', [game.player1_id, game.player2_id].filter(Boolean));

      const { data: profiles, error: profilesError } = await Promise.race([profilesPromise, timeoutPromise]);
      
      if (profilesError) {
        console.log('gameSync.getGame: Profiles fetch failed, returning game without profiles:', profilesError.message);
        return { data: { ...game, player1: null, player2: null }, error: null };
      }

      const player1 = profiles?.find(p => p.id === game.player1_id) || null;
      const player2 = profiles?.find(p => p.id === game.player2_id) || null;

      console.log('gameSync.getGame: Complete success, returning game with profiles');

      return {
        data: {
          ...game,
          player1,
          player2
        },
        error: null
      };
    } catch (e) {
      console.error('gameSync.getGame: Exception in fallback:', e.message);
      return { data: null, error: { message: e.message } };
    }
  }

  // Make a move
  async makeMove(gameId, playerId, moveData) {
    if (!supabase) return { error: { message: 'Not configured' } };

    console.log('gameSync.makeMove: Starting move', { gameId, playerId });

    const { 
      pieceType, 
      row, 
      col, 
      rotation, 
      flipped, 
      newBoard, 
      newBoardPieces, 
      newUsedPieces, 
      nextPlayer, 
      gameOver, 
      winnerId 
    } = moveData;

    // Get current move count
    const { count: moveCount, error: countError } = await supabase
      .from('game_moves')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    // Record the move in history with board state for replays
    const { data: moveRecord, error: moveError } = await supabase
      .from('game_moves')
      .insert({
        game_id: gameId,
        player_id: playerId,
        piece_type: pieceType,
        row,
        col,
        rotation,
        flipped: flipped || false,
        move_number: (moveCount || 0) + 1,
        board_state: { board: newBoard, boardPieces: newBoardPieces }
      })
      .select()
      .single();

    if (moveError) {
      console.error('gameSync.makeMove: Error recording move:', moveError);
    }

    // Update game state
    const updateData = {
      board: newBoard,
      board_pieces: newBoardPieces,
      used_pieces: newUsedPieces,
      current_player: nextPlayer,
      updated_at: new Date().toISOString()
    };

    if (gameOver) {
      updateData.status = 'completed';
      updateData.winner_id = winnerId || null;

      if (winnerId) {
        await this.updatePlayerStats(gameId, winnerId);
      }
    }

    const { data, error } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)
      .select()
      .single();

    return { data, error };
  }

  // Update player statistics after game ends
  async updatePlayerStats(gameId, winnerId) {
    if (!supabase) return;

    const { data: game } = await this.getGame(gameId);
    if (!game) return;

    const player1Id = game.player1_id;
    const player2Id = game.player2_id;
    const loserId = winnerId === player1Id ? player2Id : player1Id;

    // Update winner stats
    await supabase.rpc('increment_player_stats', {
      player_id: winnerId,
      won: true
    });

    // Update loser stats
    await supabase.rpc('increment_player_stats', {
      player_id: loserId,
      won: false
    });

    // Update ELO ratings
    try {
      await supabase.rpc('update_ratings_after_game', {
        p_game_id: gameId,
        p_winner_id: winnerId
      });
    } catch (err) {
      console.error('gameSync: Error updating ELO ratings:', err);
    }

    // Check achievements for both players
    try {
      await supabase.rpc('check_achievements', {
        p_user_id: winnerId,
        p_game_id: gameId
      });
      await supabase.rpc('check_achievements', {
        p_user_id: loserId,
        p_game_id: gameId
      });
    } catch (err) {
      console.error('gameSync: Error checking achievements:', err);
    }
  }

  // Forfeit/abandon game
  async forfeitGame(gameId, forfeitingPlayerId) {
    if (!supabase) return { error: { message: 'Not configured' } };

    const { data: game } = await this.getGame(gameId);
    if (!game) return { error: { message: 'Game not found' } };
    
    const winnerId = game.player1_id === forfeitingPlayerId 
      ? game.player2_id 
      : game.player1_id;

    const { data, error } = await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_id: winnerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)
      .select()
      .single();

    if (!error) {
      await this.updatePlayerStats(gameId, winnerId);
    }

    return { data, error };
  }

  // Get game history/moves
  async getGameMoves(gameId) {
    if (!supabase) return { data: [], error: null };

    const { data, error } = await supabase
      .from('game_moves')
      .select('*')
      .eq('game_id', gameId)
      .order('move_number', { ascending: true });

    return { data: data || [], error };
  }

  // Get player's recent games - uses direct fetch
  async getPlayerGames(playerId, limit = 10) {
    if (!supabase) return { data: [], error: null };

    try {
      // Get auth token for direct fetch
      const authKey = 'sb-oyeibyrednwlolmsjlwk-auth-token';
      const authData = JSON.parse(localStorage.getItem(authKey) || 'null');
      
      if (!authData?.access_token) {
        return { data: [], error: { message: 'No auth token' } };
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const gamesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?or=(player1_id.eq.${playerId},player2_id.eq.${playerId})&order=created_at.desc&limit=${limit}&select=*`,
        {
          headers: {
            'Authorization': `Bearer ${authData.access_token}`,
            'apikey': ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!gamesResponse.ok) {
        const error = await gamesResponse.json();
        return { data: [], error };
      }

      const games = await gamesResponse.json();

      if (!games || games.length === 0) {
        return { data: [], error: null };
      }

      const playerIds = [...new Set(games.flatMap(g => [g.player1_id, g.player2_id]))];
      
      const profilesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=in.(${playerIds.join(',')})&select=id,username,rating`,
        {
          headers: {
            'Authorization': `Bearer ${authData.access_token}`,
            'apikey': ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      let profiles = [];
      if (profilesResponse.ok) {
        profiles = await profilesResponse.json();
      }

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      const gamesWithProfiles = games.map(game => ({
        ...game,
        player1: profileMap[game.player1_id] || null,
        player2: profileMap[game.player2_id] || null
      }));

      return { data: gamesWithProfiles, error: null };
    } catch (e) {
      return { data: [], error: { message: e.message } };
    }
  }

  // Get active games for a player
  // Uses direct fetch to bypass Supabase client timeout issues
  async getActiveGames(playerId) {
    if (!supabase) return { data: [], error: null };

    try {
      // Get auth token and anon key for direct fetch
      const authKey = 'sb-oyeibyrednwlolmsjlwk-auth-token';
      const authData = JSON.parse(localStorage.getItem(authKey) || 'null');
      
      if (!authData?.access_token) {
        console.log('[GameSync] No access token for getActiveGames');
        return { data: [], error: { message: 'No auth token' } };
      }

      // Use the anon key from environment (embedded at build time)
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log('[GameSync] getActiveGames: Using direct fetch for', playerId);

      // Direct fetch - bypasses Supabase client issues
      const gamesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?or=(player1_id.eq.${playerId},player2_id.eq.${playerId})&status=eq.active&order=updated_at.desc&select=*`,
        {
          headers: {
            'Authorization': `Bearer ${authData.access_token}`,
            'apikey': ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!gamesResponse.ok) {
        const error = await gamesResponse.json();
        console.error('[GameSync] getActiveGames fetch error:', error);
        return { data: [], error };
      }

      const games = await gamesResponse.json();
      console.log('[GameSync] getActiveGames: Fetched', games.length, 'games');

      if (games.length === 0) {
        return { data: [], error: null };
      }

      // Fetch profiles for players
      const playerIds = [...new Set(games.flatMap(g => [g.player1_id, g.player2_id]))];
      
      const profilesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=in.(${playerIds.join(',')})&select=id,username,rating`,
        {
          headers: {
            'Authorization': `Bearer ${authData.access_token}`,
            'apikey': ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      let profiles = [];
      if (profilesResponse.ok) {
        profiles = await profilesResponse.json();
      }

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      const gamesWithProfiles = games.map(game => ({
        ...game,
        player1: profileMap[game.player1_id] || null,
        player2: profileMap[game.player2_id] || null
      }));

      return { data: gamesWithProfiles, error: null };
    } catch (e) {
      console.error('[GameSync] getActiveGames exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  // Check if it's the player's turn
  isPlayerTurn(game, playerId) {
    if (!game) return false;
    const isPlayer1 = game.player1_id === playerId;
    return (isPlayer1 && game.current_player === 1) || 
           (!isPlayer1 && game.current_player === 2);
  }

  // Get player number (1 or 2)
  getPlayerNumber(game, playerId) {
    if (!game) return null;
    if (game.player1_id === playerId) return 1;
    if (game.player2_id === playerId) return 2;
    return null;
  }
}

export const gameSyncService = new GameSyncService();
export default gameSyncService;
