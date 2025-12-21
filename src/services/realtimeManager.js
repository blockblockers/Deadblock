// Realtime Connection Manager - Optimizes Supabase Realtime usage
// Consolidates multiple channels into minimal connections to maximize free tier capacity
// UPDATED: Polling fallback now uses direct fetch to bypass client timeout issues
import { supabase, isSupabaseConfigured } from '../utils/supabase';

// Direct fetch helper for polling (avoids Supabase client timeout)
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';

const getAuthHeaders = () => {
  const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!authData?.access_token || !ANON_KEY) return null;
  return {
    'Authorization': `Bearer ${authData.access_token}`,
    'apikey': ANON_KEY,
    'Content-Type': 'application/json'
  };
};

const directFetch = async (table, params = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null };
  
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  const queryParams = [];
  
  if (params.select) queryParams.push(`select=${encodeURIComponent(params.select)}`);
  if (params.eq) Object.entries(params.eq).forEach(([k, v]) => queryParams.push(`${k}=eq.${v}`));
  if (params.order) queryParams.push(`order=${params.order}`);
  if (params.limit) queryParams.push(`limit=${params.limit}`);
  if (params.single) headers['Accept'] = 'application/vnd.pgrst.object+json';
  
  url += queryParams.join('&');
  
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return { data: null };
    const data = await response.json();
    return { data };
  } catch (e) {
    console.error('[RealtimeManager] Direct fetch error:', e);
    return { data: null };
  }
};

class RealtimeManager {
  constructor() {
    // Single consolidated channel per user for all personal notifications
    this.userChannel = null;
    this.userId = null;
    
    // Game-specific channel (only one at a time)
    this.gameChannel = null;
    this.currentGameId = null;
    
    // Event handlers registered by components
    this.handlers = {
      // User-level events
      gameInvite: new Set(),
      friendRequest: new Set(),
      matchFound: new Set(),
      
      // Game-level events  
      gameUpdate: new Set(),
      chatMessage: new Set(),
    };
    
    // Connection state
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    
    // Idle timeout - disconnect after 5 minutes of inactivity
    this.idleTimeout = null;
    this.idleTimeoutMs = 5 * 60 * 1000; // 5 minutes
    
    // Polling fallback for when realtime is unavailable
    this.pollingIntervals = {};
    this.usePollingFallback = false;
    
    // Track last seen data to only notify on changes
    this.lastGameState = null;
  }

  // Initialize user channel - call once when user logs in
  async connectUser(userId) {
    if (!isSupabaseConfigured() || !userId) return false;
    
    // Already connected for this user
    if (this.userChannel && this.userId === userId) {
      this.resetIdleTimeout();
      return true;
    }
    
    // Disconnect any existing connection
    await this.disconnectUser();
    
    this.userId = userId;
    console.log('[RealtimeManager] Connecting user channel for:', userId);
    
    try {
      // Single consolidated channel for all user notifications
      this.userChannel = supabase
        .channel(`user-notifications:${userId}`, {
          config: {
            presence: { key: userId },
          }
        })
        // Game invites
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'game_invites',
            filter: `to_user_id=eq.${userId}`
          },
          (payload) => {
            console.log('[RealtimeManager] Game invite received:', payload.new?.id);
            this.notifyHandlers('gameInvite', payload.new);
          }
        )
        // Friend requests
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friends',
            filter: `friend_id=eq.${userId}`
          },
          (payload) => {
            console.log('[RealtimeManager] Friend request received:', payload.new?.id);
            this.notifyHandlers('friendRequest', payload.new);
          }
        )
        // Matchmaking results
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games',
            filter: `player2_id=eq.${userId}`
          },
          (payload) => {
            // Only notify for new games (matchmaking found)
            if (payload.eventType === 'INSERT' || 
                (payload.eventType === 'UPDATE' && payload.new?.status === 'active' && payload.old?.status === 'pending')) {
              console.log('[RealtimeManager] Match found:', payload.new?.id);
              this.notifyHandlers('matchFound', payload.new);
            }
          }
        )
        // Email invite links (when someone accepts your invite link)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'email_invites',
            filter: `from_user_id=eq.${userId}`
          },
          (payload) => {
            console.log('[RealtimeManager] Email invite updated:', payload.new?.id, payload.new?.status);
            // When status changes from pending/sent to accepted/declined, notify
            if (payload.new?.status === 'accepted' || payload.new?.status === 'declined') {
              this.notifyHandlers('emailInviteUpdated', payload.new);
            }
          }
        );
      
      // Subscribe with connection status tracking
      const status = await new Promise((resolve) => {
        this.userChannel.subscribe((status) => {
          console.log('[RealtimeManager] User channel status:', status);
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            this.connectionAttempts = 0;
            resolve('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            resolve('error');
          }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => resolve('timeout'), 10000);
      });
      
      if (status !== 'connected') {
        console.warn('[RealtimeManager] Failed to connect, using polling fallback');
        this.enablePollingFallback();
        return false;
      }
      
      this.resetIdleTimeout();
      return true;
      
    } catch (error) {
      console.error('[RealtimeManager] Connection error:', error);
      this.enablePollingFallback();
      return false;
    }
  }
  
  // Disconnect user channel - call on logout or long idle
  async disconnectUser() {
    if (this.userChannel) {
      console.log('[RealtimeManager] Disconnecting user channel');
      await this.userChannel.unsubscribe();
      this.userChannel = null;
    }
    
    this.userId = null;
    this.isConnected = false;
    this.clearIdleTimeout();
    this.disablePollingFallback();
  }
  
  // Connect to a specific game - only one game at a time
  async connectGame(gameId) {
    if (!isSupabaseConfigured() || !gameId) return false;
    
    // Already connected to this game
    if (this.gameChannel && this.currentGameId === gameId) {
      return true;
    }
    
    // Disconnect from previous game
    await this.disconnectGame();
    
    this.currentGameId = gameId;
    this.lastGameState = null; // Reset for new game
    console.log('[RealtimeManager] Connecting game channel for:', gameId);
    
    try {
      this.gameChannel = supabase
        .channel(`game:${gameId}`)
        // Game state updates
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${gameId}`
          },
          (payload) => {
            console.log('[RealtimeManager] Game update received');
            this.notifyHandlers('gameUpdate', payload.new);
          }
        )
        // Chat messages
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'game_chat',
            filter: `game_id=eq.${gameId}`
          },
          (payload) => {
            console.log('[RealtimeManager] 📨 Chat message received:', {
              id: payload.new?.id,
              user_id: payload.new?.user_id,
              message_type: payload.new?.message_type,
              message_key: payload.new?.message_key
            });
            this.notifyHandlers('chatMessage', payload.new);
          }
        );
      
      const status = await new Promise((resolve) => {
        this.gameChannel.subscribe((status) => {
          console.log('[RealtimeManager] Game channel status:', status);
          if (status === 'SUBSCRIBED') {
            resolve('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            resolve('error');
          }
        });
        setTimeout(() => resolve('timeout'), 10000);
      });
      
      if (status !== 'connected') {
        console.warn('[RealtimeManager] Game channel failed, using polling');
        this.startGamePolling(gameId);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('[RealtimeManager] Game connection error:', error);
      this.startGamePolling(gameId);
      return false;
    }
  }
  
  // Disconnect from game channel
  async disconnectGame() {
    if (this.gameChannel) {
      console.log('[RealtimeManager] Disconnecting game channel');
      await this.gameChannel.unsubscribe();
      this.gameChannel = null;
    }
    
    this.currentGameId = null;
    this.lastGameState = null;
    this.stopGamePolling();
  }
  
  // Register event handler
  on(event, handler) {
    if (this.handlers[event]) {
      this.handlers[event].add(handler);
      console.log(`[RealtimeManager] Handler registered for ${event}, count: ${this.handlers[event].size}`);
    }
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }
  
  // Unregister event handler
  off(event, handler) {
    if (this.handlers[event]) {
      this.handlers[event].delete(handler);
      console.log(`[RealtimeManager] Handler removed for ${event}, count: ${this.handlers[event].size}`);
    }
  }
  
  // Notify all handlers for an event
  notifyHandlers(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[RealtimeManager] Handler error for ${event}:`, error);
        }
      });
    }
    
    // Reset idle timeout on activity
    this.resetIdleTimeout();
  }
  
  // Idle timeout management
  resetIdleTimeout() {
    this.clearIdleTimeout();
    this.idleTimeout = setTimeout(() => {
      console.log('[RealtimeManager] Idle timeout - disconnecting');
      this.disconnectUser();
    }, this.idleTimeoutMs);
  }
  
  clearIdleTimeout() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
  }
  
  // Polling fallback for when Realtime is unavailable or quota exceeded
  // UPDATED: Uses direct fetch instead of Supabase client
  enablePollingFallback() {
    if (this.usePollingFallback) return;
    
    console.log('[RealtimeManager] Enabling polling fallback');
    this.usePollingFallback = true;
    
    // Poll for invites every 10 seconds
    this.pollingIntervals.invites = setInterval(async () => {
      if (!this.userId) return;
      
      const { data } = await directFetch('game_invites', {
        select: '*',
        eq: { to_user_id: this.userId, status: 'pending' },
        order: 'created_at.desc',
        limit: 5
      });
      
      if (data?.length > 0) {
        // Check for new invites (created in last 15 seconds)
        const recentInvites = data.filter(inv => {
          const createdAt = new Date(inv.created_at);
          return Date.now() - createdAt.getTime() < 15000;
        });
        recentInvites.forEach(inv => this.notifyHandlers('gameInvite', inv));
      }
    }, 10000);
    
    // Poll for friend requests every 30 seconds
    this.pollingIntervals.friends = setInterval(async () => {
      if (!this.userId) return;
      
      const { data } = await directFetch('friends', {
        select: '*',
        eq: { friend_id: this.userId, status: 'pending' },
        order: 'created_at.desc',
        limit: 5
      });
      
      if (data?.length > 0) {
        const recentRequests = data.filter(req => {
          const createdAt = new Date(req.created_at);
          return Date.now() - createdAt.getTime() < 35000;
        });
        recentRequests.forEach(req => this.notifyHandlers('friendRequest', req));
      }
    }, 30000);
  }
  
  disablePollingFallback() {
    console.log('[RealtimeManager] Disabling polling fallback');
    this.usePollingFallback = false;
    
    Object.values(this.pollingIntervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    this.pollingIntervals = {};
  }
  
  // Game polling when realtime fails
  // UPDATED: Uses direct fetch and only notifies on actual changes
  startGamePolling(gameId) {
    console.log('[RealtimeManager] Starting game polling for:', gameId);
    
    this.pollingIntervals.game = setInterval(async () => {
      if (this.currentGameId !== gameId) {
        this.stopGamePolling();
        return;
      }
      
      const { data } = await directFetch('games', {
        select: '*',
        eq: { id: gameId },
        single: true
      });
      
      if (data) {
        // Only notify if game state actually changed
        const stateKey = `${data.current_player}-${data.status}-${JSON.stringify(data.board)}`;
        if (stateKey !== this.lastGameState) {
          this.lastGameState = stateKey;
          this.notifyHandlers('gameUpdate', data);
        }
      }
    }, 2000); // Poll every 2 seconds for active games
  }
  
  stopGamePolling() {
    if (this.pollingIntervals.game) {
      clearInterval(this.pollingIntervals.game);
      this.pollingIntervals.game = null;
    }
    this.lastGameState = null;
  }
  
  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      userId: this.userId,
      currentGameId: this.currentGameId,
      usePollingFallback: this.usePollingFallback,
      channelCount: (this.userChannel ? 1 : 0) + (this.gameChannel ? 1 : 0),
    };
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager();
export default realtimeManager;
