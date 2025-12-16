// Game Sync Service - Real-time game state management
// FIXED: makeMove now uses direct fetch to bypass Supabase client timeout issues
import { supabase } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';

// Constants for direct fetch
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper to get auth headers
const getAuthHeaders = () => {
  const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  if (!authData?.access_token || !ANON_KEY) {
    return null;
  }
  return {
    'Authorization': `Bearer ${authData.access_token}`,
    'apikey': ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
};

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

  // Get game state - uses direct fetch
  async getGame(gameId) {
    if (!supabase) return { data: null, error: { message: 'Not configured' } };

    console.log('gameSync.getGame: Starting fetch for game:', gameId);

    const headers = getAuthHeaders();
    if (!headers) {
      console.error('gameSync.getGame: No auth token');
      return { data: null, error: { message: 'Not authenticated' } };
    }

    // Add Accept header for single object
    headers['Accept'] = 'application/vnd.pgrst.object+json';

    try {
      // Fetch game
      const gameResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?id=eq.${gameId}&select=*`,
        { headers }
      );

      if (!gameResponse.ok) {
        const errorText = await gameResponse.text();
        console.error('gameSync.getGame: Fetch failed', gameResponse.status, errorText);
        return { data: null, error: { message: `Failed to fetch game: ${gameResponse.status}` } };
      }

      const game = await gameResponse.json();
      
      if (!game || !game.id) {
        console.error('gameSync.getGame: No game found');
        return { data: null, error: { message: 'Game not found' } };
      }

      console.log('gameSync.getGame: Game fetched successfully');

      // Fetch player profiles
      let player1 = null;
      let player2 = null;

      const playerIds = [game.player1_id, game.player2_id].filter(Boolean);
      if (playerIds.length > 0) {
        const profileHeaders = { ...headers };
        delete profileHeaders['Accept']; // Remove single object preference

        const profilesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=in.(${playerIds.join(',')})&select=*`,
          { headers: profileHeaders }
        );

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          player1 = profiles?.find(p => p.id === game.player1_id) || null;
          player2 = profiles?.find(p => p.id === game.player2_id) || null;
        } else {
          console.log('gameSync.getGame: Profiles fetch failed, returning game without profiles');
        }
      }

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
      console.error('gameSync.getGame: Exception:', e.message);
      return { data: null, error: { message: e.message } };
    }
  }

  // =====================================================
  // FIXED: makeMove now uses direct fetch
  // This fixes the "confirm doesn't submit" issue
  // =====================================================
  async makeMove(gameId, playerId, moveData) {
    if (!supabase) return { error: { message: 'Not configured' } };

    console.log('gameSync.makeMove: Starting move', { gameId, playerId });

    const headers = getAuthHeaders();
    if (!headers) {
      console.error('gameSync.makeMove: No auth token');
      return { data: null, error: { message: 'Not authenticated' } };
    }

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

    try {
      // Step 1: Get current move count using direct fetch
      const countHeaders = { ...headers };
      countHeaders['Prefer'] = 'count=exact';
      countHeaders['Range-Unit'] = 'items';
      countHeaders['Range'] = '0-0';
      
      let moveCount = 0;
      try {
        const countResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/game_moves?game_id=eq.${gameId}&select=id`,
          { headers: countHeaders, method: 'HEAD' }
        );
        const contentRange = countResponse.headers.get('content-range');
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)/);
          if (match) moveCount = parseInt(match[1], 10);
        }
      } catch (e) {
        console.log('gameSync.makeMove: Could not get move count, using 0');
      }

      console.log('gameSync.makeMove: Current move count:', moveCount);

      // Step 2: Record the move in history using direct fetch
      const moveInsertData = {
        game_id: gameId,
        player_id: playerId,
        piece_type: pieceType,
        row,
        col,
        rotation: rotation || 0,
        flipped: flipped || false,
        move_number: moveCount + 1,
        board_state: { board: newBoard, boardPieces: newBoardPieces }
      };

      const moveInsertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/game_moves`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(moveInsertData)
        }
      );

      if (!moveInsertResponse.ok) {
        const errorText = await moveInsertResponse.text();
        console.error('gameSync.makeMove: Error recording move:', errorText);
        // Don't fail the entire operation - move recording is for replay
      } else {
        console.log('gameSync.makeMove: Move recorded successfully');
      }

      // Step 3: Update game state using direct fetch
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
      }

      console.log('gameSync.makeMove: Updating game state...', { 
        nextPlayer, 
        gameOver, 
        usedPiecesCount: newUsedPieces.length 
      });

      const updateHeaders = { ...headers };
      updateHeaders['Accept'] = 'application/vnd.pgrst.object+json';

      const gameUpdateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?id=eq.${gameId}`,
        {
          method: 'PATCH',
          headers: updateHeaders,
          body: JSON.stringify(updateData)
        }
      );

      if (!gameUpdateResponse.ok) {
        const errorText = await gameUpdateResponse.text();
        console.error('gameSync.makeMove: Game update failed:', errorText);
        return { data: null, error: { message: `Game update failed: ${gameUpdateResponse.status}` } };
      }

      const updatedGame = await gameUpdateResponse.json();
      console.log('gameSync.makeMove: Game updated successfully', { 
        newCurrentPlayer: updatedGame.current_player,
        status: updatedGame.status 
      });

      // Step 4: Update player stats if game is over
      if (gameOver && winnerId) {
        console.log('gameSync.makeMove: Game over, updating stats...');
        await this.updatePlayerStats(gameId, winnerId);
      }

      return { data: updatedGame, error: null };

    } catch (e) {
      console.error('gameSync.makeMove: Exception:', e.message);
      return { data: null, error: { message: e.message } };
    }
  }

  // Update player statistics after game ends
  async updatePlayerStats(gameId, winnerId) {
    if (!supabase) return;

    const { data: game } = await this.getGame(gameId);
    if (!game) return;

    const player1Id = game.player1_id;
    const player2Id = game.player2_id;
    const loserId = winnerId === player1Id ? player2Id : player1Id;

    try {
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
      await supabase.rpc('update_ratings_after_game', {
        p_game_id: gameId,
        p_winner_id: winnerId
      });
    } catch (err) {
      console.error('gameSync: Error updating stats:', err);
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

  // Forfeit/abandon game - uses direct fetch
  async forfeitGame(gameId, forfeitingPlayerId) {
    if (!supabase) return { error: { message: 'Not configured' } };

    const { data: game } = await this.getGame(gameId);
    if (!game) return { error: { message: 'Game not found' } };
    
    const winnerId = game.player1_id === forfeitingPlayerId 
      ? game.player2_id 
      : game.player1_id;

    const headers = getAuthHeaders();
    if (!headers) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    headers['Accept'] = 'application/vnd.pgrst.object+json';

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/games?id=eq.${gameId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'completed',
            winner_id: winnerId,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        return { data: null, error: { message: 'Forfeit failed' } };
      }

      const data = await response.json();
      await this.updatePlayerStats(gameId, winnerId);

      return { data, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  }

  // Get game history/moves
  async getGameMoves(gameId) {
    if (!supabase) return { data: [], error: null };

    const headers = getAuthHeaders();
    if (!headers) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/game_moves?game_id=eq.${gameId}&order=move_number.asc&select=*`,
        { headers }
      );

      if (!response.ok) {
        return { data: [], error: { message: 'Failed to fetch moves' } };
      }

      const data = await response.json();
      return { data: data || [], error: null };
    } catch (e) {
      return { data: [], error: { message: e.message } };
    }
  }

  // Get player's recent games - uses direct fetch
  async getPlayerGames(playerId, limit = 10) {
    if (!supabase) return { data: [], error: null };

    const headers = getAuthHeaders();
    if (!headers) {
      return { data: [], error: { message: 'No auth token' } };
    }

    try {
      const gamesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?or=(player1_id.eq.${playerId},player2_id.eq.${playerId})&order=created_at.desc&limit=${limit}&select=*`,
        { headers }
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
        { headers }
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

  // Get active games for a player - uses direct fetch
  async getActiveGames(playerId) {
    if (!supabase) return { data: [], error: null };

    const headers = getAuthHeaders();
    if (!headers) {
      console.log('[GameSync] No access token for getActiveGames');
      return { data: [], error: { message: 'No auth token' } };
    }

    console.log('[GameSync] getActiveGames: Using direct fetch for', playerId);

    try {
      const gamesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?or=(player1_id.eq.${playerId},player2_id.eq.${playerId})&status=eq.active&order=updated_at.desc&select=*`,
        { headers }
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
        { headers }
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
