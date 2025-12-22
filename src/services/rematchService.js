// rematchService.js - Service for handling rematch requests
// Features:
// - Create rematch requests after game ends
// - Accept/decline rematch requests
// - Real-time notifications for rematch status
// - Auto-create new game when accepted

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';

const isConfigured = () => SUPABASE_URL && ANON_KEY;

const getAuthHeaders = () => {
  const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  if (!authData?.access_token || !ANON_KEY) return null;
  return {
    'Authorization': `Bearer ${authData.access_token}`,
    'apikey': ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
};

class RematchService {
  constructor() {
    this.subscriptions = new Map();
  }

  /**
   * Create a rematch request after a game ends
   * @param {string} gameId - The completed game ID
   * @param {string} fromUserId - The user requesting the rematch
   * @param {string} toUserId - The opponent
   * @returns {Promise<{data: object|null, error: object|null}>}
   */
  async createRematchRequest(gameId, fromUserId, toUserId) {
    if (!isConfigured()) return { data: null, error: { message: 'Not configured' } };

    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: { message: 'Not authenticated' } };

    try {
      console.log('[RematchService] Creating rematch request:', { gameId, fromUserId, toUserId });

      // Check if there's already a pending rematch request for this game
      const existingUrl = `${SUPABASE_URL}/rest/v1/rematch_requests?game_id=eq.${gameId}&status=eq.pending&select=*`;
      const existingResponse = await fetch(existingUrl, { headers });
      
      if (existingResponse.ok) {
        const existing = await existingResponse.json();
        if (existing && existing.length > 0) {
          // If opponent already requested, auto-accept
          const existingRequest = existing[0];
          if (existingRequest.from_user_id === toUserId) {
            console.log('[RematchService] Opponent already requested rematch, auto-accepting...');
            return await this.acceptRematchRequest(existingRequest.id, fromUserId);
          }
          // If we already requested, return existing
          if (existingRequest.from_user_id === fromUserId) {
            console.log('[RematchService] Rematch already requested');
            return { data: existingRequest, error: null };
          }
        }
      }

      // Randomly determine who goes first
      const firstPlayerId = Math.random() < 0.5 ? fromUserId : toUserId;

      // Create new rematch request
      const requestData = {
        game_id: gameId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        first_player_id: firstPlayerId,
        status: 'pending',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/rematch_requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RematchService] Failed to create request:', errorText);
        return { data: null, error: { message: 'Failed to create rematch request' } };
      }

      const data = await response.json();
      const request = Array.isArray(data) ? data[0] : data;
      
      console.log('[RematchService] Rematch request created:', request.id);
      return { data: request, error: null };

    } catch (e) {
      console.error('[RematchService] Create error:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  /**
   * Get pending rematch request for a game (if any)
   * @param {string} gameId - The game ID
   * @param {string} userId - Current user ID
   * @returns {Promise<{data: object|null, error: object|null}>}
   */
  async getPendingRematchRequest(gameId, userId) {
    if (!isConfigured()) return { data: null, error: null };

    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: null };

    try {
      const url = `${SUPABASE_URL}/rest/v1/rematch_requests?game_id=eq.${gameId}&status=eq.pending&select=*`;
      const response = await fetch(url, { headers });

      if (!response.ok) return { data: null, error: null };

      const data = await response.json();
      const request = data && data.length > 0 ? data[0] : null;

      return { data: request, error: null };

    } catch (e) {
      console.error('[RematchService] Get pending error:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  /**
   * Accept a rematch request - creates a new game
   * @param {string} requestId - The rematch request ID
   * @param {string} userId - The accepting user ID
   * @returns {Promise<{data: object|null, error: object|null}>}
   */
  async acceptRematchRequest(requestId, userId) {
    if (!isConfigured()) return { data: null, error: { message: 'Not configured' } };

    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: { message: 'Not authenticated' } };

    try {
      console.log('[RematchService] Accepting rematch request:', requestId);

      // First, get the request details
      const getUrl = `${SUPABASE_URL}/rest/v1/rematch_requests?id=eq.${requestId}&select=*`;
      const getResponse = await fetch(getUrl, { headers });

      if (!getResponse.ok) {
        return { data: null, error: { message: 'Request not found' } };
      }

      const requests = await getResponse.json();
      const request = requests[0];

      if (!request) {
        return { data: null, error: { message: 'Request not found' } };
      }

      if (request.status !== 'pending') {
        return { data: null, error: { message: 'Request already processed' } };
      }

      // Determine player positions based on first_player_id
      const player1Id = request.first_player_id;
      const player2Id = request.first_player_id === request.from_user_id 
        ? request.to_user_id 
        : request.from_user_id;

      // Create the new game
      const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(0));
      const gameData = {
        player1_id: player1Id,
        player2_id: player2Id,
        board: emptyBoard,
        board_pieces: {},
        used_pieces: [],
        current_player: 1,
        status: 'active'
      };

      const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/games`, {
        method: 'POST',
        headers,
        body: JSON.stringify(gameData)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[RematchService] Failed to create game:', errorText);
        return { data: null, error: { message: 'Failed to create new game' } };
      }

      const games = await createResponse.json();
      const newGame = Array.isArray(games) ? games[0] : games;

      console.log('[RematchService] New game created:', newGame.id);

      // Update the rematch request with the new game ID
      const updateUrl = `${SUPABASE_URL}/rest/v1/rematch_requests?id=eq.${requestId}`;
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          status: 'accepted',
          new_game_id: newGame.id,
          updated_at: new Date().toISOString()
        })
      });

      console.log('[RematchService] Rematch accepted, game:', newGame.id);

      return {
        data: {
          request: { ...request, status: 'accepted', new_game_id: newGame.id },
          game: newGame,
          firstPlayerId: player1Id
        },
        error: null
      };

    } catch (e) {
      console.error('[RematchService] Accept error:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  /**
   * Decline a rematch request
   * @param {string} requestId - The rematch request ID
   * @param {string} userId - The declining user ID
   * @returns {Promise<{data: object|null, error: object|null}>}
   */
  async declineRematchRequest(requestId, userId) {
    if (!isConfigured()) return { data: null, error: { message: 'Not configured' } };

    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: { message: 'Not authenticated' } };

    try {
      console.log('[RematchService] Declining rematch request:', requestId);

      const url = `${SUPABASE_URL}/rest/v1/rematch_requests?id=eq.${requestId}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'declined',
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        return { data: null, error: { message: 'Failed to decline request' } };
      }

      const data = await response.json();
      const request = Array.isArray(data) ? data[0] : data;

      console.log('[RematchService] Rematch declined');
      return { data: request, error: null };

    } catch (e) {
      console.error('[RematchService] Decline error:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  /**
   * Cancel a rematch request (by the requester)
   * @param {string} requestId - The rematch request ID
   * @param {string} userId - The cancelling user ID (must be the requester)
   * @returns {Promise<{data: object|null, error: object|null}>}
   */
  async cancelRematchRequest(requestId, userId) {
    if (!isConfigured()) return { data: null, error: { message: 'Not configured' } };

    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: { message: 'Not authenticated' } };

    try {
      console.log('[RematchService] Cancelling rematch request:', requestId);

      const url = `${SUPABASE_URL}/rest/v1/rematch_requests?id=eq.${requestId}&from_user_id=eq.${userId}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        return { data: null, error: { message: 'Failed to cancel request' } };
      }

      console.log('[RematchService] Rematch cancelled');
      return { data: { cancelled: true }, error: null };

    } catch (e) {
      console.error('[RematchService] Cancel error:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  /**
   * Subscribe to rematch request updates for a specific game
   * @param {string} gameId - The game ID to watch
   * @param {string} userId - Current user ID
   * @param {function} callback - Called when rematch request status changes
   * @returns {function} Unsubscribe function
   */
  subscribeToRematchUpdates(gameId, userId, callback) {
    if (!isConfigured()) return () => {};

    const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (!authData?.access_token) return () => {};

    // Use polling as a reliable fallback since we may not have supabase client
    const pollInterval = setInterval(async () => {
      const { data } = await this.getPendingRematchRequest(gameId, userId);
      callback(data);
    }, 3000);

    // Store for cleanup
    this.subscriptions.set(gameId, pollInterval);

    // Return unsubscribe function
    return () => {
      clearInterval(pollInterval);
      this.subscriptions.delete(gameId);
    };
  }

  /**
   * Check if user has a pending rematch request (either sent or received)
   * @param {string} gameId - The game ID
   * @param {string} userId - Current user ID
   * @returns {Promise<{hasPending: boolean, isSender: boolean, request: object|null}>}
   */
  async checkRematchStatus(gameId, userId) {
    const { data: request } = await this.getPendingRematchRequest(gameId, userId);
    
    if (!request) {
      return { hasPending: false, isSender: false, request: null };
    }

    return {
      hasPending: true,
      isSender: request.from_user_id === userId,
      request
    };
  }
}

export const rematchService = new RematchService();
export default rematchService;
