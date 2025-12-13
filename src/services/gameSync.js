// Game Sync Service - Real-time game state management
import { supabase } from '../utils/supabase';

class GameSyncService {
  constructor() {
    this.activeSubscription = null;
    this.currentGameId = null;
  }

  // Subscribe to game updates
  subscribeToGame(gameId, onUpdate, onError) {
    if (!supabase) return { unsubscribe: () => {} };

    // Unsubscribe from previous game if any
    this.unsubscribe();
    this.currentGameId = gameId;

    this.activeSubscription = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          console.log('Game update received:', payload);
          onUpdate(payload.new);
        }
      )
      .on('error', (error) => {
        console.error('Subscription error:', error);
        onError?.(error);
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return this.activeSubscription;
  }

  // Unsubscribe from current game
  unsubscribe() {
    if (this.activeSubscription) {
      this.activeSubscription.unsubscribe();
      this.activeSubscription = null;
      this.currentGameId = null;
    }
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

    console.log('gameSync.makeMove: Move details', {
      pieceType,
      row,
      col,
      rotation,
      flipped,
      newBoardFirstRow: newBoard?.[0],
      newBoardPiecesKeys: Object.keys(newBoardPieces || {}),
      newUsedPieces,
      nextPlayer,
      gameOver
    });

    // Get current move count
    const { count: moveCount, error: countError } = await supabase
      .from('game_moves')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    console.log('gameSync.makeMove: Move count', { moveCount, countError });

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
      // Don't return here - still try to update the game
    } else {
      console.log('gameSync.makeMove: Move recorded', { moveId: moveRecord?.id });
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

      // Update player stats
      if (winnerId) {
        await this.updatePlayerStats(gameId, winnerId);
      }
    }

    console.log('gameSync.makeMove: Updating game with:', {
      gameId,
      updateData: {
        ...updateData,
        board: `[${updateData.board.length}x${updateData.board[0]?.length} array]`,
        board_pieces: `${Object.keys(updateData.board_pieces || {}).length} pieces`
      }
    });

    const { data, error } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', gameId)
      .select()
      .single();

    console.log('gameSync.makeMove: Update result', { 
      success: !error, 
      error: error?.message,
      dataId: data?.id,
      dataBoardSample: data?.board?.[0]?.slice(0, 3)
    });

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
      console.log('gameSync: ELO ratings updated for game', gameId);
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
      console.log('gameSync: Achievements checked for both players');
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

  // Get player's recent games
  async getPlayerGames(playerId, limit = 10) {
    if (!supabase) return { data: [], error: null };

    try {
      // Fetch games first
      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !games) {
        console.error('Error fetching player games:', error);
        return { data: [], error };
      }

      // Get unique player IDs
      const playerIds = [...new Set(games.flatMap(g => [g.player1_id, g.player2_id]))];
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, rating')
        .in('id', playerIds);

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Attach profiles to games
      const gamesWithProfiles = games.map(game => ({
        ...game,
        player1: profileMap[game.player1_id] || null,
        player2: profileMap[game.player2_id] || null
      }));

      return { data: gamesWithProfiles, error: null };
    } catch (e) {
      console.error('Exception fetching player games:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  // Get active games for a player
  async getActiveGames(playerId) {
    if (!supabase) return { data: [], error: null };

    console.log('gameSync.getActiveGames: Fetching for player', playerId);
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
      );

      // Fetch active games first
      const gamesPromise = supabase
        .from('games')
        .select('*')
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      let result;
      try {
        result = await Promise.race([gamesPromise, timeoutPromise]);
      } catch (raceError) {
        console.error('gameSync.getActiveGames: Timeout or error:', raceError.message);
        return { data: [], error: { message: raceError.message } };
      }

      const { data: games, error } = result;
      const elapsed = Date.now() - startTime;

      console.log('gameSync.getActiveGames: Query completed in', elapsed, 'ms');
      console.log('gameSync.getActiveGames: Query result', { 
        count: games?.length, 
        error: error?.message,
        gameStatuses: games?.map(g => ({ id: g.id, status: g.status }))
      });

      if (error || !games) {
        console.error('Error fetching active games:', error);
        return { data: [], error };
      }

      if (games.length === 0) {
        console.log('gameSync.getActiveGames: No active games found');
        return { data: [], error: null };
      }

      // Get unique player IDs
      const playerIds = [...new Set(games.flatMap(g => [g.player1_id, g.player2_id]))];
      
      // Fetch profiles (with timeout)
      const profilesPromise = supabase
        .from('profiles')
        .select('id, username, rating')
        .in('id', playerIds);

      let profilesResult;
      try {
        profilesResult = await Promise.race([profilesPromise, new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profiles timeout')), 5000)
        )]);
      } catch (profileError) {
        console.error('gameSync.getActiveGames: Profiles fetch timeout');
        profilesResult = { data: null };
      }

      const { data: profiles } = profilesResult;

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Attach profiles to games
      const gamesWithProfiles = games.map(game => ({
        ...game,
        player1: profileMap[game.player1_id] || null,
        player2: profileMap[game.player2_id] || null
      }));

      return { data: gamesWithProfiles, error: null };
    } catch (e) {
      console.error('Exception fetching active games:', e);
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
