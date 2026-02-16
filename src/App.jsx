// App.jsx - Main application component
// v7.20: Added Creator Puzzles (PuzzleTypeSelect, CreatorPuzzleSelect, CreatorPuzzleGame)
// v7.19.1: Fixed TDZ error - moved useAuth() before wasAuthenticatedRef
// v7.19: Sign out now redirects to entry auth screen (reset hasPassedEntryAuth on sign out)
import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { useGameState } from './hooks/useGameState';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './utils/supabase';
import { useRealtimeConnection } from './hooks/useRealtimeConnection';
import { streakTracker } from './utils/streakTracker';

// Core screens (always loaded - used frequently)
import MenuScreen from './components/MenuScreen';
import GameScreen from './components/GameScreen';
import NeonTitle from './components/NeonTitle';

// Global persistent background animation (renders once, never remounts)
import GlobalBackground from './components/GlobalBackground';

// Loading screen for Suspense fallback
import LoadingScreen from './components/LoadingScreen';
import { LazyWrapper, LazyInline, preloadOnlineComponents, preloadPuzzleComponents, preloadWeeklyComponents } from './components/LazyWrapper';

// Entry and Profile components (loaded on app start)
import EntryAuthScreen from './components/EntryAuthScreen';
import PlayerProfileCard from './components/PlayerProfileCard';
import WelcomeModal from './components/WelcomeModal';
import HowToPlayModal from './components/HowToPlayModal';

// =============================================================================
// LAZY LOADED COMPONENTS
// These components are loaded on-demand to reduce initial bundle size
// =============================================================================

// Puzzle components (loaded when entering puzzle mode)
const PuzzleTypeSelect = lazy(() => import('./components/PuzzleTypeSelect'));
const PuzzleSelect = lazy(() => import('./components/PuzzleSelect'));
const CreatorPuzzleSelect = lazy(() => import('./components/CreatorPuzzleSelect'));
const CreatorPuzzleGame = lazy(() => import('./components/CreatorPuzzleGame'));
const SpeedPuzzleScreen = lazy(() => import('./components/SpeedPuzzleScreen'));
const DifficultySelector = lazy(() => import('./components/DifficultySelector'));

// Weekly Challenge components (loaded when entering weekly challenge)
const WeeklyChallengeMenu = lazy(() => import('./components/WeeklyChallengeMenu'));
const WeeklyChallengeScreen = lazy(() => import('./components/WeeklyChallengeScreen'));
const WeeklyLeaderboard = lazy(() => import('./components/WeeklyLeaderboard'));

// Profile/Stats modal (loaded on demand)
const PlayerStatsModal = lazy(() => import('./components/PlayerStatsModal'));

// Online components (loaded when entering online features)
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
function AppContent({ onBgThemeChange }) {
  const [isMobile, setIsMobile] = useState(false);
  const [onlineGameId, setOnlineGameId] = useState(null);
  const [hasRedirectedAfterOAuth, setHasRedirectedAfterOAuth] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState(() => {
    // Check localStorage for a persisted invite code (survives OAuth redirect)
    return localStorage.getItem('deadblock_pending_invite_code') || null;
  });
  const [inviteInfo, setInviteInfo] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  
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
  
  // Auth state - MUST be before any code that references isAuthenticated (TDZ fix)
  const { isAuthenticated, loading: authLoading, isOnlineEnabled, isOAuthCallback, clearOAuthCallback, profile, isNewUser, clearNewUser, refreshProfile } = useAuth();
  
  // v7.19: Track if user was previously authenticated (to detect sign-out)
  const wasAuthenticatedRef = React.useRef(isAuthenticated);
  
  useEffect(() => {
    // Only reset entry auth if user WAS authenticated and now is NOT (actual sign-out)
    // This prevents kicking offline users back to entry screen
    if (wasAuthenticatedRef.current && !isAuthenticated && !authLoading) {
      setHasPassedEntryAuth(false);
      setIsOfflineMode(false);
      setGameMode(null);
      localStorage.removeItem('deadblock_entry_auth_passed');
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, authLoading, setGameMode]);
  
  // Check for pending online intent (set before OAuth redirect)
  const [pendingOnlineIntent, setPendingOnlineIntent] = useState(() => {
    return localStorage.getItem('deadblock_pending_online_intent') === 'true';
  });
  
  // Spectating and replay state
  const [spectatingGameId, setSpectatingGameId] = useState(null);
  const [replayGameId, setReplayGameId] = useState(null);
  
  // Weekly challenge state
  const [currentWeeklyChallenge, setCurrentWeeklyChallenge] = useState(null);
  
  // Creator puzzle state
  const [currentCreatorPuzzle, setCurrentCreatorPuzzle] = useState(null);
  
  // Initialize realtime connection when user logs in (optimized - uses only 2 channels)
  useRealtimeConnection();
  
  // State for welcome modal
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  // v7.12: State for new user tutorial (shown after welcome modal completes)
  const [showNewUserTutorial, setShowNewUserTutorial] = useState(false);
  
  // v7.8: Track if new user joined via invite link (to show tutorial)
  const [showTutorialOnJoin, setShowTutorialOnJoin] = useState(false);
  
  // Show welcome modal when new user is detected
  useEffect(() => {
    if (isNewUser && profile && !showWelcomeModal) {
      // console.log('[App] New user detected, showing welcome modal');
      setShowWelcomeModal(true);
    }
  }, [isNewUser, profile, showWelcomeModal]);

  // Check for invite code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    
    if (inviteCode) {
      // console.log('App: Found invite code in URL:', inviteCode);
      setPendingInviteCode(inviteCode);
      // Persist to localStorage so it survives OAuth redirect
      localStorage.setItem('deadblock_pending_invite_code', inviteCode);
      
      // Clean up URL but keep the code in state
      window.history.replaceState({}, document.title, '/');
      
      // Fetch invite info (for display purposes only - don't clear on failure)
      const fetchInviteInfo = async () => {
        setInviteLoading(true);
        setInviteError(null);
        try {
          const { inviteService } = await import('./services/inviteService');
          const { data, error } = await inviteService.getInviteByCode(inviteCode);
          
          if (data && !error) {
            setInviteInfo(data);
            // console.log('App: Invite info loaded:', data);
          } else if (error) {
            // console.log('App: Could not fetch invite preview:', error.message);
            setInviteError(error.message);
          } else {
            // Don't clear the invite code - let acceptInvite handle validation
            // console.log('App: Could not fetch invite preview (will try to accept anyway)');
          }
        } catch (err) {
          console.error('App: Error fetching invite info:', err);
          setInviteError(err.message || 'Failed to load invite');
          // Don't clear - let acceptInvite handle it
        } finally {
          setInviteLoading(false);
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
    const inviteCode = pendingInviteCode || localStorage.getItem('deadblock_pending_invite_code');
    
    if (inviteCode && isAuthenticated && profile?.id && isOnlineEnabled) {
      // console.log('App: User logged in with pending invite, accepting...', inviteCode);
      
      try {
        const { inviteService } = await import('./services/inviteService');
        
        // Use inviteService to accept the invite (creates game directly)
        const { data, error } = await inviteService.acceptInviteByCode(inviteCode, profile.id);
        
        // console.log('App: acceptInviteByCode result:', { data, error });
        
        if (data?.success && data?.game_id) {
          // console.log('App: Invite accepted! Game ID:', data.game_id);
          // Clear the pending invite from both state and localStorage
          setPendingInviteCode(null);
          setInviteInfo(null);
          setInviteError(null);
          localStorage.removeItem('deadblock_pending_invite_code');
          
          // v7.8: Check if this is a new user - show tutorial
          // A user is considered "new" if they just created their account
          const isFirstGame = !localStorage.getItem('deadblock_has_played_online');
          if (isFirstGame || isNewUser) {
            // console.log('[App] New user joining via invite - will show tutorial');
            setShowTutorialOnJoin(true);
            localStorage.setItem('deadblock_has_played_online', 'true');
          }
          
          // Go directly to the game
          setOnlineGameId(data.game_id);
          if (setGameModeFn) setGameModeFn('online-game');
        } else if (error) {
          // console.log('App: Could not accept invite:', error.message);
          if (error.message !== 'Cannot accept your own invite') {
            alert(error.message);
          }
          setPendingInviteCode(null);
          setInviteInfo(null);
          setInviteError(null);
          localStorage.removeItem('deadblock_pending_invite_code');
          // Fall back to online menu
          if (setGameModeFn) setGameModeFn('online-menu');
        } else {
          // No success and no error - something went wrong
          // console.log('App: Unexpected response from acceptInviteByCode');
          setPendingInviteCode(null);
          setInviteInfo(null);
          setInviteError(null);
          localStorage.removeItem('deadblock_pending_invite_code');
          if (setGameModeFn) setGameModeFn('online-menu');
        }
      } catch (err) {
        console.error('App: Error accepting invite:', err);
        setPendingInviteCode(null);
        setInviteInfo(null);
        setInviteError(null);
        localStorage.removeItem('deadblock_pending_invite_code');
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
      // console.log('App: Cleaning up stale OAuth callback URL');
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
    setPendingMove,
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

  // Update background theme based on current screen/gameMode
  useEffect(() => {
    if (!onBgThemeChange) return;
    
    // Map gameMode to background theme
    const themeMap = {
      'null': 'menu',           // Main menu
      'undefined': 'menu',
      'auth': 'auth',           // Login/signup screens
      'online-menu': 'online',  // Online lobby
      'online-game': 'online',  // Online match
      'matchmaking': 'online',  // Finding opponent
      'puzzle': 'puzzle',       // Puzzle mode
      'puzzle-select': 'puzzle',
      'puzzle-type-select': 'puzzle',
      'creator-puzzle-select': 'puzzle',
      'creator-puzzle': 'puzzle',
      'speed-puzzle': 'puzzle',
      'weekly-menu': 'puzzle',  // Weekly uses puzzle theme
      'weekly-challenge': 'puzzle',
      'weekly-leaderboard': 'puzzle',
      'difficulty-select': 'game',
      'ai': 'game',             // AI games
      'local': 'game',          // Local 2P
      'profile': 'online',
      'leaderboard': 'online',
    };
    
    const theme = themeMap[String(gameMode)] || 'menu';
    onBgThemeChange(theme);
  }, [gameMode, onBgThemeChange]);

  // Check if user was already authenticated (skip entry screen)
  // This handles page refresh, OAuth return, and any other case where user is authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && !hasPassedEntryAuth) {
      // console.log('App: User authenticated, marking entry auth as passed');
      setHasPassedEntryAuth(true);
      
      // If there was a pending online intent, clear it and go to online menu
      if (pendingOnlineIntent || localStorage.getItem('deadblock_pending_online_intent') === 'true') {
        // console.log('App: Found pending online intent, going to online menu');
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
    const inviteCode = pendingInviteCode || localStorage.getItem('deadblock_pending_invite_code');
    if (inviteCode && !isAuthenticated && !authLoading && isOnlineEnabled && gameMode === null) {
      // console.log('App: Invite code detected but user not logged in, redirecting to auth');
      setGameMode('auth');
    }
  }, [pendingInviteCode, isAuthenticated, authLoading, isOnlineEnabled, gameMode, setGameMode]);

  // Redirect after OAuth completes - handle invite links and normal flow
  useEffect(() => {
    const storedInviteCode = localStorage.getItem('deadblock_pending_invite_code');
    /* OAuth redirect debug - disabled for production
    console.log('OAuth redirect check:', { 
      isOAuthCallback, isAuthenticated, authLoading, hasRedirectedAfterOAuth, 
      hasPassedEntryAuth, hasProfile: !!profile, pendingOnlineIntent,
      pendingInviteCode, storedInviteCode
    });
    */
    
    if (isOAuthCallback && isAuthenticated && !authLoading && !hasRedirectedAfterOAuth) {
      // Check if we need to wait for profile to process invite
      const inviteCode = pendingInviteCode || storedInviteCode;
      
      // If there's an invite code but no profile yet, wait for profile to load
      if (inviteCode && !profile?.id) {
        // console.log('OAuth complete with invite - waiting for profile to load...');
        return; // Effect will re-run when profile changes
      }
      
      // Now we can proceed with redirect
      const doRedirect = async () => {
        clearOAuthCallback?.();
        
        // Clear pending online intent
        const hadOnlineIntent = pendingOnlineIntent || localStorage.getItem('deadblock_pending_online_intent') === 'true';
        localStorage.removeItem('deadblock_pending_online_intent');
        setPendingOnlineIntent(false);
        
        // Always pass entry auth and clear offline mode after successful OAuth
        setHasPassedEntryAuth(true);
        setIsOfflineMode(false);
        setShowOnlineAuthPrompt(false);
        
        // PRIORITY 1: Handle pending invite link
        if (inviteCode && profile?.id) {
          // console.log('OAuth complete with pending invite - processing invite...', inviteCode);
          try {
            const { inviteService } = await import('./services/inviteService');
            
            const { data, error } = await inviteService.acceptInviteByCode(inviteCode, profile.id);
            
            // console.log('OAuth invite accept result:', { data, error });
            
            if (data?.success && data?.game_id) {
              // console.log('Invite accepted! Starting game:', data.game_id);
              // Clear invite state
              setPendingInviteCode(null);
              setInviteInfo(null);
              setInviteError(null);
              localStorage.removeItem('deadblock_pending_invite_code');
              // Mark as redirected AFTER successful invite processing
              setHasRedirectedAfterOAuth(true);
              // Go directly to the game
              setOnlineGameId(data.game_id);
              setGameMode('online-game');
              return; // Don't continue to other redirects
            } else if (error) {
              // console.log('Invite error:', error.message);
              if (error.message !== 'Cannot accept your own invite') {
                alert(error.message);
              }
            }
          } catch (err) {
            console.error('Error accepting invite:', err);
          }
          // Clear invite state even on error
          setPendingInviteCode(null);
          setInviteInfo(null);
          setInviteError(null);
          localStorage.removeItem('deadblock_pending_invite_code');
        }
        
        // Mark as redirected for non-invite flow
        setHasRedirectedAfterOAuth(true);
        
        // PRIORITY 2: Online intent or already past entry
        if (hadOnlineIntent || hasPassedEntryAuth) {
          // console.log('OAuth complete with online intent - going to online menu');
          setGameMode('online-menu');
        } else {
          // PRIORITY 3: Default to game menu
          // console.log('OAuth complete from entry screen - going to game menu');
          setGameMode(null);
        }
      };
      
      doRedirect();
    }
  }, [isOAuthCallback, isAuthenticated, authLoading, hasRedirectedAfterOAuth, hasPassedEntryAuth, profile, pendingOnlineIntent, pendingInviteCode, setGameMode, clearOAuthCallback]);
  
  // v7.15.2: Check for streak reminder on app load
  useEffect(() => {
    if (isAuthenticated && profile?.id && !authLoading) {
      // Small delay to ensure notifications are initialized
      const timer = setTimeout(() => {
        streakTracker.checkAndRemind();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, profile?.id, authLoading]);
  
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
    // console.log('handleStartGame called:', { mode, isOnlineEnabled, isOfflineMode, isAuthenticated });
    
    if (mode === 'ai') {
      setGameMode('difficulty-select');
    } else if (mode === 'online') {
      // Check if online is enabled and user is authenticated
      if (!isOnlineEnabled) {
        // console.log('Online not enabled - showing alert');
        alert('Online features are not configured. Please set up Supabase.');
        return;
      }
      // If user is in offline mode, show auth prompt
      if (isOfflineMode && !isAuthenticated) {
        // console.log('Offline mode, not authenticated - showing auth prompt for online-menu');
        // Set intent and destination before showing auth
        localStorage.setItem('deadblock_pending_online_intent', 'true');
        localStorage.setItem('deadblock_pending_auth_destination', 'online-menu');
        setPendingOnlineIntent(true);
        setPendingAuthDestination('online-menu');
        setShowOnlineAuthPrompt(true);
        return;
      }
      if (!isAuthenticated) {
        // console.log('Not authenticated - going to auth screen');
        setGameMode('auth');
      } else {
        // console.log('Authenticated - going to online-menu');
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
    // console.log('handleOnlineAuthSuccess - redirecting to:', pendingAuthDestination);
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
    // console.log('handleWeeklyChallenge called:', { isOnlineEnabled, isOfflineMode, isAuthenticated });
    
    // Weekly challenge requires authentication
    if (!isOnlineEnabled) {
      // console.log('Online not enabled - showing alert');
      alert('Online features are not configured. Please set up Supabase.');
      return;
    }
    if (isOfflineMode && !isAuthenticated) {
      // console.log('Offline mode, not authenticated - showing auth prompt for weekly-menu');
      // Set intent and destination before showing auth
      localStorage.setItem('deadblock_pending_online_intent', 'true');
      localStorage.setItem('deadblock_pending_auth_destination', 'weekly-menu');
      setPendingOnlineIntent(true);
      setPendingAuthDestination('weekly-menu');
      setShowOnlineAuthPrompt(true);
      return;
    }
    if (!isAuthenticated) {
      // console.log('Not authenticated - going to auth screen');
      setGameMode('auth');
      return;
    }
    // console.log('Authenticated - going to weekly-menu');
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

  // Handle creator puzzle selection
  const handleCreatorPuzzleSelect = (puzzle) => {
    setCurrentCreatorPuzzle(puzzle);
    setGameMode('creator-puzzle');
    console.log('[App] Starting creator puzzle:', puzzle.puzzle_number);
  };

  // Handle next creator puzzle (after completing one)
  const handleNextCreatorPuzzle = async (nextPuzzleNumber) => {
    try {
      // Dynamically import the service
      const { creatorPuzzleService } = await import('./services/creatorPuzzleService');
      const nextPuzzle = await creatorPuzzleService.getPuzzleByNumber(nextPuzzleNumber);
      if (nextPuzzle) {
        setCurrentCreatorPuzzle(nextPuzzle);
        // Stay in creator-puzzle mode
      } else {
        // No more puzzles, go back to selection
        setCurrentCreatorPuzzle(null);
        setGameMode('creator-puzzle-select');
      }
    } catch (err) {
      console.error('[App] Failed to load next puzzle:', err);
      setCurrentCreatorPuzzle(null);
      setGameMode('creator-puzzle-select');
    }
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
    // v7.12: Refresh profile to ensure ELO is updated on return to menu
    refreshProfile?.();
  };

  // Handle resume game
  const handleResumeGame = (game) => {
    // console.log('handleResumeGame called:', { gameId: game?.id, game });
    if (!game?.id) {
      console.error('handleResumeGame: No game ID!');
      return;
    }
    setOnlineGameId(game.id);
    setGameMode('online-game');
  };

  // Handle spectate game
  const handleSpectateGame = (gameId) => {
    // console.log('handleSpectateGame called:', gameId);
    setSpectatingGameId(gameId);
    setGameMode('spectate');
  };

  // Handle view replay
  const handleViewReplay = (gameId) => {
    // console.log('handleViewReplay called:', gameId);
    setReplayGameId(gameId);
    setGameMode('replay');
  };

  // Handle service worker notification clicks and URL-based navigation
  // v7.11: Improved to ensure gameId navigation works properly
  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      console.log('[App] Received service worker message:', event.data);
      
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const { data } = event.data;
        // Service worker sends 'type', not 'notificationType'
        const { gameId, type: notificationType, inviteId, rematchId, openChat } = data || {};
        
        console.log('[App] Processing notification click:', { gameId, notificationType, openChat });
        
        // If not authenticated yet, store for later navigation
        if (!hasPassedEntryAuth) {
          console.log('[App] Not past entry auth, storing for later navigation');
          if (gameId) {
            sessionStorage.setItem('deadblock_pending_game_id', gameId);
          }
          if (openChat) {
            sessionStorage.setItem('deadblock_open_chat', 'true');
          }
          if (notificationType === 'weekly_challenge') {
            sessionStorage.setItem('deadblock_pending_nav', 'weekly');
          } else {
            sessionStorage.setItem('deadblock_pending_nav', 'online');
          }
          localStorage.setItem('deadblock_pending_online_intent', 'true');
          return;
        }
        
        // Navigate immediately if authenticated
        // v7.11: Always navigate to specific game when gameId is provided
        if (gameId) {
          console.log('[App] Navigating to game:', gameId);
          if (openChat) {
            sessionStorage.setItem('deadblock_open_chat', 'true');
          }
          setOnlineGameId(gameId);
          setGameMode('online-game');
        } else if (notificationType === 'weekly_challenge') {
          // Weekly challenge notification - go to weekly menu
          console.log('[App] Navigating to weekly challenge menu');
          setGameMode('weekly-menu');
        } else {
          console.log('[App] Navigating to online menu');
          setGameMode('online-menu');
        }
      }
    };
    
    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    // Also check URL params on load (for when app opens from notification click)
    const params = new URLSearchParams(window.location.search);
    const navigateTo = params.get('navigateTo');
    const urlGameId = params.get('gameId');
    const rematchGameId = params.get('rematchGameId');
    const openChat = params.get('openChat');
    
    // Store navigation params in sessionStorage so they survive auth loading
    if (navigateTo === 'online') {
      console.log('[App] URL params detected - gameId:', urlGameId);
      if (urlGameId) {
        sessionStorage.setItem('deadblock_pending_game_id', urlGameId);
      }
      if (openChat === 'true') {
        sessionStorage.setItem('deadblock_open_chat', 'true');
      }
      sessionStorage.setItem('deadblock_pending_nav', 'online');
      window.history.replaceState({}, document.title, '/');
    } else if (navigateTo === 'weekly') {
      // Handle weekly challenge notification navigation
      sessionStorage.setItem('deadblock_pending_nav', 'weekly');
      window.history.replaceState({}, document.title, '/');
    }
    
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []); // Empty deps - only run on mount
  
  // v7.11: Separate useEffect to process pending navigation after auth is ready
  useEffect(() => {
    if (!hasPassedEntryAuth) return;
    
    const pendingNav = sessionStorage.getItem('deadblock_pending_nav');
    const pendingGameId = sessionStorage.getItem('deadblock_pending_game_id');
    
    if (pendingNav === 'online') {
      console.log('[App] Processing pending online navigation, gameId:', pendingGameId);
      sessionStorage.removeItem('deadblock_pending_nav');
      sessionStorage.removeItem('deadblock_pending_game_id');
      // Keep deadblock_open_chat for OnlineGameScreen to read
      
      // Small delay to ensure state is ready
      setTimeout(() => {
        if (pendingGameId) {
          console.log('[App] Setting online game:', pendingGameId);
          setOnlineGameId(pendingGameId);
          setGameMode('online-game');
        } else {
          setGameMode('online-menu');
        }
      }, 100);
    } else if (pendingNav === 'weekly') {
      console.log('[App] Processing pending weekly navigation');
      sessionStorage.removeItem('deadblock_pending_nav');
      setTimeout(() => {
        setGameMode('weekly-menu');
      }, 100);
    }
  }, [hasPassedEntryAuth, setGameMode, setOnlineGameId]);

  // Fallback timeout for stuck loading state
  const [loadingStuck, setLoadingStuck] = useState(false);
  
  // Check if we should be showing loading screen
  const shouldShowLoading = isOnlineEnabled && (authLoading || (isOAuthCallback && !profile));
  
  useEffect(() => {
    if (shouldShowLoading) {
      const timeout = setTimeout(() => {
        // console.log('Loading stuck timeout triggered');
        setLoadingStuck(true);
      }, 5000); // 5 seconds
      
      // If we're stuck for too long (10 seconds), force clear the OAuth callback
      const forceTimeout = setTimeout(() => {
        // console.log('Force clearing stuck OAuth state');
        if (clearOAuthCallback) {
          clearOAuthCallback();
        }
        // Also force pass entry auth if we're stuck
        if (!hasPassedEntryAuth && isAuthenticated) {
          setHasPassedEntryAuth(true);
        }
        // If there was pending online intent, go to online menu
        if (pendingOnlineIntent || localStorage.getItem('deadblock_pending_online_intent') === 'true') {
          // console.log('Force timeout: handling pending online intent');
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
  
  /* DEBUG: Always log current state (even before loading check) - disabled for production
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
  */
  
  // INLINE OAuth completion handling - if we're in OAuth callback but user is authenticated,
  // trigger the redirect immediately instead of waiting for effect
  if (isOAuthCallback && isAuthenticated && !authLoading && !hasRedirectedAfterOAuth) {
    // console.log('=== INLINE OAuth completion - triggering redirect ===');
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
        // console.log('OAuth complete - going to online menu');
        setGameMode('online-menu');
      } else {
        // console.log('OAuth complete - going to main menu');
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

  /* Debug logging - comprehensive state dump - disabled for production
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
  */

  // Show Entry Auth Screen first (before anything else)
  // Skip if:
  // 1. Already passed entry screen
  // 2. Auth is still loading
  // 3. OAuth callback in progress  
  // 4. User is already authenticated (effect will set hasPassedEntryAuth)
  const shouldShowEntryAuth = !hasPassedEntryAuth && !authLoading && !isOAuthCallback && !isAuthenticated;
  // console.log('Entry auth check:', { shouldShowEntryAuth, hasPassedEntryAuth, authLoading, isOAuthCallback, isAuthenticated });
  
  if (shouldShowEntryAuth) {
    // console.log('Rendering: EntryAuthScreen');
    return (
      <EntryAuthScreen
        onComplete={handleEntryAuthComplete}
        onOfflineMode={handleOfflineMode}
      />
    );
  }

  // Online Auth Prompt (for offline users trying to go online)
  if (showOnlineAuthPrompt) {
    // console.log('Rendering: Online Auth Prompt for destination:', pendingAuthDestination);
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
        forceOnlineOnly={false}
        intendedDestination={pendingAuthDestination}
      />
    );
  }

  // Render Menu Screen - this should be the default after auth
  // Changed from !gameMode to explicit null check plus fallback
  if (gameMode === null || gameMode === undefined) {
    // console.log('Rendering: MenuScreen (gameMode is null/undefined)');
    // console.log('MenuScreen props:', { isOnlineEnabled, isAuthenticated, isOfflineMode, hasProfile: !!profile });
    
    // If user just authenticated but hasPassedEntryAuth not set yet, set it now
    if (isAuthenticated && !hasPassedEntryAuth) {
      // console.log('Setting hasPassedEntryAuth from render');
      // Schedule for next tick to avoid state update during render
      setTimeout(() => setHasPassedEntryAuth(true), 0);
    }
    return (
      <>
        <MenuScreen
          onStartGame={handleStartGame}
          onPuzzleSelect={() => setGameMode('puzzle-type-select')}
          onWeeklyChallenge={handleWeeklyChallenge}
          showHowToPlay={showHowToPlay}
          onToggleHowToPlay={setShowHowToPlay}
          showSettings={showSettings}
          onToggleSettings={setShowSettings}
          isOnlineEnabled={isOnlineEnabled}
          isAuthenticated={isAuthenticated}
          isOfflineMode={isOfflineMode}
          onShowProfile={() => setShowProfileModal(true)}
          onSignIn={() => setGameMode('auth')}
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
              // User skipped - just close without tutorial
              setShowWelcomeModal(false);
              clearNewUser();
            }}
            onEditUsername={() => {
              setShowWelcomeModal(false);
              clearNewUser();
              setShowProfileModal(true);
            }}
            onComplete={() => {
              // v7.12: User completed welcome - show tutorial next
              setShowWelcomeModal(false);
              clearNewUser();
              setShowNewUserTutorial(true);
            }}
          />
        )}
        
        {/* v7.12: Tutorial modal for new users (shown after welcome modal) */}
        {showNewUserTutorial && (
          <HowToPlayModal 
            isOpen={true} 
            onClose={() => setShowNewUserTutorial(false)} 
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
    // console.log('Rendering: EntryAuthScreen for auth mode with inviteInfo:', !!inviteInfo);
    return (
      <EntryAuthScreen
        onComplete={() => {
          // After auth, check if we need to accept an invite
          const inviteCode = pendingInviteCode || localStorage.getItem('deadblock_pending_invite_code');
          if (inviteCode && profile?.id) {
            // Invite will be processed by the invite acceptance effect
            setGameMode(null); // Go to menu, invite effect will handle the rest
          } else {
            setGameMode('online-menu');
          }
        }}
        onOfflineMode={() => {
          setPendingInviteCode(null);
          setInviteInfo(null);
          setInviteError(null);
          localStorage.removeItem('deadblock_pending_invite_code');
          setGameMode(null);
        }}
        inviteInfo={inviteInfo}
        inviteLoading={inviteLoading}
        inviteError={inviteError}
        onCancelInvite={() => {
          setPendingInviteCode(null);
          setInviteInfo(null);
          localStorage.removeItem('deadblock_pending_invite_code');
          setInviteError(null);
          setGameMode(null);
        }}
        forceOnlineOnly={!!inviteInfo}
      />
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
          showTutorial={showTutorialOnJoin}
          onTutorialClose={() => setShowTutorialOnJoin(false)}
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

  // =====================================================
  // PUZZLE MODES (Lazy loaded with Suspense)
  // =====================================================

  // Render Puzzle Type Selection Screen (Creator vs Generated)
  if (gameMode === 'puzzle-type-select') {
    return (
      <LazyWrapper message="Loading puzzles...">
        <PuzzleTypeSelect
          onSelectCreator={() => setGameMode('creator-puzzle-select')}
          onSelectGenerated={() => setGameMode('puzzle-select')}
          onBack={() => setGameMode(null)}
        />
      </LazyWrapper>
    );
  }

  // Render Creator Puzzle Selection Screen
  if (gameMode === 'creator-puzzle-select') {
    return (
      <LazyWrapper message="Loading creator puzzles...">
        <CreatorPuzzleSelect
          onSelectPuzzle={handleCreatorPuzzleSelect}
          onBack={() => setGameMode('puzzle-type-select')}
        />
      </LazyWrapper>
    );
  }

  // Render Creator Puzzle Game Screen
  if (gameMode === 'creator-puzzle') {
    if (!currentCreatorPuzzle) {
      setGameMode('creator-puzzle-select');
      return null;
    }
    return (
      <LazyWrapper message="Loading puzzle...">
        <CreatorPuzzleGame
          puzzle={currentCreatorPuzzle}
          onBack={() => {
            setCurrentCreatorPuzzle(null);
            setGameMode('creator-puzzle-select');
          }}
          onNextPuzzle={handleNextCreatorPuzzle}
        />
      </LazyWrapper>
    );
  }

  // Render Generated Puzzle Difficulty Select Screen
  if (gameMode === 'puzzle-select') {
    return (
      <LazyWrapper message="Loading puzzle mode...">
        <PuzzleSelect
          onSelectPuzzle={handlePuzzleSelect}
          onSpeedMode={() => setGameMode('speed-puzzle')}
          onBack={() => setGameMode('puzzle-type-select')}
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
    // console.log('Rendering: WeeklyChallengeMenu');
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
  // console.log('Rendering: GameScreen (fallback) - gameMode:', gameMode);
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
      puzzleDifficulty={puzzleDifficulty}
      isMobile={isMobile}
      isGeneratingPuzzle={isGeneratingPuzzle}
      aiAnimatingMove={aiAnimatingMove}
      playerAnimatingMove={playerAnimatingMove}
      moveCount={moveHistory.length}
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
      onQuitGame={(isForfeit) => {
        // For now, just go back to menu
        // In the future, could record a loss for VS AI mode if isForfeit is true
        // console.log('Quit game:', { isForfeit, gameMode });
        setGameMode(null);
      }}
      onDifficultySelect={() => setGameMode(gameMode === 'puzzle' ? 'puzzle-select' : 'difficulty-select')}
    />
  );
}

// Main App with Auth Provider wrapper
function App() {
  // Background theme state - persists across screen changes
  const [bgTheme, setBgTheme] = useState('menu');
  
  return (
    <AuthProvider>
      {/* Global background - rendered once, never remounts */}
      <GlobalBackground theme={bgTheme} />
      <AppContent onBgThemeChange={setBgTheme} />
      <IOSInstallPrompt />
    </AuthProvider>
  );
}

export default App;
