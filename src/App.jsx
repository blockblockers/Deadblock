// App.jsx - INVITE LINK ENHANCEMENT
// ============================================
// CHANGES NEEDED - Search for "INVITE_ENHANCEMENT" comments
// These are the key modifications to add to your existing App.jsx
// ============================================

// ============================================
// STEP 1: Add these state variables near other state declarations
// ============================================

// INVITE_ENHANCEMENT: State for invite link flow
const [pendingInviteCode, setPendingInviteCode] = useState(null);
const [inviteInfo, setInviteInfo] = useState(null);
const [inviteLoading, setInviteLoading] = useState(false);
const [inviteError, setInviteError] = useState(null);

// ============================================
// STEP 2: Add this useEffect early in App.jsx to detect invite codes
// Replace your existing invite detection code with this enhanced version
// ============================================

// INVITE_ENHANCEMENT: Detect invite code from URL on mount
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  
  if (inviteCode) {
    console.log('App: Found invite code in URL:', inviteCode);
    
    // Store invite code in both state and localStorage for persistence
    setPendingInviteCode(inviteCode);
    localStorage.setItem('deadblock_pending_invite', inviteCode);
    
    // Clean up URL but keep the code in state/localStorage
    window.history.replaceState({}, document.title, '/');
    
    // Fetch invite info
    const fetchInviteInfo = async () => {
      setInviteLoading(true);
      setInviteError(null);
      
      try {
        const { inviteService } = await import('./services/inviteService');
        const { data, error } = await inviteService.getInviteByCode(inviteCode);
        
        if (data && !error) {
          setInviteInfo(data);
          console.log('App: Invite info loaded:', data);
          
          // Store invite info in localStorage for after OAuth redirect
          localStorage.setItem('deadblock_pending_invite_info', JSON.stringify(data));
        } else {
          console.log('App: Invite not found or expired');
          setInviteError('This invite link has expired or is invalid.');
          setPendingInviteCode(null);
          localStorage.removeItem('deadblock_pending_invite');
          localStorage.removeItem('deadblock_pending_invite_info');
        }
      } catch (err) {
        console.error('App: Error fetching invite info:', err);
        setInviteError('Could not load invite details.');
      } finally {
        setInviteLoading(false);
      }
    };
    
    if (isOnlineEnabled) {
      fetchInviteInfo();
    }
  } else {
    // Check localStorage for invite code (persisted through OAuth redirect)
    const storedInviteCode = localStorage.getItem('deadblock_pending_invite');
    const storedInviteInfo = localStorage.getItem('deadblock_pending_invite_info');
    
    if (storedInviteCode) {
      console.log('App: Restoring invite code from localStorage:', storedInviteCode);
      setPendingInviteCode(storedInviteCode);
      
      if (storedInviteInfo) {
        try {
          setInviteInfo(JSON.parse(storedInviteInfo));
        } catch (e) {
          console.error('App: Failed to parse stored invite info');
        }
      }
    }
  }
}, [isOnlineEnabled]);

// ============================================
// STEP 3: Add this useEffect to handle invite acceptance after login
// This should run when user becomes authenticated with a pending invite
// ============================================

// INVITE_ENHANCEMENT: Accept invite after successful authentication
useEffect(() => {
  const acceptPendingInvite = async () => {
    // Only proceed if we have all required conditions
    if (!pendingInviteCode || !isAuthenticated || !profile?.id || !isOnlineEnabled || authLoading) {
      return;
    }
    
    console.log('App: User authenticated with pending invite, accepting...');
    
    try {
      const { getSupabase } = await import('./utils/supabase');
      const supabase = getSupabase();
      
      if (!supabase) {
        console.error('App: Supabase not available');
        return;
      }
      
      const { data, error } = await supabase.rpc('accept_invite_link', {
        code: pendingInviteCode,
        accepting_user_id: profile.id
      });
      
      if (error) {
        console.error('App: Error accepting invite:', error);
        setInviteError('Could not accept invite: ' + error.message);
        // Clear the pending invite on error
        clearPendingInvite();
        return;
      }
      
      if (data?.success) {
        console.log('App: Invite accepted successfully!', data);
        
        // Clear the pending invite
        clearPendingInvite();
        
        // Navigate directly to the game
        if (data.game_id && setGameMode) {
          console.log('App: Navigating to game:', data.game_id);
          
          // Small delay to ensure profile is fully loaded
          setTimeout(() => {
            // Set the active game and navigate to online game screen
            setActiveOnlineGameId?.(data.game_id);
            setGameMode('online-game');
          }, 500);
        } else {
          // Fallback: go to online menu where the game will appear
          setGameMode?.('online-menu');
        }
      } else {
        console.log('App: Invite acceptance returned no success flag');
        setInviteError('Could not join game. The invite may have expired.');
        clearPendingInvite();
      }
    } catch (err) {
      console.error('App: Exception accepting invite:', err);
      setInviteError('An error occurred while joining the game.');
      clearPendingInvite();
    }
  };
  
  acceptPendingInvite();
}, [pendingInviteCode, isAuthenticated, profile?.id, isOnlineEnabled, authLoading]);

// ============================================
// STEP 4: Add this helper function to clear pending invite state
// ============================================

// INVITE_ENHANCEMENT: Helper to clear all pending invite state
const clearPendingInvite = () => {
  setPendingInviteCode(null);
  setInviteInfo(null);
  setInviteError(null);
  localStorage.removeItem('deadblock_pending_invite');
  localStorage.removeItem('deadblock_pending_invite_info');
};

// ============================================
// STEP 5: Modify the EntryAuthScreen rendering to pass invite info
// Find where you render EntryAuthScreen and update it like this:
// ============================================

// INVITE_ENHANCEMENT: When showing entry auth, pass invite info if present
// In your shouldShowEntryAuth block, update the EntryAuthScreen render:

if (shouldShowEntryAuth) {
  // If there's a pending invite, show auth screen with invite context
  const hasInvite = !!pendingInviteCode && !!inviteInfo;
  
  console.log('Rendering: EntryAuthScreen', { hasInvite, inviteInfo });
  
  return (
    <EntryAuthScreen
      onComplete={handleEntryAuthComplete}
      onOfflineMode={hasInvite ? undefined : handleOfflineMode} // Disable offline if joining via invite
      forceOnlineOnly={hasInvite} // Force online mode for invite flow
      intendedDestination={hasInvite ? 'game-invite' : 'online-menu'}
      inviteInfo={inviteInfo}
      inviteLoading={inviteLoading}
      inviteError={inviteError}
      onCancelInvite={clearPendingInvite}
    />
  );
}

// ============================================
// STEP 6: Update the OAuth redirect handler to preserve invite
// In your OAuth callback handling useEffect, ensure invite is preserved
// ============================================

// INVITE_ENHANCEMENT: After OAuth completes, check for pending invite
useEffect(() => {
  if (isOAuthCallback && isAuthenticated && !authLoading && !hasRedirectedAfterOAuth) {
    // Check if we have a pending invite to process
    const storedInviteCode = localStorage.getItem('deadblock_pending_invite');
    
    if (storedInviteCode) {
      console.log('App: OAuth complete with pending invite, invite will be accepted by other effect');
      // Don't redirect yet - let the invite acceptance effect handle navigation
      setHasRedirectedAfterOAuth(true);
      clearOAuthCallback?.();
      // The acceptPendingInvite effect will handle the rest
    } else {
      // Normal OAuth flow without invite
      setHasRedirectedAfterOAuth(true);
      clearOAuthCallback?.();
      // ... your existing redirect logic
    }
  }
}, [isOAuthCallback, isAuthenticated, authLoading, hasRedirectedAfterOAuth]);

// ============================================
// STEP 7: Add activeOnlineGameId state if not present
// ============================================

// INVITE_ENHANCEMENT: Track active online game for direct navigation
const [activeOnlineGameId, setActiveOnlineGameId] = useState(null);

// Pass this to your online game screen:
// <OnlineGameScreen gameId={activeOnlineGameId} ... />
