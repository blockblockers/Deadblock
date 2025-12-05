import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import MenuScreen from './components/MenuScreen';
import PuzzleSelect from './components/PuzzleSelect';
import GameScreen from './components/GameScreen';
import DifficultySelector from './components/DifficultySelector';

function App() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

export default App;
