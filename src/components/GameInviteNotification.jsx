// GameInviteNotification.jsx - Toast notifications for game invites and friend requests
// FIXED: Uses centralized RealtimeManager instead of separate channels
// FIX: Changed table subscription from 'friendships' (wrong) to 'friends' (correct)
// FIX: Added proper error handling for friend request accept in parent handler

import { useState, useEffect, useCallback, useRef } from 'react';
import { Swords, UserPlus, X, Check, Clock } from 'lucide-react';
import { inviteService } from '../services/inviteService';
import { supabase } from '../utils/supabase';
import { realtimeManager } from '../services/realtimeManager';
import { soundManager } from '../utils/soundManager';
import { notificationService } from '../services/notificationService';

const GameInviteNotification = ({ userId, onAccept, onDecline }) => {
  const [notifications, setNotifications] = useState([]);
  const unsubscribeRef = useRef([]);

  // Subscribe to real-time events via centralized RealtimeManager
  useEffect(() => {
    if (!userId) return;

    console.log('[GameInviteNotification] Setting up subscriptions for:', userId);

    // Listen for game invites via RealtimeManager
    const unsubInvite = realtimeManager.on('gameInvite', async (invite) => {
      if (!invite) return;
      
      // Only show notifications for invites directed at this user
      if (invite.to_user_id !== userId) return;
      
      console.log('[GameInviteNotification] New invite received:', invite.id);
      
      // Fetch full invite with sender info
      const { data: fullInvite } = await supabase
        .from('game_invites')
        .select(`
          *,
          from_user:profiles!game_invites_from_user_id_fkey(id, username, display_name)
        `)
        .eq('id', invite.id)
        .single();

      if (fullInvite && fullInvite.status === 'pending') {
        const senderName = fullInvite.from_user?.username || fullInvite.from_user?.display_name || 'Someone';
        
        setNotifications(prev => [
          ...prev,
          {
            id: fullInvite.id,
            type: 'invite',
            sender: senderName,
            senderId: fullInvite.from_user_id,
            timestamp: Date.now()
          }
        ]);

        soundManager.playSound('notification');

        if (document.hidden) {
          notificationService.notifyGameInvite(senderName, fullInvite.id);
        }
      }
    });

    // Listen for friend requests via RealtimeManager
    // RealtimeManager subscribes to the correct 'friends' table (not 'friendships')
    const unsubFriend = realtimeManager.on('friendRequest', async (request) => {
      if (!request) return;
      
      // Only show notifications for requests directed at this user
      if (request.friend_id !== userId) return;
      
      console.log('[GameInviteNotification] New friend request:', request.id);
      
      if (request.status === 'pending') {
        // Fetch sender info - request.user_id is the person who sent the request
        const { data: sender } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .eq('id', request.user_id)
          .single();

        if (sender) {
          const senderName = sender.username || sender.display_name || 'Someone';
          
          setNotifications(prev => {
            // Avoid duplicate notifications for same request
            if (prev.some(n => n.id === request.id)) return prev;
            
            return [
              ...prev,
              {
                id: request.id,
                type: 'friend_request',
                sender: senderName,
                senderId: sender.id,
                timestamp: Date.now()
              }
            ];
          });

          soundManager.playSound('notification');
          
          if (document.hidden) {
            notificationService.notifyFriendRequest(senderName);
          }
        }
      }
    });

    unsubscribeRef.current = [unsubInvite, unsubFriend];

    return () => {
      console.log('[GameInviteNotification] Cleaning up subscriptions');
      unsubscribeRef.current.forEach(unsub => unsub?.());
      unsubscribeRef.current = [];
    };
  }, [userId]);

  // Auto-remove old notifications after 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => prev.filter(n => now - n.timestamp < 30000));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAccept = useCallback(async (notification) => {
    // Remove from notifications
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    
    // Call parent handler
    onAccept?.(notification);
  }, [onAccept]);

  const handleDecline = useCallback((notification) => {
    // Remove from notifications
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    
    // Call parent handler
    onDecline?.(notification);
  }, [onDecline]);

  const handleDismiss = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-amber-500/30 animate-slide-in"
        >
          <button
            onClick={() => handleDismiss(notification.id)}
            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              notification.type === 'invite' 
                ? 'bg-amber-500/20' 
                : 'bg-cyan-500/20'
            }`}>
              {notification.type === 'invite' ? (
                <Swords className="w-5 h-5 text-amber-400" />
              ) : (
                <UserPlus className="w-5 h-5 text-cyan-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate">
                {notification.type === 'invite' ? 'Game Challenge!' : 'Friend Request'}
              </p>
              <p className="text-slate-400 text-sm">
                <span className={notification.type === 'invite' ? 'text-amber-400' : 'text-cyan-400'}>
                  {notification.sender}
                </span>
                {notification.type === 'invite' 
                  ? ' wants to play' 
                  : ' wants to be friends'}
              </p>

              {/* Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAccept(notification)}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${
                    notification.type === 'invite'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  }`}
                >
                  <Check size={14} />
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(notification)}
                  className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-all"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slide-in {
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
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default GameInviteNotification;
