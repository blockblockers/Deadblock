// Friends Service - Manage friend relationships
// UPDATED: Uses direct fetch to bypass Supabase client timeout issues
import { isSupabaseConfigured } from '../utils/supabase';
import { realtimeManager } from './realtimeManager';
import { dbSelect, dbInsert, dbUpdate, dbDelete, dbRpc, getCurrentUserId, getAuthHeaders, SUPABASE_URL } from './supabaseDirectFetch';

let statusPollingInterval = null;

export const friendsService = {
  async getFriends(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      // Fetch friendships
      const { data: friendships, error } = await dbSelect('friends', {
        select: 'id,status,created_at,user_id,friend_id',
        or: `user_id.eq.${userId},friend_id.eq.${userId}`,
        eq: { status: 'accepted' }
      });

      if (error || !friendships?.length) return { data: [], error };

      // Get all friend IDs
      const friendIds = [...new Set(friendships.flatMap(f => 
        [f.user_id, f.friend_id].filter(id => id !== userId)
      ))];

      // Fetch profiles
      const { data: profiles } = await dbSelect('profiles', {
        select: 'id,username,avatar_url,rating,is_online,last_seen',
        in: { id: friendIds }
      });

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      const friends = friendships.map(f => {
        const friendId = f.user_id === userId ? f.friend_id : f.user_id;
        return {
          friendshipId: f.id,
          ...profileMap[friendId],
          friendSince: f.created_at
        };
      });

      return { data: friends, error: null };
    } catch (err) {
      console.error('Error in getFriends:', err);
      return { data: [], error: null };
    }
  },

  async getPendingRequests(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const { data: requests, error } = await dbSelect('friends', {
        select: 'id,created_at,user_id',
        eq: { friend_id: userId, status: 'pending' }
      });

      if (error || !requests?.length) return { data: [], error: null };

      const userIds = requests.map(r => r.user_id);
      const { data: profiles } = await dbSelect('profiles', {
        select: 'id,username,avatar_url,rating',
        in: { id: userIds }
      });

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      return { 
        data: requests.map(r => ({
          requestId: r.id,
          from: profileMap[r.user_id],
          requestedAt: r.created_at
        })), 
        error: null 
      };
    } catch (err) {
      console.error('Error in getPendingRequests:', err);
      return { data: [], error: null };
    }
  },

  async getSentRequests(userId) {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    try {
      const { data: requests, error } = await dbSelect('friends', {
        select: 'id,created_at,friend_id',
        eq: { user_id: userId, status: 'pending' }
      });

      if (error || !requests?.length) return { data: [], error: null };

      const friendIds = requests.map(r => r.friend_id);
      const { data: profiles } = await dbSelect('profiles', {
        select: 'id,username,avatar_url,rating',
        in: { id: friendIds }
      });

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      return { 
        data: requests.map(r => ({
          requestId: r.id,
          to: profileMap[r.friend_id],
          requestedAt: r.created_at
        })), 
        error: null 
      };
    } catch (err) {
      console.error('Error in getSentRequests:', err);
      return { data: [], error: null };
    }
  },

  async sendFriendRequest(userId, friendId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    // Check existing
    const { data: existing } = await dbSelect('friends', {
      select: 'id,status',
      or: `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`,
      single: true
    });

    if (existing) {
      if (existing.status === 'accepted') return { data: null, error: { message: 'Already friends' } };
      if (existing.status === 'pending') return { data: null, error: { message: 'Friend request already pending' } };
    }

    return await dbInsert('friends', {
      user_id: userId,
      friend_id: friendId,
      status: 'pending'
    }, { returning: true, single: true });
  },

  async acceptFriendRequest(requestId, userId) {
    if (!isSupabaseConfigured()) return { data: null, error: { message: 'Not configured' } };

    return await dbUpdate('friends', 
      { status: 'accepted', updated_at: new Date().toISOString() },
      { eq: { id: requestId, friend_id: userId } },
      { returning: true, single: true }
    );
  },

  async declineFriendRequest(requestId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    return await dbDelete('friends', {
      eq: { id: requestId },
      or: `user_id.eq.${userId},friend_id.eq.${userId}`
    });
  },

  async removeFriend(friendshipId, userId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    return await dbDelete('friends', {
      eq: { id: friendshipId },
      or: `user_id.eq.${userId},friend_id.eq.${userId}`
    });
  },

  async areFriends(userId1, userId2) {
    if (!isSupabaseConfigured()) return false;

    const { data } = await dbSelect('friends', {
      select: 'id',
      or: `and(user_id.eq.${userId1},friend_id.eq.${userId2}),and(user_id.eq.${userId2},friend_id.eq.${userId1})`,
      eq: { status: 'accepted' },
      single: true
    });

    return !!data;
  },

  // Get detailed friendship status between two users
  // Returns object: { status: 'friends'|'pending_sent'|'pending_received'|'blocked'|null, friendshipId: string|null }
  async getFriendshipStatus(currentUserId, otherUserId) {
    if (!isSupabaseConfigured() || !currentUserId || !otherUserId) {
      return { status: null, friendshipId: null };
    }

    try {
      // Check for any relationship between the users
      const { data } = await dbSelect('friends', {
        select: 'id,user_id,friend_id,status',
        or: `and(user_id.eq.${currentUserId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${currentUserId})`,
        single: true
      });

      if (!data) return { status: null, friendshipId: null };

      // Determine the status based on who initiated and the current status
      if (data.status === 'accepted') {
        return { status: 'friends', friendshipId: data.id };
      } else if (data.status === 'blocked') {
        return { status: 'blocked', friendshipId: data.id };
      } else if (data.status === 'pending') {
        // Check who sent the request
        if (data.user_id === currentUserId) {
          return { status: 'pending_sent', friendshipId: data.id };
        } else {
          return { status: 'pending_received', friendshipId: data.id };
        }
      }

      return { status: null, friendshipId: null };
    } catch (err) {
      console.error('Error getting friendship status:', err);
      return { status: null, friendshipId: null };
    }
  },

  async blockUser(userId, blockedUserId) {
    if (!isSupabaseConfigured()) return { error: { message: 'Not configured' } };

    const { data: existing } = await dbSelect('friends', {
      select: 'id',
      or: `and(user_id.eq.${userId},friend_id.eq.${blockedUserId}),and(user_id.eq.${blockedUserId},friend_id.eq.${userId})`,
      single: true
    });

    if (existing) {
      return await dbUpdate('friends',
        { status: 'blocked', updated_at: new Date().toISOString() },
        { eq: { id: existing.id } }
      );
    } else {
      return await dbInsert('friends', {
        user_id: userId,
        friend_id: blockedUserId,
        status: 'blocked'
      });
    }
  },

  async updateOnlineStatus(userId, isOnline) {
    if (!isSupabaseConfigured()) return;
    await dbRpc('update_online_status', { user_uuid: userId, online: isOnline });
  },

  subscribToFriendStatus(userId, friendIds, callback) {
    if (!isSupabaseConfigured() || !friendIds.length) return null;

    console.log('[FriendsService] Starting friend status polling (30s interval)');

    this.fetchFriendStatuses(friendIds).then(statuses => {
      statuses.forEach(status => callback(status));
    });

    statusPollingInterval = setInterval(async () => {
      const statuses = await this.fetchFriendStatuses(friendIds);
      statuses.forEach(status => callback(status));
    }, 30000);

    return {
      unsubscribe: () => {
        if (statusPollingInterval) {
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;
        }
      }
    };
  },

  async fetchFriendStatuses(friendIds) {
    if (!isSupabaseConfigured() || !friendIds.length) return [];

    try {
      const { data } = await dbSelect('profiles', {
        select: 'id,is_online,last_seen',
        in: { id: friendIds }
      });
      return data || [];
    } catch (err) {
      console.error('Error fetching friend statuses:', err);
      return [];
    }
  },

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
