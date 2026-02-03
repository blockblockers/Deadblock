// Game Sync Service - Real-time game state management
// FIXED: 
// - makeMove uses direct fetch to bypass Supabase client timeout issues
// - board_state column is now optional (won't break if column doesn't exist)
// - Subscription handler properly validates callbacks
import { supabase, isSupabaseConfigured } from '../utils/supabase';
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

  // Get the last move for a game (for replay animation on load)
  async getLastMove(gameId) {
    if (!supabase) return { data: null, error: { message: 'Not configured' } };

    const headers = getAuthHeaders();
    if (!headers) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    try {
      // Fetch the most recent move for this game
      const fetchHeaders = { ...headers };
      fetchHeaders['Accept'] = 'application/vnd.pgrst.object+json';
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/game_moves?game_id=eq.${gameId}&order=move_number.desc&limit=1`,
        { headers: fetchHeaders }
      );

      if (!response.ok) {
        // If 406 (no rows), return null without error
        if (response.status === 406) {
          return { data: null, error: null };
        }
        return { data: null, error: { message: `Failed to fetch last move: ${response.status}` } };
      }

      const move = await response.json();
      return { data: move, error: null };
    } catch (e) {
      console.error('gameSync.getLastMove: Exception:', e.message);
      return { data: null, error: { message: e.message } };
    }
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

      /* makeMove updating game state debug - disabled for production
      console.log('gameSync.makeMove: Updating game state...', { 
        nextPlayer, 
        gameOver, 
        usedPiecesCount: newUsedPieces.length 
      });
      */

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
      /* makeMove success debug - disabled for production
      console.log('gameSync.makeMove: Game updated successfully', { 
        newCurrentPlayer: updatedGame.current_player,
        status: updatedGame.status 
      });
      */

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

  // v7.15.2: Get active games + unviewed completed games (losses/wins the user hasn't seen yet)
  // Uses localStorage to track which completed games have been viewed
  async getActiveAndUnviewedGames(userId) {
    if (!supabase || !userId) return { data: [], error: null };

    const headers = getAuthHeaders();
    if (!headers) {
      return { data: [], error: { message: 'Not authenticated' } };
    }

    try {
      // Get viewed games from localStorage
      const viewedGames = this.getViewedGames();

      // Fetch active games
      const activeResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?or=(player1_id.eq.${userId},player2_id.eq.${userId})&status=eq.active&order=updated_at.desc&select=*`,
        { headers }
      );

      // Fetch ALL completed games (we'll filter by viewed status client-side)
      // Limit to last 50 to avoid fetching entire history
      const completedResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/games?or=(player1_id.eq.${userId},player2_id.eq.${userId})&status=eq.completed&order=updated_at.desc&limit=50&select=*`,
        { headers }
      );

      if (!activeResponse.ok || !completedResponse.ok) {
        return { data: [], error: { message: 'Failed to fetch games' } };
      }

      const activeGames = await activeResponse.json();
      const completedGames = await completedResponse.json();

      // Filter completed games to only include unviewed ones (no time limit)
      const unviewedCompleted = completedGames.filter(game => !viewedGames.includes(game.id));

      // Mark unviewed completed games with flags
      unviewedCompleted.forEach(game => {
        game._isUnviewedResult = true;
        game._isLoss = game.winner_id !== userId;
      });

      // Combine active + unviewed completed
      const allGames = [...unviewedCompleted, ...activeGames];

      // Fetch all player profiles
      const allPlayerIds = new Set();
      allGames.forEach(g => {
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

          allGames.forEach(game => {
            game.player1 = profileMap[game.player1_id] || null;
            game.player2 = profileMap[game.player2_id] || null;
            const oppId = game.player1_id === userId ? game.player2_id : game.player1_id;
            game.opponent = profileMap[oppId] || null;
          });
        }
      }

      return { data: allGames, error: null };

    } catch (e) {
      console.error('[GameSync] getActiveAndUnviewedGames: Exception:', e.message);
      return { data: [], error: { message: e.message } };
    }
  }

  // v7.15.2: Mark a completed game as viewed (stores in localStorage)
  markGameAsViewed(gameId) {
    if (!gameId) return;
    
    try {
      const viewedGames = this.getViewedGames();
      if (!viewedGames.includes(gameId)) {
        viewedGames.push(gameId);
        // Keep only last 100 viewed games to prevent localStorage bloat
        const trimmed = viewedGames.slice(-100);
        localStorage.setItem('deadblock_viewed_games', JSON.stringify(trimmed));
      }
    } catch (e) {
      console.warn('[GameSync] Failed to mark game as viewed:', e);
    }
  }

  // v7.15.2: Get list of viewed game IDs from localStorage
  getViewedGames() {
    try {
      const stored = localStorage.getItem('deadblock_viewed_games');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
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

  // Check for and auto-forfeit games with no activity for 2+ weeks
  // Only reduces rating for inactive player, doesn't increase opponent's rating
  async checkAndForfeitStaleGames(userId) {
    if (!isSupabaseConfigured() || !userId) return { forfeited: [] };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { forfeited: [] };

      // Get active games for this user
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      
      // Find games where it's been this user's turn for 2+ weeks
      const url = `${SUPABASE_URL}/rest/v1/games?select=*,player1:profiles!games_player1_id_fkey(id,username,display_name,rating),player2:profiles!games_player2_id_fkey(id,username,display_name,rating)&status=eq.active&or=(player1_id.eq.${userId},player2_id.eq.${userId})&updated_at=lt.${twoWeeksAgo}`;
      
      const response = await fetch(url, { headers });
      if (!response.ok) return { forfeited: [] };
      
      const staleGames = await response.json();
      const forfeitedGames = [];
      
      for (const game of staleGames) {
        // Determine whose turn it is
        const currentPlayerId = game.current_player === 1 ? game.player1_id : game.player2_id;
        
        // Auto-forfeit: the player whose turn it is loses
        const winnerId = game.current_player === 1 ? game.player2_id : game.player1_id;
        const loserId = currentPlayerId;
        
        // Update game status
        const updateUrl = `${SUPABASE_URL}/rest/v1/games?id=eq.${game.id}`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            status: 'completed',
            winner_id: winnerId,
            forfeit_reason: 'inactivity',
            updated_at: new Date().toISOString()
          })
        });
        
        if (updateResponse.ok) {
          // Only reduce rating for the inactive player (loser)
          // Don't increase rating for winner - it's not a real win
          const loserRating = loserId === game.player1_id 
            ? (game.player1?.rating || 1000) 
            : (game.player2?.rating || 1000);
          
          // Reduce by 15 points (half of normal loss)
          const newLoserRating = Math.max(100, loserRating - 15);
          
          const ratingUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${loserId}`;
          await fetch(ratingUrl, {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ rating: newLoserRating })
          });
          
          forfeitedGames.push({
            gameId: game.id,
            loserId,
            winnerId,
            reason: 'inactivity'
          });
        }
      }
      
      return { forfeited: forfeitedGames };
    } catch (e) {
      console.error('[GameSync] checkAndForfeitStaleGames error:', e);
      return { forfeited: [] };
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

  // v7.15.3: Get count of players currently in matchmaking queue
  async getMatchmakingCount() {
    if (!supabase) return { data: { count: 0 }, error: null };

    const headers = getAuthHeaders();
    if (!headers) {
      return { data: { count: 0 }, error: null };
    }

    try {
      // Query the matchmaking_queue table for active entries
      // Players are "active" if they joined recently (within last 2 minutes) and haven't been matched
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/matchmaking_queue?status=eq.waiting&created_at=gte.${twoMinutesAgo}&select=id`,
        { 
          headers: {
            ...headers,
            'Prefer': 'count=exact'
          }
        }
      );

      if (!response.ok) {
        return { data: { count: 0 }, error: null };
      }

      // Get count from content-range header
      const contentRange = response.headers.get('content-range');
      let count = 0;
      
      if (contentRange) {
        // Format is "0-N/total" or "*/total" for empty results
        const match = contentRange.match(/\/(\d+)$/);
        if (match) {
          count = parseInt(match[1], 10);
        }
      } else {
        // Fallback: count the results
        const data = await response.json();
        count = Array.isArray(data) ? data.length : 0;
      }

      return { data: { count }, error: null };

    } catch (e) {
      console.error('[GameSync] getMatchmakingCount error:', e);
      return { data: { count: 0 }, error: null };
    }
  }
}

export const gameSyncService = new GameSyncService();
export default gameSyncService;
