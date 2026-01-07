// rematchService.js - Service for handling rematch requests
// v7.7: Added getPendingRematchRequests for pending rematches in OnlineMenu
// Features:
// - Create rematch requests after game ends
// - Accept/decline rematch requests
// - Real-time notifications for rematch status
// - Auto-create new game when accepted
// - Get all pending rematch requests for a user

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
      // console.log('[RematchService] Creating rematch request:', { gameId, fromUserId, toUserId });

      // Check if there's already a pending rematch request for this game
      const existingUrl = `${SUPABASE_URL}/rest/v1/rematch_requests?game_id=eq.${gameId}&status=eq.pending&select=*`;
      const existingResponse = await fetch(existingUrl, { headers });
      
      if (existingResponse.ok) {
        const existing = await existingResponse.json();
        if (existing && existing.length > 0) {
          // If opponent already requested, auto-accept
          const existingRequest = existing[0];
          if (existingRequest.from_user_id === toUserId) {
            // console.log('[RematchService] Opponent already requested rematch, auto-accepting...');
            return await this.acceptRematchRequest(existingRequest.id, fromUserId);
          }
          // If we already requested, return existing
          if (existingRequest.from_user_id === fromUserId) {
            // console.log('[RematchService] Rematch already requested');
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
        status: 'pending'
      };

      const createUrl = `${SUPABASE_URL}/rest/v1/rematch_requests`;
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[RematchService] Failed to create request:', errorText);
        return { data: null, error: { message: 'Failed to create rematch request' } };
      }

      const data = await createResponse.json();
      const request = Array.isArray(data) ? data[0] : data;

      // console.log('[RematchService] Rematch request created:', request.id);
      return { data: request, error: null };

    } catch (e) {
      console.error('[RematchService] Create error:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  /**
   * Get pending rematch request for a specific game
   * @param {string} gameId - The game ID
   * @param {string} userId - Current user ID (to verify involvement)
   * @returns {Promise<{data: object|null, error: object|null}>}
   */
  async getPendingRematchRequest(gameId, userId) {
    if (!isConfigured()) return { data: null, error: null };

    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: null };

    try {
      const url = `${SUPABASE_URL}/rest/v1/rematch_requests?game_id=eq.${gameId}&status=eq.pending&or=(from_user_id.eq.${userId},to_user_id.eq.${userId})&select=*&order=created_at.desc&limit=1`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        return { data: null, error: null };
      }

      const data = await response.json();
      return { data: data[0] || null, error: null };

    } catch (e) {
      console.error('[RematchService] Get pending error:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  /**
   * Get rematch request by game (any status - for polling)
   * @param {string} gameId - The game ID
   * @param {string} userId - Current user ID
   * @returns {Promise<{data: object|null, error: object|null}>}
   */
  async getRematchRequestByGame(gameId, userId) {
    if (!isConfigured()) return { data: null, error: null };

    const headers = getAuthHeaders();
    if (!headers) return { data: null, error: null };

    try {
      // Get most recent request for this game (any status)
      const url = `${SUPABASE_URL}/rest/v1/rematch_requests?game_id=eq.${gameId}&or=(from_user_id.eq.${userId},to_user_id.eq.${userId})&select=*&order=created_at.desc&limit=1`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        return { data: null, error: null };
      }

      const data = await response.json();
      return { data: data[0] || null, error: null };

    } catch (e) {
      console.error('[RematchService] Get request by game error:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  /**
   * NEW v7.7: Get all pending rematch requests for a user
   * Used in OnlineMenu to show pending rematches section
   * @param {string} userId - The user ID
   * @returns {Promise<{data: array, error: object|null}>}
   */
  async getPendingRematchRequests(userId) {
    if (!isConfigured()) return { data: [], error: null };

    const headers = getAuthHeaders();
    if (!headers) return { data: [], error: { message: 'Not authenticated' } };

    try {
      // console.log('[RematchService] Getting pending rematch requests for:', userId);

      // Get rematch requests where user is sender or receiver and status is pending
      const url = `${SUPABASE_URL}/rest/v1/rematch_requests?or=(from_user_id.eq.${userId},to_user_id.eq.${userId})&status=eq.pending&order=created_at.desc`;
      
      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.error('[RematchService] Failed to fetch rematch requests');
        return { data: [], error: { message: 'Failed to fetch rematch requests' } };
      }

      const requests = await response.json();
      // console.log('[RematchService] Found', requests?.length || 0, 'pending rematch requests');

      if (!requests || requests.length === 0) {
        return { data: [], error: null };
      }

      // Fetch opponent profiles
      const opponentIds = requests.map(r => 
        r.from_user_id === userId ? r.to_user_id : r.from_user_id
      ).filter(Boolean);

      const uniqueOpponentIds = [...new Set(opponentIds)];

      if (uniqueOpponentIds.length > 0) {
        const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?id=in.(${uniqueOpponentIds.join(',')})&select=id,username,display_name`;
        const profilesResponse = await fetch(profilesUrl, { headers });

        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          const profileMap = {};
          profiles.forEach(p => { profileMap[p.id] = p; });

          // Enrich requests with opponent info
          requests.forEach(r => {
            const oppId = r.from_user_id === userId ? r.to_user_id : r.from_user_id;
            const oppProfile = profileMap[oppId];
            r.opponent_id = oppId;
            r.opponent_name = oppProfile?.display_name || oppProfile?.username || 'Opponent';
            r.is_sender = r.from_user_id === userId;
          });
        }
      }

      return { data: requests, error: null };

    } catch (e) {
      console.error('[RematchService] Get pending requests error:', e);
      return { data: [], error: { message: e.message } };
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
      // console.log('[RematchService] Accepting rematch request:', requestId);

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

      // console.log('[RematchService] New game created:', newGame.id);

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

      // console.log('[RematchService] Rematch accepted, game:', newGame.id);

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
      // console.log('[RematchService] Declining rematch request:', requestId);

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
      const request = Array.isArray(data) ? data[0] : null;

      // console.log('[RematchService] Rematch declined');
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
      // console.log('[RematchService] Cancelling rematch request:', requestId);

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

      // console.log('[RematchService] Rematch cancelled');
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

    let lastStatus = null;
    let lastNewGameId = null;

    // Use polling as a reliable fallback since we may not have supabase client
    const pollInterval = setInterval(async () => {
      // Get the latest request for this game (any status)
      const { data } = await this.getRematchRequestByGame(gameId, userId);
      
      // Check if status or new_game_id changed
      if (data) {
        const statusChanged = data.status !== lastStatus;
        const newGameAvailable = data.new_game_id && data.new_game_id !== lastNewGameId;
        
        if (statusChanged || newGameAvailable) {
          lastStatus = data.status;
          lastNewGameId = data.new_game_id;
          
          // console.log('[RematchService] Status update:', { 
            status: data.status, 
            new_game_id: data.new_game_id,
            from_user_id: data.from_user_id 
          });
        
          callback(data);
        }
      } else {
        // No request found - could be deleted or never created
        if (lastStatus !== null) {
          lastStatus = null;
          lastNewGameId = null;
          callback(null);
        }
      }
    }, 2000); // Poll every 2 seconds for faster response

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
