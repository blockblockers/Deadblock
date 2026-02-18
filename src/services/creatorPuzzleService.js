// creatorPuzzleService.js - Service for Creator Puzzles
// v1.1: Added progress tracking for attempt persistence
// Handles fetching puzzles, completions, progress, and stats

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Get auth token from localStorage - tries multiple possible key formats
const getAuthToken = () => {
  try {
    // Try the standard Supabase auth key patterns
    const possibleKeys = [
      `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`,
      'supabase.auth.token',
      'sb-auth-token'
    ];
    
    for (const key of possibleKeys) {
      const authData = JSON.parse(localStorage.getItem(key) || 'null');
      if (authData?.access_token) {
        return authData.access_token;
      }
    }
    
    // Fallback: search for any Supabase auth key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('auth-token')) {
        const authData = JSON.parse(localStorage.getItem(key) || 'null');
        if (authData?.access_token) {
          return authData.access_token;
        }
      }
    }
    
    return ANON_KEY;
  } catch {
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

  // =========================================================================
  // PROGRESS TRACKING (Attempt Persistence)
  // =========================================================================

  /**
   * Get progress (attempts) for a specific puzzle
   * @param {string} userId 
   * @param {string} puzzleId - UUID of the puzzle
   * @returns {Promise<Object|null>} Progress record or null
   */
  async getProgress(userId, puzzleId) {
    if (!userId || !puzzleId) return null;
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzle_progress?user_id=eq.${userId}&puzzle_id=eq.${puzzleId}`,
        { headers: getHeaders() }
      );
      
      if (!response.ok) {
        console.warn('[CreatorPuzzleService] Failed to fetch progress:', response.status);
        return null;
      }
      
      const progress = await response.json();
      return progress[0] || null;
    } catch (error) {
      console.error('[CreatorPuzzleService] Error fetching progress:', error);
      return null;
    }
  },

  /**
   * Get progress by puzzle number (convenience method)
   * @param {string} userId 
   * @param {number} puzzleNumber 
   * @returns {Promise<Object|null>} Progress record or null
   */
  async getProgressByNumber(userId, puzzleNumber) {
    if (!userId || !puzzleNumber) return null;
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzle_progress?user_id=eq.${userId}&puzzle_number=eq.${puzzleNumber}`,
        { headers: getHeaders() }
      );
      
      if (!response.ok) {
        console.warn('[CreatorPuzzleService] Failed to fetch progress by number:', response.status);
        return null;
      }
      
      const progress = await response.json();
      return progress[0] || null;
    } catch (error) {
      console.error('[CreatorPuzzleService] Error fetching progress by number:', error);
      return null;
    }
  },

  /**
   * Save/update progress (attempts) for a puzzle
   * @param {string} userId 
   * @param {string} puzzleId - UUID of the puzzle
   * @param {number} puzzleNumber 
   * @param {number} attempts 
   * @returns {Promise<Object|null>} Updated progress record
   */
  async saveProgress(userId, puzzleId, puzzleNumber, attempts) {
    if (!userId || !puzzleId) {
      console.warn('[CreatorPuzzleService] Cannot save progress: missing userId or puzzleId');
      return null;
    }
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzle_progress`,
        {
          method: 'POST',
          headers: {
            ...getHeaders(),
            'Prefer': 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify({
            user_id: userId,
            puzzle_id: puzzleId,
            puzzle_number: puzzleNumber,
            attempts: attempts,
            last_attempt_at: new Date().toISOString(),
          }),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CreatorPuzzleService] Save progress error:', errorText);
        return null;
      }
      
      const result = await response.json();
      console.log('[CreatorPuzzleService] Progress saved:', puzzleNumber, 'attempts:', attempts);
      return result[0] || null;
    } catch (error) {
      console.error('[CreatorPuzzleService] Error saving progress:', error);
      return null;
    }
  },

  /**
   * Increment attempts for a puzzle (convenience method)
   * @param {string} userId 
   * @param {string} puzzleId 
   * @param {number} puzzleNumber 
   * @param {number} currentAttempts - Current attempt count to increment from
   * @returns {Promise<Object|null>} Updated progress record
   */
  async incrementAttempts(userId, puzzleId, puzzleNumber, currentAttempts = 1) {
    return this.saveProgress(userId, puzzleId, puzzleNumber, currentAttempts + 1);
  },

  /**
   * Clear progress for a puzzle (called automatically by DB trigger on completion)
   * @param {string} userId 
   * @param {string} puzzleId 
   * @returns {Promise<boolean>} Success status
   */
  async clearProgress(userId, puzzleId) {
    if (!userId || !puzzleId) return false;
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzle_progress?user_id=eq.${userId}&puzzle_id=eq.${puzzleId}`,
        {
          method: 'DELETE',
          headers: getHeaders(),
        }
      );
      
      return response.ok;
    } catch (error) {
      console.error('[CreatorPuzzleService] Error clearing progress:', error);
      return false;
    }
  },

  // =========================================================================
  // COMPLETIONS
  // =========================================================================

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
    if (!userId || !puzzleId) {
      throw new Error('User ID and Puzzle ID required');
    }

    try {
      // Use upsert to handle re-completions (update attempts count)
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/creator_puzzle_completions`,
        {
          method: 'POST',
          headers: {
            ...getHeaders(),
            'Prefer': 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify({
            user_id: userId,
            puzzle_id: puzzleId,
            puzzle_number: puzzleNumber,
            time_to_complete_ms: timeToCompleteMs,
            attempts: attempts,
            completed_at: new Date().toISOString(),
          }),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CreatorPuzzleService] Mark completed error:', errorText);
        throw new Error(`Failed to mark completed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[CreatorPuzzleService] Marked puzzle completed:', puzzleNumber, 'attempts:', attempts);
      
      // Note: Progress is automatically cleared by database trigger
      return result[0];
    } catch (error) {
      console.error('[CreatorPuzzleService] Error marking completed:', error);
      throw error;
    }
  },

  // =========================================================================
  // STATS
  // =========================================================================

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

  // =========================================================================
  // SOLUTION VALIDATION (for reference)
  // =========================================================================

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
