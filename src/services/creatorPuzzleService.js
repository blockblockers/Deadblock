// creatorPuzzleService.js - Service for Creator Puzzles
// v2.0: Fixed auth token retrieval and added better error logging
// Handles fetching puzzles, completions, and stats

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Get the correct localStorage key for auth token
// Supabase uses format: sb-{project-ref}-auth-token
const getAuthStorageKey = () => {
  if (!SUPABASE_URL) return null;
  try {
    // Extract project ref from URL: https://xxxxx.supabase.co -> xxxxx
    const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match && match[1]) {
      return `sb-${match[1]}-auth-token`;
    }
  } catch (e) {
    console.warn('[CreatorPuzzleService] Could not parse Supabase URL:', e);
  }
  return null;
};

// Get auth token from localStorage
const getAuthToken = () => {
  try {
    const authKey = getAuthStorageKey();
    if (!authKey) {
      console.warn('[CreatorPuzzleService] No auth storage key found');
      return ANON_KEY;
    }
    
    const authData = JSON.parse(localStorage.getItem(authKey) || 'null');
    if (authData?.access_token) {
      return authData.access_token;
    }
    
    // Fallback: user might not be logged in, use anon key
    return ANON_KEY;
  } catch (e) {
    console.warn('[CreatorPuzzleService] Error getting auth token:', e);
    return ANON_KEY;
  }
};

// Standard headers for Supabase requests
const getHeaders = () => ({
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

export const creatorPuzzleService = {
  /**
   * Fetch all active creator puzzles
   * @returns {Promise<Array>} Array of puzzles ordered by puzzle_number
   */
  async getAllPuzzles() {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzles?is_active=eq.true&order=puzzle_number.asc`,
        { headers: getHeaders() }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch puzzles: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[CreatorPuzzleService] Error fetching puzzles:', error);
      throw error;
    }
  },

  /**
   * Fetch a single puzzle by number
   * @param {number} puzzleNumber 
   * @returns {Promise<Object|null>} Puzzle object or null
   */
  async getPuzzleByNumber(puzzleNumber) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzles?puzzle_number=eq.${puzzleNumber}&is_active=eq.true`,
        { headers: getHeaders() }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch puzzle: ${response.status}`);
      }
      
      const puzzles = await response.json();
      return puzzles[0] || null;
    } catch (error) {
      console.error('[CreatorPuzzleService] Error fetching puzzle:', error);
      throw error;
    }
  },

  /**
   * Fetch user's completed puzzles
   * @param {string} userId 
   * @returns {Promise<Array>} Array of completion records
   */
  async getUserCompletions(userId) {
    if (!userId) return [];
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzle_completions?user_id=eq.${userId}&order=puzzle_number.asc`,
        { headers: getHeaders() }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch completions: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[CreatorPuzzleService] Error fetching completions:', error);
      return [];
    }
  },

  /**
   * Get set of completed puzzle numbers for a user
   * @param {string} userId 
   * @returns {Promise<Set<number>>} Set of completed puzzle numbers
   */
  async getCompletedPuzzleNumbers(userId) {
    const completions = await this.getUserCompletions(userId);
    return new Set(completions.map(c => c.puzzle_number));
  },

  /**
   * Mark a puzzle as completed
   * @param {string} userId 
   * @param {string} puzzleId 
   * @param {number} puzzleNumber 
   * @param {number} timeToCompleteMs - Time in milliseconds
   * @param {number} attempts - Number of attempts (default 1)
   * @returns {Promise<Object>} Completion record
   */
  async markCompleted(userId, puzzleId, puzzleNumber, timeToCompleteMs = null, attempts = 1) {
    console.log('[CreatorPuzzleService] markCompleted called with:', { userId, puzzleId, puzzleNumber, timeToCompleteMs, attempts });
    
    if (!userId || !puzzleId) {
      console.error('[CreatorPuzzleService] Missing required params:', { userId, puzzleId });
      throw new Error('User ID and Puzzle ID required');
    }

    const body = {
      user_id: userId,
      puzzle_id: puzzleId,
      puzzle_number: puzzleNumber,
      time_to_complete_ms: timeToCompleteMs,
      attempts: attempts,
      completed_at: new Date().toISOString(),
    };

    console.log('[CreatorPuzzleService] Request body:', body);
    console.log('[CreatorPuzzleService] Auth storage key:', getAuthStorageKey());

    try {
      // Use upsert to handle re-completions (update attempts count)
      // NOTE: This requires a unique constraint on (user_id, puzzle_number) in the database
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzle_completions`,
        {
          method: 'POST',
          headers: {
            ...getHeaders(),
            'Prefer': 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(body),
        }
      );
      
      const responseText = await response.text();
      console.log('[CreatorPuzzleService] Response status:', response.status, response.statusText);
      console.log('[CreatorPuzzleService] Response body:', responseText);
      
      if (!response.ok) {
        console.error('[CreatorPuzzleService] Mark completed error:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        throw new Error(`Failed to mark completed: ${response.status} - ${responseText}`);
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.warn('[CreatorPuzzleService] Could not parse response as JSON');
        result = [];
      }
      
      console.log('[CreatorPuzzleService] Successfully marked puzzle completed:', puzzleNumber, result);
      return result[0] || result;
    } catch (error) {
      console.error('[CreatorPuzzleService] Error marking completed:', error);
      throw error;
    }
  },

  /**
   * Increment attempts for a puzzle (when user retries)
   * @param {string} userId 
   * @param {number} puzzleNumber 
   * @returns {Promise<void>}
   */
  async incrementAttempts(userId, puzzleNumber) {
    if (!userId) return;

    try {
      // First get current attempts
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzle_completions?user_id=eq.${userId}&puzzle_number=eq.${puzzleNumber}`,
        { headers: getHeaders() }
      );
      
      if (!response.ok) return;
      
      const completions = await response.json();
      if (completions.length > 0) {
        const current = completions[0];
        await fetch(
          `${SUPABASE_URL}/rest/v1/creator_puzzle_completions?id=eq.${current.id}`,
          {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
              attempts: (current.attempts || 0) + 1,
            }),
          }
        );
      }
    } catch (error) {
      console.error('[CreatorPuzzleService] Error incrementing attempts:', error);
    }
  },

  /**
   * Get user stats for creator puzzles
   * @param {string} userId 
   * @returns {Promise<Object>} Stats object
   */
  async getUserStats(userId) {
    if (!userId) {
      return { completed: 0, total: 0, percent: 0 };
    }

    try {
      const [puzzles, completions] = await Promise.all([
        this.getAllPuzzles(),
        this.getUserCompletions(userId),
      ]);

      return {
        completed: completions.length,
        total: puzzles.length,
        percent: puzzles.length > 0 
          ? Math.round((completions.length / puzzles.length) * 100) 
          : 0,
      };
    } catch (error) {
      console.error('[CreatorPuzzleService] Error getting stats:', error);
      return { completed: 0, total: 0, percent: 0 };
    }
  },

  /**
   * Validate a move against the puzzle's solution
   * @param {Object} puzzle - The puzzle object
   * @param {number} moveIndex - Which move in the solution sequence (0-indexed)
   * @param {Object} playerMove - The move the player made
   * @returns {boolean} True if move matches solution
   */
  validateMove(puzzle, moveIndex, playerMove) {
    if (!puzzle?.solution_moves || !Array.isArray(puzzle.solution_moves)) {
      console.error('[CreatorPuzzleService] Invalid puzzle solution data');
      return false;
    }

    const expectedMove = puzzle.solution_moves[moveIndex];
    if (!expectedMove) {
      console.error('[CreatorPuzzleService] No expected move at index', moveIndex);
      return false;
    }

    // Compare piece, position, and rotation
    const pieceMatch = playerMove.piece === expectedMove.piece;
    const positionMatch = 
      playerMove.position[0] === expectedMove.position[0] && 
      playerMove.position[1] === expectedMove.position[1];
    const rotationMatch = playerMove.rotation === expectedMove.rotation;

    return pieceMatch && positionMatch && rotationMatch;
  },

  /**
   * Get the correct next move for a puzzle
   * @param {Object} puzzle - The puzzle object
   * @param {number} moveIndex - Which move in the solution sequence (0-indexed)
   * @returns {Object|null} The expected move or null
   */
  getExpectedMove(puzzle, moveIndex) {
    if (!puzzle?.solution_moves || !Array.isArray(puzzle.solution_moves)) {
      return null;
    }
    return puzzle.solution_moves[moveIndex] || null;
  },

  /**
   * Check if puzzle is fully solved
   * @param {Object} puzzle - The puzzle object
   * @param {number} movesCompleted - Number of correct moves made
   * @returns {boolean} True if all solution moves completed
   */
  isPuzzleSolved(puzzle, movesCompleted) {
    if (!puzzle?.solution_moves) return false;
    return movesCompleted >= puzzle.solution_moves.length;
  },
};

export default creatorPuzzleService;
