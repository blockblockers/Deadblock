// =====================================================
// Invite Service - Handles game invites and invite links
// =====================================================

import { isSupabaseConfigured, supabase } from '../utils/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper to get auth headers
const getAuthHeaders = () => {
  if (!supabase) return null;
  
  const token = supabase.auth.session?.()?.access_token 
    || JSON.parse(localStorage.getItem(`sb-${SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`) || '{}')?.access_token;
  
  if (!token) return null;
  
  return {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Helper for database inserts
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

// Helper for database updates
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
  // Get invite by code (for invite links)
  // This can be called without authentication
  // =====================================================
  async getInviteByCode(code) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      // Try to get auth headers, but fall back to anon key for public access
      const headers = getAuthHeaders() || {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
      };
      
      // Call the RPC function to get invite details
      const url = `${SUPABASE_URL}/rest/v1/rpc/get_email_invite_by_code`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code })
      });

      if (!response.ok) return { data: null, error: { message: 'Invite not found' } };
      const data = await response.json();
      return { data: data?.[0] || data || null, error: null };
    } catch (e) {
      console.error('getInviteByCode exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  // =====================================================
  // Search users by username OR display_name
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

  // =====================================================
  // Send game invite to another user
  // =====================================================
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

  // =====================================================
  // Get received invites
  // =====================================================
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

  // =====================================================
  // Get sent invites
  // =====================================================
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
  // Accept an invite and create a game
  // =====================================================
  async acceptInvite(inviteId, userId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { data: null, error: { message: 'Not authenticated' } };

      // Get the invite
      const inviteUrl = `${SUPABASE_URL}/rest/v1/game_invites?id=eq.${inviteId}&status=eq.pending&select=*`;
      const inviteResponse = await fetch(inviteUrl, { headers });
      
      if (!inviteResponse.ok) {
        return { data: null, error: { message: 'Invite not found' } };
      }
      
      const invites = await inviteResponse.json();
      const invite = invites?.[0];
      
      if (!invite) {
        return { data: null, error: { message: 'Invite not found or expired' } };
      }

      // Verify the user is the recipient
      if (invite.to_user_id !== userId) {
        return { data: null, error: { message: 'Not authorized to accept this invite' } };
      }

      // Create empty board
      const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));
      
      // Randomly select who goes first (based on invite first_move_option if set)
      let firstPlayer = 1;
      const firstMoveOption = invite.first_move_option || 'random';
      if (firstMoveOption === 'random') {
        firstPlayer = Math.random() < 0.5 ? 1 : 2;
      } else if (firstMoveOption === 'inviter') {
        firstPlayer = 1;
      } else if (firstMoveOption === 'invitee') {
        firstPlayer = 2;
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

      return { data: { game: fullGame }, error: null };
    } catch (e) {
      console.error('acceptInvite exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  // =====================================================
  // Decline an invite
  // =====================================================
  async declineInvite(inviteId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { error: { message: 'Not authenticated' } };

      const url = `${SUPABASE_URL}/rest/v1/game_invites?id=eq.${inviteId}&to_user_id=eq.${userId}&status=eq.pending`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'declined' })
      });

      if (!response.ok) return { error: { message: response.statusText } };
      return { error: null };
    } catch (e) {
      console.error('declineInvite exception:', e);
      return { error: { message: e.message } };
    }
  }

  // =====================================================
  // Cancel a sent invite
  // =====================================================
  async cancelInvite(inviteId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { error: { message: 'Not authenticated' } };

      const url = `${SUPABASE_URL}/rest/v1/game_invites?id=eq.${inviteId}&from_user_id=eq.${userId}&status=eq.pending`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) return { error: { message: response.statusText } };
      return { error: null };
    } catch (e) {
      console.error('cancelInvite exception:', e);
      return { error: { message: e.message } };
    }
  }

  // =====================================================
  // Subscribe to invite updates (realtime)
  // =====================================================
  subscribeToInvites(userId, onNewInvite, onInviteUpdate) {
    if (!isSupabaseConfigured()) return () => {};

    if (!supabase) return () => {};

    const channel = supabase
      .channel(`invites:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_invites',
          filter: `to_user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[InviteService] New invite received:', payload.new);
          onNewInvite?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_invites',
          filter: `from_user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[InviteService] Sent invite updated:', payload.new);
          onInviteUpdate?.(payload.new);
        }
      )
      .subscribe();

    // Store the unsubscribe handler
    this.unsubscribeHandler = () => {
      supabase.removeChannel(channel);
    };

    return this.unsubscribeHandler;
  }

  // =====================================================
  // Unsubscribe from invite updates
  // =====================================================
  unsubscribeFromInvites() {
    if (this.unsubscribeHandler) {
      this.unsubscribeHandler();
      this.unsubscribeHandler = null;
    }
  }

  // =====================================================
  // INVITE LINK FUNCTIONS (for sharing via URL)
  // =====================================================

  // Create an invite link
  async createInviteLink(fromUserId, toEmail = null) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { data: null, error: { message: 'Not authenticated' } };

      // Generate a unique code
      const code = this.generateInviteCode();
      
      // Create the invite in email_invites table
      const response = await fetch(`${SUPABASE_URL}/rest/v1/email_invites`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          from_user_id: fromUserId,
          to_email: toEmail,
          code: code,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create invite link:', errorText);
        return { data: null, error: { message: 'Failed to create invite link' } };
      }

      const invites = await response.json();
      const invite = invites[0];
      
      // Generate the full invite URL
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/?invite=${code}`;

      return { 
        data: { 
          ...invite, 
          invite_url: inviteUrl 
        }, 
        error: null 
      };
    } catch (e) {
      console.error('createInviteLink exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  // Generate a random invite code
  generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Get invite links created by user
  async getInviteLinks(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const headers = getAuthHeaders();
      if (!headers) return { data: [], error: null };

      const url = `${SUPABASE_URL}/rest/v1/email_invites?from_user_id=eq.${userId}&order=created_at.desc&limit=20`;

      const response = await fetch(url, { headers });
      if (!response.ok) return { data: [], error: null };

      const invites = await response.json();
      
      // Add invite URLs
      const baseUrl = window.location.origin;
      const invitesWithLinks = invites.map(invite => ({
        ...invite,
        invite_url: `${baseUrl}/?invite=${invite.code}`,
        recipient_name: invite.to_email || (invite.accepted_by ? 'Friend' : 'Anyone')
      }));

      return { data: invitesWithLinks, error: null };
    } catch (e) {
      console.error('getInviteLinks exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  // Cancel an invite link
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

  // Mark invite link as shared
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
}

export const inviteService = new InviteService();
export default inviteService;
