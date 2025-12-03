import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import MenuScreen from './components/MenuScreen';
import PuzzleSelect from './components/PuzzleSelect';
import GameScreen from './components/GameScreen';
import DifficultySelector from './components/DifficultySelector';
import { soundManager } from './utils/soundManager';

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize sound on first user interaction
  useEffect(() => {
    const initSound = () => {
      if (!musicStarted) {
        soundManager.init();
        soundManager.startBackgroundMusic('/sounds/background-music.mp3');
        setMusicStarted(true);
      }
    };

    // Listen for first interaction to start audio (browser autoplay policy)
    const events = ['touchstart', 'mousedown', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, initSound, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, initSound);
      });
    };
  }, [musicStarted]);

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
  } = useGameState();

  // Handle starting a game (with difficulty selection for AI mode)
  const handleStartGame = (mode) => {
    if (mode === 'ai') {
      setGameMode('difficulty-select');
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
      />
    );
  }

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

  // Render Game Screen
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
      onCellClick={handleCellClick}
      onSelectPiece={selectPiece}
      onRotate={rotatePiece}
      onFlip={flipPiece}
      onConfirm={confirmMove}
      onCancel={cancelMove}
      onMovePiece={movePendingPiece}
      onUndo={undoMove}
      onReset={resetGame}
      onMenu={() => setGameMode(null)}
    />
  );
}

export default App;