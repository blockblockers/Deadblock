// Replay Service - Game replay functionality
// UPDATED: Uses direct fetch to bypass Supabase client timeout issues
import { isSupabaseConfigured } from '../utils/supabase';
import { dbSelect, dbInsert, dbCount } from './supabaseDirectFetch';

export const replayService = {
  async recordMove(gameId, playerId, moveData) {
    if (!isSupabaseConfigured()) return { error: null };

    return await dbInsert('game_moves', {
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
    }, { returning: true, single: true });
  },

  async getGameMoves(gameId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data: moves, error } = await dbSelect('game_moves', {
      select: 'id,move_number,piece_type,row,col,rotation,flipped,board_state,time_taken_seconds,created_at,player_id',
      eq: { game_id: gameId },
      order: 'move_number.asc'
    });

    if (error || !moves?.length) return { data: [], error };

    const playerIds = [...new Set(moves.map(m => m.player_id))];
    const { data: profiles } = await dbSelect('profiles', {
      select: 'id,username',
      in: { id: playerIds }
    });

    const profileMap = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    const result = moves.map(m => ({
      ...m,
      player: profileMap[m.player_id]
    }));

    return { data: result, error: null };
  },

  async getReplaySummary(gameId) {
    if (!isSupabaseConfigured()) return { data: null, error: null };

    const { data: game, error: gameError } = await dbSelect('online_games', {
      select: 'id,status,winner_id,created_at,updated_at,player1_id,player2_id',
      eq: { id: gameId },
      single: true
    });

    if (gameError || !game) return { data: null, error: gameError };

    const { data: profiles } = await dbSelect('profiles', {
      select: 'id,username,avatar_url,elo_rating',
      in: { id: [game.player1_id, game.player2_id] }
    });

    const profileMap = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    const { count: moveCount } = await dbCount('game_moves', { eq: { game_id: gameId } });

    const startTime = new Date(game.created_at);
    const endTime = new Date(game.updated_at);
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    return {
      data: {
        ...game,
        player1: profileMap[game.player1_id],
        player2: profileMap[game.player2_id],
        moveCount: moveCount || 0,
        durationSeconds,
        durationFormatted: formatDuration(durationSeconds)
      },
      error: null
    };
  },

  async getUserReplays(userId, limit = 20) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data: games, error } = await dbSelect('online_games', {
      select: 'id,status,winner_id,created_at,updated_at,player1_id,player2_id',
      or: `player1_id.eq.${userId},player2_id.eq.${userId}`,
      eq: { status: 'completed' },
      order: 'updated_at.desc',
      limit
    });

    if (error || !games?.length) return { data: [], error };

    const playerIds = [...new Set(games.flatMap(g => [g.player1_id, g.player2_id]))];
    const { data: profiles } = await dbSelect('profiles', {
      select: 'id,username,avatar_url',
      in: { id: playerIds }
    });

    const profileMap = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    const replaysWithCounts = await Promise.all(
      games.map(async (game) => {
        const { count } = await dbCount('game_moves', { eq: { game_id: game.id } });
        return {
          ...game,
          player1: profileMap[game.player1_id],
          player2: profileMap[game.player2_id],
          moveCount: count || 0,
          isWin: game.winner_id === userId,
          opponent: game.player1_id === userId ? profileMap[game.player2_id] : profileMap[game.player1_id]
        };
      })
    );

    return { data: replaysWithCounts, error: null };
  },

  async getFeaturedReplays(limit = 10) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data: games, error } = await dbSelect('online_games', {
      select: 'id,winner_id,created_at,updated_at,player1_id,player2_id',
      eq: { status: 'completed' },
      order: 'updated_at.desc',
      limit: 50
    });

    if (error || !games?.length) return { data: [], error };

    const playerIds = [...new Set(games.flatMap(g => [g.player1_id, g.player2_id]))];
    const { data: profiles } = await dbSelect('profiles', {
      select: 'id,username,avatar_url,elo_rating',
      in: { id: playerIds }
    });

    const profileMap = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    const sorted = games
      .map(g => ({
        ...g,
        player1: profileMap[g.player1_id],
        player2: profileMap[g.player2_id],
        combinedRating: (profileMap[g.player1_id]?.elo_rating || 1200) + (profileMap[g.player2_id]?.elo_rating || 1200)
      }))
      .sort((a, b) => b.combinedRating - a.combinedRating)
      .slice(0, limit);

    return { data: sorted, error: null };
  },

  getReplayLink(gameId) {
    return `${window.location.origin}/?replay=${gameId}`;
  },

  async getKeyMoments(gameId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data: moves, error } = await this.getGameMoves(gameId);
    if (error || !moves.length) return { data: [], error };

    const keyMoments = [];

    if (moves.length > 0) {
      keyMoments.push({ type: 'first_move', moveNumber: 1, description: 'Game started', move: moves[0] });
    }

    moves.forEach((move, index) => {
      if (index > 0 && index % 5 === 0) {
        keyMoments.push({ type: 'mid_game', moveNumber: move.move_number, description: `Move ${move.move_number}`, move });
      }
    });

    if (moves.length > 1) {
      const lastMove = moves[moves.length - 1];
      keyMoments.push({ type: 'winning_move', moveNumber: lastMove.move_number, description: 'Winning move', move: lastMove });
    }

    return { data: keyMoments, error: null };
  }
};

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
