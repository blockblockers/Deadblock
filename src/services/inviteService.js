// Invite Service - Handle friend search and game invitations
// UPDATED: Uses direct fetch to bypass Supabase client timeout issues
import { isSupabaseConfigured } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';
import { dbSelect, dbInsert, dbUpdate, dbRpc, getAuthHeaders, SUPABASE_URL } from './supabaseDirectFetch';

class InviteService {
  constructor() {
    this.unsubscribeHandler = null;
  }

  async searchUsers(query, currentUserId, limit = 10) {
    if (!isSupabaseConfigured() || !query || query.length < 2) {
      return { data: [], error: null };
    }

    try {
      const headers = getAuthHeaders();
      if (!headers) return { data: [], error: { message: 'Not authenticated' } };

      // Use ilike for partial match
      const url = `${SUPABASE_URL}/rest/v1/profiles?select=id,username,rating,games_played,games_won&username=ilike.*${encodeURIComponent(query)}*&id=neq.${currentUserId}&order=rating.desc&limit=${limit}`;
      
      const response = await fetch(url, { headers });
      if (!response.ok) return { data: [], error: { message: response.statusText } };
      
      const data = await response.json();
      return { data: data || [], error: null };
    } catch (e) {
      console.error('searchUsers exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  async sendInvite(fromUserId, toUserId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      // Check existing
      const { data: existingInvite } = await dbSelect('game_invites', {
        select: 'id,status,from_user_id',
        or: `and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`,
        eq: { status: 'pending' },
        single: true
      });

      if (existingInvite) {
        if (existingInvite.from_user_id === toUserId) {
          return await this.acceptInvite(existingInvite.id, fromUserId);
        }
        return { data: null, error: { message: 'Invite already sent' } };
      }

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

      const senderIds = invites.map(i => i.from_user_id);
      const { data: profiles } = await dbSelect('profiles', {
        select: 'id,username,rating',
        in: { id: senderIds }
      });

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      const invitesWithProfiles = invites.map(invite => ({
        ...invite,
        from_user: profileMap[invite.from_user_id] || null
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

      const recipientIds = invites.map(i => i.to_user_id);
      const { data: profiles } = await dbSelect('profiles', {
        select: 'id,username,rating',
        in: { id: recipientIds }
      });

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      const invitesWithProfiles = invites.map(invite => ({
        ...invite,
        to_user: profileMap[invite.to_user_id] || null
      }));

      return { data: invitesWithProfiles, error: null };
    } catch (e) {
      console.error('getSentInvites exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  async acceptInvite(inviteId, acceptingUserId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      console.log('acceptInvite: Starting', { inviteId, acceptingUserId });

      const { data: invite, error: fetchError } = await dbSelect('game_invites', {
        select: '*',
        eq: { id: inviteId, status: 'pending' },
        single: true
      });

      console.log('acceptInvite: Fetched invite', { invite, fetchError });

      if (fetchError || !invite) {
        return { data: null, error: { message: 'Invite not found or already processed' } };
      }

      if (invite.to_user_id !== acceptingUserId) {
        return { data: null, error: { message: 'Not authorized to accept this invite' } };
      }

      const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));

      console.log('acceptInvite: Creating game...');

      const { data: game, error: gameError } = await dbInsert('games', {
        player1_id: invite.from_user_id,
        player2_id: invite.to_user_id,
        board: emptyBoard,
        board_pieces: {},
        used_pieces: [],
        current_player: 1,
        status: 'active'
      }, { returning: true, single: true });

      console.log('acceptInvite: Game created', { game, gameError });

      if (gameError) {
        console.error('Error creating game from invite:', gameError);
        return { data: null, error: gameError };
      }

      await dbUpdate('game_invites',
        { status: 'accepted', game_id: game.id },
        { eq: { id: inviteId } }
      );

      // Fetch profiles
      const { data: profiles } = await dbSelect('profiles', {
        select: 'id,username,display_name,rating',
        in: { id: [invite.from_user_id, invite.to_user_id] }
      });

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      const fullGame = {
        ...game,
        player1: profileMap[invite.from_user_id],
        player2: profileMap[invite.to_user_id]
      };

      console.log('acceptInvite: Final game', { fullGame });

      return { data: { invite, game: fullGame }, error: null };
    } catch (e) {
      console.error('acceptInvite exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  async declineInvite(inviteId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    try {
      return await dbUpdate('game_invites',
        { status: 'declined' },
        { eq: { id: inviteId, to_user_id: userId, status: 'pending' } }
      );
    } catch (e) {
      console.error('declineInvite exception:', e);
      return { error: { message: e.message } };
    }
  }

  async cancelInvite(inviteId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    try {
      return await dbUpdate('game_invites',
        { status: 'cancelled' },
        { eq: { id: inviteId, from_user_id: userId, status: 'pending' } }
      );
    } catch (e) {
      console.error('cancelInvite exception:', e);
      return { error: { message: e.message } };
    }
  }

  subscribeToInvites(userId, onInviteReceived, onInviteUpdated) {
    if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

    console.log('[InviteService] Subscribing to invites via RealtimeManager');

    this.unsubscribeHandler = realtimeManager.on('gameInvite', (invite) => {
      console.log('[InviteService] New invite received via RealtimeManager:', invite?.id);
      onInviteReceived?.(invite);
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
        { eq: { id: inviteId, from_user_id: userId, status: 'pending' } }
      );
    } catch (e) {
      console.error('markInviteLinkShared exception:', e);
      return { error: { message: e.message } };
    }
  }

  async getInviteByCode(code) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    try {
      const { data, error } = await dbRpc('get_email_invite_by_code', { code });

      if (error || !data || data.length === 0) {
        return { data: null, error: error || { message: 'Invite not found' } };
      }

      return { data: data[0], error: null };
    } catch (e) {
      console.error('getInviteByCode exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }
}

export const inviteService = new InviteService();
export default inviteService;
