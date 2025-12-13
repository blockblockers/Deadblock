// Friends Service - Manage friend relationships
// OPTIMIZED: Uses polling instead of Realtime for friend status (saves 1 channel per user)
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';

// Polling interval for friend status (30 seconds)
let statusPollingInterval = null;

export const friendsService = {
  // Get all friends for a user
  async getFriends(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          status,
          created_at,
          user_id,
          friend_id,
          user:profiles!friends_user_id_fkey(id, username, avatar_url, rating, is_online, last_seen),
          friend:profiles!friends_friend_id_fkey(id, username, avatar_url, rating, is_online, last_seen)
        `)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      // If the table doesn't exist, return empty array
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        return { data: [], error: null };
      }

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
    } catch (err) {
      console.error('Error in getFriends:', err);
      return { data: [], error: null };
    }
  },

  // Get pending friend requests (received)
  async getPendingRequests(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          created_at,
          user:profiles!friends_user_id_fkey(id, username, avatar_url, rating)
        `)
        .eq('friend_id', userId)
        .eq('status', 'pending');

      // If the table doesn't exist, return empty array
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        return { data: [], error: null };
      }

      if (error) return { data: null, error };

      return { 
        data: (data || []).map(r => ({
          requestId: r.id,
          from: r.user,
          requestedAt: r.created_at
        })), 
        error: null 
      };
    } catch (err) {
      console.error('Error in getPendingRequests:', err);
      return { data: [], error: null };
    }
  },

  // Get sent friend requests
  async getSentRequests(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          created_at,
          friend:profiles!friends_friend_id_fkey(id, username, avatar_url, rating)
        `)
        .eq('user_id', userId)
        .eq('status', 'pending');

      // If the table doesn't exist, return empty array
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        return { data: [], error: null };
      }

      if (error) return { data: null, error };

      return { 
        data: (data || []).map(r => ({
          requestId: r.id,
          to: r.friend,
          requestedAt: r.created_at
        })), 
        error: null 
      };
    } catch (err) {
      console.error('Error in getSentRequests:', err);
      return { data: [], error: null };
    }
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

  // Subscribe to friend status changes - OPTIMIZED: Uses polling instead of Realtime
  // This saves 1 channel per user, trading off real-time updates for 30-second polling
  subscribToFriendStatus(userId, friendIds, callback) {
    if (!isSupabaseConfigured() || !friendIds.length) return null;

    console.log('[FriendsService] Starting friend status polling (30s interval)');

    // Initial fetch
    this.fetchFriendStatuses(friendIds).then(statuses => {
      statuses.forEach(status => callback(status));
    });

    // Poll every 30 seconds
    statusPollingInterval = setInterval(async () => {
      const statuses = await this.fetchFriendStatuses(friendIds);
      statuses.forEach(status => callback(status));
    }, 30000);

    // Return an unsubscribe function that mimics the subscription interface
    return {
      unsubscribe: () => {
        if (statusPollingInterval) {
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;
        }
      }
    };
  },

  // Helper to fetch friend statuses
  async fetchFriendStatuses(friendIds) {
    if (!isSupabaseConfigured() || !friendIds.length) return [];

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, is_online, last_seen')
        .in('id', friendIds);

      return data || [];
    } catch (err) {
      console.error('Error fetching friend statuses:', err);
      return [];
    }
  },

  // Subscribe to friend requests via RealtimeManager
  subscribeToFriendRequests(userId, callback) {
    if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

    console.log('[FriendsService] Subscribing to friend requests via RealtimeManager');

    const unsubscribe = realtimeManager.on('friendRequest', (request) => {
      console.log('[FriendsService] Friend request received:', request?.id);
      callback(request);
    });

    return { unsubscribe };
  }
};

export default friendsService;
