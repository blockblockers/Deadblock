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

    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        player1:profiles!games_player1_id_fkey(*),
        player2:profiles!games_player2_id_fkey(*)
      `)
      .eq('id', gameId)
      .single();

    return { data, error };
  }

  // Make a move
  async makeMove(gameId, playerId, moveData) {
    if (!supabase) return { error: { message: 'Not configured' } };

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
    const { count: moveCount } = await supabase
      .from('game_moves')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    // Record the move in history
    const { error: moveError } = await supabase
      .from('game_moves')
      .insert({
        game_id: gameId,
        player_id: playerId,
        piece_type: pieceType,
        row,
        col,
        rotation,
        flipped: flipped || false,
        move_number: (moveCount || 0) + 1
      });

    if (moveError) {
      console.error('Error recording move:', moveError);
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

    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        player1:profiles!games_player1_id_fkey(id, username, rating),
        player2:profiles!games_player2_id_fkey(id, username, rating)
      `)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  }

  // Get active games for a player
  async getActiveGames(playerId) {
    if (!supabase) return { data: [], error: null };

    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        player1:profiles!games_player1_id_fkey(id, username, rating),
        player2:profiles!games_player2_id_fkey(id, username, rating)
      `)
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    return { data: data || [], error };
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
