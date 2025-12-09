// Matchmaking Service
import { supabase } from '../utils/supabase';

class MatchmakingService {
  constructor() {
    this.subscription = null;
    this.pollingInterval = null;
  }

  // Join the matchmaking queue
  async joinQueue(userId, rating) {
    if (!supabase) return { error: { message: 'Not configured' } };

    // First, leave any existing queue entries
    await this.leaveQueue(userId);
    
    const { data, error } = await supabase
      .from('matchmaking_queue')
      .insert({
        user_id: userId,
        rating: rating || 1000,
        status: 'waiting'
      })
      .select()
      .single();
    
    return { data, error };
  }

  // Leave the queue
  async leaveQueue(userId) {
    if (!supabase) return { error: null };

    const { error } = await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', userId);
    
    return { error };
  }

  // Find a match within rating range
  async findMatch(userId, userRating, ratingRange = 300) {
    if (!supabase) return null;

    // Look for players within rating range, prioritize closest rating
    const { data: candidates, error } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('status', 'waiting')
      .neq('user_id', userId)
      .gte('rating', userRating - ratingRange)
      .lte('rating', userRating + ratingRange)
      .order('queued_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error finding match:', error);
      return null;
    }

    if (candidates && candidates.length > 0) {
      return candidates[0];
    }
    return null;
  }

  // Create a new game between two players
  async createGame(player1Id, player2Id) {
    if (!supabase) return { error: { message: 'Not configured' } };

    // Initialize empty 8x8 board (null = empty cell)
    const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Randomly decide who goes first
    const firstPlayer = Math.random() < 0.5 ? 1 : 2;
    
    console.log('Creating game between', player1Id, 'and', player2Id);
    
    try {
      // First, create the game without the profile joins
      const { data: game, error: createError } = await supabase
        .from('games')
        .insert({
          player1_id: player1Id,
          player2_id: player2Id,
          board: emptyBoard,
          board_pieces: {},
          used_pieces: [],
          current_player: firstPlayer,
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating game:', createError);
        return { game: null, error: createError };
      }

      console.log('Game created:', game.id);

      // Now fetch the game with player profiles
      const { data: fullGame, error: fetchError } = await supabase
        .from('games')
        .select(`
          *,
          player1:profiles!games_player1_id_fkey(*),
          player2:profiles!games_player2_id_fkey(*)
        `)
        .eq('id', game.id)
        .single();

      if (fetchError) {
        console.error('Error fetching game with profiles:', fetchError);
        // Return the basic game even if profile fetch fails
        return { game, error: null };
      }

      // Remove both players from queue
      await supabase
        .from('matchmaking_queue')
        .delete()
        .in('user_id', [player1Id, player2Id]);

      console.log('Game ready with profiles:', fullGame.id);
      return { game: fullGame, error: null };
    } catch (err) {
      console.error('Exception creating game:', err);
      return { game: null, error: { message: err.message || 'Unknown error' } };
    }
  }

  // Start searching for a match with polling
  startMatchmaking(userId, userRating, onMatch, onError) {
    // Clear any existing polling
    this.stopMatchmaking();

    // Poll every 2 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        // Check if still in queue
        const { data: queueEntry } = await supabase
          .from('matchmaking_queue')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'waiting')
          .single();

        if (!queueEntry) {
          // No longer in queue, might have been matched
          this.stopMatchmaking();
          return;
        }

        // Try to find a match
        const match = await this.findMatch(userId, userRating);
        
        if (match) {
          // Found a match! Create the game
          const { game, error } = await this.createGame(userId, match.user_id);
          
          if (error) {
            console.error('Error creating game:', error);
            onError?.(error);
          } else if (game) {
            this.stopMatchmaking();
            onMatch(game);
          }
        }
      } catch (err) {
        console.error('Matchmaking error:', err);
        onError?.(err);
      }
    }, 2000);

    return () => this.stopMatchmaking();
  }

  // Subscribe to being matched by another player
  subscribeToMatches(userId, onMatch) {
    if (!supabase) return { unsubscribe: () => {} };

    this.subscription = supabase
      .channel(`user-matches-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'games',
          filter: `player2_id=eq.${userId}`
        },
        async (payload) => {
          // We were matched as player 2
          const { data: game } = await supabase
            .from('games')
            .select(`
              *,
              player1:profiles!games_player1_id_fkey(*),
              player2:profiles!games_player2_id_fkey(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (game) {
            this.stopMatchmaking();
            onMatch(game);
          }
        }
      )
      .subscribe();

    return this.subscription;
  }

  // Stop all matchmaking
  stopMatchmaking() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  // Get queue status
  async getQueueStatus() {
    if (!supabase) return { count: 0 };

    const { count } = await supabase
      .from('matchmaking_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting');

    return { count: count || 0 };
  }
}

export const matchmakingService = new MatchmakingService();
export default matchmakingService;
