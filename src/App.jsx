import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { useGameState } from './hooks/useGameState';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './utils/supabase';
import { useRealtimeConnection } from './hooks/useRealtimeConnection';

// Core screens (always loaded - used frequently)
import MenuScreen from './components/MenuScreen';
import GameScreen from './components/GameScreen';
import NeonTitle from './components/NeonTitle';

// Loading screen for Suspense fallback
import LoadingScreen from './components/LoadingScreen';
import { LazyWrapper, LazyInline, preloadOnlineComponents, preloadPuzzleComponents, preloadWeeklyComponents } from './components/LazyWrapper';

// Entry and Profile components (loaded on app start)
import EntryAuthScreen from './components/EntryAuthScreen';
import PlayerProfileCard from './components/PlayerProfileCard';
import WelcomeModal from './components/WelcomeModal';

// =============================================================================
// LAZY LOADED COMPONENTS
// These components are loaded on-demand to reduce initial bundle size
// =============================================================================

// Puzzle components (loaded when entering puzzle mode)
const PuzzleSelect = lazy(() => import('./components/PuzzleSelect'));
const SpeedPuzzleScreen = lazy(() => import('./components/SpeedPuzzleScreen'));
const DifficultySelector = lazy(() => import('./components/DifficultySelector'));

// Weekly Challenge components (loaded when entering weekly challenge)
const WeeklyChallengeMenu = lazy(() => import('./components/WeeklyChallengeMenu'));
const WeeklyChallengeScreen = lazy(() => import('./components/WeeklyChallengeScreen'));
const WeeklyLeaderboard = lazy(() => import('./components/WeeklyLeaderboard'));

// Profile/Stats modal (loaded on demand)
const PlayerStatsModal = lazy(() => import('./components/PlayerStatsModal'));

// Online components (loaded when entering online features)
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const OnlineMenu = lazy(() => import('./components/OnlineMenu'));
const MatchmakingScreen = lazy(() => import('./components/MatchmakingScreen'));
const OnlineGameScreen = lazy(() => import('./components/OnlineGameScreen'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const SpectatorView = lazy(() => import('./components/SpectatorView'));
const GameReplay = lazy(() => import('./components/GameReplay'));

// PWA Install Prompt for iOS/Safari
import IOSInstallPrompt from './components/IOSInstallPrompt';

// Main App Content (wrapped in AuthProvider)
function AppContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [onlineGameId, setOnlineGameId] = useState(null);
  const [hasRedirectedAfterOAuth, setHasRedirectedAfterOAuth] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);
  
  // Entry auth and offline mode state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOnlineAuthPrompt, setShowOnlineAuthPrompt] = useState(false);
  // Track where user wants to go after authentication (online-menu or weekly-menu)
  const [pendingAuthDestination, setPendingAuthDestination] = useState(() => {
    return localStorage.getItem('deadblock_pending_auth_destination') || 'online-menu';
  });
  
  // Persist entry auth state to localStorage so it survives page refresh
  const [hasPassedEntryAuth, setHasPassedEntryAuth] = useState(() => {
    // Check if already authenticated - if so, they've already passed entry auth
    // This handles the case where the user refreshes the page after signing in
    return localStorage.getItem('deadblock_entry_auth_passed') === 'true';
  });
  
  // Update localStorage when hasPassedEntryAuth changes
  useEffect(() => {
    if (hasPassedEntryAuth) {
      localStorage.setItem('deadblock_entry_auth_passed', 'true');
    }
  }, [hasPassedEntryAuth]);
  
  // Check for pending online intent (set before OAuth redirect)
  const [pendingOnlineIntent, setPendingOnlineIntent] = useState(() => {
    return localStorage.getItem('deadblock_pending_online_intent') === 'true';
  });
  
  // Spectating and replay state
  const [spectatingGameId, setSpectatingGameId] = useState(null);
  const [replayGameId, setReplayGameId] = useState(null);
  
  // Weekly challenge state
  const [currentWeeklyChallenge, setCurrentWeeklyChallenge] = useState(null);
  
  const { isAuthenticated, loading: authLoading, isOnlineEnabled, isOAuthCallback, clearOAuthCallback, profile, isNewUser, clearNewUser } = useAuth();
  
  // Initialize realtime connection when user logs in (optimized - uses only 2 channels)
  useRealtimeConnection();
  
  // State for welcome modal
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  // Show welcome modal when new user is detected
  useEffect(() => {
    if (isNewUser && profile && !showWelcomeModal) {
      console.log('[App] New user detected, showing welcome modal');
      setShowWelcomeModal(true);
    }
  }, [isNewUser, profile, showWelcomeModal]);

  // Check for invite code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    
    if (inviteCode) {
      console.log('App: Found invite code in URL:', inviteCode);
      setPendingInviteCode(inviteCode);
      
      // Clean up URL but keep the code in state
      window.history.replaceState({}, document.title, '/');
      
      // Fetch invite info
      const fetchInviteInfo = async () => {
        try {
          const { inviteService } = await import('./services/inviteService');
          const { data, error } = await inviteService.getInviteByCode(inviteCode);
          
          if (data && !error) {
            setInviteInfo(data);
            console.log('App: Invite info loaded:', data);
          } else {
            console.log('App: Invite not found or expired');
            setPendingInviteCode(null);
          }
        } catch (err) {
          console.error('App: Error fetching invite info:', err);
        }
      };
      
      if (isOnlineEnabled) {
        fetchInviteInfo();
      }
    }
  }, [isOnlineEnabled]);

  // Handle accepting the invite after user logs in
  // NOTE: This effect is defined early but uses setGameMode which is defined later
  // We handle this by checking if setGameMode exists
  const acceptInviteRef = React.useRef(null);
  acceptInviteRef.current = async (setGameModeFn) => {
    if (pendingInviteCode && isAuthenticated && profile?.id && isOnlineEnabled) {
      console.log('App: User logged in with pending invite, accepting...');
      
      try {
        const { getSupabase } = await import('./utils/supabase');
        const supabase = getSupabase();
        
        if (supabase) {
          const { data, error } = await supabase.rpc('accept_invite_link', {
            code: pendingInviteCode,
            accepting_user_id: profile.id
          });
          
          if (data?.success) {
            console.log('App: Invite accepted successfully!');
            // Clear the pending invite
            setPendingInviteCode(null);
            setInviteInfo(null);
            // Go to online menu to see the game invite
            if (setGameModeFn) setGameModeFn('online-menu');
          } else if (data?.error) {
            console.log('App: Could not accept invite:', data.error);
            if (data.error !== 'Cannot accept your own invite') {
              alert(data.error);
            }
            setPendingInviteCode(null);
            setInviteInfo(null);
          }
        }
      } catch (err) {
        console.error('App: Error accepting invite:', err);
      }
    }
  };

  // Clean up stale OAuth callback URLs
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const hasRealAuthData = hash.includes('access_token=') || window.location.search.includes('code=');
    
    // If we're on /auth/callback but there's no actual auth data, clean up the URL
    if (path.includes('/auth/callback') && !hasRealAuthData) {
      console.log('App: Cleaning up stale OAuth callback URL');
      window.history.replaceState({}, document.title, '/');
    }
  }, []); // Run once on mount
  
  // Get all game state and actions from custom hook
  const {
    // State
    board,
    boardPieces,
    currentPlayer,
    selectedPiece,
    rotation,
    flipped,
    gameOver,
    winner,
    usedPieces,
    moveHistory,
    gameMode,
    isAIThinking,
    pendingMove,
    currentPuzzle,
    showHowToPlay,
    showSettings,
    aiDifficulty,
    isGeneratingPuzzle,
    puzzleDifficulty,
    aiAnimatingMove,
    playerAnimatingMove,
    
    // Actions
    setGameMode,
    setShowHowToPlay,
    setShowSettings,
    setAiDifficulty,
    setPendingMove,
    handleCellClick,
    confirmMove,
    cancelMove,
    movePendingPiece,
    undoMove,
    resetGame,
    loadPuzzle,
    startNewGame,
    selectPiece,
    rotatePiece,
    flipPiece,
    resetCurrentPuzzle,
  } = useGameState();

  // Check if user was already authenticated (skip entry screen)
  // This handles page refresh, OAuth return, and any other case where user is authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && !hasPassedEntryAuth) {
      console.log('App: User authenticated, marking entry auth as passed');
      setHasPassedEntryAuth(true);
      
      // If there was a pending online intent, clear it and go to online menu
      if (pendingOnlineIntent || localStorage.getItem('deadblock_pending_online_intent') === 'true') {
        console.log('App: Found pending online intent, going to online menu');
        localStorage.removeItem('deadblock_pending_online_intent');
        setPendingOnlineIntent(false);
        setIsOfflineMode(false);
        setGameMode('online-menu');
      }
    }
  }, [authLoading, isAuthenticated, hasPassedEntryAuth, pendingOnlineIntent, setGameMode]);

  // Effect to accept pending invite after login (needs setGameMode from useGameState)
  useEffect(() => {
    if (acceptInviteRef.current) {
      acceptInviteRef.current(setGameMode);
    }
  }, [pendingInviteCode, isAuthenticated, profile?.id, isOnlineEnabled, setGameMode]);

  // If user has invite code but isn't logged in, redirect to auth
  useEffect(() => {
    if (inviteInfo && !isAuthenticated && !authLoading && isOnlineEnabled && gameMode === null) {
      console.log('App: Invite detected but user not logged in, redirecting to auth');
      setGameMode('auth');
    }
  }, [inviteInfo, isAuthenticated, authLoading, isOnlineEnabled, gameMode, setGameMode]);

  // Redirect after OAuth completes - go to game menu from entry screen
  useEffect(() => {
    console.log('OAuth redirect check:', { isOAuthCallback, isAuthenticated, authLoading, hasRedirectedAfterOAuth, hasPassedEntryAuth, hasProfile: !!profile, pendingOnlineIntent });
    if (isOAuthCallback && isAuthenticated && !authLoading && !hasRedirectedAfterOAuth) {
      // Wait a moment for profile to load
      const doRedirect = () => {
        setHasRedirectedAfterOAuth(true);
        clearOAuthCallback?.(); // Clear the flag after handling
        
        // Clear pending online intent
        const hadOnlineIntent = pendingOnlineIntent || localStorage.getItem('deadblock_pending_online_intent') === 'true';
        localStorage.removeItem('deadblock_pending_online_intent');
        setPendingOnlineIntent(false);
        
        // Always pass entry auth and clear offline mode after successful OAuth
        setHasPassedEntryAuth(true);
        setIsOfflineMode(false);
        setShowOnlineAuthPrompt(false);
        
        // If user had pending online intent (was trying to access online features), go to online menu
        // Otherwise if they were already past entry, go to online menu
        // Otherwise go to main menu
        if (hadOnlineIntent || hasPassedEntryAuth) {
          console.log('OAuth complete with online intent - going to online menu');
          setGameMode('online-menu');
        } else {
          console.log('OAuth complete from entry screen - going to game menu');
          setGameMode(null); // Game menu
        }
      };
      
      // If profile isn't loaded yet, wait a moment
      if (!profile) {
        console.log('OAuth complete but waiting for profile...');
        setTimeout(doRedirect, 500);
      } else {
        doRedirect();
      }
    }
  }, [isOAuthCallback, isAuthenticated, authLoading, hasRedirectedAfterOAuth, hasPassedEntryAuth, profile, pendingOnlineIntent, setGameMode, clearOAuthCallback]);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle starting a game (with difficulty selection for AI mode)
  const handleStartGame = (mode) => {
    console.log('handleStartGame called:', { mode, isOnlineEnabled, isOfflineMode, isAuthenticated });
    
    if (mode === 'ai') {
      setGameMode('difficulty-select');
    } else if (mode === 'online') {
      // Check if online is enabled and user is authenticated
      if (!isOnlineEnabled) {
        console.log('Online not enabled - showing alert');
        alert('Online features are not configured. Please set up Supabase.');
        return;
      }
      // If user is in offline mode, show auth prompt
      if (isOfflineMode && !isAuthenticated) {
        console.log('Offline mode, not authenticated - showing auth prompt for online-menu');
        // Set intent and destination before showing auth
        localStorage.setItem('deadblock_pending_online_intent', 'true');
        localStorage.setItem('deadblock_pending_auth_destination', 'online-menu');
        setPendingOnlineIntent(true);
        setPendingAuthDestination('online-menu');
        setShowOnlineAuthPrompt(true);
        return;
      }
      if (!isAuthenticated) {
        console.log('Not authenticated - going to auth screen');
        setGameMode('auth');
      } else {
        console.log('Authenticated - going to online-menu');
        setGameMode('online-menu');
      }
    } else {
      startNewGame(mode);
    }
  };

  // Handle entry auth complete
  const handleEntryAuthComplete = () => {
    setHasPassedEntryAuth(true);
    setIsOfflineMode(false);
  };

  // Handle offline mode selection
  const handleOfflineMode = () => {
    setHasPassedEntryAuth(true);
    setIsOfflineMode(true);
  };

  // Handle online auth from offline mode
  const handleOnlineAuthSuccess = () => {
    console.log('handleOnlineAuthSuccess - redirecting to:', pendingAuthDestination);
    // Get the destination before clearing
    const destination = pendingAuthDestination || 'online-menu';
    
    // Clear pending online intent
    localStorage.removeItem('deadblock_pending_online_intent');
    localStorage.removeItem('deadblock_pending_auth_destination');
    setPendingOnlineIntent(false);
    setPendingAuthDestination('online-menu'); // Reset to default
    setShowOnlineAuthPrompt(false);
    setIsOfflineMode(false);
    
    // Go to the intended destination
    setGameMode(destination);
  };

  // Handle weekly challenge button click
  const handleWeeklyChallenge = () => {
    console.log('handleWeeklyChallenge called:', { isOnlineEnabled, isOfflineMode, isAuthenticated });
    
    // Weekly challenge requires authentication
    if (!isOnlineEnabled) {
      console.log('Online not enabled - showing alert');
      alert('Online features are not configured. Please set up Supabase.');
      return;
    }
    if (isOfflineMode && !isAuthenticated) {
      console.log('Offline mode, not authenticated - showing auth prompt for weekly-menu');
      // Set intent and destination before showing auth
      localStorage.setItem('deadblock_pending_online_intent', 'true');
      localStorage.setItem('deadblock_pending_auth_destination', 'weekly-menu');
      setPendingOnlineIntent(true);
      setPendingAuthDestination('weekly-menu');
      setShowOnlineAuthPrompt(true);
      return;
    }
    if (!isAuthenticated) {
      console.log('Not authenticated - going to auth screen');
      setGameMode('auth');
      return;
    }
    console.log('Authenticated - going to weekly-menu');
    setGameMode('weekly-menu');
  };

  // Handle playing the weekly challenge
  const handlePlayWeeklyChallenge = (challenge) => {
    setCurrentWeeklyChallenge(challenge);
    setGameMode('weekly-game');
  };

  // Handle viewing weekly leaderboard
  const handleWeeklyLeaderboard = (challenge) => {
    setCurrentWeeklyChallenge(challenge);
    setGameMode('weekly-leaderboard');
  };

  // Start AI game after difficulty selection
  const handleStartAIGame = (aiGoesFirst = false) => {
    startNewGame('ai', aiGoesFirst);
  };

  // Handle puzzle selection
  const handlePuzzleSelect = (puzzle) => {
    loadPuzzle(puzzle);
  };

  // Handle match found
  const handleMatchFound = (game) => {
    setOnlineGameId(game.id);
    setGameMode('online-game');
  };

  // Handle online game end
  const handleOnlineGameEnd = (result) => {
    setOnlineGameId(null);
    setGameMode('online-menu');
  };

  // Handle resume game
  const handleResumeGame = (game) => {
    console.log('handleResumeGame called:', { gameId: game?.id, game });
    if (!game?.id) {
      console.error('handleResumeGame: No game ID!');
      return;
    }
    setOnlineGameId(game.id);
    setGameMode('online-game');
  };

  // Handle spectate game
  const handleSpectateGame = (gameId) => {
    console.log('handleSpectateGame called:', gameId);
    setSpectatingGameId(gameId);
    setGameMode('spectate');
  };

  // Handle view replay
  const handleViewReplay = (gameId) => {
    console.log('handleViewReplay called:', gameId);
    setReplayGameId(gameId);
    setGameMode('replay');
  };

  // Fallback timeout for stuck loading state
  const [loadingStuck, setLoadingStuck] = useState(false);
  
  // Check if we should be showing loading screen
  const shouldShowLoading = isOnlineEnabled && (authLoading || (isOAuthCallback && !profile));
  
  useEffect(() => {
    if (shouldShowLoading) {
      const timeout = setTimeout(() => {
        console.log('Loading stuck timeout triggered');
        setLoadingStuck(true);
      }, 5000); // 5 seconds
      
      // If we're stuck for too long (10 seconds), force clear the OAuth callback
      const forceTimeout = setTimeout(() => {
        console.log('Force clearing stuck OAuth state');
        if (clearOAuthCallback) {
          clearOAuthCallback();
        }
        // Also force pass entry auth if we're stuck
        if (!hasPassedEntryAuth && isAuthenticated) {
          setHasPassedEntryAuth(true);
        }
        // If there was pending online intent, go to online menu
        if (pendingOnlineIntent || localStorage.getItem('deadblock_pending_online_intent') === 'true') {
          console.log('Force timeout: handling pending online intent');
          localStorage.removeItem('deadblock_pending_online_intent');
          setPendingOnlineIntent(false);
          setIsOfflineMode(false);
          if (isAuthenticated) {
            setGameMode('online-menu');
          }
        }
      }, 10000);
      
      return () => {
        clearTimeout(timeout);
        clearTimeout(forceTimeout);
      };
    } else {
      setLoadingStuck(false);
    }
  }, [shouldShowLoading, clearOAuthCallback, hasPassedEntryAuth, isAuthenticated, pendingOnlineIntent, setGameMode]);

  // Show loading while auth is initializing or processing OAuth callback
  // Keep showing during OAuth callback until redirect effect handles it
  const showAuthLoading = isOnlineEnabled && (authLoading || (isOAuthCallback && !hasRedirectedAfterOAuth));
  
  // DEBUG: Always log current state (even before loading check)
  console.log('=== App Render Debug ===', {
    showAuthLoading,
    authLoading,
    isOAuthCallback,
    hasRedirectedAfterOAuth,
    isAuthenticated,
    hasPassedEntryAuth,
    isOnlineEnabled,
    gameMode,
    hasProfile: !!profile,
  });
  
  // INLINE OAuth completion handling - if we're in OAuth callback but user is authenticated,
  // trigger the redirect immediately instead of waiting for effect
  if (isOAuthCallback && isAuthenticated && !authLoading && !hasRedirectedAfterOAuth) {
    console.log('=== INLINE OAuth completion - triggering redirect ===');
    // Use setTimeout to avoid state update during render
    setTimeout(() => {
      setHasRedirectedAfterOAuth(true);
      clearOAuthCallback?.();
      setHasPassedEntryAuth(true);
      setIsOfflineMode(false);
      
      const hadOnlineIntent = pendingOnlineIntent || localStorage.getItem('deadblock_pending_online_intent') === 'true';
      localStorage.removeItem('deadblock_pending_online_intent');
      setPendingOnlineIntent(false);
      
      if (hadOnlineIntent) {
        console.log('OAuth complete - going to online menu');
        setGameMode('online-menu');
      } else {
        console.log('OAuth complete - going to main menu');
        setGameMode(null);
      }
    }, 0);
    
    // Show brief loading while redirect processes
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 mb-8">
          <NeonTitle size="large" />
        </div>
        <div className="relative z-10 w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="relative z-10 text-amber-300 text-sm font-medium tracking-wider">WELCOME BACK...</p>
      </div>
    );
  }
  
  if (showAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        {/* Grid background */}
        <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        {/* Title */}
        <div className="relative z-10 mb-8">
          <NeonTitle size="large" />
        </div>
        
        {/* Spinner */}
        <div className="relative z-10 w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="relative z-10 text-amber-300 text-sm font-medium tracking-wider">
          {isOAuthCallback ? 'SIGNING YOU IN...' : 'LOADING...'}
        </p>
        {loadingStuck && (
          <div className="relative z-10 mt-6 text-center">
            <p className="text-slate-400 text-xs mb-3">Taking longer than expected...</p>
            <button
              onClick={() => {
                // Clear all Supabase related storage and reload
                Object.keys(localStorage).forEach(key => {
                  if (key.startsWith('sb-') || key.includes('supabase')) {
                    localStorage.removeItem(key);
                  }
                });
                // Clear pending online intent
                localStorage.removeItem('deadblock_pending_online_intent');
                // Clear session storage too
                sessionStorage.clear();
                // Force reload to root
                window.location.replace('/');
              }}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600"
            >
              Reset & Reload
            </button>
          </div>
        )}
      </div>
    );
  }

  // Debug logging - comprehensive state dump
  console.log('App render state:', { 
    gameMode, 
    onlineGameId, 
    isAuthenticated, 
    authLoading, 
    isOAuthCallback, 
    hasPassedEntryAuth, 
    isOfflineMode,
    showOnlineAuthPrompt,
    isOnlineEnabled,
    hasProfile: !!profile
  });

  // Show Entry Auth Screen first (before anything else)
  // Skip if:
  // 1. Already passed entry screen
  // 2. Auth is still loading
  // 3. OAuth callback in progress  
  // 4. User is already authenticated (effect will set hasPassedEntryAuth)
  const shouldShowEntryAuth = !hasPassedEntryAuth && !authLoading && !isOAuthCallback && !isAuthenticated;
  console.log('Entry auth check:', { shouldShowEntryAuth, hasPassedEntryAuth, authLoading, isOAuthCallback, isAuthenticated });
  
  if (shouldShowEntryAuth) {
    console.log('Rendering: EntryAuthScreen');
    return (
      <EntryAuthScreen
        onComplete={handleEntryAuthComplete}
        onOfflineMode={handleOfflineMode}
      />
    );
  }

  // Online Auth Prompt (for offline users trying to go online)
  if (showOnlineAuthPrompt) {
    console.log('Rendering: Online Auth Prompt for destination:', pendingAuthDestination);
    return (
      <EntryAuthScreen
        onComplete={handleOnlineAuthSuccess}
        onOfflineMode={() => {
          // Clear pending online intent and destination when user cancels
          localStorage.removeItem('deadblock_pending_online_intent');
          localStorage.removeItem('deadblock_pending_auth_destination');
          setPendingOnlineIntent(false);
          setPendingAuthDestination('online-menu');
          setShowOnlineAuthPrompt(false);
        }}
        forceOnlineOnly={true}
        intendedDestination={pendingAuthDestination}
      />
    );
  }

  // Render Menu Screen - this should be the default after auth
  // Changed from !gameMode to explicit null check plus fallback
  if (gameMode === null || gameMode === undefined) {
    console.log('Rendering: MenuScreen (gameMode is null/undefined)');
    console.log('MenuScreen props:', { isOnlineEnabled, isAuthenticated, isOfflineMode, hasProfile: !!profile });
    
    // If user just authenticated but hasPassedEntryAuth not set yet, set it now
    if (isAuthenticated && !hasPassedEntryAuth) {
      console.log('Setting hasPassedEntryAuth from render');
      // Schedule for next tick to avoid state update during render
      setTimeout(() => setHasPassedEntryAuth(true), 0);
    }
    return (
      <>
        <MenuScreen
          onStartGame={handleStartGame}
          onPuzzleSelect={() => setGameMode('puzzle-select')}
          onWeeklyChallenge={handleWeeklyChallenge}
          showHowToPlay={showHowToPlay}
          onToggleHowToPlay={setShowHowToPlay}
          showSettings={showSettings}
          onToggleSettings={setShowSettings}
          isOnlineEnabled={isOnlineEnabled}
          isAuthenticated={isAuthenticated}
          isOfflineMode={isOfflineMode}
          onShowProfile={() => setShowProfileModal(true)}
          // Preload components on hover for better UX
          onPuzzleHover={preloadPuzzleComponents}
          onOnlineHover={preloadOnlineComponents}
          onWeeklyHover={preloadWeeklyComponents}
        />
        <LazyInline>
          <PlayerStatsModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            isOffline={isOfflineMode}
          />
        </LazyInline>
        
        {/* Welcome modal for new users */}
        {showWelcomeModal && profile && (
          <WelcomeModal
            username={profile.username || profile.display_name || 'Player'}
            onClose={() => {
              setShowWelcomeModal(false);
              clearNewUser();
            }}
            onEditUsername={() => {
              setShowWelcomeModal(false);
              clearNewUser();
              setShowProfileModal(true);
            }}
          />
        )}
      </>
    );
  }

  // =====================================================
  // ONLINE MODES (Lazy loaded with Suspense)
  // =====================================================

  // Auth Screen (Login/Signup)
  if (gameMode === 'auth') {
    return (
      <LazyWrapper message="Loading authentication...">
        <AuthScreen
          onBack={() => setGameMode(null)}
          onSuccess={() => setGameMode('online-menu')}
          inviteInfo={inviteInfo}
        />
      </LazyWrapper>
    );
  }

  // Online Menu/Lobby
  if (gameMode === 'online-menu') {
    return (
      <LazyWrapper message="Loading online lobby...">
        <OnlineMenu
          onFindMatch={() => setGameMode('matchmaking')}
          onViewProfile={() => setGameMode('profile')}
          onViewLeaderboard={() => setGameMode('leaderboard')}
          onResumeGame={handleResumeGame}
          onSpectateGame={handleSpectateGame}
          onViewReplay={handleViewReplay}
          onBack={() => setGameMode(null)}
        />
      </LazyWrapper>
    );
  }

  // Matchmaking Screen
  if (gameMode === 'matchmaking') {
    return (
      <LazyWrapper message="Finding opponents...">
        <MatchmakingScreen
          onMatchFound={handleMatchFound}
          onCancel={() => setGameMode('online-menu')}
        />
      </LazyWrapper>
    );
  }

  // Online Game
  if (gameMode === 'online-game') {
    if (!onlineGameId) {
      console.error('online-game mode but no gameId, redirecting to menu');
      // Reset to online menu if we somehow got here without a game ID
      return (
        <LazyWrapper message="Loading online lobby...">
          <OnlineMenu
            onFindMatch={() => setGameMode('matchmaking')}
            onViewProfile={() => setGameMode('profile')}
            onViewLeaderboard={() => setGameMode('leaderboard')}
            onResumeGame={handleResumeGame}
            onSpectateGame={handleSpectateGame}
            onViewReplay={handleViewReplay}
            onBack={() => setGameMode(null)}
          />
        </LazyWrapper>
      );
    }
    return (
      <LazyWrapper message="Loading game...">
        <OnlineGameScreen
          gameId={onlineGameId}
          onGameEnd={handleOnlineGameEnd}
          onLeave={() => {
            setOnlineGameId(null);
            setGameMode('online-menu');
          }}
        />
      </LazyWrapper>
    );
  }

  // User Profile
  if (gameMode === 'profile') {
    return (
      <LazyWrapper message="Loading profile...">
        <UserProfile
          onBack={() => setGameMode('online-menu')}
        />
      </LazyWrapper>
    );
  }

  // Leaderboard
  if (gameMode === 'leaderboard') {
    return (
      <LazyWrapper message="Loading leaderboard...">
        <Leaderboard
          onBack={() => setGameMode('online-menu')}
        />
      </LazyWrapper>
    );
  }

  // Spectate Game
  if (gameMode === 'spectate') {
    return (
      <LazyWrapper message="Loading spectator view...">
        <SpectatorView
          gameId={spectatingGameId}
          userId={profile?.id}
          onClose={() => {
            setSpectatingGameId(null);
            setGameMode('online-menu');
          }}
        />
      </LazyWrapper>
    );
  }

  // Game Replay
  if (gameMode === 'replay') {
    return (
      <LazyWrapper message="Loading replay...">
        <GameReplay
          gameId={replayGameId}
          onClose={() => {
            setReplayGameId(null);
            setGameMode('online-menu');
          }}
        />
      </LazyWrapper>
    );
  }

  // =====================================================
  // OFFLINE MODES (Lazy loaded with Suspense)
  // =====================================================

  // Render Difficulty Selector for AI
  if (gameMode === 'difficulty-select') {
    return (
      <LazyWrapper message="Loading difficulty selector...">
        <DifficultySelector
          selectedDifficulty={aiDifficulty}
          onSelectDifficulty={setAiDifficulty}
          onStartGame={handleStartAIGame}
          onBack={() => setGameMode(null)}
        />
      </LazyWrapper>
    );
  }

  // Render Puzzle Difficulty Select Screen
  if (gameMode === 'puzzle-select') {
    return (
      <LazyWrapper message="Loading puzzle mode...">
        <PuzzleSelect
          onSelectPuzzle={handlePuzzleSelect}
          onSpeedMode={() => setGameMode('speed-puzzle')}
          onBack={() => setGameMode(null)}
        />
      </LazyWrapper>
    );
  }
  
  // Render Speed Puzzle Screen
  if (gameMode === 'speed-puzzle') {
    return (
      <LazyWrapper message="Loading speed puzzle...">
        <SpeedPuzzleScreen
          onMenu={() => setGameMode('puzzle-select')}
          isOfflineMode={isOfflineMode}
        />
      </LazyWrapper>
    );
  }

  // =====================================================
  // WEEKLY CHALLENGE MODES (Lazy loaded with Suspense)
  // =====================================================

  // Weekly Challenge Menu
  if (gameMode === 'weekly-menu') {
    console.log('Rendering: WeeklyChallengeMenu');
    return (
      <LazyWrapper message="Loading weekly challenge...">
        <WeeklyChallengeMenu
          onPlay={handlePlayWeeklyChallenge}
          onLeaderboard={handleWeeklyLeaderboard}
          onBack={() => setGameMode(null)}
        />
      </LazyWrapper>
    );
  }

  // Weekly Challenge Game
  if (gameMode === 'weekly-game') {
    return (
      <LazyWrapper message="Starting challenge...">
        <WeeklyChallengeScreen
          challenge={currentWeeklyChallenge}
          onMenu={() => setGameMode('weekly-menu')}
          onLeaderboard={handleWeeklyLeaderboard}
        />
      </LazyWrapper>
    );
  }

  // Weekly Leaderboard
  if (gameMode === 'weekly-leaderboard') {
    return (
      <LazyWrapper message="Loading leaderboard...">
        <WeeklyLeaderboard
          challenge={currentWeeklyChallenge}
          onBack={() => setGameMode('weekly-menu')}
        />
      </LazyWrapper>
    );
  }

  // Render Game Screen (for ai, 2player, and puzzle modes)
  console.log('Rendering: GameScreen (fallback) - gameMode:', gameMode);
  return (
    <GameScreen
      board={board}
      boardPieces={boardPieces}
      currentPlayer={currentPlayer}
      selectedPiece={selectedPiece}
      rotation={rotation}
      flipped={flipped}
      gameOver={gameOver}
      winner={winner}
      usedPieces={usedPieces}
      moveHistory={moveHistory}
      gameMode={gameMode}
      isAIThinking={isAIThinking}
      pendingMove={pendingMove}
      currentPuzzle={currentPuzzle}
      aiDifficulty={aiDifficulty}
      isMobile={isMobile}
      isGeneratingPuzzle={isGeneratingPuzzle}
      aiAnimatingMove={aiAnimatingMove}
      playerAnimatingMove={playerAnimatingMove}
      setPendingMove={setPendingMove}
      onCellClick={handleCellClick}
      onSelectPiece={selectPiece}
      onRotate={rotatePiece}
      onFlip={flipPiece}
      onConfirm={confirmMove}
      onCancel={cancelMove}
      onMovePiece={movePendingPiece}
      onReset={resetGame}
      onRetryPuzzle={resetCurrentPuzzle}
      onMenu={() => setGameMode(null)}
      onDifficultySelect={() => setGameMode(gameMode === 'puzzle' ? 'puzzle-select' : 'difficulty-select')}
    />
  );
}

// Main App with Auth Provider wrapper
function App() {
  return (
    <AuthProvider>
      <AppContent />
      <IOSInstallPrompt />
    </AuthProvider>
  );
}

export default App;
