// useRealtimeConnection - Auto-manages RealtimeManager connection based on auth state
// Add this hook to App.jsx to automatically connect/disconnect realtime channels

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { realtimeManager } from '../services/realtimeManager';

/**
 * Hook that automatically manages RealtimeManager connection based on user auth state.
 * 
 * - Connects when user logs in
 * - Disconnects when user logs out
 * - Handles reconnection on visibility change (tab becomes active)
 * 
 * Usage: Add `useRealtimeConnection()` in App.jsx inside the AuthProvider
 */
export function useRealtimeConnection() {
  const { user, isAuthenticated, sessionReady } = useAuth();
  const connectionAttempted = useRef(false);
  
  // Connect/disconnect based on auth state
  useEffect(() => {
    const connectUser = async () => {
      if (isAuthenticated && user?.id && sessionReady) {
        // Only attempt connection once per session
        if (connectionAttempted.current) return;
        connectionAttempted.current = true;
        
        console.log('[useRealtimeConnection] Connecting realtime for user:', user.id);
        const success = await realtimeManager.connectUser(user.id);
        console.log('[useRealtimeConnection] Connection result:', success ? 'connected' : 'polling fallback');
      }
    };
    
    const disconnectUser = async () => {
      if (!isAuthenticated && connectionAttempted.current) {
        console.log('[useRealtimeConnection] Disconnecting realtime (user logged out)');
        await realtimeManager.disconnectUser();
        connectionAttempted.current = false;
      }
    };
    
    if (sessionReady) {
      if (isAuthenticated && user?.id) {
        connectUser();
      } else {
        disconnectUser();
      }
    }
    
    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount - let the manager handle idle timeout
    };
  }, [isAuthenticated, user?.id, sessionReady]);
  
  // Reconnect when tab becomes visible (if was idle-disconnected)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && user?.id) {
        // Check if we need to reconnect
        const status = realtimeManager.getStatus();
        if (!status.isConnected && !status.usePollingFallback) {
          console.log('[useRealtimeConnection] Tab visible, reconnecting...');
          realtimeManager.connectUser(user.id);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, user?.id]);
  
  // Return status for debugging
  return realtimeManager.getStatus();
}

export default useRealtimeConnection;
