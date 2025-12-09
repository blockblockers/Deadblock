import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './utils/supabase';

// Screens
import MenuScreen from './components/MenuScreen';
import PuzzleSelect from './components/PuzzleSelect';
import GameScreen from './components/GameScreen';
import DifficultySelector from './components/DifficultySelector';

// Online components (lazy loaded if needed)
import AuthScreen from './components/AuthScreen';
import OnlineMenu from './components/OnlineMenu';
import MatchmakingScreen from './components/MatchmakingScreen';
import OnlineGameScreen from './components/OnlineGameScreen';
import UserProfile from './components/UserProfile';
import Leaderboard from './components/Leaderboard';

// Main App Content (wrapped in AuthProvider)
function AppContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [onlineGameId, setOnlineGameId] = useState(null);
  const [hasRedirectedAfterOAuth, setHasRedirectedAfterOAuth] = useState(false);
  
  const { isAuthenticated, loading: authLoading, isOnlineEnabled, isOAuthCallback } = useAuth();

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

  // Redirect to online menu after OAuth completes
  useEffect(() => {
    if (isOAuthCallback && isAuthenticated && !authLoading && !hasRedirectedAfterOAuth) {
      console.log('OAuth complete, redirecting to online menu');
      setHasRedirectedAfterOAuth(true);
      setGameMode('online-menu');
    }
  }, [isOAuthCallback, isAuthenticated, authLoading, hasRedirectedAfterOAuth, setGameMode]);
  
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
  const handleStartAIGame = () => {
    startNewGame('ai');
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

  // Show loading while auth is initializing or processing OAuth callback
  if (isOnlineEnabled && (authLoading || isOAuthCallback)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-amber-300 text-sm">
          {isOAuthCallback ? 'Signing you in...' : 'Loading...'}
        </p>
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
        onBack={() => setGameMode(null)}
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
      onCellClick={handleCellClick}
      onSelectPiece={selectPiece}
      onRotate={rotatePiece}
      onFlip={flipPiece}
      onConfirm={confirmMove}
      onCancel={cancelMove}
      onMovePiece={movePendingPiece}
      onUndo={undoMove}
      onReset={resetGame}
      onRetryPuzzle={resetCurrentPuzzle}
      onMenu={() => setGameMode(null)}
    />
  );
}

// Main App with Auth Provider wrapper
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
