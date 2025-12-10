// Replay Service - Game replay functionality
import { supabase, isSupabaseConfigured } from '../utils/supabase';

export const replayService = {
  // Record a move (called during gameplay)
  async recordMove(gameId, playerId, moveData) {
    if (!isSupabaseConfigured()) return { error: null };

    const { data, error } = await supabase
      .from('game_moves')
      .insert({
        game_id: gameId,
        player_id: playerId,
        move_number: moveData.moveNumber,
        piece_type: moveData.pieceType,
        row: moveData.row,
        col: moveData.col,
        rotation: moveData.rotation || 0,
        flipped: moveData.flipped || false,
        board_state: moveData.boardState,
        time_taken_seconds: moveData.timeTaken
      })
      .select()
      .single();

    return { data, error };
  },

  // Get all moves for a game
  async getGameMoves(gameId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('game_moves')
      .select(`
        id,
        move_number,
        piece_type,
        row,
        col,
        rotation,
        flipped,
        board_state,
        time_taken_seconds,
        created_at,
        player:profiles!game_moves_player_id_fkey(id, username)
      `)
      .eq('game_id', gameId)
      .order('move_number', { ascending: true });

    return { data: data || [], error };
  },

  // Get game summary for replay
  async getReplaySummary(gameId) {
    if (!isSupabaseConfigured()) return { data: null, error: null };

    // Get game details
    const { data: game, error: gameError } = await supabase
      .from('online_games')
      .select(`
        id,
        status,
        winner_id,
        created_at,
        updated_at,
        player1:profiles!online_games_player1_id_fkey(id, username, avatar_url, elo_rating),
        player2:profiles!online_games_player2_id_fkey(id, username, avatar_url, elo_rating)
      `)
      .eq('id', gameId)
      .single();

    if (gameError) return { data: null, error: gameError };

    // Get move count
    const { count: moveCount } = await supabase
      .from('game_moves')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', gameId);

    // Get total game duration
    const startTime = new Date(game.created_at);
    const endTime = new Date(game.updated_at);
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    return {
      data: {
        ...game,
        moveCount: moveCount || 0,
        durationSeconds,
        durationFormatted: formatDuration(durationSeconds)
      },
      error: null
    };
  },

  // Get available replays for a user
  async getUserReplays(userId, limit = 20) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('online_games')
      .select(`
        id,
        status,
        winner_id,
        created_at,
        updated_at,
        player1_id,
        player2_id,
        player1:profiles!online_games_player1_id_fkey(id, username, avatar_url),
        player2:profiles!online_games_player2_id_fkey(id, username, avatar_url)
      `)
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) return { data: null, error };

    // Add move counts
    const replaysWithCounts = await Promise.all(
      data.map(async (game) => {
        const { count } = await supabase
          .from('game_moves')
          .select('id', { count: 'exact', head: true })
          .eq('game_id', game.id);

        return {
          ...game,
          moveCount: count || 0,
          isWin: game.winner_id === userId,
          opponent: game.player1_id === userId ? game.player2 : game.player1
        };
      })
    );

    return { data: replaysWithCounts, error: null };
  },

  // Get featured/popular replays
  async getFeaturedReplays(limit = 10) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    // Get recent completed games with high-rated players
    const { data, error } = await supabase
      .from('online_games')
      .select(`
        id,
        winner_id,
        created_at,
        updated_at,
        player1:profiles!online_games_player1_id_fkey(id, username, avatar_url, elo_rating),
        player2:profiles!online_games_player2_id_fkey(id, username, avatar_url, elo_rating)
      `)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) return { data: null, error };

    // Sort by combined rating and take top ones
    const sorted = data
      .map(g => ({
        ...g,
        combinedRating: (g.player1?.elo_rating || 1200) + (g.player2?.elo_rating || 1200)
      }))
      .sort((a, b) => b.combinedRating - a.combinedRating)
      .slice(0, limit);

    return { data: sorted, error: null };
  },

  // Generate shareable replay link
  getReplayLink(gameId) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?replay=${gameId}`;
  },

  // Get key moments in a game (significant moves)
  async getKeyMoments(gameId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data: moves, error } = await this.getGameMoves(gameId);
    if (error || !moves.length) return { data: [], error };

    const keyMoments = [];

    // First move
    if (moves.length > 0) {
      keyMoments.push({
        type: 'first_move',
        moveNumber: 1,
        description: 'Game started',
        move: moves[0]
      });
    }

    // Detect "blocking" moves (would need board analysis)
    // For now, mark every 5th move as potentially significant
    moves.forEach((move, index) => {
      if (index > 0 && index % 5 === 0) {
        keyMoments.push({
          type: 'mid_game',
          moveNumber: move.move_number,
          description: `Move ${move.move_number}`,
          move
        });
      }
    });

    // Last move (winning move)
    if (moves.length > 1) {
      const lastMove = moves[moves.length - 1];
      keyMoments.push({
        type: 'winning_move',
        moveNumber: lastMove.move_number,
        description: 'Winning move',
        move: lastMove
      });
    }

    return { data: keyMoments, error: null };
  }
};

// Helper function to format duration
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export default replayService;
