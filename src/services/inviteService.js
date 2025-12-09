// Invite Service - Handle friend search and game invitations
import { supabase, isSupabaseConfigured } from '../utils/supabase';

class InviteService {
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
      // Get the invite
      const { data: invite, error: fetchError } = await supabase
        .from('game_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !invite) {
        return { data: null, error: { message: 'Invite not found or already processed' } };
      }

      // Verify the accepting user is the recipient
      if (invite.to_user_id !== acceptingUserId) {
        return { data: null, error: { message: 'Not authorized to accept this invite' } };
      }

      // Create the game - inviter (from_user) goes first as player 1
      const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));
      
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

      if (gameError) {
        console.error('Error creating game from invite:', gameError);
        return { data: null, error: gameError };
      }

      // Update invite status
      await supabase
        .from('game_invites')
        .update({ 
          status: 'accepted',
          game_id: game.id 
        })
        .eq('id', inviteId);

      return { data: { invite, game }, error: null };
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

  // Subscribe to invite updates for a user
  subscribeToInvites(userId, onInviteReceived, onInviteUpdated) {
    if (!supabase) return null;

    const subscription = supabase
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
          console.log('New invite received:', payload);
          onInviteReceived?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_invites',
          filter: `or(from_user_id.eq.${userId},to_user_id.eq.${userId})`
        },
        (payload) => {
          console.log('Invite updated:', payload);
          onInviteUpdated?.(payload.new);
        }
      )
      .subscribe();

    return subscription;
  }

  // Unsubscribe from invite updates
  unsubscribeFromInvites(subscription) {
    if (subscription) {
      supabase?.removeChannel(subscription);
    }
  }
}

export const inviteService = new InviteService();
export default inviteService;
