import React, { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './utils/supabase';

// Screens
import MenuScreen from './components/MenuScreen';
import PuzzleSelect from './components/PuzzleSelect';
import SpeedPuzzleScreen from './components/SpeedPuzzleScreen';
import GameScreen from './components/GameScreen';
import DifficultySelector from './components/DifficultySelector';
import NeonTitle from './components/NeonTitle';

// Online components (lazy loaded if needed)
import AuthScreen from './components/AuthScreen';
import OnlineMenu from './components/OnlineMenu';
import MatchmakingScreen from './components/MatchmakingScreen';
import OnlineGameScreen from './components/OnlineGameScreen';
import UserProfile from './components/UserProfile';
import Leaderboard from './components/Leaderboard';
import SpectatorView from './components/SpectatorView';
import GameReplay from './components/GameReplay';

// PWA Install Prompt for iOS/Safari
import IOSInstallPrompt from './components/IOSInstallPrompt';

// Main App Content (wrapped in AuthProvider)
function AppContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [onlineGameId, setOnlineGameId] = useState(null);
  const [hasRedirectedAfterOAuth, setHasRedirectedAfterOAuth] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);
  
  // Spectating and replay state
  const [spectatingGameId, setSpectatingGameId] = useState(null);
  const [replayGameId, setReplayGameId] = useState(null);
  
  const { isAuthenticated, loading: authLoading, isOnlineEnabled, isOAuthCallback, clearOAuthCallback, profile } = useAuth();

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

  // Redirect to online menu after OAuth completes
  useEffect(() => {
    console.log('OAuth redirect check:', { isOAuthCallback, isAuthenticated, authLoading, hasRedirectedAfterOAuth });
    if (isOAuthCallback && isAuthenticated && !authLoading && !hasRedirectedAfterOAuth) {
      console.log('OAuth complete, redirecting to online menu');
      setHasRedirectedAfterOAuth(true);
      clearOAuthCallback?.(); // Clear the flag after handling
      setGameMode('online-menu');
    }
  }, [isOAuthCallback, isAuthenticated, authLoading, hasRedirectedAfterOAuth, setGameMode, clearOAuthCallback]);
  
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
    if (mode === 'ai') {
      setGameMode('difficulty-select');
    } else if (mode === 'online') {
      // Check if online is enabled and user is authenticated
      if (!isOnlineEnabled) {
        alert('Online features are not configured. Please set up Supabase.');
        return;
      }
      if (!isAuthenticated) {
        setGameMode('auth');
      } else {
        setGameMode('online-menu');
      }
    } else {
      startNewGame(mode);
    }
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
  
  useEffect(() => {
    if (isOnlineEnabled && (authLoading || isOAuthCallback)) {
      const timeout = setTimeout(() => {
        console.log('Loading stuck timeout triggered');
        setLoadingStuck(true);
      }, 5000); // 5 seconds (reduced from 15)
      
      return () => clearTimeout(timeout);
    } else {
      setLoadingStuck(false);
    }
  }, [isOnlineEnabled, authLoading, isOAuthCallback]);

  // Show loading while auth is initializing or processing OAuth callback
  if (isOnlineEnabled && (authLoading || isOAuthCallback)) {
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

  // Debug logging
  console.log('App render:', { gameMode, onlineGameId, isAuthenticated, authLoading, isOAuthCallback });

  // Render Menu Screen
  if (!gameMode) {
    return (
      <MenuScreen
        onStartGame={handleStartGame}
        onPuzzleSelect={() => setGameMode('puzzle-select')}
        showHowToPlay={showHowToPlay}
        onToggleHowToPlay={setShowHowToPlay}
        showSettings={showSettings}
        onToggleSettings={setShowSettings}
        isOnlineEnabled={isOnlineEnabled}
        isAuthenticated={isAuthenticated}
      />
    );
  }

  // =====================================================
  // ONLINE MODES
  // =====================================================

  // Auth Screen (Login/Signup)
  if (gameMode === 'auth') {
    return (
      <AuthScreen
        onBack={() => setGameMode(null)}
        onSuccess={() => setGameMode('online-menu')}
        inviteInfo={inviteInfo}
      />
    );
  }

  // Online Menu/Lobby
  if (gameMode === 'online-menu') {
    return (
      <OnlineMenu
        onFindMatch={() => setGameMode('matchmaking')}
        onViewProfile={() => setGameMode('profile')}
        onViewLeaderboard={() => setGameMode('leaderboard')}
        onResumeGame={handleResumeGame}
        onSpectateGame={handleSpectateGame}
        onViewReplay={handleViewReplay}
        onBack={() => setGameMode(null)}
      />
    );
  }

  // Matchmaking Screen
  if (gameMode === 'matchmaking') {
    return (
      <MatchmakingScreen
        onMatchFound={handleMatchFound}
        onCancel={() => setGameMode('online-menu')}
      />
    );
  }

  // Online Game
  if (gameMode === 'online-game') {
    if (!onlineGameId) {
      console.error('online-game mode but no gameId, redirecting to menu');
      // Reset to online menu if we somehow got here without a game ID
      return (
        <OnlineMenu
          onFindMatch={() => setGameMode('matchmaking')}
          onViewProfile={() => setGameMode('profile')}
          onViewLeaderboard={() => setGameMode('leaderboard')}
          onResumeGame={handleResumeGame}
          onSpectateGame={handleSpectateGame}
          onViewReplay={handleViewReplay}
          onBack={() => setGameMode(null)}
        />
      );
    }
    return (
      <OnlineGameScreen
        gameId={onlineGameId}
        onGameEnd={handleOnlineGameEnd}
        onLeave={() => {
          setOnlineGameId(null);
          setGameMode('online-menu');
        }}
      />
    );
  }

  // User Profile
  if (gameMode === 'profile') {
    return (
      <UserProfile
        onBack={() => setGameMode('online-menu')}
      />
    );
  }

  // Leaderboard
  if (gameMode === 'leaderboard') {
    return (
      <Leaderboard
        onBack={() => setGameMode('online-menu')}
      />
    );
  }

  // Spectate Game
  if (gameMode === 'spectate') {
    return (
      <SpectatorView
        gameId={spectatingGameId}
        userId={profile?.id}
        onClose={() => {
          setSpectatingGameId(null);
          setGameMode('online-menu');
        }}
      />
    );
  }

  // Game Replay
  if (gameMode === 'replay') {
    return (
      <GameReplay
        gameId={replayGameId}
        onClose={() => {
          setReplayGameId(null);
          setGameMode('online-menu');
        }}
      />
    );
  }

  // =====================================================
  // OFFLINE MODES
  // =====================================================

  // Render Difficulty Selector for AI
  if (gameMode === 'difficulty-select') {
    return (
      <DifficultySelector
        selectedDifficulty={aiDifficulty}
        onSelectDifficulty={setAiDifficulty}
        onStartGame={handleStartAIGame}
        onBack={() => setGameMode(null)}
      />
    );
  }

  // Render Puzzle Difficulty Select Screen
  if (gameMode === 'puzzle-select') {
    return (
      <PuzzleSelect
        onSelectPuzzle={handlePuzzleSelect}
        onSpeedMode={() => setGameMode('speed-puzzle')}
        onBack={() => setGameMode(null)}
      />
    );
  }
  
  // Render Speed Puzzle Screen
  if (gameMode === 'speed-puzzle') {
    return (
      <SpeedPuzzleScreen
        onMenu={() => setGameMode('puzzle-select')}
      />
    );
  }

  // Render Game Screen (for ai, 2player, and puzzle modes)
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
      onDifficultySelect={() => setGameMode(gameMode === 'puzzle' ? 'puzzle-select' : 'ai-select')}
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
