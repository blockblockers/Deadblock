// Invite Service - Handle friend search and game invitations
// OPTIMIZED: Uses centralized RealtimeManager for invite notifications
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';

class InviteService {
  constructor() {
    this.unsubscribeHandler = null;
  }

  // Search for users by username (partial match)
  async searchUsers(query, currentUserId, limit = 10) {
    if (!supabase || !query || query.length < 2) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, rating, games_played, games_won')
        .ilike('username', `%${query}%`)
        .neq('id', currentUserId) // Exclude current user
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('searchUsers error:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (e) {
      console.error('searchUsers exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  // Send a game invite to another user
  async sendInvite(fromUserId, toUserId) {
    if (!supabase) {
      return { data: null, error: { message: 'Not configured' } };
    }

    try {
      // Check if there's already a pending invite between these users
      const { data: existingInvite } = await supabase
        .from('game_invites')
        .select('id, status, from_user_id')
        .or(`and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        // If the other user already invited us, auto-accept and create game
        if (existingInvite.from_user_id === toUserId) {
          return await this.acceptInvite(existingInvite.id, fromUserId);
        }
        return { data: null, error: { message: 'Invite already sent' } };
      }

      // Create new invite
      const { data, error } = await supabase
        .from('game_invites')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
        .select()
        .single();

      if (error) {
        console.error('sendInvite error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (e) {
      console.error('sendInvite exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  // Get pending invites received by user
  async getReceivedInvites(userId) {
    if (!supabase) {
      return { data: [], error: null };
    }

    try {
      // First get the invites
      const { data: invites, error } = await supabase
        .from('game_invites')
        .select('*')
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error || !invites || invites.length === 0) {
        return { data: [], error };
      }

      // Get the sender profiles
      const senderIds = invites.map(i => i.from_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, rating')
        .in('id', senderIds);

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Attach profiles to invites
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

  // Get pending invites sent by user
  async getSentInvites(userId) {
    if (!supabase) {
      return { data: [], error: null };
    }

    try {
      const { data: invites, error } = await supabase
        .from('game_invites')
        .select('*')
        .eq('from_user_id', userId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error || !invites || invites.length === 0) {
        return { data: [], error };
      }

      // Get the recipient profiles
      const recipientIds = invites.map(i => i.to_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, rating')
        .in('id', recipientIds);

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Attach profiles to invites
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

  // Accept an invite and create a game
  async acceptInvite(inviteId, acceptingUserId) {
    if (!supabase) {
      return { data: null, error: { message: 'Not configured' } };
    }

    try {
      console.log('acceptInvite: Starting', { inviteId, acceptingUserId });
      
      // Get the invite
      const { data: invite, error: fetchError } = await supabase
        .from('game_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('status', 'pending')
        .single();

      console.log('acceptInvite: Fetched invite', { invite, fetchError });

      if (fetchError || !invite) {
        return { data: null, error: { message: 'Invite not found or already processed' } };
      }

      // Verify the accepting user is the recipient
      if (invite.to_user_id !== acceptingUserId) {
        return { data: null, error: { message: 'Not authorized to accept this invite' } };
      }

      // Create the game - inviter (from_user) goes first as player 1
      const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));
      
      console.log('acceptInvite: Creating game...');
      
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          player1_id: invite.from_user_id,
          player2_id: invite.to_user_id,
          board: emptyBoard,
          board_pieces: {},
          used_pieces: [],
          current_player: 1,
          status: 'active'
        })
        .select()
        .single();

      console.log('acceptInvite: Game created', { game, gameError });

      if (gameError) {
        console.error('Error creating game from invite:', gameError);
        return { data: null, error: gameError };
      }

      // Update invite status
      const { error: updateError } = await supabase
        .from('game_invites')
        .update({ 
          status: 'accepted',
          game_id: game.id 
        })
        .eq('id', inviteId);

      console.log('acceptInvite: Invite updated', { updateError });

      // Fetch the full game with player profiles
      let fullGame = null;
      try {
        const { data: gameWithProfiles } = await supabase
          .from('games')
          .select(`
            *,
            player1:profiles!games_player1_id_fkey(id, username, display_name, rating),
            player2:profiles!games_player2_id_fkey(id, username, display_name, rating)
          `)
          .eq('id', game.id)
          .single();
        
        fullGame = gameWithProfiles;
      } catch (joinError) {
        console.log('acceptInvite: Join failed, fetching profiles separately', joinError);
      }

      // Fallback: fetch profiles separately if join didn't work
      if (!fullGame || !fullGame.player1 || !fullGame.player2) {
        console.log('acceptInvite: Fetching profiles separately');
        const [{ data: p1 }, { data: p2 }] = await Promise.all([
          supabase.from('profiles').select('id, username, display_name, rating').eq('id', invite.from_user_id).single(),
          supabase.from('profiles').select('id, username, display_name, rating').eq('id', invite.to_user_id).single()
        ]);
        
        fullGame = {
          ...game,
          player1: p1,
          player2: p2
        };
      }

      console.log('acceptInvite: Final game', { fullGame });

      return { data: { invite, game: fullGame }, error: null };
    } catch (e) {
      console.error('acceptInvite exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  // Decline an invite
  async declineInvite(inviteId, userId) {
    if (!supabase) {
      return { error: { message: 'Not configured' } };
    }

    try {
      const { error } = await supabase
        .from('game_invites')
        .update({ status: 'declined' })
        .eq('id', inviteId)
        .eq('to_user_id', userId)
        .eq('status', 'pending');

      return { error };
    } catch (e) {
      console.error('declineInvite exception:', e);
      return { error: { message: e.message } };
    }
  }

  // Cancel a sent invite
  async cancelInvite(inviteId, userId) {
    if (!supabase) {
      return { error: { message: 'Not configured' } };
    }

    try {
      const { error } = await supabase
        .from('game_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId)
        .eq('from_user_id', userId)
        .eq('status', 'pending');

      return { error };
    } catch (e) {
      console.error('cancelInvite exception:', e);
      return { error: { message: e.message } };
    }
  }

  // Subscribe to invite updates - uses RealtimeManager (no new channel!)
  subscribeToInvites(userId, onInviteReceived, onInviteUpdated) {
    if (!supabase) return { unsubscribe: () => {} };

    console.log('[InviteService] Subscribing to invites via RealtimeManager');

    // Register handler with RealtimeManager
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

  // Unsubscribe from invite updates
  unsubscribeFromInvites(subscription) {
    if (subscription?.unsubscribe) {
      subscription.unsubscribe();
    }
  }

  // ============ SHAREABLE INVITE LINKS ============
  // No email service needed - users share links via text, WhatsApp, email, etc.

  // Create a shareable invite link
  async createInviteLink(fromUserId, recipientName = '') {
    if (!supabase) {
      return { data: null, error: { message: 'Not configured' } };
    }

    try {
      // Create invite record
      const { data: invite, error: createError } = await supabase
        .from('email_invites')
        .insert({
          from_user_id: fromUserId,
          to_email: recipientName.trim() || `friend_${Date.now()}`,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating invite link:', createError);
        return { data: null, error: createError };
      }

      // Generate the shareable link
      const appUrl = window.location.origin;
      const inviteLink = `${appUrl}/?invite=${invite.invite_code}`;

      return { 
        data: { 
          ...invite, 
          inviteLink,
          recipientName: recipientName.trim() || 'Friend'
        }, 
        error: null 
      };
    } catch (e) {
      console.error('createInviteLink exception:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  // Get pending invite links created by user
  async getInviteLinks(userId) {
    if (!supabase) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('email_invites')
        .select('*')
        .eq('from_user_id', userId)
        .in('status', ['pending', 'sent'])
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error };
      }

      // Add invite links to each record
      const appUrl = window.location.origin;
      const invitesWithLinks = (data || []).map(invite => ({
        ...invite,
        inviteLink: `${appUrl}/?invite=${invite.invite_code}`,
        recipientName: invite.to_email?.startsWith('friend_') 
          ? 'Friend' 
          : invite.to_email
      }));

      return { data: invitesWithLinks, error: null };
    } catch (e) {
      console.error('getInviteLinks exception:', e);
      return { data: [], error: { message: e.message } };
    }
  }

  // Cancel/delete an invite link
  async cancelInviteLink(inviteId, userId) {
    if (!supabase) {
      return { error: { message: 'Not configured' } };
    }

    try {
      const { error } = await supabase
        .from('email_invites')
        .update({ status: 'expired' })
        .eq('id', inviteId)
        .eq('from_user_id', userId)
        .in('status', ['pending', 'sent']);

      return { error };
    } catch (e) {
      console.error('cancelInviteLink exception:', e);
      return { error: { message: e.message } };
    }
  }

  // Mark invite as "sent" (user copied/shared the link)
  async markInviteLinkShared(inviteId, userId) {
    if (!supabase) {
      return { error: { message: 'Not configured' } };
    }

    try {
      const { error } = await supabase
        .from('email_invites')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', inviteId)
        .eq('from_user_id', userId)
        .eq('status', 'pending');

      return { error };
    } catch (e) {
      console.error('markInviteLinkShared exception:', e);
      return { error: { message: e.message } };
    }
  }

  // Get invite details by code (for the invite landing page)
  async getInviteByCode(code) {
    if (!supabase) {
      return { data: null, error: { message: 'Not configured' } };
    }

    try {
      const { data, error } = await supabase
        .rpc('get_email_invite_by_code', { code });

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
