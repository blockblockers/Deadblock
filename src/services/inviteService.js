// Invite Service - Handle friend search and game invitations
// FIXES:
// 1. Enhanced search to include username AND display_name
// 2. First move selection option when accepting invite
// 3. Uses direct fetch to bypass Supabase client timeout issues
import { isSupabaseConfigured } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';

// Supabase direct fetch config
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper to get auth headers
const getAuthHeaders = () => {
  try {
    const authData = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (!authData?.access_token || !ANON_KEY) return null;
    return {
      'Authorization': `Bearer ${authData.access_token}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    };
  } catch (e) {
    return null;
  }
};

// Direct fetch helpers
const dbSelect = async (table, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: 'Not authenticated' };
  
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  if (options.select) url += `select=${encodeURIComponent(options.select)}&`;
  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      url += `${key}=eq.${value}&`;
    });
  }
  if (options.or) url += `or=(${encodeURIComponent(options.or)})&`;
  if (options.neq) {
    Object.entries(options.neq).forEach(([key, value]) => {
      url += `${key}=neq.${value}&`;
    });
  }
  if (options.order) url += `order=${options.order}&`;
  if (options.limit) url += `limit=${options.limit}&`;
  
  try {
    const response = await fetch(url, { 
      headers: options.single 
        ? { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
        : headers 
    });
    if (!response.ok) return { data: null, error: 'Fetch failed' };
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};

const dbInsert = async (table, data, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: 'Not authenticated' };
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: options.returning 
        ? { ...headers, 'Prefer': 'return=representation' }
        : headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) return { data: null, error: 'Insert failed' };
    if (options.returning) {
      const result = await response.json();
      return { data: options.single ? result[0] : result, error: null };
    }
    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};

const dbUpdate = async (table, data, where = {}, options = {}) => {
  const headers = getAuthHeaders();
  if (!headers) return { data: null, error: 'Not authenticated' };
  
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  if (where.eq) {
    Object.entries(where.eq).forEach(([key, value]) => {
      url += `${key}=eq.${value}&`;
    });
  }
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: options.returning 
        ? { ...headers, 'Prefer': 'return=representation' }
        : headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) return { data: null, error: 'Update failed' };
    if (options.returning) {
      const result = await response.json();
      return { data: options.single ? result[0] : result, error: null };
    }
    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};

class InviteService {
  constructor() {
    this.unsubscribeHandler = null;
  }

  // =====================================================
  // ENHANCED: Search users by username OR display_name
  // =====================================================
  async searchUsers(query, currentUserId, limit = 10) {
    if (!isSupabaseConfigured() || !query || query.length < 2) {
      return { data: [], error: null };
    }

    try {
      const headers = getAuthHeaders();
      if (!headers) return { data: [], error: { message: 'Not authenticated' } };

      // Clean up the search query
      const searchQuery = query.trim().toLowerCase();
      
      // Search by username OR display_name (partial match, case insensitive)
      const orFilter = `username.ilike.*${searchQuery}*,display_name.ilike.*${searchQuery}*`;
      
      const url = `${SUPABASE_URL}/rest/v1/profiles?select=id,username,display_name,rating,games_played,games_won&or=(${encodeURIComponent(orFilter)})&id=neq.${currentUserId}&order=rating.desc&limit=${limit}`;
      
      console.log('[InviteService] Searching users with query:', searchQuery);
      
      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.error('[InviteService] Search failed:', response.statusText);
        return { data: [], error: { message: response.statusText } };
      }
      
      const data = await response.json();
      console.log('[InviteService] Search results:', data?.length || 0, 'users found');
      
      return { data: data || [], error: null };
    } catch (e) {
      console.error('searchUsers exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  async sendInvite(fromUserId, toUserId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      // Check existing invites between these users
      const headers = getAuthHeaders();
      if (!headers) return { data: null, error: { message: 'Not authenticated' } };
      
      const existingUrl = `${SUPABASE_URL}/rest/v1/game_invites?select=id,status,from_user_id&or=(and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId}))&status=eq.pending&limit=1`;
      
      const existingResponse = await fetch(existingUrl, { headers });
      if (existingResponse.ok) {
        const existing = await existingResponse.json();
        if (existing?.length > 0) {
          const existingInvite = existing[0];
          // If the other user already invited us, accept their invite
          if (existingInvite.from_user_id === toUserId) {
            return await this.acceptInvite(existingInvite.id, fromUserId);
          }
          return { data: null, error: { message: 'Invite already sent' } };
        }
      }

      // Create new invite
      return await dbInsert('game_invites', {
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, { returning: true, single: true });
    } catch (e) {
      console.error('sendInvite exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  async getReceivedInvites(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { data: [], error: null };

      const url = `${SUPABASE_URL}/rest/v1/game_invites?select=*&to_user_id=eq.${userId}&status=eq.pending&expires_at=gt.${new Date().toISOString()}&order=created_at.desc`;

      const response = await fetch(url, { headers });
      if (!response.ok) return { data: [], error: null };

      const invites = await response.json();
      if (!invites?.length) return { data: [], error: null };

      // Get sender profiles
      const senderIds = invites.map(i => i.from_user_id);
      const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?id=in.(${senderIds.join(',')})&select=id,username,display_name,rating`;

      const profilesResponse = await fetch(profilesUrl, { headers });
      const profiles = profilesResponse.ok ? await profilesResponse.json() : [];

      const profileMap = {};
      profiles.forEach(p => { profileMap[p.id] = p; });

      const invitesWithProfiles = invites.map(invite => ({
        ...invite,
        from_user: profileMap[invite.from_user_id]
      }));

      return { data: invitesWithProfiles, error: null };
    } catch (e) {
      console.error('getReceivedInvites exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  async getSentInvites(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { data: [], error: null };

      const url = `${SUPABASE_URL}/rest/v1/game_invites?select=*&from_user_id=eq.${userId}&status=eq.pending&expires_at=gt.${new Date().toISOString()}&order=created_at.desc`;

      const response = await fetch(url, { headers });
      if (!response.ok) return { data: [], error: null };

      const invites = await response.json();
      if (!invites?.length) return { data: [], error: null };

      // Get recipient profiles
      const recipientIds = invites.map(i => i.to_user_id);
      const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?id=in.(${recipientIds.join(',')})&select=id,username,display_name,rating`;

      const profilesResponse = await fetch(profilesUrl, { headers });
      const profiles = profilesResponse.ok ? await profilesResponse.json() : [];

      const profileMap = {};
      profiles.forEach(p => { profileMap[p.id] = p; });

      const invitesWithProfiles = invites.map(invite => ({
        ...invite,
        to_user: profileMap[invite.to_user_id]
      }));

      return { data: invitesWithProfiles, error: null };
    } catch (e) {
      console.error('getSentInvites exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  // =====================================================
  // ENHANCED: Accept invite with first move selection
  // firstMoveOption: 'random' | 'inviter' | 'invitee'
  // =====================================================
  async acceptInvite(inviteId, userId, firstMoveOption = 'random') {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { data: null, error: { message: 'Not authenticated' } };

      // Get the invite
      const inviteUrl = `${SUPABASE_URL}/rest/v1/game_invites?id=eq.${inviteId}&select=*`;
      const inviteResponse = await fetch(inviteUrl, { 
        headers: { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
      });
      
      if (!inviteResponse.ok) return { data: null, error: { message: 'Invite not found' } };
      
      const invite = await inviteResponse.json();

      if (!invite) return { data: null, error: { message: 'Invite not found' } };
      if (invite.status !== 'pending') return { data: null, error: { message: 'Invite already processed' } };
      if (invite.to_user_id !== userId && invite.from_user_id !== userId) {
        return { data: null, error: { message: 'Not authorized' } };
      }

      // Create empty board
      const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(0));
      
      // Determine first player based on option
      // player1 = inviter (from_user), player2 = invitee (to_user)
      let firstPlayer;
      if (firstMoveOption === 'inviter') {
        firstPlayer = 1;
      } else if (firstMoveOption === 'invitee') {
        firstPlayer = 2;
      } else {
        // Random
        firstPlayer = Math.random() < 0.5 ? 1 : 2;
      }
      
      console.log('[InviteService] Creating game with firstPlayer:', firstPlayer, 'option:', firstMoveOption);

      // Create the game
      const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/games`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          player1_id: invite.from_user_id,
          player2_id: invite.to_user_id,
          board: emptyBoard,
          board_pieces: {},
          used_pieces: [],
          current_player: firstPlayer,
          status: 'active'
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Failed to create game:', errorText);
        return { data: null, error: { message: 'Failed to create game' } };
      }

      const games = await createResponse.json();
      const game = games[0];

      // Update invite with game_id
      await dbUpdate('game_invites', 
        { status: 'accepted', game_id: game.id },
        { eq: { id: inviteId } }
      );

      // Fetch full game with profiles
      const gameUrl = `${SUPABASE_URL}/rest/v1/games?id=eq.${game.id}&select=*,player1:profiles!games_player1_id_fkey(*),player2:profiles!games_player2_id_fkey(*)`;
      const gameResponse = await fetch(gameUrl, { 
        headers: { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
      });
      
      const fullGame = gameResponse.ok ? await gameResponse.json() : game;

      return { data: { invite: { ...invite, status: 'accepted', game_id: game.id }, game: fullGame }, error: null };
    } catch (e) {
      console.error('acceptInvite exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  async declineInvite(inviteId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { error: { message: 'Not authenticated' } };
      
      // Verify the invite belongs to this user
      const inviteUrl = `${SUPABASE_URL}/rest/v1/game_invites?id=eq.${inviteId}&select=to_user_id`;
      const inviteResponse = await fetch(inviteUrl, { 
        headers: { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
      });
      
      if (inviteResponse.ok) {
        const invite = await inviteResponse.json();
        if (invite?.to_user_id !== userId) {
          return { error: { message: 'Not authorized' } };
        }
      }

      return await dbUpdate('game_invites',
        { status: 'declined' },
        { eq: { id: inviteId } }
      );
    } catch (e) {
      console.error('declineInvite exception:', e);
      return { error: { message: e.message } };
    }
  }

  async cancelInvite(inviteId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { error: { message: 'Not authenticated' } };
      
      // Verify the invite was sent by this user
      const inviteUrl = `${SUPABASE_URL}/rest/v1/game_invites?id=eq.${inviteId}&select=from_user_id`;
      const inviteResponse = await fetch(inviteUrl, { 
        headers: { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
      });
      
      if (inviteResponse.ok) {
        const invite = await inviteResponse.json();
        if (invite?.from_user_id !== userId) {
          return { error: { message: 'Not authorized' } };
        }
      }

      return await dbUpdate('game_invites',
        { status: 'cancelled' },
        { eq: { id: inviteId } }
      );
    } catch (e) {
      console.error('cancelInvite exception:', e);
      return { error: { message: e.message } };
    }
  }

  subscribeToInvites(userId, onNewInvite, onInviteUpdated) {
    // Use realtime manager for invite updates
    this.unsubscribeHandler = realtimeManager.subscribeToTable(
      'game_invites',
      (payload) => {
        const invite = payload.new || payload.old;
        if (!invite) return;

        // Check if this invite is relevant to us
        const isRecipient = invite.to_user_id === userId;
        const isSender = invite.from_user_id === userId;

        if (!isRecipient && !isSender) return;

        if (payload.eventType === 'INSERT' && isRecipient) {
          onNewInvite?.(invite);
        } else if (payload.eventType === 'UPDATE') {
          onInviteUpdated?.(invite);
        }
      },
      (error) => {
        console.error('Invite subscription error:', error);
      }
    );

    return {
      unsubscribe: () => {
        if (this.unsubscribeHandler) {
          this.unsubscribeHandler();
          this.unsubscribeHandler = null;
        }
      }
    };
  }

  unsubscribeFromInvites(subscription) {
    if (subscription?.unsubscribe) subscription.unsubscribe();
  }

  async createInviteLink(fromUserId, recipientName = '') {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      const { data: invite, error: createError } = await dbInsert('email_invites', {
        from_user_id: fromUserId,
        to_email: recipientName.trim() || `friend_${Date.now()}`,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }, { returning: true, single: true });

      if (createError) {
        console.error('Error creating invite link:', createError);
        return { data: null, error: createError };
      }

      const appUrl = window.location.origin;
      const inviteLink = `${appUrl}/?invite=${invite.invite_code}`;

      return {
        data: { ...invite, inviteLink, recipientName: recipientName.trim() || 'Friend' },
        error: null
      };
    } catch (e) {
      console.error('createInviteLink exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  async getInviteLinks(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { data: [], error: null };

      const url = `${SUPABASE_URL}/rest/v1/email_invites?select=*&from_user_id=eq.${userId}&status=in.(pending,sent)&expires_at=gt.${new Date().toISOString()}&order=created_at.desc`;

      const response = await fetch(url, { headers });
      if (!response.ok) return { data: [], error: null };

      const data = await response.json();
      const appUrl = window.location.origin;
      
      const invitesWithLinks = (data || []).map(invite => ({
        ...invite,
        inviteLink: `${appUrl}/?invite=${invite.invite_code}`,
        recipientName: invite.to_email?.startsWith('friend_') ? 'Friend' : invite.to_email
      }));

      return { data: invitesWithLinks, error: null };
    } catch (e) {
      console.error('getInviteLinks exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  async cancelInviteLink(inviteId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { error: { message: 'Not authenticated' } };

      const url = `${SUPABASE_URL}/rest/v1/email_invites?id=eq.${inviteId}&from_user_id=eq.${userId}&status=in.(pending,sent)`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'expired' })
      });

      if (!response.ok) return { error: { message: response.statusText } };
      return { error: null };
    } catch (e) {
      console.error('cancelInviteLink exception:', e);
      return { error: { message: e.message } };
    }
  }

  async markInviteLinkShared(inviteId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    try {
      return await dbUpdate('email_invites',
        { status: 'sent', sent_at: new Date().toISOString() },
        { eq: { id: inviteId } }
      );
    } catch (e) {
      console.error('markInviteLinkShared exception:', e);
      return { error: { message: e.message } };
    }
  }

  async getInviteByCode(code) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      const headers = getAuthHeaders();
      const fetchHeaders = headers || {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
      };
      
      const url = `${SUPABASE_URL}/rest/v1/rpc/get_email_invite_by_code`;
      const response = await fetch(url, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({ code })
      });

      if (!response.ok) return { data: null, error: { message: 'Invite not found' } };
      const data = await response.json();
      return { data: data?.[0] || null, error: null };
    } catch (e) {
      console.error('getInviteByCode exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }
}

export const inviteService = new InviteService();
export default inviteService;
