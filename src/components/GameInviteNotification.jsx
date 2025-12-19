// GameInviteNotification - Toast notifications for game invites and challenges
// FIXED: Removed FK joins that don't exist in the database schema
// Uses separate profile fetches instead
import { useState, useEffect, useRef } from 'react';
import { Gamepad2, X, Check, Clock, Users, Bell } from 'lucide-react';
import { isSupabaseConfigured } from '../utils/supabase';
import { realtimeManager } from '../services/realtimeManager';
import { soundManager } from '../utils/soundManager';
import { ratingService } from '../services/ratingService';
import TierIcon from './TierIcon';

// Direct fetch config
const AUTH_KEY = 'sb-oyeibyrednwlolmsjlwk-auth-token';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oyeibyrednwlolmsjlwk.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

// Fetch profile by ID
const fetchProfile = async (profileId) => {
  const headers = getAuthHeaders();
  if (!headers) return null;
  
  try {
    const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}&select=id,username,avatar_url,rating`;
    const response = await fetch(url, { 
      headers: { ...headers, 'Accept': 'application/vnd.pgrst.object+json' }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error('Error fetching profile:', e);
    return null;
  }
};

const GameInviteNotification = ({ userId, onAccept, onDecline }) => {
  const [notifications, setNotifications] = useState([]);
  const unsubscribeRef = useRef([]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;

    // Check for pending invites on load
    checkPendingInvites();

    // Register handlers with RealtimeManager
    const unsubInvite = realtimeManager.on('gameInvite', async (invite) => {
      // Fetch inviter details separately (no FK join)
      const inviterId = invite.from_user_id || invite.inviter_id;
      const inviter = await fetchProfile(inviterId);

      const notification = {
        id: invite.id,
        type: 'invite',
        inviter,
        timerSeconds: invite.timer_seconds,
        createdAt: invite.created_at,
        expiresAt: new Date(Date.now() + 60000) // 60 second expiry
      };

      setNotifications(prev => [...prev, notification]);
      soundManager.playSound?.('notification');
      
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    });

    const unsubFriend = realtimeManager.on('friendRequest', async (request) => {
      const requester = await fetchProfile(request.from_user_id);

      const notification = {
        id: request.id,
        type: 'friend_request',
        from: requester,
        createdAt: request.created_at
      };

      setNotifications(prev => [...prev, notification]);
      soundManager.playSound?.('notification');
    });

    unsubscribeRef.current = [unsubInvite, unsubFriend];

    return () => {
      unsubscribeRef.current.forEach(unsub => unsub?.());
    };
  }, [userId]);

  // FIXED: Check pending invites without FK joins
  const checkPendingInvites = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      // Simple query without FK joins
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const url = `${SUPABASE_URL}/rest/v1/game_invites?to_user_id=eq.${userId}&status=eq.pending&created_at=gte.${oneMinuteAgo}&select=id,timer_seconds,created_at,from_user_id`;
      
      const response = await fetch(url, { headers });
      if (!response.ok) return;
      
      const invites = await response.json();
      if (!invites?.length) return;

      // Fetch inviter profiles separately
      const notifications = await Promise.all(invites.map(async (inv) => {
        const inviter = await fetchProfile(inv.from_user_id);
        return {
          id: inv.id,
          type: 'invite',
          inviter,
          timerSeconds: inv.timer_seconds,
          createdAt: inv.created_at,
          expiresAt: new Date(new Date(inv.created_at).getTime() + 60000)
        };
      }));

      setNotifications(notifications);
    } catch (e) {
      console.error('Error checking pending invites:', e);
    }
  };

  const handleAccept = async (notification) => {
    removeNotification(notification.id);
    onAccept?.(notification);
  };

  const handleDecline = async (notification) => {
    removeNotification(notification.id);
    
    if (notification.type === 'invite') {
      // Update invite status
      const headers = getAuthHeaders();
      if (headers) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/game_invites?id=eq.${notification.id}`, {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ status: 'declined' })
          });
        } catch (e) {
          console.error('Error declining invite:', e);
        }
      }
    }
    
    onDecline?.(notification);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Auto-remove expired notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNotifications(prev => 
        prev.filter(n => !n.expiresAt || new Date(n.expiresAt) > now)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onAccept={() => handleAccept(notification)}
          onDecline={() => handleDecline(notification)}
        />
      ))}
    </div>
  );
};

// Individual notification card
const NotificationCard = ({ notification, onAccept, onDecline }) => {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!notification.expiresAt) return;

    const updateTime = () => {
      const remaining = Math.max(0, Math.floor((new Date(notification.expiresAt) - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [notification.expiresAt]);

  if (notification.type === 'invite') {
    const tier = ratingService.getRatingTier(notification.inviter?.rating || 1200);

    return (
      <div className="bg-slate-900 border border-amber-500/50 rounded-xl shadow-xl overflow-hidden animate-slide-in">
        {/* Timer bar */}
        {notification.expiresAt && (
          <div className="h-1 bg-slate-800">
            <div 
              className="h-full bg-amber-500 transition-all duration-1000"
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {notification.inviter?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <div className="font-bold text-white">{notification.inviter?.username || 'Unknown'}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <TierIcon shape={tier.shape} glowColor={tier.glowColor} size="small" />
                {notification.inviter?.rating || 1200}
                {notification.timerSeconds && (
                  <>
                    <span className="mx-1">•</span>
                    <Clock size={10} />
                    {notification.timerSeconds}s turns
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onDecline}
              className="text-slate-500 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Message */}
          <div className="text-sm text-amber-200 mb-3 flex items-center gap-2">
            <Gamepad2 size={16} />
            Challenges you to a game!
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-400 flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Accept
            </button>
            <button
              onClick={onDecline}
              className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 flex items-center justify-center gap-2"
            >
              <X size={18} />
              Decline
            </button>
          </div>

          {/* Time remaining */}
          {timeLeft > 0 && (
            <div className="text-center text-xs text-slate-500 mt-2">
              Expires in {timeLeft}s
            </div>
          )}
        </div>
      </div>
    );
  }

  if (notification.type === 'friend_request') {
    return (
      <div className="bg-slate-900 border border-cyan-500/50 rounded-xl shadow-xl p-4 animate-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {notification.from?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="font-medium text-white">{notification.from?.username || 'Unknown'}</div>
            <div className="text-xs text-cyan-400 flex items-center gap-1">
              <Users size={12} />
              Friend request
            </div>
          </div>
          <button
            onClick={onDecline}
            className="text-slate-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 py-1.5 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400"
          >
            Accept
          </button>
          <button
            onClick={onDecline}
            className="flex-1 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// Notification bell with count
export const NotificationBell = ({ count = 0, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-slate-400 hover:text-white"
    >
      <Bell size={24} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
};

export default GameInviteNotification;

// Add CSS animation
if (typeof document !== 'undefined') {
  const styleId = 'game-invite-notification-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      .animate-slide-in {
        animation: slideIn 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }
}
