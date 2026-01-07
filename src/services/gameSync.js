// Game Sync Service - Real-time game state management
// FIXED: 
// - makeMove uses direct fetch to bypass Supabase client timeout issues
// - board_state column is now optional (won't break if column doesn't exist)
// - Subscription handler properly validates callbacks
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
  // FIXED: Validates callback is a function before storing
  subscribeToGame(gameId, onUpdate, onError) {
    if (!supabase) return { unsubscribe: () => {} };

    // Validate callbacks
    if (typeof onUpdate !== 'function') {
      console.error('[GameSync] subscribeToGame: onUpdate must be a function');
      return { unsubscribe: () => {} };
    }

    // Unsubscribe from previous game if any
    this.unsubscribe();
    this.currentGameId = gameId;

    // console.log('[GameSync] Subscribing to game via RealtimeManager:', gameId);

    // Connect to game channel via RealtimeManager
    realtimeManager.connectGame(gameId);

    // Register handler for game updates
    const wrappedHandler = (gameData) => {
      // console.log('[GameSync] Game update received:', gameData?.id);
      try {
        if (typeof onUpdate === 'function') {
          onUpdate(gameData);
        }
      } catch (err) {
        console.error('[GameSync] Handler error:', err);
        if (typeof onError === 'function') {
          onError(err);
        }
      }
    };

    this.unsubscribeHandler = realtimeManager.on('gameUpdate', wrappedHandler);

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

    // console.log('gameSync.getGame: Starting fetch for game:', gameId);

    const headers = getAuthHeaders();
    if (!headers) {
      console.error('gameSync.getGame: No auth token');
      return { data: null, error: { message: 'Not authenticated' } };
    }

    // Add Accept header for single object response
    const fetchHeaders = { ...headers };
    fetchHeaders['Accept'] = 'application/vnd.pgrst.object+json';

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/games?id=eq.${gameId}&select=*`,
        { headers: fetchHeaders }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('gameSync.getGame: Fetch failed:', errorText);
        return { data: null, error: { message: `Failed to fetch game: ${response.status}` } };
      }

      const game = await response.json();
      // console.log('gameSync.getGame: Game fetched successfully');

      // Fetch player profiles
      let player1 = null;
      let player2 = null;

      const playerIds = [game.player1_id, game.player2_id].filter(Boolean);
      if (playerIds.length > 0) {
        const profileHeaders = { ...headers };
        delete profileHeaders['Accept']; // Allow array response

        const profilesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=in.(${playerIds.join(',')})&select=*`,
          { headers: profileHeaders }
        );

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          player1 = profiles?.find(p => p.id === game.player1_id) || null;
          player2 = profiles?.find(p => p.id === game.player2_id) || null;
        } else {
          // console.log('gameSync.getGame: Profiles fetch failed, returning game without profiles');
        }
      }

      // console.log('gameSync.getGame: Complete success, returning game with profiles');

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

  // Get player number (1 or 2)
  getPlayerNumber(game, userId) {
    if (!game || !userId) return null;
    if (game.player1_id === userId) return 1;
    if (game.player2_id === userId) return 2;
    return null;
  }

  // Check if it's the player's turn
  isPlayerTurn(game, userId) {
    if (!game || !userId) return false;
    if (game.status !== 'active') return false;
    const playerNum = this.getPlayerNumber(game, userId);
    return game.current_player === playerNum;
  }

  // =====================================================
  // FIXED: makeMove now uses direct fetch
  // board_state is now optional (won't break if column doesn't exist)
  // =====================================================
  async makeMove(gameId, playerId, moveData) {
    if (!supabase) return { error: { message: 'Not configured' } };

    // console.log('gameSync.makeMove: Starting move', { gameId, playerId });

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
        // console.log('gameSync.makeMove: Could not get move count, using 0');
      }

      // console.log('gameSync.makeMove: Current move count:', moveCount);

      // Step 2: Record the move in history using direct fetch
      // FIXED: board_state is optional - don't include if column doesn't exist
      const moveInsertData = {
        game_id: gameId,
        player_id: playerId,
        piece_type: pieceType,
        row,
        col,
        rotation: rotation || 0,
        flipped: flipped || false,
        move_number: moveCount + 1
        // NOTE: board_state removed - column may not exist in database
      };

      try {
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
          // console.log('gameSync.makeMove: Move recorded successfully');
        }
      } catch (moveErr) {
        console.warn('gameSync.makeMove: Could not record move history:', moveErr.message);
        // Continue with game update even if move history fails
      }

      // Step 3: Update game state using direct fetch
      const updateData = {
        board: newBoard,
        board_pieces: newBoardPieces,
        used_pieces: newUsedPieces,
        current_player: nextPlayer,
        turn_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (gameOver) {
        updateData.status = 'completed';
        updateData.winner_id = winnerId || null;
      }

      // console.log('gameSync.makeMove: Updating game state...', { 
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
      // console.log('gameSync.makeMove: Game updated successfully', { 
        newCurrentPlayer: updatedGame.current_player,
        status: updatedGame.status 
      });

      // Step 4: Update player stats if game is over
      if (gameOver && winnerId) {
        // console.log('gameSync.makeMove: Game over, updating stats...');
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

    try {
      const { data: game } = await this.getGame(gameId);
      if (!game) return;

      const player1Id = game.player1_id;
      const player2Id = game.player2_id;
      const loserId = winnerId === player1Id ? player2Id : player1Id;

      // Get current stats
      const headers = getAuthHeaders();
      if (!headers) return;

      // CRITICAL: Update ELO ratings first
      // console.log('gameSync.updatePlayerStats: Updating ELO ratings...');
      try {
        const eloResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/rpc/update_ratings_after_game`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
              p_game_id: gameId, 
              p_winner_id: winnerId 
            })
          }
        );
        
        if (eloResponse.ok) {
          // console.log('gameSync.updatePlayerStats: ELO ratings updated successfully');
        } else {
          const errorText = await eloResponse.text();
          console.error('gameSync.updatePlayerStats: ELO update failed:', errorText);
        }
      } catch (eloError) {
        console.error('gameSync.updatePlayerStats: ELO update exception:', eloError.message);
      }

      // Update winner stats (win count)
      await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/increment_wins`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ p_user_id: winnerId })
        }
      ).catch(() => {});

      // Update loser stats (loss count)
      await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/increment_losses`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ p_user_id: loserId })
        }
      ).catch(() => {});

    } catch (e) {
      console.error('gameSync.updatePlayerStats: Error:', e.message);
    }
  }

  // Get active games for a user
  async getActiveGames(userId) {
    if (!supabase || !userId) return { data: [], error: null };

    // console.log('[GameSync] getActiveGames: Using direct fetch for', userId);

    const headers = getAuthHeaders();
    if (!headers) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    try {
      // Fetch games where user is player1 or player2 and status is active
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/games?or=(player1_id.eq.${userId},player2_id.eq.${userId})&status=eq.active&order=updated_at.desc&select=*`,
        { headers }
      );

      if (!response.ok) {
        return { data: [], error: { message: 'Failed to fetch games' } };
      }

      const games = await response.json();
      // console.log('[GameSync] getActiveGames: Fetched', games.length, 'games');

      // Fetch opponent profiles
      const opponentIds = games.map(g => 
        g.player1_id === userId ? g.player2_id : g.player1_id
      ).filter(Boolean);

      if (opponentIds.length > 0) {
        const uniqueIds = [...new Set(opponentIds)];
        const profilesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=in.(${uniqueIds.join(',')})&select=id,username,display_name,rating`,
          { headers }
        );

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          const profileMap = {};
          profiles.forEach(p => { profileMap[p.id] = p; });

          games.forEach(game => {
            // FIXED: Populate player1 and player2 objects (OnlineMenu expects these)
            game.player1 = profileMap[game.player1_id] || null;
            game.player2 = profileMap[game.player2_id] || null;
            // Also keep opponent for backwards compatibility
            const oppId = game.player1_id === userId ? game.player2_id : game.player1_id;
            game.opponent = profileMap[oppId] || null;
          });
        }
      }

      return { data: games, error: null };

    } catch (e) {
      console.error('[GameSync] getActiveGames: Exception:', e.message);
      return { data: [], error: { message: e.message } };
    }
  }

  // Get player's recent completed games
  async getPlayerGames(userId, limit = 10) {
    if (!supabase || !userId) return { data: [], error: null };

    // console.log('[GameSync] getPlayerGames: Using direct fetch for', userId);

    const headers = getAuthHeaders();
    if (!headers) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    try {
      // Fetch completed games where user is player1 or player2
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/games?or=(player1_id.eq.${userId},player2_id.eq.${userId})&status=eq.completed&order=updated_at.desc&limit=${limit}&select=*`,
        { headers }
      );

      if (!response.ok) {
        return { data: [], error: { message: 'Failed to fetch games' } };
      }

      const games = await response.json();
      // console.log('[GameSync] getPlayerGames: Fetched', games.length, 'games');

      // Fetch all player profiles (both players for each game)
      const allPlayerIds = new Set();
      games.forEach(g => {
        if (g.player1_id) allPlayerIds.add(g.player1_id);
        if (g.player2_id) allPlayerIds.add(g.player2_id);
      });

      if (allPlayerIds.size > 0) {
        const uniqueIds = [...allPlayerIds];
        const profilesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=in.(${uniqueIds.join(',')})&select=id,username,display_name,rating`,
          { headers }
        );

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          const profileMap = {};
          profiles.forEach(p => { profileMap[p.id] = p; });

          games.forEach(game => {
            game.player1 = profileMap[game.player1_id] || null;
            game.player2 = profileMap[game.player2_id] || null;
            const oppId = game.player1_id === userId ? game.player2_id : game.player1_id;
            game.opponent = profileMap[oppId] || null;
          });
        }
      }

      return { data: games, error: null };

    } catch (e) {
      console.error('[GameSync] getPlayerGames: Exception:', e.message);
      return { data: [], error: { message: e.message } };
    }
  }

  // Forfeit a game
  async forfeitGame(gameId, userId) {
    if (!supabase || !gameId || !userId) {
      return { error: { message: 'Invalid parameters' } };
    }

    // console.log('gameSync.forfeitGame:', { gameId, userId });

    const headers = getAuthHeaders();
    if (!headers) {
      return { error: { message: 'Not authenticated' } };
    }

    try {
      // Get game to determine winner
      const { data: game } = await this.getGame(gameId);
      if (!game) {
        return { error: { message: 'Game not found' } };
      }

      // Winner is the opponent
      const winnerId = game.player1_id === userId ? game.player2_id : game.player1_id;

      const updateHeaders = { ...headers };
      updateHeaders['Accept'] = 'application/vnd.pgrst.object+json';

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/games?id=eq.${gameId}`,
        {
          method: 'PATCH',
          headers: updateHeaders,
          body: JSON.stringify({
            status: 'completed',
            winner_id: winnerId,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        return { error: { message: 'Failed to forfeit game' } };
      }

      // Update stats
      await this.updatePlayerStats(gameId, winnerId);

      return { data: await response.json(), error: null };

    } catch (e) {
      return { error: { message: e.message } };
    }
  }

  // Abandon a game (quit before any moves)
  async abandonGame(gameId) {
    if (!supabase || !gameId) {
      return { error: { message: 'Invalid parameters' } };
    }

    // console.log('gameSync.abandonGame:', { gameId });

    const headers = getAuthHeaders();
    if (!headers) {
      return { error: { message: 'Not authenticated' } };
    }

    try {
      const updateHeaders = { ...headers };
      updateHeaders['Accept'] = 'application/vnd.pgrst.object+json';

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/games?id=eq.${gameId}`,
        {
          method: 'PATCH',
          headers: updateHeaders,
          body: JSON.stringify({
            status: 'abandoned',
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        return { error: { message: 'Failed to abandon game' } };
      }

      return { data: await response.json(), error: null };

    } catch (e) {
      return { error: { message: e.message } };
    }
  }
}

// Standalone function for creating rematch games
export async function createRematchGame(originalGameId, currentUserId, opponentId, firstPlayerId) {
  if (!supabase) return { data: null, error: { message: 'Not configured' } };

  // console.log('[GameSync] Creating rematch game:', { originalGameId, currentUserId, opponentId, firstPlayerId });

  const headers = getAuthHeaders();
  if (!headers) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  try {
    // Determine player positions based on who goes first
    // firstPlayerId becomes player1 (who always goes first)
    const player1Id = firstPlayerId;
    const player2Id = firstPlayerId === currentUserId ? opponentId : currentUserId;

    // Create empty board - must use 0 not null (matches working format)
    const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(0));

    // Create new game matching the format used in inviteService
    const newGame = {
      player1_id: player1Id,
      player2_id: player2Id,
      status: 'active',
      current_player: 1, // Player 1 always goes first
      board: emptyBoard,
      board_pieces: {},
      used_pieces: []
      // Don't include timer_seconds, turn_started_at, created_at, updated_at
      // - database will auto-generate these
    };

    // console.log('[GameSync] Rematch game data:', newGame);

    const createHeaders = { ...headers, 'Prefer': 'return=representation' };

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/games`,
      {
        method: 'POST',
        headers: createHeaders,
        body: JSON.stringify(newGame)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GameSync] Rematch creation failed:', response.status, errorText);
      return { data: null, error: { message: `Failed to create rematch: ${response.status}` } };
    }

    // Response is an array when using 'return=representation'
    const games = await response.json();
    const createdGame = Array.isArray(games) ? games[0] : games;
    
    // console.log('[GameSync] Rematch created successfully:', createdGame?.id);

    return { data: createdGame, error: null };

  } catch (e) {
    console.error('[GameSync] Rematch error:', e);
    return { data: null, error: { message: e.message } };
  }
}

export const gameSyncService = new GameSyncService();
export default gameSyncService;
