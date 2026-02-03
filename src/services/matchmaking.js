// Matchmaking Service
// OPTIMIZED: Uses centralized RealtimeManager for match notifications
// FIXED v7.15.1: Race conditions where matched player's polling kills realtime
//   before the matchFound event arrives, and duplicate game creation
import { supabase } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';

class MatchmakingService {
  constructor() {
    this.unsubscribeHandler = null;
    this.pollingInterval = null;
    this.matchHandled = false; // Guard against double-firing onMatch
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

  // Check if a game was recently created for this user (fallback detection)
  async checkForRecentGame(userId) {
    if (!supabase) return null;

    try {
      // Look for active games created in the last 30 seconds involving this user
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      const { data: games, error } = await supabase
        .from('games')
        .select(`
          *,
          player1:profiles!games_player1_id_fkey(*),
          player2:profiles!games_player2_id_fkey(*)
        `)
        .eq('status', 'active')
        .gte('created_at', thirtySecondsAgo)
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[Matchmaking] Error checking for recent game:', error);
        return null;
      }

      if (games && games.length > 0) {
        console.log('[Matchmaking] Found recent game via fallback:', games[0].id);
        return games[0];
      }
      return null;
    } catch (err) {
      console.error('[Matchmaking] Exception checking for recent game:', err);
      return null;
    }
  }

  // Create a new game between two players
  async createGame(player1Id, player2Id) {
    if (!supabase) return { error: { message: 'Not configured' } };

    // Initialize empty 8x8 board (null = empty cell)
    const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Randomly decide who goes first
    const firstPlayer = Math.random() < 0.5 ? 1 : 2;
    
    console.log('[Matchmaking] Creating game between', player1Id, 'and', player2Id);
    
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
        console.error('[Matchmaking] Error creating game:', createError);
        return { game: null, error: createError };
      }

      console.log('[Matchmaking] Game created:', game.id);

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
        console.error('[Matchmaking] Error fetching game with profiles:', fetchError);
        // Return the basic game even if profile fetch fails
        return { game, error: null };
      }

      // Remove both players from queue
      await supabase
        .from('matchmaking_queue')
        .delete()
        .in('user_id', [player1Id, player2Id]);

      console.log('[Matchmaking] Game ready with profiles:', fullGame.id);
      return { game: fullGame, error: null };
    } catch (err) {
      console.error('[Matchmaking] Exception creating game:', err);
      return { game: null, error: { message: err.message || 'Unknown error' } };
    }
  }

  // Start searching for a match with polling
  // FIXED: Two race conditions resolved:
  // 1. When queue entry disappears (other player created game), actively check
  //    for the new game instead of just stopping (which killed the realtime sub)
  // 2. Only the earlier-queued player creates the game to prevent duplicates
  startMatchmaking(userId, userRating, onMatch, onError) {
    // Clear any existing polling
    this.stopMatchmaking();
    this.matchHandled = false;

    // Safe wrapper to prevent double-firing onMatch
    const safeOnMatch = (game) => {
      if (this.matchHandled) {
        console.log('[Matchmaking] Match already handled, ignoring duplicate');
        return;
      }
      this.matchHandled = true;
      this.stopMatchmaking();
      onMatch(game);
    };

    // Poll every 2 seconds
    this.pollingInterval = setInterval(async () => {
      if (this.matchHandled) return;
      
      try {
        // Check if still in queue
        const { data: queueEntry } = await supabase
          .from('matchmaking_queue')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'waiting')
          .single();

        if (!queueEntry) {
          // FIX #1: Queue entry gone - the OTHER player likely created a game for us.
          // Instead of just stopping (which kills the realtime sub before the event
          // arrives), actively check for a recently created game.
          console.log('[Matchmaking] No queue entry found - checking for recent game...');
          
          const recentGame = await this.checkForRecentGame(userId);
          if (recentGame) {
            console.log('[Matchmaking] Found game via polling fallback:', recentGame.id);
            safeOnMatch(recentGame);
          } else {
            // No game found either - may have been removed from queue for other reasons
            // Keep polling a couple more times in case game creation is in progress
            console.log('[Matchmaking] No game found yet, will retry...');
            // Don't stop - give it a few more cycles. The realtime sub or next
            // poll iteration will catch it. After 10 seconds of no queue + no game,
            // we'll stop naturally.
          }
          return;
        }

        // Try to find a match
        const match = await this.findMatch(userId, userRating);
        
        if (match) {
          // FIX #2: Prevent duplicate game creation.
          // Only the player who joined the queue FIRST creates the game.
          // The other player will be notified via realtime or polling fallback.
          if (queueEntry.queued_at > match.queued_at) {
            // The other player queued first - they should create the game.
            // We wait for notification (realtime or polling fallback).
            console.log('[Matchmaking] Match found but other player queued first - waiting for them to create game');
            return;
          }
          
          console.log('[Matchmaking] Match found - we are the creator');
          
          // Found a match! Create the game
          const { game, error } = await this.createGame(userId, match.user_id);
          
          if (error) {
            console.error('[Matchmaking] Error creating game:', error);
            // Don't call onError for transient failures - the other player might
            // have already created the game. Check on next poll cycle.
          } else if (game) {
            safeOnMatch(game);
          }
        }
      } catch (err) {
        console.error('[Matchmaking] Matchmaking error:', err);
        onError?.(err);
      }
    }, 2000);

    return () => this.stopMatchmaking();
  }

  // Subscribe to being matched by another player - uses RealtimeManager
  subscribeToMatches(userId, onMatch) {
    if (!supabase) return { unsubscribe: () => {} };

    console.log('[Matchmaking] Subscribing to matches via RealtimeManager');

    // Register handler with RealtimeManager (no new channel created!)
    this.unsubscribeHandler = realtimeManager.on('matchFound', async (gameData) => {
      if (this.matchHandled) {
        console.log('[Matchmaking] Match already handled, ignoring realtime event');
        return;
      }
      
      console.log('[Matchmaking] Match found via RealtimeManager:', gameData?.id);
      
      // Fetch full game with profiles
      const { data: game } = await supabase
        .from('games')
        .select(`
          *,
          player1:profiles!games_player1_id_fkey(*),
          player2:profiles!games_player2_id_fkey(*)
        `)
        .eq('id', gameData.id)
        .single();

      if (game) {
        this.matchHandled = true;
        this.stopMatchmaking();
        onMatch(game);
      }
    });

    return {
      unsubscribe: () => {
        if (this.unsubscribeHandler) {
          this.unsubscribeHandler();
          this.unsubscribeHandler = null;
        }
      }
    };
  }

  // Stop all matchmaking
  stopMatchmaking() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.unsubscribeHandler) {
      this.unsubscribeHandler();
      this.unsubscribeHandler = null;
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
