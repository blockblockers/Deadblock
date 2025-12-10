// Friends Service - Manage friend relationships
import { supabase, isSupabaseConfigured } from '../utils/supabase';

export const friendsService = {
  // Get all friends for a user
  async getFriends(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        status,
        created_at,
        user_id,
        friend_id,
        user:profiles!friends_user_id_fkey(id, username, avatar_url, elo_rating, is_online, last_seen),
        friend:profiles!friends_friend_id_fkey(id, username, avatar_url, elo_rating, is_online, last_seen)
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) return { data: null, error };

    // Normalize the data - get the "other" person in each friendship
    const friends = data.map(f => {
      const isUser = f.user_id === userId;
      const friendData = isUser ? f.friend : f.user;
      return {
        friendshipId: f.id,
        ...friendData,
        friendSince: f.created_at
      };
    });

    return { data: friends, error: null };
  },

  // Get pending friend requests (received)
  async getPendingRequests(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        created_at,
        user:profiles!friends_user_id_fkey(id, username, avatar_url, elo_rating)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (error) return { data: null, error };

    return { 
      data: data.map(r => ({
        requestId: r.id,
        from: r.user,
        requestedAt: r.created_at
      })), 
      error: null 
    };
  },

  // Get sent friend requests
  async getSentRequests(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        created_at,
        friend:profiles!friends_friend_id_fkey(id, username, avatar_url, elo_rating)
      `)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) return { data: null, error };

    return { 
      data: data.map(r => ({
        requestId: r.id,
        to: r.friend,
        requestedAt: r.created_at
      })), 
      error: null 
    };
  },

  // Send friend request
  async sendFriendRequest(userId, friendId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    // Check if already friends or request exists
    const { data: existing } = await supabase
      .from('friends')
      .select('id, status')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return { data: null, error: { message: 'Already friends' } };
      }
      if (existing.status === 'pending') {
        return { data: null, error: { message: 'Friend request already pending' } };
      }
    }

    const { data, error } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending'
      })
      .select()
      .single();

    return { data, error };
  },

  // Accept friend request
  async acceptFriendRequest(requestId, userId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    const { data, error } = await supabase
      .from('friends')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('friend_id', userId) // Only the recipient can accept
      .select()
      .single();

    return { data, error };
  },

  // Decline/cancel friend request
  async declineFriendRequest(requestId, userId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    return { error };
  },

  // Remove friend
  async removeFriend(friendshipId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    return { error };
  },

  // Check if two users are friends
  async areFriends(userId1, userId2) {
    if (!isSupabaseConfigured()) return false;

    const { data } = await supabase
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${userId1},friend_id.eq.${userId2}),and(user_id.eq.${userId2},friend_id.eq.${userId1})`)
      .eq('status', 'accepted')
      .single();

    return !!data;
  },

  // Block a user
  async blockUser(userId, blockedUserId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    // First check if there's an existing relationship
    const { data: existing } = await supabase
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${userId},friend_id.eq.${blockedUserId}),and(user_id.eq.${blockedUserId},friend_id.eq.${userId})`)
      .single();

    if (existing) {
      // Update existing to blocked
      const { error } = await supabase
        .from('friends')
        .update({ status: 'blocked', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return { error };
    } else {
      // Create new blocked relationship
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: userId,
          friend_id: blockedUserId,
          status: 'blocked'
        });
      return { error };
    }
  },

  // Update online status
  async updateOnlineStatus(userId, isOnline) {
    if (!isSupabaseConfigured()) return;

    await supabase.rpc('update_online_status', {
      user_uuid: userId,
      online: isOnline
    });
  },

  // Subscribe to friend status changes
  subscribToFriendStatus(userId, friendIds, callback) {
    if (!isSupabaseConfigured() || !friendIds.length) return null;

    return supabase
      .channel('friend-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=in.(${friendIds.join(',')})`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }
};

export default friendsService;
