// useRealtimeConnection - Hook to manage Realtime connection lifecycle
// Automatically connects when user logs in, disconnects on logout
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { realtimeManager } from '../services/realtimeManager';

export function useRealtimeConnection() {
  const { user, sessionReady, isAuthenticated } = useAuth();
  const connectedRef = useRef(false);
  const userIdRef = useRef(null);

  useEffect(() => {
    // Only connect when session is ready and user is authenticated
    if (sessionReady && isAuthenticated && user?.id) {
      // Avoid reconnecting for same user
      if (userIdRef.current === user.id && connectedRef.current) {
        return;
      }

      console.log('[useRealtimeConnection] Connecting user:', user.id);
      userIdRef.current = user.id;
      
      realtimeManager.connectUser(user.id).then((success) => {
        connectedRef.current = success;
        console.log('[useRealtimeConnection] Connection result:', success);
      });
    } else if (!isAuthenticated && connectedRef.current) {
      // User logged out - disconnect
      console.log('[useRealtimeConnection] Disconnecting (logged out)');
      realtimeManager.disconnectUser();
      connectedRef.current = false;
      userIdRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount - let the manager handle idle timeout
    };
  }, [sessionReady, isAuthenticated, user?.id]);

  // Return connection status and manager for components that need it
  return {
    isConnected: connectedRef.current,
    realtimeManager
  };
}

export default useRealtimeConnection;
